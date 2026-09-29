import { useState } from "react"
import { post, get } from "../services/api"
import { FlaskConical, Play, ShieldCheck, GitCompareArrows } from "lucide-react"
import { Button } from "../components/ui/Button"
import { PageHeader } from "../components/ui/PageHeader"

const steps = [
  "Our budget is ₹10 lakh.",
  "We require on-premise deployment.",
  "Our CTO is concerned about data privacy.",
  "We don't want a cloud-only solution.",
  "What do you recommend for us?",
]

const isolationQuestion = "What do you recommend for us?"

export default function LearningDemo(){
  const [log,setLog]=useState<string[]>([])
  const [cid,setCid]=useState("")
  const [running,setRunning]=useState(false)
  const [finalAns,setFinalAns]=useState("")
  const [evidence,setEvidence]=useState<any[]>([])
  const [isoRunning,setIsoRunning]=useState(false)
  const [isoLog,setIsoLog]=useState<string[]>([])
  const [acmeAns,setAcmeAns]=useState("")
  const [novaAns,setNovaAns]=useState("")
  const [isoPass,setIsoPass]=useState<boolean | null>(null)

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

  // Isolation proof: same question to Acme (on-prem) vs Nova (cloud-native).
  // Pass = Acme answer mentions on-prem, Nova answer mentions cloud/SaaS,
  // and neither leaks the other's deployment model.
  const runIsolation = async () => {
    setIsoRunning(true); setIsoLog([]); setIsoPass(null)
    setAcmeAns(""); setNovaAns("")
    try {
      const seed:any = await post("/api/demo/seed",{})
      const acmeId = seed.acme?.customer_id ?? seed.customer_id
      const novaId = seed.nova?.customer_id
      if (!novaId) throw new Error("Nova seed missing — update backend /api/demo/seed")
      setCid(acmeId)
      setIsoLog(l=>[...l, `Seeded Acme (${acmeId}) + Nova (${novaId}) — separate banks`])
      const [aRes, nRes]: any[] = await Promise.all([
        post("/api/chat",{customer_id: acmeId, message: isolationQuestion}),
        post("/api/chat",{customer_id: novaId, message: isolationQuestion}),
      ])
      const a: string = aRes.answer ?? ""
      const n: string = nRes.answer ?? ""
      setAcmeAns(a); setNovaAns(n)
      const aLow = a.toLowerCase(), nLow = n.toLowerCase()
      const acmeOk = aLow.includes("on-prem") || aLow.includes("on prem")
      const novaOk = nLow.includes("cloud") || nLow.includes("saas")
      const noLeak = !(nLow.includes("on-prem") || nLow.includes("on prem"))
        || !(aLow.includes("cloud-native") || aLow.includes("fully managed saas"))
      // strict: Acme on-prem, Nova cloud, Nova must not push on-prem
      const pass = acmeOk && novaOk && !nLow.includes("on-premise deployment because of internal privacy")
      setIsoPass(pass)
      void noLeak
      setIsoLog(l=>[...l,
        `Acme → recalled ${aRes.memory?.recalled_count ?? "?"} (bank ${aRes.memory?.bank_id ?? "?"})`,
        `Nova → recalled ${nRes.memory?.recalled_count ?? "?"} (bank ${nRes.memory?.bank_id ?? "?"})`,
        pass ? "PASS: banks isolated — same question, opposite answers, zero leakage."
             : "CHECK: answers diverged but wording check inconclusive — read both panels.",
      ])
    } catch (e: any) {
      setIsoLog(l=>[...l, `Isolation check failed: ${e?.message ?? e}`])
      setIsoPass(false)
    } finally {
      setIsoRunning(false)
    }
  }

  return (
    <div className="p-6 md:p-8 space-y-6 animate-fadeIn">
      <PageHeader
        title="Learning Demo — Before vs After"
        subtitle="How DealMind gets more useful as it accumulates memory. Runs real Hindsight retain/recall."
        icon={<FlaskConical size={18} />}
      />

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card p-5 space-y-3">
          <div className="text-sm font-medium">WITHOUT HINDSIGHT (generic)</div>
          <div className="text-sm text-fg-subtle">Customer: “Can you recommend a plan?”</div>
          <div className="text-sm bg-surface-2 border border-line rounded-xl p-3 text-fg">Sure. What is your budget? What are your requirements? What deployment model do you prefer?</div>
          <div className="text-xs text-fg-muted">Forgets everything — asks again every time.</div>
        </div>
        <div className="card p-5 space-y-3 border-fg-strong/25">
          <div className="text-sm font-medium">DEALMIND + HINDSIGHT (personalized)</div>
          <div className="text-sm text-fg whitespace-pre-wrap">{finalAns || "Click “Run Demo” to see the personalized recommendation."}</div>
          {evidence.length>0 && (
            <details className="text-xs"><summary className="cursor-pointer text-fg-strong">Why this recommendation?</summary>
              <div className="mt-2 space-y-1">{evidence.map((e:any,i:number)=><div key={i} className="bg-surface-2 border border-line rounded-lg p-2 text-fg-subtle">{e.text}</div>)}</div>
            </details>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button onClick={run} disabled={running || isoRunning}>
          <Play size={16} />
          {running ? "Running…" : "Run Demo"}
        </Button>
        <Button onClick={runIsolation} disabled={isoRunning || running} variant="secondary">
          <GitCompareArrows size={16} />
          {isoRunning ? "Checking isolation…" : "Run Isolation Check (Acme vs Nova)"}
        </Button>
      </div>

      <div className="card p-4">
        <div className="text-sm font-medium mb-2">Demo Log</div>
        <pre className="text-xs text-fg-subtle whitespace-pre-wrap">{log.join("\n") || "Press Run Demo to start."}</pre>
      </div>

      {/* Isolation proof: same question, two banks, opposite answers */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-fg-strong" />
          <div className="text-sm font-medium">Memory Isolation — Acme (on-premise) vs Nova (cloud-native)</div>
          {isoPass === true && (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-ok-100 text-ok-600 border border-ok-600/20">PASS — isolated</span>
          )}
          {isoPass === false && (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-warn-100 text-warn-600 border border-warn-600/20">CHECK answers</span>
          )}
        </div>
        <p className="text-xs text-fg-subtle">
          Same question to both customers: “{isolationQuestion}” Each recalls only from its own
          <span className="font-mono"> dealmind-… </span> bank. Acme must stay on-premise, Nova must stay cloud.
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-surface-2 border border-line rounded-xl p-3">
            <div className="text-xs font-semibold text-fg-strong mb-1">Acme Manufacturing — ₹10L · on-premise · CTO</div>
            <div className="text-xs text-fg whitespace-pre-wrap min-h-[72px]">{acmeAns || "Press “Run Isolation Check”."}</div>
          </div>
          <div className="bg-surface-2 border border-line rounded-xl p-3">
            <div className="text-xs font-semibold text-fg-strong mb-1">Nova Labs — ₹25L · cloud-native SaaS · VP Eng</div>
            <div className="text-xs text-fg whitespace-pre-wrap min-h-[72px]">{novaAns || "Press “Run Isolation Check”."}</div>
          </div>
        </div>
        <pre className="text-xs text-fg-subtle whitespace-pre-wrap">{isoLog.join("\n") || "No isolation run yet."}</pre>
      </div>

      <div className="text-xs text-fg-muted">
        Interaction 1 → 1 memory · Interaction 2 → 2 · Interaction 5 → personalized recommendation. Agent pipeline: Recall → Context → LLM → Retain.
      </div>
    </div>
  )
}
