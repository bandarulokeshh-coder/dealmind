import { useEffect, useState } from "react"
import { get, post } from "../services/api"
import { Link } from "react-router-dom"

export default function Customers(){
  const [rows,setRows]=useState<any[]>([])
  const [form,setForm]=useState({name:"",company:"",industry:"",email:""})
  const load=()=> get<any[]>("/api/customers").then(setRows)
  useEffect(()=>{load()},[])
  const create=async()=>{
    if(!form.name||!form.company) return alert("Name & company required")
    await post("/api/customers",{...form, deal_value: 0, deal_stage:"Lead"})
    setForm({name:"",company:"",industry:"",email:""}); load()
  }
  return (
    <div className="p-6 md:p-8 space-y-6">
      <h1 className="text-2xl font-semibold">Customers</h1>
      <div className="card p-4 flex flex-wrap gap-2 items-end">
        <input placeholder="Name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm"/>
        <input placeholder="Company" value={form.company} onChange={e=>setForm({...form,company:e.target.value})} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm"/>
        <input placeholder="Industry" value={form.industry} onChange={e=>setForm({...form,industry:e.target.value})} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm"/>
        <input placeholder="Email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm"/>
        <button onClick={create} className="btn">Add Customer</button>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rows.map(c=>(
          <div key={c.id} className="card p-4 space-y-2">
            <div className="font-medium">{c.name}</div>
            <div className="text-sm text-zinc-400">{c.company} · {c.industry}</div>
            <div className="text-xs text-zinc-500">{c.email}</div>
            <div className="text-xs"><span className="px-2 py-1 rounded-full bg-white/5">{c.deal_stage}</span> ₹{(c.deal_value/100000).toFixed(1)}L</div>
            <Link to={`/chat?customer=${c.id}`} className="inline-block text-xs text-violet-400 hover:text-violet-300 mt-2">Open conversation →</Link>
          </div>
        ))}
        {!rows.length && <div className="text-sm text-zinc-500">No customers yet. Click “Load Demo Customer” on Dashboard or add one.</div>}
      </div>
    </div>
  )
}
