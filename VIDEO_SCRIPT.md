# DealMind — Demo Video Script (2:30, 60-sec value in first 60s)

> HackwithHyderabad 3.0 — AI Agents That Learn Using Hindsight
> Goal: story → problem → solution → live demo → learning curve → close. Keep scope tight: one persona (sales rep), one workflow (deal intelligence).

---

## Cold open (0:00-0:10) — Hook
**[Screen: Chat - "What's your budget? What's your deployment preference?" repeated]**
> "My sales agent asked the same prospect for their budget three times. On the fourth call, the prospect ghosted. Conversation history is not memory."

## Problem (0:10-0:25)
**[Screen: title card "Retention → Recall → Reasoning → Better Response"]**
> "DealMind is a B2B deal intelligence agent that remembers every objection, budget, deployment constraint, and decision maker across a deal cycle — so the rep never has to."

## Architecture in 15 seconds (0:25-0:40)
**[Screen: docs/architecture.md diagram]**
> "React → FastAPI → Agent Loop → Groq gpt-oss-120b → Postgres for business records, Vectorize Hindsight for long-term memory. Per-customer banks: `dealmind-{customer_id}`. Recall before reasoning, evidence chain after."

## Live Demo — The 5-step Acme story (0:40-1:50) — THE CORE
**Setup:** Dashboard → click **Load Demo Customer** → toast "Acme Manufacturing — ₹10L Enterprise AI Platform — 6 memories seeded" → show chart + Recent Memory Events.

**Chat (Acme selected) — type each, show ✦ indicators:**
1. Type "Our budget is ₹10 lakh." → send → show `✦ Learned 1` + trace `RETAIN`
2. "We require on-premise deployment." → `✦ Learned 1`
3. "Our CTO is concerned about data privacy." → `✦ Learned 1`
4. "We don't want cloud-only." → `✦ Learned 1`
5. **"What do you recommend for Acme?"** → show `✦ Recalled 4 memories` expanded (list 4 facts with relevance scores) → response: on-premise Enterprise AI Platform with privacy controls for CTO, respecting ₹10L budget + rejected cloud + offer to schedule CTO demo. Show `Why this recommendation?` panel.

**Memory page:** categorized memories (Budget / Requirements / Decision Makers / Concerns) + Timeline accumulation.

**Learning Demo page:** click **Run Demo** → show automated 5-step loop → split-screen **Before (generic: "What's your budget?") vs After (personalized)**. Narrate: "Same prompt. Different agent. Because it remembered."

**Deals → Deal Intelligence:** open Enterprise AI Platform → show `reflect` synthesis: "CTO needs technical demo, privacy is blocker, budget confirmed, next step: schedule demo" + evidence attached.

## Why Hindsight, not just history (1:50-2:10)
**[Screen: Settings → health = connected + hindsight-integration.md]**
> "retain / recall / reflect per bank, retain_mission steers extraction, sensitive filtering drops sk-*, card numbers, transient 'hi' dropped, health endpoint reports `connected` vs `mock/unavailable` — never fake Memory Saved. Isolation `dealmind-{id}` prevents Acme leaking to Nova."

## Close + CTA (2:10-2:30)
**[Screen: Repo + Live Demo URLs]**
> "DealMind started as a chatbot with a sales prompt. It became useful when it stopped forgetting. Repo, live demo, and article linked below. #HackwithHyderabad #Hindsight"

---

## Recording Checklist
- [ ] Resolution 1920x1080, 30s-2:30 total (aim 2:00)
- [ ] Mic on, captions on
- [ ] Backend `GET /api/health` shows `hindsight: connected` before recording (or show mock fallback honestly)
- [ ] Clear `.log` files not in frame; use clean browser profile
- [ ] Export 1080p mp4, upload to YouTube unlisted, link in submission + README

## B-roll to capture (if time)
- `backend/app/hindsight/service.py` → `bank_id_for` + `SALES_MISSION`
- `backend/app/agents/deal_agent.py` → `build_recall_query` + recall→LLM→retain flow
- Hindsight cloud dashboard (if using `https://api.hindsight.vectorize.io`) or `docker compose ps` for local

## YouTube Description Template
```
DealMind — AI Sales Agent That Learns (HackwithHyderabad 3.0)

Retention → Recall → Reasoning → Better Response

An agent with per-customer Hindsight memory banks that remembers budget, deployment, objections, and decision makers — and visibly improves: Before (generic) → After (personalized).

Stack: React + FastAPI + Groq gpt-oss-120b + Vectorize Hindsight (retain/recall/reflect) + Postgres

Links:
- Live Demo: (url)
- GitHub: (url)
- Article: article.md / Hashnode/Medium link
- Hindsight: https://hindsight.vectorize.io | https://github.com/vectorize-io/hindsight

#HackwithHyderabad #Hindsight #AIAgents #Vectorize
```
