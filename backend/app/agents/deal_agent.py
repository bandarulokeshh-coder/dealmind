from ..services.llm import SYSTEM_PROMPT
from ..hindsight.service import get_hindsight, bank_id_for
from typing import List, Dict

def build_recall_query(user_msg: str) -> str:
    # Generate a recall query focused on relevant memories for this request
    # Simple heuristic: expand current message into memory-search terms
    low = user_msg.lower()
    if "recommend" in low or "suggest" in low or "plan" in low:
        return f"Customer requirements, budget, preferences, deployment needs, objections, decision makers related to: {user_msg}"
    if "budget" in low or "price" in low:
        return f"Customer budget and pricing constraints: {user_msg}"
    if "deploy" in low or "privacy" in low or "on-prem" in low:
        return f"Customer deployment preferences and privacy concerns: {user_msg}"
    return f"Customer facts relevant to: {user_msg}"

def run_agent(customer_id: str, user_msg: str, llm) -> Dict:
    hs = get_hindsight()
    bank_id = bank_id_for(customer_id)

    # 1. Recall
    query = build_recall_query(user_msg)
    recalled = hs.recall(bank_id, query)
    recall_count = len(recalled)

    # 2. Build context
    mem_block = ""
    if recalled:
        mem_block = "Relevant memories about this customer:\n" + "\n".join(f"- {m['text']}" for m in recalled[:6])
    else:
        mem_block = "No prior memories for this customer yet."

    messages = [
        {"role":"system","content": SYSTEM_PROMPT},
        {"role":"system","content": mem_block},
        {"role":"user","content": user_msg},
    ]

    # 3. LLM
    answer = llm.chat(messages)

    # 4. Extract & retain durable facts
    facts = llm.extract_facts(user_msg)
    retained = 0
    for f in facts:
        if hs.retain(bank_id, f, context=f"Customer {customer_id} said: {user_msg[:120]}"):
            retained += 1

    return {
        "answer": answer,
        "memory": {"recalled": recall_count>0, "recalled_count": recall_count, "retained_count": retained, "bank_id": bank_id, "hindsight_available": hs.available},
        "evidence": recalled,
        "hindsight_ops": [
            {"operation":"RECALL","query":query,"count":recall_count},
            {"operation":"RETAIN","count":retained, "facts": facts},
        ]
    }
