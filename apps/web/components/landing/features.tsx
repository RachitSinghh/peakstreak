import { CalendarDays, Flame, NotebookPen } from "lucide-react"

import { Reveal } from "@/components/landing/reveal"

// A real lifecycle — before / during / after — so the phase markers carry
// meaning rather than decoration.
const PHASES = [
  {
    phase: "Before you start",
    icon: CalendarDays,
    title: "See the real cost up front",
    body: "Total runtime, video count, and a finish date computed from a pace you choose — before you commit a single evening.",
  },
  {
    phase: "Every day",
    icon: Flame,
    title: "Keep a streak, earn a freeze",
    body: "One video a day keeps the flame lit. Miss a day? A weekly streak freeze has your back — twice doesn't.",
  },
  {
    phase: "The day you finish",
    icon: NotebookPen,
    title: "Finish with proof you learned",
    body: "Private notes beside every video, compiled into one exportable document the day you finish.",
  },
]

export function Features() {
  return (
    <Reveal as="section" className="mx-auto max-w-5xl px-4 py-20 sm:py-28">
      <h2 className="ps-reveal mx-auto max-w-2xl text-center text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
        A finite plan, start to finish.
      </h2>

      <div className="mt-12 grid gap-4 sm:grid-cols-3">
        {PHASES.map((p, i) => (
          // Outer element carries the scroll reveal; inner card owns the hover
          // lift — kept separate so the two transforms never fight.
          <div
            key={p.title}
            className="ps-reveal"
            style={{ "--ps-delay": `${0.1 + i * 0.12}s` } as React.CSSProperties}
          >
            <div className="group border-border bg-card hover:border-primary/40 relative h-full overflow-hidden rounded-2xl border p-6 transition-[colors,transform] duration-300 hover:-translate-y-1">
              <div
                aria-hidden
                className="from-primary/10 pointer-events-none absolute -top-16 -right-16 h-32 w-32 rounded-full bg-gradient-to-br to-transparent opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
              />
              <span className="text-muted-foreground font-mono text-[10px] tracking-[0.18em] uppercase">
                {p.phase}
              </span>
              <p.icon className="text-primary mt-4 size-5" />
              <h3 className="mt-3 text-base font-semibold">{p.title}</h3>
              <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">{p.body}</p>
            </div>
          </div>
        ))}
      </div>
    </Reveal>
  )
}
