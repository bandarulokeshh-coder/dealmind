# DealMind — Social Media Posts

> Copy-paste ready for LinkedIn + X/Twitter. Part of HackwithHyderabad 3.0 content deliverables.

---

## LinkedIn Post

**My sales agent kept forgetting the prospect's budget. So I gave it a memory.**

We have all seen this: AI sales assistants that treat every conversation as the first conversation.

- "What's your budget?" — asked 3 times
- "On-premise or cloud?" — asked again
- The prospect stops replying.

I built **DealMind — an AI Sales Agent That Learns** for HackwithHyderabad 3.0.

**Retention → Recall → Reasoning → Better Response**

The trick is not a bigger model. It is a memory layer:

- **Per-customer isolation** — `dealmind-{customer_id}` bank per prospect. Acme's on-premise constraint never leaks to Nova.
- **Mission-steered extraction** — `retain_mission` keeps budget/deployment/objections/decision-makers/timeline, drops "hi" and "thanks"
- **Recall before reasoning** — every message expands to a Hindsight query (`requirements budget preferences objections decision makers timeline rejected options`) and injects memories as system context before the LLM call
- **Evidence chain** — UI shows `✦ Recalled 4 memories` + `Why this recommendation?` with relevance scores. Memory is visible, not magic.

**Before → After (Acme Manufacturing, ₹10L, on-premise, CTO = privacy decision maker, rejected cloud):**

- Without memory: "What's your budget? Cloud or on-premise?"
- With 4 Hindsight retains: "Based on your ₹10L budget and on-premise requirement, here's an Enterprise AI Platform with privacy controls for your CTO — respecting that you rejected cloud-only — plus a technical demo."

Same prompt. Different agent. Because it remembered.

Stack: React + FastAPI + Groq `openai/gpt-oss-120b` + **Vectorize Hindsight** (`retain`/`recall`/`reflect`) + Postgres (business records ≠ memory)

Demo: Dashboard → Load Demo Customer → Chat → Learning Demo split-screen → Deal Intelligence (reflect synthesis)

Repo: (link)
Live Demo: (link)
#HackwithHyderabad #Hindsight #AIAgents #Vectorize #BuildInPublic

---

## X / Twitter Thread (6 tweets)

**1/6** My sales agent kept asking the same prospect for their budget 3 times.

On the 4th call, the prospect ghosted.

So I stopped treating conversation history as memory and built an agent that actually learns.

**2/6** Introducing DealMind — AI Sales Agent That Learns 🧠

Retention → Recall → Reasoning → Better Response

Powered by Vectorize Hindsight: per-customer memory banks, mission-steered extraction, semantic recall before every LLM response.

**3/6** The hard lesson: isolation is the product.

One big memory store = Acme says "on-premise only", Nova says "cloud-native" → agent recommends on-premise to Nova.

Fix: `dealmind-{customer_id}` banks. Same prospect → same bank. Different prospect → never cross-contaminates.

**4/6** Recall before you reason.

"Recommend for Acme?" → expands to `requirements budget preferences objections decision makers timeline rejected options` → Hindsight recall → injected as system context → LLM → personalized on-premise proposal with CTO privacy controls.

Without memory? "What's your budget?"

**5/6** What makes it real:
- Sensitive filtering (sk-*, api keys, card numbers never retained)
- Transient filtering ("hi"/"thanks" dropped)
- `GET /api/health` shows `hindsight: connected` vs `mock/unavailable` — never fake Memory Saved
- Evidence chain with relevance scores

**6/6** Stack: React + FastAPI + Groq gpt-oss-120b + Hindsight retain/recall/reflect + Postgres

Try the 5-step Acme simulation: 4 facts retained → 5th message is personalized.

Repo + live demo: (links) 👇
#HackwithHyderabad #Hindsight #AIAgents

---

## Image / Video suggestion
Record 30s screen capture: Dashboard chart → Chat Acme 5 messages → Memory timeline → Learning Demo Before/After split → Deal Intelligence evidence. Captions: "Without memory: generic. With memory: personalized."
