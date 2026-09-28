import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"
export function cn(...c: (string|undefined|false)[]) { return twMerge(clsx(c)) }
