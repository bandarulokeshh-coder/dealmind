# Demo

1. Dashboard → **Load Demo Customer** (POST /api/demo/seed → Acme ₹10L + 6 memories).
2. Chat (Acme) → sequential:
   - “Our budget is ₹10 lakh.” → retain budget
   - “We require on-premise deployment.” → retain deployment
   - “Our CTO is concerned about data privacy.” → retain CTO+privacy
   - “We don't want cloud-only.” → retain rejected option
   - “What do you recommend?” → recall all → personalized on-premise proposal with privacy controls.
3. Memory → categorized memories + timeline.
4. Learning Demo → **Run Demo** → Before (generic) vs After (personalized) split-screen + “Why this recommendation?” evidence.
5. Deals → **Deal Intelligence** → reflect synthesis.

See `frontend/src/pages/LearningDemo.tsx` for automated 5-step simulation (POST /api/chat loop).
