import { useEffect, useState } from "react"
import { get } from "../services/api"
import { cn } from "../lib/utils"
import { BarChart3, DollarSign, Shield, Target, TrendingUp } from "lucide-react"
import { Card, CardContent } from "../components/ui/Card"
import { Badge } from "../components/ui/Badge"
import { Button } from "../components/ui/Button"
import { Modal } from "../components/ui/Modal"
import { PageHeader } from "../components/ui/PageHeader"
import { Skeleton } from "../components/ui/Skeleton"

interface Deal {
  id: string
  customer_id: string
  title: string
  value: number
  stage: string
  status: string
  probability: number
}

interface DealIntelligence {
  deal: Deal
  synthesis: string
  evidence: Array<{ text: string; relevance: number }>
}

const stageColors = {
  // Pipeline stages are ordered, not categorical, so they run as one ink ramp:
  // earliest stage darkest, latest lightest. The previous blue/purple/amber/
  // orange/emerald set implied five unrelated meanings.
  Lead: "bg-ink-900 text-surface-1 border border-ink-900",
  Qualification: "bg-ink-700 text-surface-1 border border-ink-700",
  Proposal: "bg-ink-500 text-surface-1 border border-ink-500",
  Negotiation: "bg-ink-300 text-fg-strong border border-ink-300",
  Closed: "bg-ok-100 text-ok-600 border border-ok-600/20",
}

export default function Deals() {
  const [rows, setRows] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [intel, setIntel] = useState<DealIntelligence | null>(null)

  useEffect(() => {
    setLoading(true)
    get<Deal[]>("/api/deals")
      .then(setRows)
      .finally(() => setLoading(false))
  }, [])

  const openIntel = async (id: string) => {
    const data = await get<DealIntelligence>(`/api/deal-intelligence/${id}`)
    setIntel(data)
  }

  const closeIntel = () => setIntel(null)

  const getStatusColor = (status: string) => {
    if (status === "Active") return "bg-ok-100 text-ok-600 border-ok-600/20"
    if (status === "Lost") return "bg-danger-100 text-danger-600 border-danger-600/20"
    return "bg-surface-2 text-fg-subtle border-line"
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      <PageHeader
        title="Deals"
        subtitle={`${rows.length} ${
          rows.length === 1 ? "deal" : "deals"
        } in your pipeline • Total value: ₹${Math.round(
          rows.reduce((sum, d) => sum + (d.value || 0), 0) / 100000
        )}L`}
        icon={<Target size={18} />}
        actions={
          <div className="flex items-center gap-2 rounded-xl border border-line bg-surface-1 px-3 py-2 text-xs text-fg-subtle">
            <BarChart3 size={14} className="text-fg-muted" />
            Pipeline value indicator
          </div>
        }
      />

      {/* Deals List */}
      {loading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-12">
          <Target size={48} className="mx-auto text-fg-muted mb-4" />
          <h3 className="text-lg font-medium text-fg-strong mb-2">No deals yet</h3>
          <p className="text-fg-subtle mb-4">Seed demo data from Dashboard to see deals</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {rows.map((deal) => (
            <Card key={deal.id} variant="glass" className="group">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-fg-strong truncate">{deal.title}</h3>
                    <p className="text-xs text-fg-muted mt-0.5">ID: {deal.id.slice(0, 8)}</p>
                  </div>
                  <Badge
                    variant={deal.status === "Active" ? "success" : "warning"}
                    className="ml-2 text-[10px]"
                  >
                    {deal.status}
                  </Badge>
                </div>

                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign size={14} className="text-fg-muted" />
                    <span className="font-medium text-fg-strong tabular-nums">
                      ₹{(deal.value / 100000).toFixed(1)}L
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-fg-subtle">
                    {deal.stage && (
                      <span className={cn("px-2 py-1 rounded-full text-xs", stageColors[deal.stage as keyof typeof stageColors] || "bg-surface-2 text-fg-subtle")}>
                        {deal.stage}
                      </span>
                    )}
                    {deal.probability && (
                      <span className="flex items-center gap-1 tabular-nums">
                        <TrendingUp size={12} />
                        {deal.probability}%
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => openIntel(deal.id)}
                  className="w-full text-xs text-fg-subtle hover:text-fg-strong hover:bg-surface-2 py-2 rounded-xl transition-colors flex items-center justify-center gap-1"
                >
                  <Shield size={12} />
                  Deal Intelligence
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Deal Intelligence Dialog */}
      <Modal
        open={!!intel}
        onClose={closeIntel}
        title={intel ? `Deal Intelligence — ${intel.deal.title}` : "Deal Intelligence"}
        subtitle="AI-powered deal synthesis with evidence"
        icon={<Shield size={16} />}
        size="xl"
      >
        {intel && (
          <>
            <div className="space-y-4">
                <div className="bg-surface-2 border border-line rounded-xl p-4">
                  <p className="text-sm text-fg leading-relaxed whitespace-pre-wrap">
                    {intel.synthesis}
                  </p>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-fg-strong mb-2">Evidence</h4>
                  <div className="space-y-2">
                    {intel.evidence?.map((e, i) => (
                      <div
                        key={i}
                        className="text-xs p-3 bg-surface-2 rounded-lg border border-line"
                      >
                        <div className="flex items-start gap-2">
                          <Shield size={12} className="text-fg-muted mt-0.5 flex-shrink-0" />
                          <p className="text-fg">{e.text}</p>
                        </div>
                        <div className="text-right mt-1">
                          <span className="px-2 py-0.5 rounded-full bg-surface-1 border border-line text-[10px] text-fg-muted tabular-nums">
                            {Math.round(e.relevance * 100)}% relevance
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => {
                    const blob = new Blob([intel.synthesis], { type: "text/plain" })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement("a")
                    a.href = url
                    a.download = `deal-intel-${intel.deal.id}.txt`
                    a.click()
                    // The previous version created an object URL per export and
                    // never revoked it, leaking one blob per click.
                    URL.revokeObjectURL(url)
                  }}
                  className="text-xs text-fg-subtle hover:text-fg-strong underline decoration-line-strong underline-offset-2 flex items-center gap-1 transition-colors"
                >
                  Export Analysis
                </button>
            </div>

            <div className="mt-6 flex justify-end">
              <Button variant="ghost" onClick={closeIntel}>
                Close
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}