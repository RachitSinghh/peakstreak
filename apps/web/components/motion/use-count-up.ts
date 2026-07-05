"use client"

import { useEffect, useRef, useState } from "react"
import { useReducedMotion } from "motion/react"

/**
 * Ramps an integer from 0 to `target` on mount for a satisfying tick-up.
 * Returns `target` immediately under prefers-reduced-motion.
 */
export function useCountUp(target: number, durationMs = 900): number {
  const reduce = useReducedMotion()
  const [value, setValue] = useState(0)
  const raf = useRef<number>(0)

  useEffect(() => {
    if (reduce) return
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs)
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(Math.round(eased * target))
      if (t < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [target, durationMs, reduce])

  return reduce ? target : value
}
