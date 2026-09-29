import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export type { ClassValue }

/**
 * Merge class names, resolving conflicting Tailwind utilities so the last one
 * wins (`cn("p-2", "p-4")` -> `"p-4"`).
 *
 * Every `components/ui/*` primitive merges its `className` prop *after* its
 * variant classes, so callers can override any variant default. A plain string
 * concat cannot do that: both classes get emitted and the winner is decided by
 * stylesheet order rather than by the caller's intent.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}