import { useEffect, useState } from "react"
import { get, post } from "../services/api"
import {
  Activity,
  Brain,
  IndianRupee,
  MessageSquare,
  Plus,
  Target,
  Users,
} from "lucide-react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Card, CardContent, CardHeader } from "../components/ui/Card"
import { Badge } from "../components/ui/Badge"
import { Button } from "../components/ui/Button"
import { PageHeader } from "../components/ui/PageHeader"
import { Skeleton } from "../components/ui/Skeleton"

interface DashboardData {
  active_deals: number
  total_deals: number
  customers: number
  interactions: number
  memories_learned: number
  total_pipeline: number
  recent_deals: Array<{id: string, title: string, value: number, stage: string, status: string, probability: number}>
  recent_events: DashboardEvent[]
}

interface DashboardEvent {
  id: string
  operation: string
  summary: string
  created_at: string
}

interface ActivityPoint {
  name: string
  recall: number
  retain: number
}

/**
 * Bucket real memory events into the last 7 days.
 *
 * The previous chart was generated with `Math.random()`, so it invented numbers
 * and reshuffled them on every single render — it looked like analytics but was
 * noise. This derives the series from actual event timestamps instead.
 */
function buildActivity(events: DashboardEvent[]): ActivityPoint[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return Array.from({ length: 7 }, (_, i) => {
    const dayStart = new Date(today)
    dayStart.setDate(dayStart.getDate() - (6 - i))
    const dayEnd = new Date(dayStart)
    dayEnd.setDate(dayEnd.getDate() + 1)

    const inDay = events.filter((e) => {
      const t = new Date(e.created_at).getTime()
      return t >= dayStart.getTime() && t < dayEnd.getTime()
    })

    return {
      name: dayStart.toLocaleDateString(undefined, { weekday: "short" }),
      recall: inDay.filter((e) => e.operation === "RECALL").length,
      retain: inDay.filter((e) => e.operation === "RETAIN").length,
    }
  })
}

// All five stat icons share one ink tone. The previous set gave each card its
// own hue (violet/emerald/sky/amber/fuchsia), which turned a row of KPI numbers
// into a rainbow and made none of them read as more important than the others.
//
// `iconClass` is written as a full literal on purpose. An earlier version built
// the class at runtime (`"text-" + stat.color + "-400"`), which Tailwind's
// static scanner can never see — so those icon colours silently did not exist.
const statCards = [
  { key: "active_deals", label: "Active Deals", icon: Target, iconClass: "text-fg-subtle" },
  {
    key: "total_pipeline",
    label: "Total Pipeline",
    icon: IndianRupee,
    iconClass: "text-fg-subtle",
    format: (v: number) => `₹${(v / 100000).toFixed(1)}L`,
  },
  { key: "customers", label: "Customers", icon: Users, iconClass: "text-fg-subtle" },
  { key: "interactions", label: "Interactions", icon: MessageSquare, iconClass: "text-fg-subtle" },
  { key: "memories_learned", label: "Memories Learned", icon: Brain, iconClass: "text-fg-subtle" },
]

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)

  useEffect(() => {
    get<DashboardData>("/api/dashboard")
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  const handleSeedDemo = async () => {
    setSeeding(true)
    try {
      await post("/api/demo/seed", {})
      location.reload()
    } finally {
      setSeeding(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 md:p-8 space-y-6 animate-fadeIn">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {statCards.map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!data) return <div className="p-8 text-fg-muted">No data available</div>

  const events = data.recent_events ?? []
  const activityData = buildActivity(events)
  const hasActivity = events.length > 0

  return (
    <div className="p-6 md:p-8 space-y-6 animate-fadeIn">
      <PageHeader
        title="Dashboard"
        subtitle="The longer you work with DealMind, the better it understands the deal."
        icon={<Activity size={18} />}
        actions={
          <Button onClick={handleSeedDemo} disabled={seeding} variant="gradient">
            <Plus size={16} />
            {seeding ? "Seeding…" : "Load Demo Customer"}
          </Button>
        }
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {statCards.map((stat) => {
          const value = data[stat.key as keyof DashboardData] as number
          const formatted = stat.format ? stat.format(value) : value.toLocaleString()

          return (
            <Card key={stat.key} variant="glass">
              <CardContent padding="sm" className="space-y-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-surface-2 ${stat.iconClass}`}
                  >
                    <stat.icon size={14} />
                  </span>
                  <span className="truncate text-[11px] font-medium text-fg-muted">
                    {stat.label}
                  </span>
                </div>
                {/* tabular-nums keeps the digits aligned as values change. */}
                <div className="text-2xl font-bold tabular-nums text-fg-strong">{formatted}</div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Charts & Activity */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Memory Activity — real events bucketed into the last 7 days */}
        <Card variant="glass" className="lg:col-span-2">
          <CardHeader
            title="Memory Activity"
            subtitle="Recall vs retain events over the last 7 days"
            icon={<Activity size={16} />}
          />
          <CardContent>
            {!hasActivity ? (
              <div className="flex h-[280px] flex-col items-center justify-center text-center">
                <Activity size={32} className="mb-3 text-fg-muted" />
                <p className="text-sm text-fg-subtle">No memory events yet</p>
                <p className="mt-1 text-xs text-fg-muted">
                  Chat with a customer to start recording activity
                </p>
              </div>
            ) : (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={activityData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    {/* Two series, so they are separated by *tone* rather than
                        hue: recall is solid ink, retain is the light grey.
                        Keeping the chart monochrome leaves the status colours
                        meaning exactly one thing. */}
                    <defs>
                      <linearGradient id="colorRecall" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#18181b" stopOpacity={0.16} />
                        <stop offset="95%" stopColor="#18181b" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorRetain" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a3a3a3" stopOpacity={0.18} />
                        <stop offset="95%" stopColor="#a3a3a3" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" vertical={false} />
                    <XAxis
                      dataKey="name"
                      fontSize={11}
                      axisLine={{ stroke: "#d4d4d4" }}
                      tickLine={false}
                      tick={{ fill: "#737373" }}
                    />
                    <YAxis
                      allowDecimals={false}
                      fontSize={11}
                      width={28}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#737373" }}
                    />
                    <Tooltip
                      cursor={{ stroke: "#d4d4d4" }}
                      contentStyle={{
                        background: "#ffffff",
                        border: "1px solid #e5e5e5",
                        borderRadius: "12px",
                        boxShadow: "0 8px 24px -14px rgba(9,9,11,0.25)",
                        color: "#18181b",
                      }}
                      labelStyle={{ color: "#525252" }}
                    />
                    <Legend
                      formatter={(value) => (
                        <span className="text-xs text-fg-subtle">{value}</span>
                      )}
                    />
                    <Area
                      type="monotone"
                      dataKey="recall"
                      name="Recall"
                      stroke="#18181b"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorRecall)"
                      dot={{ r: 2, fill: "#18181b" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="retain"
                      name="Retain"
                      stroke="#a3a3a3"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorRetain)"
                      dot={{ r: 2, fill: "#a3a3a3" }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Memory Events */}
        <Card variant="glass">
          <CardHeader
            title="Recent Memory Events"
            subtitle="Latest learning activity"
            icon={<MessageSquare size={16} />}
          />
          <CardContent>
            <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
              {data.recent_events?.length ? (
                data.recent_events.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-start gap-3 p-3 rounded-xl bg-surface-2 hover:bg-surface-3 transition-colors group"
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-surface-3 flex items-center justify-center">
                      <Badge
                        variant="secondary"
                        className="text-[9px] py-0 px-1.5"
                      >
                        {event.operation}
                      </Badge>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-fg line-clamp-2">{event.summary}</p>
                      <p className="text-[10px] text-fg-muted mt-1">
                        {new Date(event.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-fg-muted">
                  <Brain size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No events yet</p>
                  <p className="text-xs mt-1">Chat with customers to generate memories</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Deals */}
      <Card variant="glass">
        <CardHeader
          title="Recent Deals"
          subtitle="Pipeline overview"
          icon={<Target size={16} />}
        />
        <CardContent>
          <div className="space-y-0">
            {data.recent_deals?.map((deal) => (
              <div
                key={deal.id}
                className="flex items-center justify-between py-3 border-b border-line last:border-0 hover:bg-surface-2 rounded-lg px-3 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-ok-600" />
                  <div>
                    <p className="font-medium text-fg-strong">{deal.title}</p>
                    <p className="text-xs text-fg-muted">{deal.stage} • {deal.status}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-fg-strong tabular-nums">₹{(deal.value/100000).toFixed(1)}L</p>
                  <p className="text-xs text-fg-muted">{deal.probability}% probability</p>
                </div>
              </div>
            ))}
            {!data.recent_deals?.length && (
              <div className="text-center py-8 text-fg-muted">
                <Target size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No deals yet</p>
                <p className="text-xs mt-1">Seed demo data to see the pipeline</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
