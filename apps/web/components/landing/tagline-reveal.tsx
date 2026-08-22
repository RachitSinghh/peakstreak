"use client"

import { useEffect, useRef, useState } from "react"

// The body settles dim; only the pivotal words light up — the brand and
// "promise" in full white, the payoff "keep it" in lavender — so the line
// reads with rhythm and emphasis rather than as one even wall of text.
type Tone = "dim" | "bright" | "accent"
const LIT: Record<Tone, string> = {
  dim: "text-muted-foreground",
  bright: "text-foreground",
  accent: "text-primary",
}
const TOKENS: { w: string; tone: Tone; br?: boolean }[] = [
  { w: "Every", tone: "dim" },
  { w: "playlist", tone: "dim" },
  { w: "you", tone: "dim" },
  { w: "saved", tone: "dim" },
  { w: "was", tone: "dim" },
  { w: "a", tone: "dim" },
  { w: "promise", tone: "bright" },
  { w: "to", tone: "dim" },
  { w: "yourself.", tone: "dim", br: true },
  { w: "PeakStreak", tone: "bright" },
  { w: "is", tone: "dim" },
  { w: "how", tone: "dim" },
  { w: "you", tone: "dim" },
  { w: "finally", tone: "dim" },
  { w: "keep", tone: "accent" },
  { w: "it.", tone: "accent" },
]

/**
 * Large-type tagline moment (skill B11). Words warm from near-invisible to
 * their resting tone one at a time in reading order as the block scrolls in —
 * a single IntersectionObserver flips the state, staggered transition-delays
 * sequence the words. Only the key words settle bright, the rest stay dim.
 */
export function TaglineReveal() {
  const ref = useRef<HTMLParagraphElement>(null)
  const [lit, setLit] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setLit(true)
          io.disconnect()
        }
      },
      { rootMargin: "0px 0px -25% 0px" },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <section className="relative mx-auto max-w-3xl px-4 pb-20 sm:pb-28">
      {/* Dot matrix, radial-masked to fade at the edges. Extends up into the
          gap above so it reads as a field behind the text. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-24 bottom-0 -z-10"
        style={{
          backgroundImage: "radial-gradient(#3a3d45 1.2px, transparent 1.2px)",
          backgroundSize: "26px 26px",
          maskImage: "radial-gradient(50% 62% at 50% 52%, #000 30%, transparent 78%)",
          WebkitMaskImage: "radial-gradient(50% 62% at 50% 52%, #000 30%, transparent 78%)",
        }}
      />
      {/* Soft lavender glow behind the text — the hero's signature accent. */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-1/2 -z-10 h-[26rem] w-[38rem] max-w-full -translate-x-1/2 -translate-y-1/2 rounded-full blur-[120px]"
        style={{ background: "radial-gradient(circle, rgba(94,106,210,0.14), transparent 65%)" }}
      />
      <p className="text-muted-foreground mb-6 text-center font-mono text-[10px] tracking-[0.18em] uppercase">
        The promise
      </p>
      <p
        ref={ref}
        className="mx-auto max-w-[680px] text-center text-4xl leading-[1.2] font-semibold tracking-tight text-balance sm:text-5xl"
      >
        {TOKENS.map((t, i) => (
          <span key={i}>
            <span
              className={`transition-colors duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                lit ? LIT[t.tone] : "text-muted-foreground/20"
              }`}
              style={{ transitionDelay: `${i * 0.06}s` }}
            >
              {t.w}
            </span>
            {t.br ? <br /> : " "}
          </span>
        ))}
      </p>
    </section>
  )
}
