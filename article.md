# How I Made My Sales Agent Remember Objections with Hindsight

My sales agent kept asking the same prospect for their budget three times. After the fourth call, the prospect stopped replying.

That was the moment I stopped treating conversation history as memory and started building an agent that actually learns.

## What DealMind does

DealMind is a sales co-pilot for B2B teams. It sits between a sales rep and a prospect's deal cycle — every objection, budget mention, competitor, stakeholder, or deployment constraint the prospect shares is captured, remembered, and used to make the next response better.

The architecture is intentionally boring so the memory layer can be interesting:

**React (Vite + Tailwind)** → **FastAPI** → **Agent Loop** → **Groq `openai/gpt-oss-120b`** → **PostgreSQL** for business records + **[Hindsight](https://github.com/vectorize-io/hindsight)** for long-term memory. The [Hindsight docs](https://hindsight.vectorize.io/) call this separation critical, and I agree — your database is not your memory.

Every chat message flows through the same loop:

```
user message → build recall query → Hindsight recall → inject context → LLM → extract durable facts → Hindsight retain → PostgreSQL event → response + evidence
```

The key decision: recalled memories are injected as system context before the LLM call, and the response returns not just text but an evidence chain — which memories were recalled, what was newly learned, and why the recommendation was made. That chain is what makes memory visible to the rep, not just to the model.

You can read more about the pattern in Vectorize's overview of [Vectorize agent memory](https://vectorize.io/what-is-agent-memory) — Hindsight is the managed service that implements banks, fact extraction, and the retain/recall/reflect primitives.

## The core story: isolation, not just storage

The first version of DealMind had one big memory store. It worked until I tested two prospects in parallel. Acme Manufacturing said they required on-premise deployment for privacy reasons. Nova Labs said they were cloud-native and wanted a fully managed SaaS. On the fifth message to Nova, the agent recommended an on-premise deployment.

It had cross-contaminated. The memory layer had no boundary.

That bug taught me the most important lesson of agent memory: **isolation is the product**. A memory system that remembers everything but cannot keep customers apart is worse than no memory at all — it confidently gives the wrong personalization.

The fix was per-customer Hindsight banks with deterministic IDs and an explicit mission that tells Hindsight what to keep and what to throw away.

### Per-customer bank isolation

```python
# backend/app/hindsight/service.py
SALES_MISSION = (
    "You are a memory extractor for a B2B sales agent. Extract durable business facts: "
    "budget, deployment requirements, privacy concerns, decision makers, objections, preferences, "
    "buying timeline, commitments, competitor mentions, rejected options. Ignore greetings and transient small talk."
)

def bank_id_for(customer_id: str) -> str:
    safe = re.sub(r"[^a-zA-Z0-9_-]", "-", customer_id.lower())[:40]
    return f"dealmind-{safe}"

class HindsightService:
    def ensure_bank(self, bank_id: str):
        if not self.client or not self.available:
            self._mock_store.setdefault(bank_id, [])
            return
        self.client.create_bank(
            bank_id=bank_id,
            retain_mission=SALES_MISSION,
            reflect_mission="Synthesize deal intelligence: buying signals, objections, next steps.",
        )
```

`bank_id_for("eabe14e5-...")` always returns `dealmind-eabe14e5-...`. Same prospect, same bank, across restarts, deploys, and months. Different prospect, different bank, guaranteed isolation. `create_bank` is idempotent, so calling it before every retain/recall is cheap and safe — if the bank exists, it updates the mission.

The `retain_mission` is doing more work than it looks. Without it, Hindsight would happily memorize "hi", "thanks", and "good morning." With it, the extraction pass knows to keep `Acme has a ₹10 lakh budget` and drop `hello there`. The transient and sensitive filters in front of `retain` enforce that too:

```python
# backend/app/hindsight/service.py
SENSITIVE_PATTERNS = [
    re.compile(r"sk-[a-zA-Z0-9]{20,}"),
    re.compile(r"api[_-]?key\s*[:=]\s*\S+", re.I),
    re.compile(r"password\s*[:=]\s*\S+", re.I),
    re.compile(r"\b\d{13,19}\b"),  # card-like
]

def is_transient(text: str) -> bool:
    t = text.strip().lower()
    return t in {"hello","hi","thanks","thank you","okay","ok","sure"} or len(t) < 8

def retain(self, bank_id: str, content: str, context: str = None) -> bool:
    if is_sensitive(content) or is_transient(content):
        return False
    # ...
    self.client.retain(bank_id=bank_id, content=content, context=context)
```

If a prospect pastes an `sk-...` key or a 16-digit card number, it never reaches the bank. That was a non-negotiable before I would let a rep use this with real prospects.

### The agent loop: recall before you reason

The second lesson was ordering. My early agent called the LLM first, then tried to remember facts after. Responses were generic because the LLM never saw what mattered.

Flipping the order changed everything. Recall first, then reason:

```python
# backend/app/agents/deal_agent.py
def build_recall_query(user_msg: str) -> str:
    q = user_msg.strip()
    low = q.lower()
    if "recommend" in low or "suggest" in low or "proposal" in low:
        return f"customer requirements budget preferences objections decision makers timeline rejected options relevant to: {q}"
    if "budget" in low or "price" in low or "cost" in low:
        return f"budget pricing constraints preferences relevant to: {q}"
    if "deploy" in low or "on-prem" in low or "cloud" in low:
        return f"deployment requirements privacy concerns rejected options relevant to: {q}"
    return f"customer facts relevant to: {q}"

def run_agent(customer_id: str, user_msg: str, llm) -> dict:
    hs = get_hindsight()
    bank_id = bank_id_for(customer_id)
    recall_q = build_recall_query(user_msg)
    recalled = hs.recall(bank_id, recall_q, budget="mid")

    # inject recalled facts as system context
    mem_block = "\n".join(f"- {r['text']}" for r in recalled)
    messages = []
    if mem_block:
        messages.append({"role": "system", "content": f"Relevant memories:\n{mem_block}"})
    messages.append({"role": "user", "content": user_msg})

    answer = llm.chat(messages)

    facts = llm.extract_facts(user_msg)  # durable facts only
    ops = []
    for f in facts:
        if hs.retain(bank_id, f, context=user_msg):
            ops.append(f)
    return {"answer": answer, "evidence": recalled, "hindsight_ops": ops}
```

`build_recall_query` is a deliberate heuristic, not a vector dump. When the user asks "What do you recommend?", the recall query expands to `requirements budget preferences objections decision makers timeline rejected options` — exactly the signals a rep needs to draft a proposal. When they talk about deployment, it recalls `deployment requirements privacy concerns rejected options`. Generic passthrough queries caused Hindsight to return the wrong facts. Structured queries fixed it.

Every turn returns `evidence` — the actual recalled texts plus relevance scores. The frontend renders that as `✦ Recalled 4 memories` with a clickable list and a `Why this recommendation?` panel. That panel closes the loop for the human in the room.

### Graceful degradation without faking memory

Hindsight runs as `ghcr.io/vectorize-io/hindsight:latest` on `localhost:8888` with a locally embedded pg0 store, or against the managed API. The backend checks health on startup and on every `GET /api/health`:

```python
# backend/app/main.py
@app.get("/api/health")
def health():
    hs = get_hindsight()
    return {
        "hindsight": "connected" if hs.available else "mock/unavailable",
        "hindsight_url": settings.hindsight_api_url,
        "llm_model": settings.llm_model,
    }
```

When Hindsight is unavailable — Docker not running, network down, or an API limit — the service never pretends memory was saved. `available` flips to `False` and all retains go to an in-memory mock keyed by the same `bank_id`. The trace still shows `RECALL → LLM → RETAIN`, but `source` is `mock`, not `hindsight`. That honesty mattered: I would rather show degradation than lie about durable storage.

A real failure I hit during development proved the concept. Switching to `openai/gpt-oss-120b` on Groq worked for the chat LLM, but the Hindsight container's internal fact extraction used `service_tier: auto` — a tier my free Groq org does not support. Retains started failing with `service_tier auto is not available for this org` and flipping to `500`. The agent kept answering, but `Settings → Hindsight` correctly showed `mock/unavailable` instead of green. The pipeline proved itself under failure — the kind of thing you discover only because memory is in the critical path, not an afterthought.

## What changes when memory works

Here is the same prospect, Acme Manufacturing, across five interactions. Acme has a ₹10 lakh budget, requires on-premise deployment, the CTO owns the technical decision and is worried about data privacy, and they previously rejected a cloud-only offer.

**Without memory (history-in-prompt baseline):**

> **Rep:** What do you recommend for Acme?
> **Agent:** I don't have budget or deployment constraints for Acme. What is your budget? Do you prefer cloud or on-premise?

**With Hindsight after four retains:**

Setup — each of these created a retain in `dealmind-acme-corp`:
1. "Our budget is ₹10 lakh." → `Acme Manufacturing has a ₹10 lakh budget.`
2. "We require on-premise deployment because of internal privacy requirements." → `Acme requires on-premise deployment because of internal privacy requirements.`
3. "The CTO is the primary technical decision maker and is concerned about data privacy." → `The CTO is the primary technical decision maker and is concerned about data privacy.`
4. "We previously rejected a cloud-only deployment." → `Acme previously rejected a cloud-only deployment.`

Then the turning point:

> **Rep:** What do you recommend for Acme?
> **Agent:** Based on Acme's ₹10 lakh budget and on-premise requirement, I recommend our Enterprise AI Platform with an on-premise deployment and privacy controls to address the CTO's data privacy concern — since Acme previously rejected a cloud-only approach, this proposal also respects that constraint. Would you like a technical demo scheduled for the CTO?

The response referenced four facts the rep never repeated. The frontend's `✦ Recalled 4` indicator expands to the bank contents, and `Why this recommendation?` lists each fact with its relevance score. That trace is what convinced a sales manager who watched the demo that memory was not a feature toggle — it was the product.

The deal intelligence view goes one step further. `GET /api/deal-intelligence/{deal_id}` calls `hs.reflect(bank_id, "buying signals, objections, decision makers, and recommended next steps")` — a synthesis pass over all memories for that deal — and returns a next-steps summary with the recalled evidence attached. A rep opens the deal, sees "CTO needs technical demo, privacy is the blocker, budget confirmed", and knows what to do before the call.

## What I would do again, and what I would not

**Isolate on day one.** If you build agent memory without per-tenant isolation, you build a bug factory. A deterministic `bank_id_for()` and `create_bank` with a mission is five minutes of work that prevents a class of data-leakage failures that are hard to catch in testing and catastrophic in production.

**Make missions concrete, not aspirational.** "Remember important things" performs poorly. "Extract budget, deployment requirements, privacy concerns, decision makers, objections, rejected options. Ignore greetings." performs well. The difference shows up as fewer false retains and cleaner recall.

**Recall with intent, not raw user text.** Expanding "What do you recommend?" into a multi-signal Hindsight query was the single biggest quality improvement beyond isolation. Spend time on `build_recall_query` — it is your retrieval policy.

**Treat health as product.** `GET /api/health` reporting `hindsight: connected` versus `mock/unavailable` and the `source` field on evidence (`hindsight` vs `mock`) prevented silent failures from becoming false confidence. If you cannot tell whether memory is durable, you do not have memory.

**Expect provider paper cuts.** Managed memory services and inference providers do not always agree on billing tiers, service tiers, or default models. Running Hindsight with Groq on the free tier taught me to pin the internal model, handle `service_tier` mismatches, and never fake a successful retain. Test the full retain → recall loop end-to-end against your actual provider credentials, not just the chat endpoint.

DealMind started as a chatbot with a sales prompt. It became useful when it stopped forgetting. The shift was not a bigger model or a longer context window — it was a memory layer with boundaries, missions, and an evidence chain that a human could audit. Using [Hindsight](https://github.com/vectorize-io/hindsight) for that layer meant I wrote business logic, not infrastructure. The docs at [hindsight.vectorize.io](https://hindsight.vectorize.io/) cover banks, missions, and the retain/recall/reflect contract — the rest is deciding what your agent should remember about the people it serves.
