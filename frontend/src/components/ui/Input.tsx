import { forwardRef, useId } from "react"
import { cn } from "../../lib/utils"

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    // Wire <label> to <input>. Without htmlFor/id the label was inert: clicking
    // it did not focus the field and screen readers did not associate the two.
    const generatedId = useId()
    const inputId = id ?? generatedId
    const errorId = `${inputId}-error`

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-fg-subtle">
            {label}
          </label>
        )}
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            // White field on the white panel, so the border carries the shape
            // and focus deepens it to ink instead of changing hue.
            "flex h-11 w-full rounded-xl bg-surface-1 border border-line",
            "px-4 py-2.5 text-sm text-fg",
            "placeholder:text-fg-muted",
            "focus:outline-none focus:border-fg-strong focus:ring-2 focus:ring-fg-strong/10",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "transition-all duration-200",
            "hover:border-line-strong",
            error && "border-danger-600/50 focus:border-danger-600 focus:ring-danger-600/10",
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <p id={errorId} role="alert" className="text-xs text-danger-600">
            {error}
          </p>
        )}
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input, type InputProps }