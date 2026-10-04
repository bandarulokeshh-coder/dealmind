# DealMind — AI Sales Agent That Learns From Every Customer Interaction

> **Retention → Recall → Reasoning → Better Response**
> The longer you work with DealMind, the better it understands the deal.

## Problem
Traditional AI sales assistants treat every conversation as a new conversation. They forget budget, deployment requirements, objections, and decision makers — forcing customers to repeat themselves.

## Solution
DealMind is a B2B deal intelligence agent with **persistent customer memory** powered by [Vectorize Hindsight](https://github.com/vectorize-io/hindsight). It retains durable facts, recalls them when relevant, and uses them to produce increasingly personalized recommendations — visibly.

## Why Hindsight
- `retain` — durable facts (budget, requirements, objections, decision makers, timeline, rejected options)
- `recall` — semantic recall before every LLM response
- `reflect` — synthesis for deal intelligence (buying signals, next steps)
- Isolated per customer: `dealmind-{customer_id}` with sales mission steering extraction
- PostgreSQL ≠ memory: PG stores business records, Hindsight stores long-term agent memory
- Graceful fallback: mock store when Hindsight unavailable (never fake `Memory saved`)

## Architecture
```
React (Vite+TS+Tailwind) → FastAPI → Agent Loop → LLM (Groq/OpenAI-compat)
                                  → PostgreSQL (customers/deals/conversations)
                                  → Hindsight (retain/recall/reflect)
```
Agent loop: `user msg → recall query → Hindsight recall → build context → LLM → extract facts → Hindsight retain → PG events → response + evidence`

## Features
- Dashboard (pipeline, learning activity chart, recent memory events)
- Customers & Deals CRUD
- Chat with `✦ Recalled N memories` + `✦ Learned N facts` + evidence panel
- Customer Memory (categorized), Memory Timeline, Hindsight Activity trace
- Deal Intelligence + “Why this recommendation?” evidence chain
- Learning Demo: Before vs After split-screen + 5-step Acme simulation
- Memory controls: View / Forget / Export / Edit individual memories

## Tech Stack
Frontend: React 18, TypeScript, Vite, Tailwind, Recharts, lucide-react, react-router-dom
Backend: Python 3.12, FastAPI, SQLAlchemy, Pydantic, OpenAI SDK (Groq), hindsight-client 0.10.1
Infra: Docker Compose (Postgres + optional Hindsight), SQLite fallback for zero-config

## Setup
```bash
git clone https://github.com/bandarulokeshh-coder/dealmind.git && cd dealmind
cp .env.example .env
# edit .env — add LLM_API_KEY (Groq) and HINDSIGHT_API_KEY if using cloud
pip install -r backend/requirements.txt
cd frontend && npm install && cd ..
```

## Environment Variables
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/dealmind  # or sqlite:///./dealmind.db
LLM_BASE_URL=https://api.groq.com/openai/v1
LLM_API_KEY=gsk_...
LLM_MODEL=llama-3.3-70b-versatile
HINDSIGHT_API_URL=http://localhost:8888
HINDSIGHT_API_KEY=
HINDSIGHT_BANK_ID=dealmind-demo
CORS_ORIGINS=http://localhost:5173
```

## Running Locally
```bash
# Backend (from dealmind/)
uvicorn backend.app.main:app --reload --port 8000
# Frontend (new terminal)
cd frontend && npm run dev
# Docker (optional — Postgres + Hindsight)
docker compose up -d
```

## Demo Walkthrough (Acme — ₹10L Enterprise AI Platform)
1. Dashboard → **Load Demo Customer** (seeds Acme + 6 Hindsight memories)
2. Chat (select Acme) → send:
   - “Our budget is ₹10 lakh.” → retain
   - “We require on-premise deployment.” → retain
   - “Our CTO is concerned about data privacy.” → retain
   - “We don't want cloud-only.” → retain
   - “What do you recommend?” → recall ₹10L + on-premise + privacy + CTO → personalized proposal
3. Memory → categorized memories + timeline accumulation
4. Learning Demo → **Run Demo** → split-screen Before vs After
5. Deals → **Deal Intelligence** → synthesis + “Why this recommendation?”
6. Settings → health checks (never shows secrets)

## Testing
```bash
cd backend && python test_backend.py
# checks: health, seed, chat→recall→retain, memory, dashboard
```

## Security / Privacy
- No secrets to frontend; `.env` never committed
- Sensitive-data filtering before retain (API keys, passwords, card-like numbers)
- Transient small talk not retained

## Future Scope
- Real Hindsight cloud + auth, per-deal banks, reflection caching, webhook ingestion


## Deployment (single Live URL)

The deployed app is **one service**: FastAPI serves the API at `/api/*` and the built React
app at `/*`, so there is one public URL and no CORS configuration to maintain.

**Render (Blueprint — recommended)**

1. Push this repo to GitHub.
2. Render Dashboard → **New → Blueprint** → select the repo → **Apply**. `render.yaml`
   installs the Python + Node dependencies, builds the UI, and starts uvicorn.
3. When prompted, paste the two `sync: false` secrets (they never live in git):
   - `LLM_API_KEY` — Groq key (`gsk_...`)
   - `HINDSIGHT_API_KEY` — Hindsight Cloud key (`hsk_...`)
4. Confirm `GET /api/health` returns `{"database":"connected","hindsight":"connected","llm":"connected"}`.
   That URL is the Live Demo.

Free-plan notes: the service sleeps after ~15 minutes idle (first request takes ~30-50s), and
SQLite storage resets on each deploy — re-seed with **Load Demo Customer** on the Dashboard,
or point `DATABASE_URL` at a Render Postgres URL for persistence.

**Deploying the UI separately (Vercel/Netlify)**

Build with `VITE_API_URL` set to the backend origin (e.g. `https://dealmind.onrender.com`) and
add that frontend origin to the backend's `CORS_ORIGINS`.

**Tunnel (no deploy — keeps your local DB/memory)**

`./start-live.ps1` builds the UI and serves it from FastAPI on `http://localhost:8001`; expose
it with `cloudflared tunnel --url http://localhost:8001` for a temporary public URL.

## Links
- GitHub: https://github.com/bandarulokeshh-coder/dealmind
- Live Demo: (add your Render URL after the Blueprint deploy — see [Deployment](#deployment-single-live-url))
- Article: article.md
- Social: SOCIAL_POST.md
- Video Script: VIDEO_SCRIPT.md
