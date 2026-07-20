import { getTestimonials } from "@/lib/admin"

export async function Testimonials() {
  const items = await getTestimonials()
  if (items.length === 0) return null

  // Duplicate the list so the track can loop seamlessly (translateX -50% lands
  // exactly on the start of the second copy).
  const loop = [...items, ...items]

  return (
    <section className="border-border overflow-hidden border-y py-8">
      <p className="text-muted-foreground mb-6 text-center font-mono text-[10px] tracking-[0.18em] uppercase">
        What learners say
      </p>
      <style>{`
        @keyframes ps-marquee { from { transform: translateX(0) } to { transform: translateX(-50%) } }
        .ps-marquee { animation: ps-marquee 45s linear infinite; }
        .ps-marquee:hover { animation-play-state: paused; }
        @media (prefers-reduced-motion: reduce) { .ps-marquee { animation: none; } }
      `}</style>
      <div className="ps-marquee flex w-max items-stretch gap-4 px-4">
        {loop.map((t, i) => (
          <figure
            key={`${t.id}-${i}`}
            className="border-border bg-card/60 flex w-80 shrink-0 flex-col justify-between gap-4 rounded-2xl border p-5"
          >
            <blockquote className="line-clamp-4 text-sm leading-relaxed">
              “{t.message}”
            </blockquote>
            <figcaption className="flex items-center gap-2.5">
              <div className="bg-primary/15 text-primary grid size-8 shrink-0 place-items-center rounded-full text-xs font-semibold">
                {t.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-medium">{t.name}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  )
}
