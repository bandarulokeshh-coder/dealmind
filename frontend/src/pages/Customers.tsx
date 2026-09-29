import { useEffect, useState } from "react"
import { get, post } from "../services/api"
import { ExternalLink, IndianRupee, Mail, Plus, Users } from "lucide-react"
import { Card, CardContent } from "../components/ui/Card"
import { Badge } from "../components/ui/Badge"
import { Button } from "../components/ui/Button"
import { Input } from "../components/ui/Input"
import { Modal } from "../components/ui/Modal"
import { PageHeader } from "../components/ui/PageHeader"
import { Skeleton } from "../components/ui/Skeleton"

interface Customer {
  id: string
  name: string
  company: string
  industry?: string
  email?: string
  phone?: string
  deal_value?: number
  deal_stage?: string
}

export default function Customers() {
  const [rows, setRows] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    name: "",
    company: "",
    industry: "",
    email: "",
    phone: "",
  })

  const load = () => {
    setLoading(true)
    get<Customer[]>("/api/customers")
      .then(setRows)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const create = async () => {
    if (!form.name || !form.company) return
    await post("/api/customers", { ...form, deal_value: 0, deal_stage: "Lead" })
    setForm({ name: "", company: "", industry: "", email: "", phone: "" })
    setShowForm(false)
    load()
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      <PageHeader
        title="Customers"
        subtitle={`${rows.length} ${rows.length === 1 ? "customer" : "customers"} in your pipeline`}
        icon={<Users size={18} />}
        actions={
          <Button onClick={() => setShowForm(true)} variant="gradient">
            <Plus size={16} />
            Add Customer
          </Button>
        }
      />

      {/* Customer Form Dialog */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title="Add Customer"
        subtitle="New customer information"
        icon={<Plus size={16} />}
      >
        <div className="grid gap-4">
                <Input
                  placeholder="Full Name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
                <Input
                  placeholder="Company Name"
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                  required
                />
                <Input
                  placeholder="Industry"
                  value={form.industry}
                  onChange={(e) => setForm({ ...form, industry: e.target.value })}
                />
                <Input
                  placeholder="Email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
                <Input
                  placeholder="Phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setShowForm(false)}>
            Cancel
          </Button>
          <Button onClick={create}>Save Customer</Button>
        </div>
      </Modal>

      {/* Customers Grid */}
      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-12">
          <Users size={48} className="mx-auto text-fg-muted mb-4" />
          <h3 className="text-lg font-medium text-fg-strong mb-2">No customers yet</h3>
          <p className="text-fg-subtle mb-4">Add your first customer or load demo data from Dashboard</p>
          <Button variant="secondary" onClick={() => setShowForm(true)}>
            Add Customer
          </Button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((c) => (
            // The old 1%-scale hover effect did compile, but it scaled the whole
            // card — enough to blur text on subpixel boundaries and to shove the
            // grid neighbours around. The Card's own hover border and shadow
            // already mark interactivity, so the transform was dropped.
            <Card key={c.id} variant="glass" className="group">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-fg-strong truncate">{c.name}</h3>
                    <p className="text-sm text-fg-subtle truncate mt-0.5">
                      {c.company} {c.industry && `• ${c.industry}`}
                    </p>
                  </div>
                  <Badge
                    variant={c.deal_stage === "Active" ? "success" : c.deal_stage === "Proposal" ? "secondary" : "accent"}
                    className="text-[10px]"
                  >
                    {c.deal_stage || "Lead"}
                  </Badge>
                </div>

                <div className="flex items-center gap-3 text-xs text-fg-muted mb-3">
                  {c.email && (
                    <span className="flex items-center gap-1">
                      <Mail size={12} />
                      {c.email}
                    </span>
                  )}
                  {c.deal_value && (
                    <span className="flex items-center gap-1 text-fg-strong tabular-nums">
                      <IndianRupee size={12} />
                      {Math.round(c.deal_value / 100000)}L
                    </span>
                  )}
                </div>

                <div className="flex gap-2 pt-3 border-t border-line">
                  <button
                    className="flex-1 text-xs text-fg-subtle hover:text-fg-strong transition-colors"
                    onClick={() => console.log("View contacts")}
                  >
                    Contacts
                  </button>
                  <button
                    className="flex-1 text-xs text-fg-subtle hover:text-fg-strong transition-colors flex items-center justify-center gap-1"
                    onClick={() => console.log("Open chat for", c.id)}
                  >
                    Message
                    <ExternalLink size={12} />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}