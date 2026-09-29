import { forwardRef } from "react"
import { cn } from "../../lib/utils"

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        // The old white-at-5%-alpha gradient was invisible on the white canvas
        // the rest of the app renders on, so loading states looked like empty
        // space. The fill now comes from the divider token.
        className={cn(
          "rounded-xl bg-surface-3 animate-pulse",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Skeleton.displayName = "Skeleton"

interface SkeletonCardProps extends React.HTMLAttributes<HTMLDivElement> {}

const SkeletonCard = forwardRef<HTMLDivElement, SkeletonCardProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        className={cn(
          "space-y-3 animate-pulse",
          className
        )}
        ref={ref}
        {...props}
      >
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    )
  }
)
SkeletonCard.displayName = "SkeletonCard"

export { Skeleton, SkeletonCard }