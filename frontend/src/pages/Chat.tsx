import { useEffect, useState, useRef } from "react"
import { get, post } from "../services/api"
import { Send, Paperclip, Brain, Users, Sparkles, Bot, Copy, Check } from "lucide-react"
import MessageBubble from "../components/chat/MessageBubble"
import { Badge } from "../components/ui/Badge"
import { Button } from "../components/ui/Button"
import { Skeleton } from "../components/ui/Skeleton"

interface Message {
  id?: string
  role: "user" | "assistant"
  message: string
  timestamp?: string
  memoryInfo?: {
    recalled_count: number
    retained_count: number
    hindsight_available: boolean
  }
  evidence?: Array<{ text: string; relevance: number; source?: string }>
}

interface ChatMeta {
  answer: string
  memory: {
    recalled: boolean
    recalled_count: number
    retained_count: number
    bank_id: string
    hindsight_available: boolean
  }
  evidence: Array<{ text: string; relevance: number }>
  hindsight_ops: Array<{ operation: string; count: number; facts?: string[] }>
}

const quickSuggestions = [
  "Our budget is ₹10 lakh.",
  "We require on-premise deployment.",
  "Our CTO is concerned about data privacy.",
  "We don't want cloud-only.",
  "What do you recommend for us?",
]

export default function Chat() {
  const [customers, setCustomers] = useState<any[]>([])
  const [cid, setCid] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [typing, setTyping] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    get<any[]>("/api/customers").then((rows) => {
      setCustomers(rows)
      if (rows[0]) setCid(rows[0].id)
    })
  }, [])

  useEffect(() => {
    if (cid) {
      setLoading(true)
      get<any[]>(`/api/conversations/${cid}`)
        .then((rows) => {
          setMessages(rows.map(r => ({ role: r.role as "user" | "assistant", message: r.message, timestamp: r.created_at })))
        })
        .finally(() => setLoading(false))
    }
  }, [cid])

  const scrollToBottom = () => {
    endRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const copyToClipboard = async (text: string, msgId: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(msgId)
    setTimeout(() => setCopied(null), 2000)
  }

  const sendMessage = async () => {
    if (!input.trim() || !cid) return
    const text = input.trim()
    setInput("")

    // Add user message immediately
    setMessages((m) => [...m, { role: "user", message: text, timestamp: new Date().toISOString() }])

    // Show typing indicator
    setTyping(true)

    try {
      const res: ChatMeta = await post("/api/chat", {
        customer_id: cid,
        message: text,
      })

      // Simulate human-like thinking delay
      setTimeout(() => {
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            message: res.answer,
            timestamp: new Date().toISOString(),
            memoryInfo: res.memory
              ? {
                  recalled_count: res.memory.recalled_count ?? 0,
                  retained_count: res.memory.retained_count ?? 0,
                  hindsight_available: res.memory.hindsight_available ?? true,
                }
              : undefined,
            evidence: Array.isArray(res.evidence) ? res.evidence.slice(0, 8) : undefined,
          },
        ])
        setTyping(false)
        scrollToBottom()
      }, 800)
    } catch (error) {
      setTyping(false)
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          message: "I'm temporarily unable to reach the AI provider. Your message was received and memory was updated where possible.",
          timestamp: new Date().toISOString(),
        },
      ])
    }
  }

  return (
    <div className="h-[calc(100dvh-3.5rem)] flex flex-col bg-surface md:h-screen">
      {/* Header */}
      <div className="px-6 py-4 border-b border-line flex items-center justify-between bg-surface-1/90 backdrop-blur z-10">
        <div className="flex items-center gap-4">
          <div className="relative">
            <select
              value={cid}
              onChange={(e) => setCid(e.target.value)}
              className="bg-surface-1 border border-line rounded-xl px-4 py-2.5 text-sm text-fg outline-none focus:border-fg-strong focus:ring-2 focus:ring-fg-strong/10 appearance-none pr-10 cursor-pointer transition-all"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company} — {c.name}
                </option>
              ))}
            </select>
            <Users
              size={16}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-muted pointer-events-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs px-3 py-1 rounded-full bg-ok-100 text-ok-600 border border-ok-600/20 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-ok-600 animate-pulse" />
              Memory Connected
            </span>
            <Badge variant="secondary" className="text-[10px] py-0.5 px-2">
              Hindsight
            </Badge>
            {(() => {
              const active = customers.find((c) => c.id === cid)
              if (!active) return null
              const shortBank = `dealmind-${String(cid).slice(0, 8)}…`
              const profile =
                /acme/i.test(active.company || "")
                  ? "on-premise · CTO"
                  : /nova/i.test(active.company || "")
                    ? "cloud-native · VP Eng"
                    : active.deal_stage || "Lead"
              return (
                <>
                  <span
                    title={`Full bank: dealmind-${cid}`}
                    className="hidden sm:inline-flex font-mono text-[10px] px-2 py-1 rounded-full bg-surface-2 text-fg-subtle border border-line"
                  >
                    bank: {shortBank}
                  </span>
                  <span className="hidden md:inline-flex text-[10px] px-2 py-1 rounded-full bg-surface-2 text-fg-subtle border border-line">
                    {profile}
                  </span>
                </>
              )
            })()}
          </div>
        </div>

        {!customers.length && (
          <span className="text-xs text-fg-muted">
            Seed demo data from Dashboard first.
          </span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-32">
        {loading && (
          <div className="space-y-4 pt-8">
            <Skeleton className="h-16 w-full max-w-[70%]" />
            <Skeleton className="h-16 w-full max-w-[70%] ml-auto" />
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-16 px-4">
            <div className="w-20 h-20 rounded-2xl bg-fg-strong grid place-items-center mb-6 shadow-sm">
              <Bot size={32} className="text-surface-1" />
            </div>
            <h3 className="text-2xl font-bold text-fg-strong mb-2">
              Start a conversation with {customers.find((c) => c.id === cid)?.company || "your customer"}
            </h3>
            <p className="text-sm text-fg-subtle max-w-md mb-8">
              DealMind remembers customer context across conversations. It retains durable facts and recalls them when relevant for personalized responses.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl w-full">
              {quickSuggestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => setInput(q)}
                  className="text-left px-4 py-3 rounded-xl bg-surface-1 border border-line hover:bg-surface-2 hover:border-line-strong transition-all duration-200 text-xs text-fg-subtle"
                >
                  "{q}"
                </button>
              ))}
            </div>
          </div>
        )}

        {!loading &&
          messages.map((msg, i) => (
            <div key={i} className="animate-fadeIn">
              <MessageBubble
                role={msg.role}
                content={msg.message}
                timestamp={msg.timestamp}
                memoryInfo={msg.memoryInfo}
                evidence={msg.evidence}
              />
            </div>
          ))}

        {typing && (
          <div className="flex items-start gap-3 max-w-[70%]">
            <div className="w-8 h-8 rounded-full bg-surface-2 border border-line flex items-center justify-center flex-shrink-0">
              <Bot size={16} className="text-fg-subtle" />
            </div>
            <div className="bg-surface-1 border border-line rounded-2xl px-4 py-3 rounded-tl-none">
              <div className="flex items-center gap-1.5 text-sm text-fg-muted">
                <span>DealMind is typing</span>
                <div className="flex gap-0.5">
                  {/* Inline delays: Tailwind has no `animation-delay-*` utility,
                      so the `animation-delay-200/400` classes that used to be
                      here were stripped at build time and all three dots
                      bounced in unison. */}
                  {[0, 150, 300].map((delay) => (
                    <span
                      key={delay}
                      style={{ animationDelay: `${delay}ms` }}
                      className="w-1 h-1 rounded-full bg-fg-strong animate-bounce"
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* Input Area */}
      {/* `md:static` only — the previous `md:static md:relative` declared two
          contradictory position values and relied on stylesheet order. */}
      <div className="fixed bottom-0 left-0 right-0 md:static border-t border-line bg-surface-1/95 backdrop-blur z-10">
        <div className="max-w-4xl mx-auto p-4">
          {/* Quick Suggestions */}
          {messages.length === 0 && (
            <div className="flex flex-wrap gap-2 mb-3 justify-center md:justify-start">
              {quickSuggestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => setInput(q)}
                  className="text-xs px-3 py-1.5 rounded-full bg-surface-1 border border-line hover:bg-surface-2 hover:border-line-strong text-fg-subtle transition-all duration-200"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-3 items-end bg-surface-1 p-2 rounded-2xl border border-line focus-within:border-fg-strong focus-within:ring-2 focus-within:ring-fg-strong/10 transition-all duration-200">
            <div className="relative flex-1">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    sendMessage()
                  }
                }}
                placeholder="Type a message... (Shift+Enter for new line)"
                className="w-full bg-transparent border-none outline-none px-4 py-2.5 text-sm text-fg placeholder-fg-muted resize-none min-h-[44px] max-h-32"
                rows={1}
              />
              <button
                className="absolute right-3 bottom-2.5 text-fg-muted hover:text-fg transition-colors"
                title="Attach file"
              >
                <Paperclip size={16} />
              </button>
            </div>
            <Button
              onClick={sendMessage}
              disabled={!input.trim() || !cid}
              size="lg"
              className="rounded-xl px-4 h-[44px] flex-shrink-0"
            >
              <Send size={18} className="ml-1" />
            </Button>
          </div>
          <div className="text-center mt-2">
            <p className="text-[10px] text-fg-muted">
              AI can make mistakes. Verify important information.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
