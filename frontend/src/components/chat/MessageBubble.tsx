import { useState } from "react"
import type { ReactNode } from "react"
import { Bot, User, Copy, Check, Sparkles } from "lucide-react"
import { cn } from "../../lib/utils"
import EvidenceDropdown from "./EvidenceDropdown"

interface MessageBubbleProps {
  role: "user" | "assistant"
  content: string
  timestamp?: string
  memoryInfo?: {
    recalled_count: number
    retained_count: number
    hindsight_available: boolean
  }
  evidence?: Array<{text: string; relevance: number}>
  isLoading?: boolean
}

export default function MessageBubble({
  role,
  content,
  timestamp,
  memoryInfo,
  evidence,
  isLoading = false,
}: MessageBubbleProps) {
  const isUser = role === "user"
  const [copied, setCopied] = useState<string | null>(null)

  const copyToClipboard = async (msgId: string) => {
    await navigator.clipboard.writeText(content)
    setCopied(msgId)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="flex items-start gap-3 max-w-[85%]">
      {/* Avatar */}
      <div
        className={cn(
          "flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200",
          isUser
            ? "bg-fg-strong"
            : "bg-surface-2 border border-line"
        )}
      >
        {isUser ? <User size={16} className="text-surface-1" /> : <Bot size={16} className="text-fg-subtle" />}
      </div>

      <div className="space-y-2 flex-1 min-w-0">
        {/* Message Bubble */}
        <div
          className={cn(
            "rounded-2xl px-4 py-3 text-sm break-words transition-all duration-200 relative group",
            // The user's turn is the solid black bubble, the agent's is a white
            // panel. Both read from tokens, so the pair inverts as a unit.
            isUser
              ? "bg-fg-strong text-surface-1 ml-auto rounded-tr-sm"
              : "bg-surface-1 border border-line text-fg rounded-tl-sm"
          )}
        >
          {isLoading ? (
            <TypingIndicator />
          ) : (
            // Structured chat text: paragraphs, dash/numbered bullets, and
            // **bold** only. Tables are banned by the system prompt, but old
            // answers may still contain pipe rows — render them as bullets.
            <div className={cn("leading-relaxed", isUser && "text-surface-1")}>
              {renderChatContent(content, isUser)}
            </div>
          )}

          {/* Action buttons - visible on hover */}
          <div className={cn(
            "flex items-center gap-2 mt-3 transition-opacity duration-200",
            isUser ? "opacity-0 group-hover:opacity-100" : "opacity-100"
          )}>
            <button
              onClick={() => copyToClipboard(`msg-${timestamp}`)}
              className={cn(
                "p-1 rounded transition-colors",
                // The control sits on the bubble it belongs to, so its hover
                // fill has to follow that surface — a light fill on the black
                // user bubble would flash white.
                isUser
                  ? "text-surface-1/70 hover:bg-surface-1/15 hover:text-surface-1"
                  : "text-fg-muted hover:bg-surface-2 hover:text-fg"
              )}
              title="Copy to clipboard"
            >
              {copied === `msg-${timestamp}` ? (
                <Check size={12} />
              ) : (
                <Copy size={12} />
              )}
            </button>
          </div>
        </div>

        {/* Memory indicator for assistant messages */}
        {!isUser && memoryInfo && (
          <div className="flex items-center gap-2 text-xs px-1">
            {memoryInfo.hindsight_available ? (
              <>
                <Sparkles size={12} className="text-fg-strong" />
                <span className="text-fg-strong font-medium">Recalled {memoryInfo.recalled_count} memories</span>
              </>
            ) : (
              <span className="text-fg-muted">Memory unavailable</span>
            )}
            <span className="text-fg-muted">•</span>
            <span className="text-fg-subtle">Learned {memoryInfo.retained_count} facts</span>
          </div>
        )}

        {/* Timestamp */}
        {timestamp && (
          <div className="text-[10px] text-fg-muted px-1">
            {new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
        )}

        {/* Evidence dropdown for assistant messages */}
        {!isUser && evidence && evidence.length > 0 && (
          <EvidenceDropdown evidence={evidence} />
        )}
      </div>
    </div>
  )
}

// --- Structured chat rendering (no new deps) ---
// Supports: paragraphs, "- "/"* " bullets, "1. " numbered items, **bold**.
// Leftover markdown tables from old answers (| cell |) degrade to bullets.

function renderInline(text: string, isUser: boolean, keyPrefix: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**") && p.length > 4) {
      return (
        <strong key={`${keyPrefix}-${i}`} className={cn("font-semibold", isUser ? "text-surface-1" : "text-fg-strong")}>
          {p.slice(2, -2)}
        </strong>
      )
    }
    return <span key={`${keyPrefix}-${i}`}>{p}</span>
  })
}

function renderChatContent(content: string, isUser: boolean) {
  const lines = content.replace(/\r\n/g, "\n").split("\n")
  const blocks: ReactNode[] = []
  let bullets: string[] = []
  let numbered: string[] = []

  const flushBullets = () => {
    if (!bullets.length) return
    const items = bullets
    bullets = []
    blocks.push(
      <ul key={`ul-${blocks.length}`} className="my-2 space-y-1.5">
        {items.map((b, i) => (
          <li key={i} className="flex items-start gap-2 text-[14px] leading-relaxed">
            <span aria-hidden className={cn("mt-[7px] h-1 w-1 shrink-0 rounded-full", isUser ? "bg-surface-1/80" : "bg-fg-strong")} />
            <span className="min-w-0 flex-1">{renderInline(b, isUser, `b${blocks.length}-${i}`)}</span>
          </li>
        ))}
      </ul>
    )
  }

  const flushNumbered = () => {
    if (!numbered.length) return
    const items = numbered
    numbered = []
    blocks.push(
      <ol key={`ol-${blocks.length}`} className="my-2 space-y-1.5">
        {items.map((b, i) => (
          <li key={i} className="flex items-start gap-2 text-[14px] leading-relaxed">
            <span className={cn("w-4 shrink-0 text-right text-[12px] font-semibold tabular-nums", isUser ? "text-surface-1/80" : "text-fg-muted")}>
              {i + 1}.
            </span>
            <span className="min-w-0 flex-1">{renderInline(b, isUser, `n${blocks.length}-${i}`)}</span>
          </li>
        ))}
      </ol>
    )
  }

  lines.forEach((raw, idx) => {
    const line = raw.trim()
    if (!line) {
      flushBullets()
      flushNumbered()
      return
    }
    // Headings / dividers from old answers: plain semibold text
    const heading = line.match(/^#{1,4}\s+(.*)/)
    if (heading) {
      flushBullets(); flushNumbered()
      blocks.push(
        <p key={idx} className={cn("mb-1 mt-2 text-[14px] font-semibold first:mt-0", isUser ? "text-surface-1" : "text-fg-strong")}>
          {renderInline(heading[1], isUser, `h${idx}`)}
        </p>
      )
      return
    }
    if (/^(-{3,}|_{3,}|\*{3,})$/.test(line)) return
    // Table rows / separators: fold cell text into a bullet
    if (line.includes("|")) {
      const cells = line.split("|").map((c) => c.replace(/\*\*/g, "").trim()).filter(Boolean)
        .filter((c) => !/^:?-{2,}:?$/.test(c))
      flushNumbered()
      if (cells.length) bullets.push(cells.join(" — "))
      if (line.startsWith("|") || idx === lines.length - 1) flushBullets()
      return
    }
    const bullet = line.match(/^[-*]\s+(.*)/)
    if (bullet) {
      flushNumbered()
      bullets.push(bullet[1])
      return
    }
    const num = line.match(/^\d+[.)]\s+(.*)/)
    if (num) {
      flushBullets()
      numbered.push(num[1])
      return
    }
    flushBullets()
    flushNumbered()
    blocks.push(
      <p key={idx} className="mb-2 text-[14px] leading-relaxed last:mb-0">
        {renderInline(raw.trim(), isUser, `p${idx}`)}
      </p>
    )
  })
  flushBullets()
  flushNumbered()
  return blocks.length ? blocks : <p className="text-[14px]">{content}</p>
}

function TypingIndicator() {
  // Staggering needs a per-dot delay. Tailwind has no `animation-delay-*`
  // utilities, so the delay comes from inline style instead.
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-fg-muted text-xs">AI is thinking</span>
      <div className="flex gap-0.5">
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            style={{ animationDelay: `${delay}ms` }}
            className="w-1 h-1 rounded-full bg-fg-strong animate-bounce"
          />
        ))}
      </div>
    </div>
  )
}
