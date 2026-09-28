import re
import time
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

# Sensitive patterns to filter before retain (spec section 8)
SENSITIVE_PATTERNS = [
    re.compile(r"sk-[a-zA-Z0-9]{20,}"),
    re.compile(r"api[_-]?key\s*[:=]\s*\S+", re.I),
    re.compile(r"password\s*[:=]\s*\S+", re.I),
    re.compile(r"\b\d{13,19}\b"),  # card-like
]

TRANSIENT = {"hello","hi","thanks","thank you","okay","ok","sure","good morning","good evening","hey","bye"}

SALES_MISSION = (
    "You are a memory extractor for a B2B sales agent. Extract durable business facts: "
    "budget, deployment requirements, privacy concerns, decision makers, objections, preferences, "
    "buying timeline, commitments, competitor mentions, rejected options. Ignore greetings and transient small talk."
)

def is_sensitive(text: str) -> bool:
    return any(p.search(text) for p in SENSITIVE_PATTERNS)

def is_transient(text: str) -> bool:
    t = text.strip().lower()
    return t in TRANSIENT or len(t) < 8

def bank_id_for(customer_id: str) -> str:
    # deterministic per customer
    safe = re.sub(r"[^a-zA-Z0-9_-]", "-", customer_id.lower())[:40]
    return f"dealmind-{safe}"

class HindsightService:
    def __init__(self, base_url: str, api_key: str = ""):
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.client = None
        self._mock_store: Dict[str, List[str]] = {}  # fallback when server unavailable
        self.available = False
        self._next_reprobe = 0.0
        self._reprobe_interval = 20.0  # seconds between reconnect attempts after a transient failure
        self._executor = None  # single worker thread for all real-client calls (see _call)
        try:
            from hindsight_client import Hindsight
            self.client = Hindsight(base_url=self.base_url, api_key=self.api_key or None)
            # probe: real liveness check against the version endpoint
            try:
                self._call(self.client.get_version)
                self.available = True
            except Exception as e:
                logger.warning(f"Hindsight probe failed, using mock fallback: {e}")
                self.available = False
                self._next_reprobe = time.time() + self._reprobe_interval
        except Exception as e:
            logger.warning(f"Hindsight client init failed, mock mode: {e}")
            self.client = None
            self.available = False

    def _mark_unavailable(self):
        """A call failed (e.g. provider rate limit). Fall back to mock, but schedule a re-probe
        so a transient outage does not permanently degrade memory to mock mode."""
        self.available = False
        self._next_reprobe = time.time() + self._reprobe_interval

    def _call(self, fn, *args, **kwargs):
        """Run a hindsight-client call on one dedicated worker thread.

        The client's sync wrappers create/drive an asyncio loop per calling thread and its
        aiohttp session is not safe under concurrent cross-thread use (surfaces as
        'Timeout context manager should be used inside a task'). Serializing every real-client
        call onto a single thread avoids both the race and cross-loop errors."""
        if self._executor is None:
            from concurrent.futures import ThreadPoolExecutor
            self._executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="hindsight")
        return self._executor.submit(fn, *args, **kwargs).result()

    def _maybe_reprobe(self):
        """Retry the real Hindsight server once the cooldown elapses after a transient failure."""
        if not self.client or self.available or time.time() < self._next_reprobe:
            return
        try:
            if hasattr(self.client, "get_version"):
                self._call(self.client.get_version)
            self.available = True
            logger.info("Hindsight reconnected — real memory restored")
        except Exception as e:
            self._next_reprobe = time.time() + self._reprobe_interval
            logger.warning(f"Hindsight still unavailable, retrying in {int(self._reprobe_interval)}s: {e}")

    def ensure_bank(self, bank_id: str):
        self._maybe_reprobe()
        if not self.client or not self.available:
            self._mock_store.setdefault(bank_id, [])
            return
        try:
            # create_bank is idempotent — creates or updates
            self._call(
                self.client.create_bank,
                bank_id=bank_id,
                retain_mission=SALES_MISSION,
                reflect_mission="Synthesize deal intelligence: buying signals, objections, next steps.",
            )
        except Exception as e:
            logger.warning(f"ensure_bank {bank_id} failed: {e}")

    def retain(self, bank_id: str, content: str, context: str = None) -> bool:
        if is_sensitive(content) or is_transient(content):
            logger.info(f"Filtered retain (sensitive/transient): {content[:60]}")
            return False
        self.ensure_bank(bank_id)
        if self.client and self.available:
            try:
                self._call(self.client.retain, bank_id=bank_id, content=content, context=context)
                return True
            except Exception as e:
                logger.warning(f"retain failed, falling back to mock: {e}")
                self._mark_unavailable()
        # mock fallback
        self._mock_store.setdefault(bank_id, []).append(content)
        return True

    def recall(self, bank_id: str, query: str, budget: str = "mid") -> List[Dict[str, Any]]:
        self.ensure_bank(bank_id)
        if self.client and self.available:
            try:
                resp = self._call(self.client.recall, bank_id=bank_id, query=query, budget=budget)
                # RecallResponse is iterable / has results
                items = []
                # Try common shapes
                if hasattr(resp, "results"):
                    raw = resp.results
                elif hasattr(resp, "__iter__"):
                    raw = list(resp)
                else:
                    raw = []
                for r in raw or []:
                    text = getattr(r, "text", None) or getattr(r, "content", None) or str(r)
                    score = getattr(r, "score", 0) or 0
                    if not score:
                        # real server returns RecallScores(final=..., reranker=..., semantic=...)
                        scores = getattr(r, "scores", None)
                        if scores is not None:
                            score = (getattr(scores, "final", 0) or getattr(scores, "reranker", 0)
                                     or getattr(scores, "semantic", 0) or 0)
                    items.append({"text": text, "relevance": float(score) if isinstance(score,(int,float)) else 0, "source":"hindsight"})
                # also try dict shape
                if not items and isinstance(resp, dict):
                    for r in resp.get("results",[]):
                        items.append({"text": r.get("text") or r.get("content",""), "relevance": r.get("score",0), "source":"hindsight"})
                # string prompt fallback
                if not items:
                    try:
                        s = resp.to_prompt_string() if hasattr(resp,"to_prompt_string") else str(resp)
                        if s and len(s.strip())>10:
                            items.append({"text": s[:2000], "relevance": 0.8, "source":"hindsight"})
                    except: pass
                return items
            except Exception as e:
                logger.warning(f"recall failed, mock fallback: {e}")
                self._mark_unavailable()
        # mock fallback: naive keyword overlap
        mems = self._mock_store.get(bank_id, [])
        q_words = set(query.lower().split())
        scored = []
        for m in mems:
            overlap = len(q_words & set(m.lower().split()))
            if overlap>0 or not q_words:
                scored.append({"text": m, "relevance": overlap/max(1,len(q_words)), "source":"mock"})
        scored.sort(key=lambda x: x["relevance"], reverse=True)
        return scored[:8]

    def reflect(self, bank_id: str, query: str, context: str = None) -> str:
        self.ensure_bank(bank_id)
        if self.client and self.available:
            try:
                resp = self._call(self.client.reflect, bank_id=bank_id, query=query, context=context)
                # ReflectResponse shape
                ans = getattr(resp, "answer", None) or getattr(resp, "response", None) or getattr(resp,"text",None)
                if ans: return str(ans)
                if isinstance(resp, dict): return resp.get("answer") or resp.get("response") or str(resp)
                return str(resp)
            except Exception as e:
                logger.warning(f"reflect failed: {e}")
                self._mark_unavailable()
        # mock fallback: synthesize from mock memories
        mems = self._mock_store.get(bank_id, [])
        if not mems:
            return "No relevant memories found for this customer yet."
        return "Based on remembered facts:\n- " + "\n- ".join(mems[:6])

# singleton accessor
_service: Optional[HindsightService] = None
def get_hindsight() -> HindsightService:
    global _service
    if _service is None:
        from ..config import settings
        _service = HindsightService(settings.hindsight_api_url, settings.hindsight_api_key)
    return _service

def reset_hindsight():
    global _service
    _service = None
