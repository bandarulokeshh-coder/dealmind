import { Link, NavLink, useLocation } from "react-router-dom"
import { cn } from "../../lib/utils"
import {
  Brain,
  LayoutDashboard,
  Users,
  FileText,
  MessageSquare,
  Settings,
  Sparkles,
  FlaskConical,
  Target,
  MemoryStick,
  ArrowRight,
  Star,
  Zap,
  X,
} from "lucide-react"

interface NavItem {
  to: string
  label: string
  icon: React.ElementType
  badge?: number | string
}

interface SidebarProps {
  /** Drawer state below the `md` breakpoint. Ignored at `md+`, where it is always visible. */
  open: boolean
  onClose: () => void
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const location = useLocation()

  const navItems: NavItem[] = [
    { to: "/", label: "Dashboard", icon: LayoutDashboard },
    { to: "/customers", label: "Customers", icon: Users },
    { to: "/deals", label: "Deals", icon: FileText },
    { to: "/chat", label: "Conversations", icon: MessageSquare },
    { to: "/memory", label: "Memory", icon: Brain },
    { to: "/demo", label: "Learning Demo", icon: FlaskConical },
    { to: "/settings", label: "Settings", icon: Settings },
  ]

  const isActive = (path: string) => location.pathname === path

  return (
    <>
      {/* Mobile backdrop — click to dismiss the drawer */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-fg-strong/30 backdrop-blur-sm md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        aria-label="Main navigation"
        className={cn(
          "top-0 left-0 z-50 flex h-full w-[260px] shrink-0 flex-col overflow-y-auto",
          "border-r border-line",
          // off-canvas drawer on mobile
          "fixed bg-surface-1/95 backdrop-blur-xl transition-transform duration-300 ease-out",
          open ? "translate-x-0 shadow-2xl shadow-black/10" : "-translate-x-full",
          // desktop: real in-flow flex item, always visible, pinned on scroll
          "md:sticky md:z-20 md:h-screen md:translate-x-0 md:bg-surface-1/80 md:shadow-none"
        )}
      >
      {/* Logo */}
      <div className="flex items-center justify-between border-b border-line bg-surface-2 pr-3">
        <Link to="/" onClick={onClose} className="flex flex-1 items-center gap-3 px-6 py-5">
        <div className="relative">
          <div className="w-10 h-10 rounded-2xl bg-fg-strong grid place-items-center shadow-sm">
            <Brain size={20} className="text-surface-1" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-ok-600 border-2 border-surface-1" />
        </div>
        <div className="flex-1">
          {/* Flat ink instead of a grey gradient clipped to the text: the
              gradient washed the wordmark out against the white sidebar. */}
          <div className="font-bold text-xl text-fg-strong">
            DealMind
          </div>
          <div className="text-[11px] text-fg-muted font-medium -mt-0.5 flex items-center gap-1">
            <Sparkles size={10} className="text-fg-muted" />
            AI Sales Agent
          </div>
        </div>
        </Link>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close navigation menu"
          className="rounded-xl p-2 text-fg-muted transition-colors hover:bg-surface-3 hover:text-fg md:hidden"
        >
          <X size={18} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 space-y-1 px-3">
        <div className="px-4 mb-3 text-[10px] font-bold tracking-widest text-fg-muted uppercase">
          Menu
        </div>
        {navItems.map((item) => {
          const active = isActive(item.to)
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors duration-200",
                active
                  // Monochrome active state: a sunk grey fill, ink type and a
                  // single black accent bar at the left edge. The previous
                  // violet-on-violet tint had a 1.6:1 text contrast against its
                  // own background.
                  ? "border-line-strong bg-surface-2 text-fg-strong before:absolute before:left-0 before:top-1/2 before:h-5 before:w-0.5 before:-translate-y-1/2 before:rounded-full before:bg-fg-strong before:content-['']"
                  : "border-transparent text-fg-subtle hover:border-line hover:bg-surface-2 hover:text-fg"
              )}
            >
              <item.icon
                size={18}
                className={cn(
                  "transition-colors duration-200",
                  active ? "text-fg-strong" : "text-fg-muted group-hover:text-fg-subtle"
                )}
              />
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <span className="rounded-full border border-ok-600/20 bg-ok-100 px-1.5 py-0.5 text-xs text-ok-600">
                  {item.badge}
                </span>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Footer Card */}
      <div className="p-4 border-t border-line">
        <div className="glass p-4 rounded-2xl relative overflow-hidden">
          <div className="flex items-center gap-2 text-xs font-bold text-fg-subtle mb-2">
            <Sparkles size={12} className="text-fg-muted" />
            <span>Hindsight Memory</span>
          </div>
          <div className="text-[11px] text-fg-muted leading-relaxed">
            Retention → Recall → Reasoning
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[10px] text-fg-muted">
            <Zap size={10} className="text-fg-muted" />
            <span>AI-Powered Learning</span>
          </div>
        </div>
      </div>
      </aside>
    </>
  )
}
