import { forwardRef } from "react"
import { cn } from "../../lib/utils"

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "glass" | "gradient"
  hover?: boolean
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", hover = true, ...props }, ref) => {
    // Every variant is a white panel lifted off the canvas by a hairline plus a
    // soft shadow. The old set was written for a dark app: `default` was a
    // translucent dark slate, and `glass` referenced an ink-850 shade that was
    // never defined in the theme, so `variant="glass"` (used by every card on
    // the Dashboard) rendered fully transparent.
    const variants = {
      default: "bg-surface-1 border border-line",
      glass: "bg-surface-1/85 backdrop-blur-xl border border-line",
      gradient: "border border-line bg-gradient-to-b from-surface-1 to-surface-2",
    }

    return (
      <div
        className={cn(
          "rounded-card transition-[border-color,box-shadow] duration-300",
          // Neutral elevation only: the previous violet bloom was decorative
          // noise and made static, non-interactive cards look clickable.
          hover && "hover:border-line-strong hover:shadow-lg hover:shadow-black/5",
          variants[variant],
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Card.displayName = "Card"

interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: "sm" | "md" | "lg"
}

const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, padding = "md", ...props }, ref) => {
    const paddings = {
      sm: "p-4",
      md: "p-6",
      lg: "p-8",
    }

    return (
      <div
        className={cn(paddings[padding], className)}
        ref={ref}
        {...props}
      />
    )
  }
)
CardContent.displayName = "CardContent"

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  subtitle?: string
  icon?: React.ReactNode
  /** Right-aligned slot, e.g. a filter control. */
  actions?: React.ReactNode
}

const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, title, subtitle, icon, actions, children, ...props }, ref) => {
    return (
      <div
        className={cn(
          // px-6/py-4 so the header text lines up with the default `p-6`
          // CardContent below it. Previously this had only `pb-4`, which left
          // every card title 24px out of alignment with its own body.
          "flex items-center gap-4 border-b border-line px-6 py-4",
          className
        )}
        ref={ref}
        {...props}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {icon && (
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface-2 text-fg-subtle">
              {icon}
            </div>
          )}
          <div className="min-w-0">
            {title && <h3 className="truncate text-base font-semibold text-fg-strong">{title}</h3>}
            {subtitle && <p className="mt-0.5 truncate text-xs text-fg-muted">{subtitle}</p>}
          </div>
          {children}
        </div>

        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    )
  }
)
CardHeader.displayName = "CardHeader"

export { Card, CardContent, CardHeader, type CardProps, type CardContentProps, type CardHeaderProps }