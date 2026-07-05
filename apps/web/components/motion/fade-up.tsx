"use client"

import { motion, useReducedMotion } from "motion/react"

/**
 * Entrance wrapper used across the app shell: content rises and fades in on
 * mount. `delay` staggers siblings into an orchestrated reveal. Holds at the
 * final state under prefers-reduced-motion.
 */
export function FadeUp({
  children,
  delay = 0,
  className,
  y = 16,
}: {
  children: React.ReactNode
  delay?: number
  className?: string
  y?: number
}) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: reduce ? 0 : delay }}
    >
      {children}
    </motion.div>
  )
}
