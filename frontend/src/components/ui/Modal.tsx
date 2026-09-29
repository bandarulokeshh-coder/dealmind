import { useEffect, useRef, type ReactNode } from "react"
import { X } from "lucide-react"
import { cn } from "../../lib/utils"

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  icon?: ReactNode
  children: ReactNode
  /** Dialog width. */
  size?: "md" | "lg" | "xl"
  className?: string
}

/**
 * Accessible dialog used by the Customers and Deals pages.
 *
 * Both pages previously hand-rolled a `fixed inset-0` backdrop with a Card
 * inside: no `role="dialog"`, no `aria-modal`, no Escape-to-close, no focus
 * management and no body scroll lock — so the page behind kept scrolling and
 * keyboard users could not dismiss it at all.
 */
export function Modal({
  open,
  onClose,
  title,
  subtitle,
  icon,
  children,
  size = "md",
  className,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }

    // Move focus into the dialog on open and hand it back on close.
    const previouslyFocused = document.activeElement as HTMLElement | null
    panelRef.current?.focus()

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    window.addEventListener("keydown", onKeyDown)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
      document.body.style.overflow = previousOverflow
      if (previouslyFocused && typeof previouslyFocused.focus === "function") {
        previouslyFocused.focus()
      }
    }
  }, [open, onClose])

  if (!open) return null

  const widths = {
    md: "max-w-md",
    lg: "max-w-2xl",
    xl: "max-w-3xl",
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-fg-strong/40 p-4 backdrop-blur-sm sm:items-center animate-fadeIn"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn(
          "w-full rounded-card border border-line bg-surface-1",
          "my-8 shadow-2xl shadow-black/20 outline-none sm:my-0",
          widths[size],
          className
        )}
        // Clicking the panel itself must not dismiss it.
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start gap-4 border-b border-line px-6 py-4">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {icon && (
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface-2 text-fg-subtle">
                {icon}
              </div>
            )}
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-fg-strong">{title}</h2>
              {subtitle && <p className="mt-0.5 truncate text-xs text-fg-muted">{subtitle}</p>}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="-mr-2 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}