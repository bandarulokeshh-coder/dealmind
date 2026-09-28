# API

- `GET /api/health`
- `GET /api/dashboard` → active_deals, total_pipeline, customers, interactions, memories_learned, recent_deals, recent_events
- `GET /api/customers` / `POST /api/customers` / `GET /api/customers/{id}` / `GET /api/customers/{id}/memory` / `GET /api/customers/{id}/timeline` / `GET /api/customers/{id}/deals`
- `GET /api/deals` / `POST /api/deals` / `GET /api/deal-intelligence/{deal_id}` (reflect)
- `GET /api/conversations/{customer_id}` / `GET /api/memory/events/{customer_id}`
- `POST /api/chat` → {answer, memory:{recalled, recalled_count, retained_count}, evidence, hindsight_ops}
- `POST /api/demo/seed` / `POST /api/demo/reset`
- `POST /api/memory/forget/{customer_id}` / `GET /api/memory/export/{customer_id}`
