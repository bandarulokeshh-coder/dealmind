import { forwardRef } from "react"
import { Slot } from "@radix-ui/react-slot"
import { cn } from "../../lib/utils"

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
  variant?: "default" | "ghost" | "secondary" | "outline" | "gradient"
  size?: "default" | "sm" | "lg" | "icon"
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", asChild = false, ...props }, ref) => {
    const SlotComponent = asChild ? Slot : "button"

    // The primary fill is the near-black ink token with the surface token as
    // its type colour. Those two names flip together in `.theme-dark`, so the
    // same pairing renders black-on-white in light mode and white-on-black in
    // dark mode without a second rule.
    //
    // Hover is a slight opacity drop rather than a fixed shade for the same
    // reason: a hard-coded hover background would have to pick a theme. The
    // previous value was a dark indigo fill carrying near-black type, which
    // read as a disabled button, and the comment beside it claimed white type
    // that the classes never applied.
    const primary = "bg-fg-strong text-surface-1 shadow-sm hover:opacity-90"

    const variants = {
      default: primary,
      // Retained because five pages pass `variant="gradient"`. It now resolves
      // to the same solid black primary — the violet→indigo gradient it used to
      // be was the only non-monochrome fill in the app.
      gradient: primary,
      ghost:
        "bg-surface-1 text-fg border border-line hover:bg-surface-2 hover:border-line-strong",
      outline:
        "bg-transparent text-fg border border-line-strong hover:bg-surface-2",
      secondary:
        "bg-surface-2 text-fg border border-line hover:bg-surface-3",
    }

    const sizes = {
      sm: "h-8 gap-1.5 px-3 text-xs font-medium",
      default: "h-10 gap-2 px-4 text-sm",
      lg: "h-12 gap-2 px-6 text-base font-semibold",
      icon: "h-10 w-10",
    }

    return (
      <SlotComponent
        className={cn(
          "inline-flex items-center justify-center rounded-xl font-medium",
          "transition-all duration-200 active:scale-[0.98]",
          "disabled:pointer-events-none disabled:opacity-50",
          variants[variant],
          sizes[size],
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, type ButtonProps }