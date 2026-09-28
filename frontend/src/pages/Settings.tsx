import { useEffect, useState } from "react"
import { get } from "../services/api"

export default function Settings(){
  const [h,setH]=useState<any>(null)
  useEffect(()=>{ get("/api/health").then(setH) },[])
  const dot=(ok:boolean)=> <span className={`inline-block w-2 h-2 rounded-full ${ok?"bg-emerald-500":"bg-amber-500"}`}/>
  return (
    <div className="p-6 md:p-8 space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <div className="grid md:grid-cols-3 gap-4">
        <div className="card p-4"><div className="text-sm font-medium flex items-center gap-2">{dot(h?.hindsight!=="mock/unavailable")} Hindsight</div><div className="text-xs text-zinc-500 mt-1">{h?.hindsight} · {h?.hindsight_url}</div></div>
        <div className="card p-4"><div className="text-sm font-medium flex items-center gap-2">{dot(h?.llm!=="mock/unavailable")} LLM</div><div className="text-xs text-zinc-500 mt-1">{h?.llm} · {h?.llm_model}</div></div>
        <div className="card p-4"><div className="text-sm font-medium flex items-center gap-2">{dot(h?.database==="connected")} Database</div><div className="text-xs text-zinc-500 mt-1">{h?.database}</div></div>
      </div>
      <div className="card p-4 space-y-2">
        <div className="text-sm font-medium">Architecture</div>
        <pre className="text-xs text-zinc-400">Customer → DealMind Agent → Hindsight Recall → Relevant Memories → LLM → Personalized Response → Hindsight Retain
PostgreSQL = application/business data
Hindsight  = agent long-term memory (retain/recall/reflect per customer bank)</pre>
      </div>
      <div className="text-xs text-zinc-500">Secrets are never exposed to frontend. Configure via .env: LLM_API_KEY, HINDSIGHT_API_KEY, DATABASE_URL.</div>
    </div>
  )
}
