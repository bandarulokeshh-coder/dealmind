import { useState } from "react"
import { post, get } from "../services/api"

const steps = [
  "Our budget is ₹10 lakh.",
  "We require on-premise deployment.",
  "Our CTO is concerned about data privacy.",
  "We don't want a cloud-only solution.",
  "What do you recommend for us?",
]

export default function LearningDemo(){
  const [log,setLog]=useState<string[]>([])
  const [cid,setCid]=useState("")
  const [running,setRunning]=useState(false)
  const [finalAns,setFinalAns]=useState("")
  const [evidence,setEvidence]=useState<any[]>([])

  const run=async()=>{
    setRunning(true); setLog([]); setFinalAns("")
    const seed:any = await post("/api/demo/seed",{})
    const id = seed.customer_id
    setCid(id)
    setLog(l=>[...l, `Seeded Acme demo customer ${id}`])
    // reset conversations for clean demo (keep seeded memories)
    // run sequential chats
    for(let i=0;i<steps.length;i++){
      const msg = steps[i]
      setLog(l=>[...l, `Interaction ${i+1}: "${msg}" →`])
      const res:any = await post("/api/chat",{customer_id:id, message: msg})
      setLog(l=>[...l, `  Recalled ${res.memory.recalled_count}, Retained ${res.memory.retained_count}`])
      if(i===steps.length-1){ setFinalAns(res.answer); setEvidence(res.evidence||[]) }
    }
    // also show memory timeline count
    const mem:any = await get(`/api/customers/${id}/memory`)
    setLog(l=>[...l, `Total memories: ${mem.memories?.length}`])
    setRunning(false)
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      <h1 className="text-2xl font-semibold">Learning Demo — Before vs After</h1>
      <p className="text-sm text-zinc-400">Shows how DealMind becomes more useful as it accumulates memory. Runs real Hindsight retain/recall (or mock fallback).</p>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card p-5 space-y-3">
          <div className="text-sm font-medium">WITHOUT HINDSIGHT (generic)</div>
          <div className="text-sm text-zinc-400">Customer: “Can you recommend a plan?”</div>
          <div className="text-sm bg-white/5 rounded-xl p-3">Sure. What is your budget? What are your requirements? What deployment model do you prefer?</div>
          <div className="text-xs text-zinc-500">Forgets everything — asks again every time.</div>
        </div>
        <div className="card p-5 space-y-3 border-violet-500/30">
          <div className="text-sm font-medium">DEALMIND + HINDSIGHT (personalized)</div>
          <div className="text-sm text-zinc-300 whitespace-pre-wrap">{finalAns || "Click “Run Demo” to see the personalized recommendation."}</div>
          {evidence.length>0 && (
            <details className="text-xs"><summary className="cursor-pointer text-violet-400">Why this recommendation?</summary>
              <div className="mt-2 space-y-1">{evidence.map((e:any,i:number)=><div key={i} className="bg-white/5 rounded-lg p-2">{e.text}</div>)}</div>
            </details>
          )}
        </div>
      </div>

      <button onClick={run} disabled={running} className="btn">{running?"Running…":"Run Demo"}</button>

      <div className="card p-4">
        <div className="text-sm font-medium mb-2">Demo Log</div>
        <pre className="text-xs text-zinc-400 whitespace-pre-wrap">{log.join("\n") || "Press Run Demo to start."}</pre>
      </div>

      <div className="text-xs text-zinc-500">
        Interaction 1 → 1 memory · Interaction 2 → 2 · Interaction 5 → personalized recommendation. Agent pipeline: Recall → Context → LLM → Retain.
      </div>
    </div>
  )
}
