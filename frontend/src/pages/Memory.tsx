import { useEffect, useState } from "react"
import { get, post, put, del } from "../services/api"
import { Brain } from "lucide-react"
import { Button } from "../components/ui/Button"
import { PageHeader } from "../components/ui/PageHeader"

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
  const [editingMemId, setEditingMemId] = useState<string | null>(null)
  const [editText, setEditText] = useState("")

  useEffect(()=>{ get<any[]>("/api/customers").then(r=>{ setCustomers(r); if(r[0]) setCid(r[0].id)}); get("/api/health").then(setHealth)},[])
  const load=()=>{
    if(!cid) return
    get<any>(`/api/customers/${cid}/memory`).then((d:any)=>setMems(d.memories||[]))
    get<any[]>(`/api/customers/${cid}/timeline`).then(setTimeline)
  }
  useEffect(()=>{ load() },[cid])

  // Wiping a customer's long-term memory is irreversible, so it must be
  // confirmed. Previously this fired on a single click with no prompt at all.
  const forget = async () => {
    const ok = window.confirm(
      "Permanently delete every memory DealMind has stored for this customer?\n\nThis cannot be undone."
    )
    if (!ok) return
    await post(`/api/memory/forget/${cid}`, {})
    load()
  }

  const exportMemory = async () => {
    const data = await get<unknown>(`/api/memory/export/${cid}`)
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "memory.json"
    a.click()
    // The old version never revoked this, leaking one blob URL per export.
    URL.revokeObjectURL(url)
  }

  const updateMemory = async (memId: string, newText: string) => {
    try {
      await put<{id: string, summary: string, updated: boolean}>(`/api/memory/events/${memId}`, { summary: newText })
      load() // Reload memories to reflect the update
      setEditingMemId(null)
      setEditText("")
    } catch (error) {
      console.error("Failed to update memory:", error)
      alert("Failed to update memory. Please try again.")
    }
  }

  const deleteMemory = async (memId: string) => {
    const ok = window.confirm(
      "Are you sure you want to delete this memory? This action cannot be undone."
    )
    if (!ok) return

    try {
      await del<{id: string, deleted: boolean}>(`/api/memory/events/${memId}`)
      load() // Reload memories to reflect the deletion
    } catch (error) {
      console.error("Failed to delete memory:", error)
      alert("Failed to delete memory. Please try again.")
    }
  }

  return (
    <div className="p-6 md:p-8 space-y-6 animate-fadeIn">
      <PageHeader
        title="Customer Memory"
        subtitle="Everything DealMind has learned about this customer"
        icon={<Brain size={18} />}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="memory-customer" className="text-xs text-fg-muted">
              Customer
            </label>
            <select
              id="memory-customer"
              value={cid}
              onChange={(e) => setCid(e.target.value)}
              className="rounded-xl border border-line bg-surface-1 px-3 py-2 text-sm text-fg outline-none transition-colors hover:border-line-strong"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company}
                </option>
              ))}
            </select>
            <span className="text-xs text-fg-muted">Hindsight: {health?.hindsight}</span>
          </div>
        }
      />

      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" size="sm" onClick={load}>
          View Memory
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="border-danger-600/30 text-danger-600 hover:bg-danger-100 hover:border-danger-600/50"
          onClick={forget}
        >
          Forget Customer Memory
        </Button>
        <Button variant="ghost" size="sm" onClick={exportMemory}>
          Export Memory
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          <div className="text-sm font-medium">What DealMind remembers</div>
          <div className="grid gap-2">
            {mems.map((mem, index) => (
              // `key={mem.id}` produced the console warning "Each child in a
              // list should have a unique key prop": `/customers/{id}/memory`
              // returns recall hits shaped {text, relevance, source} with no
              // `id`, so every key was `undefined`. Falling back to the index
              // keeps the list stable until the endpoint exposes a real id.
              <div key={mem.id ?? `${index}-${mem.text?.slice(0, 24) ?? ""}`} className="card p-4 relative">
                {/* Memory category badge */}
                <div className="text-xs px-2 py-1 rounded-full bg-surface-2 border border-line text-fg-subtle inline-block mb-2">
                  {catOf(mem.text)}
                </div>

                {/* Memory content - editable or static */}
                {editingMemId === mem.id ? (
                  <div className="mb-3">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="w-full p-2 border border-line rounded-md focus:outline-none focus:ring-2 focus:ring-fg-strong/15 focus:border-fg-strong text-sm text-fg bg-surface-1"
                      rows={3}
                      placeholder="Edit memory..."
                    />
                  </div>
                ) : (
                  <div className="mb-3 text-sm">
                    {mem.text}
                  </div>
                )}

                {/* Memory metadata */}
                <div className="text-xs text-fg-muted mb-2 flex flex-wrap gap-2">
                  <span>{mem.source}</span>
                  <span>·</span>
                  <span className="tabular-nums">{Math.round((mem.relevance||0)*100)}% relevance</span>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2">
                    {!editingMemId && (
                      <>
                        <button
                          onClick={() => {
                            setEditingMemId(mem.id);
                            setEditText(mem.text);
                          }}
                          className="text-xs text-fg-subtle hover:text-fg-strong transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteMemory(mem.id)}
                          className="text-xs text-danger-600 hover:underline transition-colors"
                        >
                          Delete
                        </button>
                      </>
                    )}
                    {editingMemId === mem.id && (
                      <>
                        <button
                          onClick={() => updateMemory(mem.id, editText)}
                          className="px-2 py-1 bg-fg-strong text-surface-1 text-xs rounded-md hover:opacity-90 transition-opacity"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingMemId(null);
                            setEditText("");
                          }}
                          className="text-xs text-fg-muted hover:text-fg transition-colors"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
              {!mems.length && <div className="text-sm text-fg-muted">No memories yet — chat to teach DealMind.</div>}
            </div>
          </div>
        <div className="space-y-4">
          <div className="card p-4">
            <div className="text-sm font-medium mb-3">Memory Timeline</div>
            <div className="space-y-3">
              {timeline.map((e:any)=>{
                const op = String(e.operation || "").toUpperCase()
                return (
                <div key={e.id} className="flex gap-3">
                  {/* The dot used to be violet for every event type, so a RECALL
                      and a RETAIN looked identical. Tone now encodes the
                      operation and is echoed by the label beside it. */}
                  <div
                    className={
                      "w-2 h-2 rounded-full mt-1 shrink-0 " +
                      (op === "RETAIN" ? "bg-fg-strong" : op === "RECALL" ? "bg-fg-muted" : "bg-line-strong")
                    }
                  />
                  <div>
                    <div className="text-xs font-medium">{e.operation}</div>
                    <div className="text-xs text-fg-subtle">{e.summary}</div>
                    <div className="text-[11px] text-fg-muted">{new Date(e.created_at).toLocaleString()}</div>
                  </div>
                </div>
                )
              })}
              {!timeline.length && <div className="text-xs text-fg-muted">Timeline empty.</div>}
            </div>
          </div>
          <div className="card p-4">
            <div className="text-sm font-medium mb-2">Hindsight Activity</div>
            <div className="text-xs text-fg-subtle space-y-1">
              <div>RECALL → LLM → RETAIN</div>
              <div>Each chat: recall relevant memories → generate response → retain durable facts.</div>
              <div className="text-fg-muted">PostgreSQL = business records · Hindsight = long-term memory</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
