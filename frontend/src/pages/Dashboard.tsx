import { useEffect, useState } from "react"
import { get, post } from "../services/api"
import { Building2, IndianRupee, MessageSquare, Brain, Plus } from "lucide-react"
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts"

export default function Dashboard(){
  const [data,setData]=useState<any>(null)
  const [loading,setLoading]=useState(true)
  useEffect(()=>{ get("/api/dashboard").then(setData).finally(()=>setLoading(false)) },[])
  if(loading) return <div className="p-8 text-zinc-500">Loading…</div>
  if(!data) return <div className="p-8">No data</div>
  const cards = [
    {label:"Active Deals", value: data.active_deals, icon: Building2},
    {label:"Total Pipeline (₹)", value: `₹${(data.total_pipeline/100000).toFixed(1)}L`, icon: IndianRupee},
    {label:"Customers", value: data.customers, icon: Building2},
    {label:"Interactions", value: data.interactions, icon: MessageSquare},
    {label:"Memories Learned", value: data.memories_learned, icon: Brain},
  ]
  const chartData = [{name:"Mon",v:3},{name:"Tue",v:7},{name:"Wed",v:5},{name:"Thu",v:12},{name:"Fri",v:9},{name:"Sat",v:14},{name:"Sun",v: data.interactions || 6}]
  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-semibold">Dashboard</h1><p className="text-sm text-zinc-500">The longer you work with DealMind, the better it understands the deal.</p></div>
        <button onClick={async()=>{ await post("/api/demo/seed",{}); location.reload() }} className="btn flex items-center gap-2"><Plus size={16}/> Load Demo Customer</button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {cards.map(c=>(
          <div key={c.label} className="card p-4">
            <div className="text-[11px] tracking-widest text-zinc-500 flex items-center gap-1"><c.icon size={12}/>{c.label}</div>
            <div className="text-xl font-semibold mt-2">{c.value}</div>
          </div>
        ))}
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="card p-4 lg:col-span-2">
          <div className="text-sm font-medium mb-2">Learning Activity</div>
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}><XAxis dataKey="name" stroke="#555"/><YAxis stroke="#555"/><Tooltip/><Area dataKey="v" stroke="#7c3aed" fill="#7c3aed33"/></AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card p-4 space-y-3">
          <div className="text-sm font-medium">Recent Memory Events</div>
          {data.recent_events?.length ? data.recent_events.map((e:any)=>(
            <div key={e.id} className="text-xs border-b border-white/5 pb-2">
              <span className="px-1.5 py-0.5 rounded bg-violet-600/20 text-violet-300 text-[10px]">{e.operation}</span>
              <div className="text-zinc-300 mt-1 line-clamp-2">{e.summary}</div>
              <div className="text-zinc-500">{new Date(e.created_at).toLocaleString()}</div>
            </div>
          )) : <div className="text-xs text-zinc-500">No events yet — chat to generate memories.</div>}
        </div>
      </div>
      <div className="card p-4">
        <div className="text-sm font-medium mb-3">Recent Deals</div>
        <div className="space-y-2">
          {data.recent_deals?.map((d:any)=>(
            <div key={d.id} className="flex items-center justify-between py-2 border-b border-white/5 text-sm">
              <div>{d.title} <span className="text-zinc-500">· {d.stage}</span></div><div className="font-medium">₹{(d.value/100000).toFixed(1)}L</div>
            </div>
          ))}
          {!data.recent_deals?.length && <div className="text-sm text-zinc-500">No deals yet.</div>}
        </div>
      </div>
    </div>
  )
}
