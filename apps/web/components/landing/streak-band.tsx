import { Flame, Snowflake } from "lucide-react"

import { Reveal } from "@/components/landing/reveal"

const DAYS = 14
const FROZEN = 8 // the one day a weekly freeze covered

export function StreakBand() {
  return (
    <section className="mx-auto max-w-5xl px-4 pb-24">
      <div className="border-border bg-card/60 relative overflow-hidden rounded-3xl border p-8 sm:p-12">
        {/* warm ember wash — the single non-lavender accent on the page */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              "radial-gradient(60% 120% at 20% 0%, rgba(240,136,62,0.10), transparent 60%)",
          }}
        />
        <div className="relative flex flex-col gap-8">
          <div className="max-w-lg">
            <span className="text-muted-foreground font-mono text-[10px] tracking-[0.18em] uppercase">
              14-day streak · 1 freeze used
            </span>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
              One video a day keeps the flame lit.
            </h2>
            <p className="text-muted-foreground mt-2 max-w-md text-sm leading-relaxed">
              Miss a day and a weekly freeze quietly covers you. Miss twice, and the streak resets —
              the stakes are what keep it real.
            </p>
          </div>

          <Reveal className="flex flex-wrap gap-2">
            {Array.from({ length: DAYS }).map((_, i) => {
              const frozen = i === FROZEN
              return (
                <div
                  key={i}
                  className="ps-pop grid size-9 place-items-center rounded-lg border"
                  style={
                    {
                      ["--ps-delay"]: `${i * 0.06}s`,
                      borderColor: frozen ? "rgba(94,106,210,0.4)" : "rgba(240,136,62,0.35)",
                      background: frozen
                        ? "rgba(94,106,210,0.14)"
                        : "linear-gradient(160deg, rgba(240,136,62,0.22), rgba(212,167,44,0.12))",
                    } as React.CSSProperties
                  }
                >
                  {frozen ? (
                    <Snowflake className="size-4" style={{ color: "#8b95e8" }} />
                  ) : (
                    <span
                      className="ps-flicker block"
                      style={
                        {
                          "--ps-flicker-jitter": `${(i % 4) * 0.25}s`,
                          "--ps-delay": `${i * 0.08}s`,
                        } as React.CSSProperties
                      }
                    >
                      <Flame className="size-4" style={{ color: "#f0883e" }} />
                    </span>
                  )}
                </div>
              )
            })}
          </Reveal>
        </div>
      </div>
    </section>
  )
}
