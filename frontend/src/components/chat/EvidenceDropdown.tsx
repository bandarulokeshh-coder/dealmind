import { useState } from "react"
import { ChevronDown, ExternalLink, Sparkles, Shield } from "lucide-react"
import { cn } from "../../lib/utils"

interface EvidenceItem {
  text: string
  relevance: number
  source?: string
}

interface EvidenceDropdownProps {
  evidence: EvidenceItem[]
}

export default function EvidenceDropdown({ evidence }: EvidenceDropdownProps) {
  const [open, setOpen] = useState(false)

  const getRelevanceColor = (relevance: number) => {
    if (relevance >= 0.8) return "text-ok-600"
    if (relevance >= 0.5) return "text-warn-600"
    return "text-fg-muted"
  }

  return (
    <div className="mt-2 animate-fadeIn">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-xs text-fg-strong underline decoration-line-strong underline-offset-2 hover:decoration-fg-strong transition-colors group"
      >
        <Sparkles size={12} />
        <span>Why this recommendation?</span>
        <ChevronDown
          size={12}
          className={cn("transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="mt-3 space-y-2 border border-line rounded-xl overflow-hidden bg-surface-2">
          {evidence.map((item, index) => (
            <div
              key={index}
              className="p-3 hover:bg-surface-1 transition-colors border-b border-line last:border-0"
            >
              <div className="flex items-start gap-2">
                <Shield
                  size={14}
                  className={cn("flex-shrink-0 mt-0.5", getRelevanceColor(item.relevance))}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-fg leading-relaxed">{item.text}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span
                      className={cn(
                        // The tint used to be hard-coded emerald regardless of
                        // the score, so a 0% match and a 95% match looked
                        // identical. It now follows the same threshold as the
                        // shield icon next to it.
                        "text-xs font-medium px-2 py-0.5 rounded-full border",
                        item.relevance >= 0.8
                          ? "text-ok-600 bg-ok-100 border-ok-600/20"
                          : item.relevance >= 0.5
                            ? "text-warn-600 bg-warn-100 border-warn-600/20"
                            : "text-fg-muted bg-surface-1 border-line"
                      )}
                    >
                      {Math.round(item.relevance * 100)}% relevant
                    </span>
                    {item.source && (
                      <span className="text-xs text-fg-muted">{item.source}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}