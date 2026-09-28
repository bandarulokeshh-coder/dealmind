import { useEffect, useState } from "react"
import { get, post } from "../services/api"

type Msg = { role:string, message:string }
export default function Chat(){
  const [customers,setCustomers]=useState<any[]>([])
  const [cid,setCid]=useState("")
  const [msgs,setMsgs]=useState<Msg[]>([])
  const [input,setInput]=useState("")
  const [lastMeta,setLastMeta]=useState<any>(null)
  const [showEv,setShowEv]=useState(false)

  useEffect(()=>{ get<any[]>("/api/customers").then(rows=>{ setCustomers(rows); if(rows[0]) setCid(rows[0].id) }) },[])
  useEffect(()=>{ if(cid) get<any[]>(`/api/conversations/${cid}`).then(setMsgs) },[cid])

  const send=async()=>{
    if(!input.trim()||!cid) return
    const text=input; setInput("")
    setMsgs(m=>[...m,{role:"user",message:text}])
    const res:any = await post("/api/chat",{customer_id:cid, message:text})
    setMsgs(m=>[...m,{role:"assistant",message:res.answer}])
    setLastMeta(res)
  }

  const quick = ["Our budget is ₹10 lakh.","We require on-premise deployment.","Our CTO is concerned about data privacy.","We don't want cloud-only.","What do you recommend for us?"]

  return (
    <div className="h-[calc(100vh-0px)] flex flex-col">
      <div className="px-6 py-4 border-b border-white/5 flex items-center gap-3">
        <select value={cid} onChange={e=>setCid(e.target.value)} className="bg-[#12121e] border border-white/10 rounded-xl px-3 py-2 text-sm">
          {customers.map(c=><option key={c.id} value={c.id}>{c.company} — {c.name}</option>)}
        </select>
        <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">● Memory Connected</span>
        {!customers.length && <span className="text-xs text-zinc-500">Seed demo data from Dashboard first.</span>}
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-3">
        {msgs.map((m,i)=>(
          <div key={i} className={`max-w-[720px] ${m.role==="user"?"ml-auto":""}`}>
            <div className={`rounded-2xl px-4 py-3 text-sm ${m.role==="user"?"bg-violet-600 text-white":"bg-[#12121e] border border-white/5 text-zinc-200"}`}>{m.message}</div>
          </div>
        ))}
        {lastMeta && (
          <div className="max-w-[720px] space-y-2">
            <button onClick={()=>setShowEv(!showEv)} className="text-xs text-violet-300">✦ Recalled {lastMeta.memory.recalled_count} relevant memories {lastMeta.memory.hindsight_available?"(Hindsight)":"(mock)"} — {showEv?"hide":"show"}</button>
            {showEv && <div className="space-y-1">{lastMeta.evidence?.map((e:any,i:number)=><div key={i} className="text-xs bg-white/5 border border-white/5 rounded-xl p-2">{e.text} <span className="text-zinc-500">· {Math.round(e.relevance*100)}%</span></div>)}</div>}
            <div className="text-xs text-emerald-300">✦ Learned {lastMeta.memory.retained_count} new customer facts</div>
            <div className="text-[11px] text-zinc-500">Hindsight ops: {lastMeta.hindsight_ops?.map((o:any)=>`${o.operation}(${o.count})`).join(" → ")}</div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-white/5 space-y-3">
        <div className="flex flex-wrap gap-2">
          {quick.map(q=><button key={q} onClick={()=>setInput(q)} className="text-xs px-2 py-1 rounded-full bg-white/5 border border-white/10 hover:bg-white/10">{q}</button>)}
        </div>
        <div className="flex gap-2">
          <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Type a message…" className="flex-1 bg-[#12121e] border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-500"/>
          <button onClick={send} className="btn px-6">Send</button>
        </div>
      </div>
    </div>
  )
}
