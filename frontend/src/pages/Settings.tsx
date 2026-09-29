import { useEffect, useState } from "react"
import { get } from "../services/api"
import { Settings2 } from "lucide-react"
import { PageHeader } from "../components/ui/PageHeader"

interface Health {
  status: string
  database: string
  hindsight: string
  llm: string
}

interface IntegrationCard {
  name: string
  detail: string
  connected: boolean
}

export default function Settings() {
  const [h, setH] = useState<Health | null>(null)

  useEffect(() => {
    get<Health>("/api/health").then(setH).catch(() => setH(null))
  }, [])

  // `/api/health` returns only these four keys. The old code rendered
  // `h?.hindsight_url` and `h?.llm_model`, neither of which exists — so the
  // page literally displayed "connected · undefined".
  const integrations: IntegrationCard[] = [
    { name: "Hindsight", detail: h?.hindsight ?? "checking…", connected: h?.hindsight === "connected" },
    { name: "LLM", detail: h?.llm ?? "checking…", connected: h?.llm === "connected" },
    { name: "Database", detail: h?.database ?? "checking…", connected: h?.database === "connected" },
  ]

  return (
    <div className="p-6 md:p-8 space-y-6 animate-fadeIn">
      <PageHeader
        title="Settings"
        subtitle="Runtime configuration and integration health"
        icon={<Settings2 size={18} />}
      />

      <div className="grid gap-4 md:grid-cols-3">
        {integrations.map((item) => (
          <div key={item.name} className="card p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-fg-strong">
              <span
                className={item.connected ? "status-dot status-dot-connected" : "status-dot status-dot-disconnected"}
                aria-hidden="true"
              />
              {item.name}
            </div>
            {/* Text, not colour alone, carries the state — colour-only status
                indicators are unusable for many readers. */}
            <div className="mt-1 text-xs text-fg-muted">{item.detail}</div>
            <div className="mt-0.5 text-[11px] font-medium text-fg-subtle">
              {item.connected ? "Connected" : item.detail === "checking…" ? "Checking…" : "Unavailable"}
            </div>
          </div>
        ))}
      </div>

      <div className="card p-4">
        <div className="mb-2 text-sm font-medium text-fg-strong">Architecture</div>
        <pre className="overflow-x-auto text-xs leading-relaxed text-fg-subtle">
          {`Customer → DealMind Agent → Hindsight Recall → Relevant Memories → LLM → Personalized Response → Hindsight Retain
PostgreSQL = application/business data
Hindsight  = agent long-term memory (retain/recall/reflect per customer bank)`}
        </pre>
      </div>

      <div className="text-xs text-fg-muted">
        Secrets are never exposed to the frontend — they are read from{" "}
        <code className="rounded bg-surface-2 border border-line px-1 py-0.5 text-fg-subtle">.env</code> on the server:
        <code className="ml-1 rounded bg-surface-2 border border-line px-1 py-0.5 text-fg-subtle">LLM_API_KEY</code>,{" "}
        <code className="rounded bg-surface-2 border border-line px-1 py-0.5 text-fg-subtle">HINDSIGHT_API_KEY</code>,{" "}
        <code className="rounded bg-surface-2 border border-line px-1 py-0.5 text-fg-subtle">DATABASE_URL</code>.
      </div>
    </div>
  )
}
