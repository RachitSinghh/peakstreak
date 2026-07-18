import { cn } from "@workspace/ui/lib/utils"

/**
 * The "PeakStreak" wordmark — uppercase, letter-spaced, PEAK in the foreground
 * colour and STREAK in a brand-indigo gradient. Shared across the app header,
 * landing header, and footer so the brand can't drift. Pass a size via
 * className (defaults inherit from the link/element wrapping it).
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-bold tracking-[0.2em] uppercase", className)}>
      <span className="text-foreground">Peak</span>
      <span className="from-primary via-[#9aa2ee] to-primary bg-gradient-to-r bg-clip-text text-transparent">
        Streak
      </span>
    </span>
  )
}
