import { useEffect, useState } from "react"
import { get, post } from "../services/api"

function catOf(t: string){
  const l=t.toLowerCase()
  if(l.includes("budget")||l.includes("₹")||l.includes("lakh")) return "Budget"
  if(l.includes("on-prem")||l.includes("deploy")) return "Requirements"
  if(l.includes("privacy")||l.includes("concern")||l.includes("worried")) return "Concerns"
  if(l.includes("cto")||l.includes("decision")) return "Decision Makers"
  if(l.includes("reject")||l.includes("don't want")||l.includes("cloud-only")) return "Previous Decisions"
  if(l.includes("timeline")||l.includes("days")) return "Timeline"
  return "Preferences"
}

export default function Memory(){
  const [customers,setCustomers]=useState<any[]>([])
  const [cid,setCid]=useState("")
  const [mems,setMems]=useState<any[]>([])
  const [timeline,setTimeline]=useState<any[]>([])
  const [health,setHealth]=useState<any>(null)

  useEffect(()=>{ get<any[]>("/api/customers").then(r=>{ setCustomers(r); if(r[0]) setCid(r[0].id)}); get("/api/health").then(setHealth)},[])
  const load=()=>{
    if(!cid) return
    get<any>(`/api/customers/${cid}/memory`).then((d:any)=>setMems(d.memories||[]))
    get<any[]>(`/api/customers/${cid}/timeline`).then(setTimeline)
  }
  useEffect(()=>{ load() },[cid])

  const forget=async()=>{ await post(`/api/memory/forget/${cid}`,{}); load() }

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold">Customer Memory</h1>
        <select value={cid} onChange={e=>setCid(e.target.value)} className="bg-[#12121e] border border-white/10 rounded-xl px-3 py-2 text-sm">
          {customers.map(c=><option key={c.id} value={c.id}>{c.company}</option>)}
        </select>
        <span className="text-xs text-zinc-500">Hindsight: {health?.hindsight}</span>
      </div>

      <div className="flex gap-2">
        <button onClick={load} className="btn-ghost text-xs">View Memory</button>
        <button onClick={forget} className="btn-ghost text-xs">Forget Customer Memory</button>
        <button onClick={async()=>{ const d:any=await get(`/api/memory/export/${cid}`); const blob=new Blob([JSON.stringify(d,null,2)],{type:"application/json"}); const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download="memory.json"; a.click()}} className="btn-ghost text-xs">Export Memory</button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          <div className="text-sm font-medium">What DealMind remembers</div>
          <div className="grid gap-2">
            {mems.map((m,i)=>(
              <div key={i} className="card p-3">
                <div className="text-xs px-2 py-1 rounded-full bg-violet-600/20 text-violet-300 inline-block">{catOf(m.text)}</div>
                <div className="text-sm mt-2">{m.text}</div>
                <div className="text-[11px] text-zinc-500 mt-1">{m.source} · {Math.round((m.relevance||0)*100)}% relevance</div>
              </div>
            ))}
            {!mems.length && <div className="text-sm text-zinc-500">No memories yet — chat to teach DealMind.</div>}
          </div>
        </div>
        <div className="space-y-4">
          <div className="card p-4">
            <div className="text-sm font-medium mb-3">Memory Timeline</div>
            <div className="space-y-3">
              {timeline.map((e:any)=>(
                <div key={e.id} className="flex gap-3">
                  <div className="w-2 h-2 rounded-full bg-violet-500 mt-1 shrink-0"/>
                  <div><div className="text-xs font-medium">{e.operation}</div><div className="text-xs text-zinc-400">{e.summary}</div><div className="text-[11px] text-zinc-500">{new Date(e.created_at).toLocaleString()}</div></div>
                </div>
              ))}
              {!timeline.length && <div className="text-xs text-zinc-500">Timeline empty.</div>}
            </div>
          </div>
          <div className="card p-4">
            <div className="text-sm font-medium mb-2">Hindsight Activity</div>
            <div className="text-xs text-zinc-400 space-y-1">
              <div>RECALL → LLM → RETAIN</div>
              <div>Each chat: recall relevant memories → generate response → retain durable facts.</div>
              <div className="text-zinc-500">PostgreSQL = business records · Hindsight = long-term memory</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
