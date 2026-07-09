"use client"

import { useEffect, useRef, useState } from "react"

/**
 * Scroll-reveal wrapper. Adds `data-revealed="true"` once the element scrolls
 * into view, which the `.ps-reveal` / `.ps-pop` CSS keys off. Replaces Framer
 * Motion's `whileInView` with a few lines of IntersectionObserver so the
 * landing route ships no animation library for its entrance reveals.
 *
 * Children opt in by carrying `.ps-reveal` (fade+rise) or `.ps-pop`
 * (fade+rise+scale); stagger them with an inline `--ps-delay`. Under
 * prefers-reduced-motion the CSS has no hidden start-state, so content is
 * visible immediately regardless of the observer.
 */
export function Reveal({
  children,
  className,
  as: Tag = "div",
}: {
  children: React.ReactNode
  className?: string
  as?: "div" | "section"
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    // No reduced-motion special case needed: the `.ps-reveal`/`.ps-pop` hidden
    // start-states live inside a (prefers-reduced-motion: no-preference) query,
    // so those users see content immediately regardless of `data-revealed`.
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setRevealed(true)
          io.disconnect() // reveal once, then stop observing
        }
      },
      { rootMargin: "0px 0px -60px 0px" },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <Tag ref={ref} data-revealed={revealed} className={className}>
      {children}
    </Tag>
  )
}
