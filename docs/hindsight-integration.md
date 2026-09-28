# Hindsight Integration

Client: `hindsight-client 0.10.1` (`from hindsight_client import Hindsight`).

## When do we retain?
After LLM response, `LLMService.extract_facts()` extracts durable facts (budget/requirements/objections/decision makers/timeline). Each fact is `HindsightService.retain(bank_id, fact)` with sensitive/transient filtering. Logs `RETAIN` MemoryEvent.

## When do we recall?
Before LLM, `build_recall_query()` generates a query from user message + `HindsightService.recall(bank_id, query, budget="mid")`. Recalled texts are injected as system context. Logs `RECALL` event. Shown in UI as `✦ Recalled N memories`.

## When do we reflect?
`GET /api/deal-intelligence/{deal_id}` calls `hs.reflect(bank_id, "buying signals, objections, decision makers, recommended next steps")` for synthesis. Also available in chat for high-level synthesis (not on every message).

## Why per-customer bank?
`bank_id_for(cid) = dealmind-{cid}` ensures isolation — Acme memories never leak to Nova. `ensure_bank()` creates/updates bank with `retain_mission`/`reflect_mission`.

## How memory affects answer
Recalled texts → system message `Relevant memories: ...` → LLM prompt → personalized answer. Evidence array returned to frontend for “Why this recommendation?” chain.

## Code
- `backend/app/hindsight/service.py` — HindsightService (real + mock fallback, filtering)
- `backend/app/agents/deal_agent.py` — run_agent()
- `backend/app/main.py` — chat + deal-intelligence endpoints
