import { BrowserRouter, Routes, Route, NavLink, Link } from "react-router-dom"
import { Brain, LayoutDashboard, Users, FileText, MessageSquare, Settings, Sparkles, FlaskConical } from "lucide-react"
import Dashboard from "./pages/Dashboard"
import Customers from "./pages/Customers"
import Chat from "./pages/Chat"
import Memory from "./pages/Memory"
import LearningDemo from "./pages/LearningDemo"
import Deals from "./pages/Deals"
import SettingsPage from "./pages/Settings"

function Nav() {
  const link = (to: string, label: string, Icon: any) => (
    <NavLink to={to} className={({isActive})=>`flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${isActive?"bg-violet-600 text-white":"text-zinc-400 hover:text-white hover:bg-white/5"}`}>
      <Icon size={16}/>{label}
    </NavLink>
  )
  return (
    <aside className="w-[240px] shrink-0 p-4 flex flex-col gap-4 border-r border-white/5 bg-[#0a0a14]">
      <Link to="/" className="flex items-center gap-2 px-2 py-2">
        <div className="w-8 h-8 rounded-xl bg-violet-600 grid place-items-center"><Brain size={16}/></div>
        <div><div className="font-semibold leading-none">DealMind</div><div className="text-[11px] text-zinc-500">AI Sales Agent</div></div>
      </Link>
      <div className="text-[10px] tracking-widest text-zinc-500 px-2">NAVIGATION</div>
      <nav className="flex flex-col gap-1">
        {link("/","Dashboard", LayoutDashboard)}
        {link("/customers","Customers", Users)}
        {link("/deals","Deals", FileText)}
        {link("/chat","Conversations", MessageSquare)}
        {link("/memory","Memory", Brain)}
        {link("/demo","Learning Demo", FlaskConical)}
        {link("/settings","Settings", Settings)}
      </nav>
      <div className="mt-auto card p-3">
        <div className="text-xs font-medium flex items-center gap-1"><Sparkles size={12}/> Hindsight</div>
        <div className="text-[11px] text-zinc-500 mt-1">Retention → Recall → Reasoning → Better Response</div>
      </div>
    </aside>
  )
}

export default function App(){
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="min-h-screen flex bg-[#070711]">
        <Nav/>
        <main className="flex-1 min-w-0">
          <Routes>
            <Route path="/" element={<Dashboard/>}/>
            <Route path="/customers" element={<Customers/>}/>
            <Route path="/deals" element={<Deals/>}/>
            <Route path="/chat" element={<Chat/>}/>
            <Route path="/memory" element={<Memory/>}/>
            <Route path="/demo" element={<LearningDemo/>}/>
            <Route path="/settings" element={<SettingsPage/>}/>
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
