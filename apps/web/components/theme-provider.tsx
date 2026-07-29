"use client"

import { MotionConfig } from "motion/react"

/**
 * v1 is dark-only (DESIGN.md §7): the `dark` class is set statically on
 * <html> in the root layout, so there's no theme switching and no next-themes
 * flash-prevention script. This provider only enforces prefers-reduced-motion
 * across all motion.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>
}
