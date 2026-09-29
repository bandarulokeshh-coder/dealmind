import type { ReactNode } from "react"
import { cn } from "../../lib/utils"

interface PageHeaderProps {
  title: string
  subtitle?: string
  /** Optional leading icon, rendered in a tinted square. */
  icon?: ReactNode
  /** Right-aligned actions such as buttons or selects. */
  actions?: ReactNode
  className?: string
}

/**
 * The single page-title block.
 *
 * Before this existed every page rolled its own header and they had drifted
 * apart: Dashboard/Customers used `font-bold` with a subtitle and a fade-in,
 * while Memory/LearningDemo/Settings used `font-semibold` with neither. One
 * component keeps them identical and makes changing the pattern a one-line edit.
 */
export function PageHeader({ title, subtitle, icon, actions, className }: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        {icon && (
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-line bg-surface-2 text-fg">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          {/* Painting this heading pure white made every page title invisible
              on the white root background. Headings read from the ink token. */}
          <h1 className="text-2xl font-bold tracking-tight text-fg-strong">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-fg-muted">{subtitle}</p>}
        </div>
      </div>

      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}
