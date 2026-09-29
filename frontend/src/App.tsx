import { BrowserRouter, Routes, Route } from "react-router-dom"
import { lazy, Suspense, useEffect, useState } from "react"
import { Menu } from "lucide-react"
import Sidebar from "./components/layout/Sidebar"
import { Skeleton } from "./components/ui/Skeleton"

// Lazy load pages for better performance
const Dashboard = lazy(() => import("./pages/Dashboard"))
const Customers = lazy(() => import("./pages/Customers"))
const Deals = lazy(() => import("./pages/Deals"))
const Chat = lazy(() => import("./pages/Chat"))
const Memory = lazy(() => import("./pages/Memory"))
const LearningDemo = lazy(() => import("./pages/LearningDemo"))
const Settings = lazy(() => import("./pages/Settings"))

export default function App() {
  const [navOpen, setNavOpen] = useState(false)

  // While the mobile drawer is open: dismiss it on Escape and stop the page
  // behind the backdrop from scrolling.
  useEffect(() => {
    if (!navOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setNavOpen(false)
    }
    window.addEventListener("keydown", onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [navOpen])

  return (
    <BrowserRouter>
      {/* `bg-surface`/`text-fg` come from the token layer. The shell previously
          hard-coded `bg-white text-black` while the document body was painted
          #070711, so every page inherited a dark scroll area under a light
          layout. */}
      <div className="min-h-screen flex bg-surface text-fg font-inter">
        <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Mobile top bar — the only nav entry point below md */}
          <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-line bg-surface-1/90 px-4 backdrop-blur-xl md:hidden">
            <button
              type="button"
              onClick={() => setNavOpen(true)}
              aria-label="Open navigation menu"
              aria-expanded={navOpen}
              className="-ml-2 rounded-xl p-2 text-fg-subtle transition-colors hover:bg-surface-2 hover:text-fg"
            >
              <Menu size={20} />
            </button>
            <span className="text-sm font-bold text-fg-strong">DealMind</span>
          </header>

          <main className="min-w-0 flex-1">
          <Suspense
            fallback={
              <div className="p-8 space-y-6">
                <Skeleton className="h-8 w-64" />
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
                <Skeleton className="h-64 w-full" />
              </div>
            }
          >
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/deals" element={<Deals />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/memory" element={<Memory />} />
              <Route path="/demo" element={<LearningDemo />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </Suspense>
          </main>
        </div>
      </div>
    </BrowserRouter>
  )
}