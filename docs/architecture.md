# Architecture

```
React (Vite+TS+Tailwind) —REST/SSE→ FastAPI —→ Agent Loop —→ LLM (Groq/OpenAI-compat)
                                      ├─→ PostgreSQL (customers/deals/conversations)
                                      └─→ Hindsight (retain/recall/reflect per bank)
```

- **Agent loop**: `user msg → recall query → Hindsight recall → context → LLM → extract facts → Hindsight retain → PG events → response + evidence`
- **Bank isolation**: `dealmind-{customer_id}` deterministic, same customer → same bank.
- **Mission**: sales extraction (budget, deployment, privacy, decision makers, objections, timeline, rejected options).
- **Fallback**: mock store when Hindsight at localhost:8888 unavailable; never fake `Memory saved`.

## Health
`GET /api/health` reports real connectivity for DB/Hindsight/LLM. Frontend Settings shows these.
