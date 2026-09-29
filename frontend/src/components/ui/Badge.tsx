import { forwardRef } from "react"
import { cn } from "../../lib/utils"

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "accent" | "success" | "warning" | "destructive"
  size?: "sm" | "default"
}

const Badge = forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    // The previous version referenced `hover:glow-violet` / `hover:glow-emerald`,
    // neither of which exists as a utility, plus a `hover:scale-105` that made
    // every label twitch on mouseover. Status pills should stay still.
    // Light tints with dark type. The previous variants used pale pastel text
    // over 15%-alpha fills — built for a dark background, and near-invisible
    // once the app rendered on white.
    const variants = {
      default: "bg-surface-2 text-fg border border-line",
      secondary: "bg-surface-2 text-fg-subtle border border-line",
      accent: "bg-warn-100 text-warn-600 border border-warn-600/20",
      success: "bg-ok-100 text-ok-600 border border-ok-600/20",
      warning: "bg-warn-100 text-warn-600 border border-warn-600/20",
      destructive: "bg-danger-100 text-danger-600 border border-danger-600/20",
    }

    const sizes = {
      sm: "px-2 py-0.5 text-[10px]",
      default: "px-2.5 py-0.5 text-xs",
    }

    return (
      <div
        className={cn(
          "inline-flex items-center justify-center gap-1 rounded-full font-medium",
          "whitespace-nowrap leading-5",
          sizes[size],
          variants[variant],
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Badge.displayName = "Badge"

export { Badge, type BadgeProps }