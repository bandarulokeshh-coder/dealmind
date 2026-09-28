import { useEffect, useState } from "react"
import { get } from "../services/api"

export default function Deals(){
  const [rows,setRows]=useState<any[]>([])
  const [intel,setIntel]=useState<any>(null)
  useEffect(()=>{ get<any[]>("/api/deals").then(setRows) },[])
  const openIntel=async(id:string)=>{ setIntel(await get(`/api/deal-intelligence/${id}`)) }
  return (
    <div className="p-6 md:p-8 space-y-6">
      <h1 className="text-2xl font-semibold">Deals</h1>
      <div className="grid md:grid-cols-2 gap-4">
        {rows.map(d=>(
          <div key={d.id} className="card p-4">
            <div className="font-medium">{d.title}</div>
            <div className="text-sm text-zinc-400">Value ₹{(d.value/100000).toFixed(1)}L · {d.stage} · {d.probability}%</div>
            <button onClick={()=>openIntel(d.id)} className="btn-ghost text-xs mt-3">Deal Intelligence</button>
          </div>
        ))}
        {!rows.length && <div className="text-sm text-zinc-500">No deals yet — seed demo data from Dashboard.</div>}
      </div>
      {intel && (
        <div className="card p-5 space-y-3">
          <h3 className="font-medium">Deal Intelligence — {intel.deal.title}</h3>
          <div className="text-sm text-zinc-300 whitespace-pre-wrap">{intel.synthesis}</div>
          <div className="text-xs font-medium mt-2">Evidence</div>
          {intel.evidence?.map((e:any,i:number)=><div key={i} className="text-xs text-zinc-400 border border-white/5 rounded-lg p-2">{e.text}</div>)}
          <details className="text-xs"><summary className="cursor-pointer text-violet-400">Why this recommendation?</summary><div className="mt-2 text-zinc-300">Used memories above → context → reasoning → recommendation. DealMind recalls relevant facts and synthesizes next steps.</div></details>
        </div>
      )}
    </div>
  )
}
