import { LandingPaste } from "@/components/landing-paste"
import { Ambient } from "@/components/landing/ambient"
import { PlanMeter } from "@/components/landing/plan-meter"

/**
 * Above-the-fold hero. The load sequence (headline lines rising out of a mask →
 * subcopy → paste tool) is CSS-driven (`.ps-*` in globals.css), so it plays on
 * first paint and the LCP headline never waits for an animation library. The
 * headline uses a transform-only reveal so the browser paints it immediately.
 *
 * Server Component; only the interactive pieces (Ambient's cursor glow,
 * PlanMeter's count-up, LandingPaste) ship JS.
 */
export function Hero() {
  return (
    <section className="relative">
      <Ambient />
      <div className="mx-auto flex max-w-5xl flex-col items-center px-4 pt-28 pb-16 text-center sm:pt-32 sm:pb-20">
        {/* One solid colour (DESIGN.md §3); the single lavender word is the
            page's one accent in the hero. No gradient-clip fill. */}
        <h1 className="text-foreground max-w-4xl text-[2rem] leading-[1.08] font-semibold tracking-tight text-balance sm:text-5xl lg:whitespace-nowrap">
          <span className="block overflow-hidden pb-1">
            <span
              className="ps-line-inner block"
              style={{ "--ps-delay": "0.1s" } as React.CSSProperties}
            >
              YouTube keeps you watching.
            </span>
          </span>
          <span className="block overflow-hidden pb-1">
            <span
              className="ps-line-inner block"
              style={{ "--ps-delay": "0.22s" } as React.CSSProperties}
            >
              PeakStreak makes you <span className="text-primary">finish.</span>
            </span>
          </span>
        </h1>

        <p
          className="ps-hero-anim text-muted-foreground mt-6 max-w-md text-base text-balance sm:text-lg"
          style={{ "--ps-delay": "0.4s" } as React.CSSProperties}
        >
          Paste a public playlist and get a finish date you&rsquo;ll actually hit.
        </p>

        <div
          className="ps-hero-anim mt-8 w-full max-w-xl"
          style={{ "--ps-delay": "0.55s" } as React.CSSProperties}
        >
          <LandingPaste />
        </div>

        <p
          className="ps-hero-anim text-muted-foreground mt-4 text-[13px]"
          style={{ "--ps-delay": "0.7s" } as React.CSSProperties}
        >
          Free, on any public playlist, with no YouTube account access.
        </p>

        <div className="mt-12 flex w-full justify-center sm:mt-14">
          <PlanMeter />
        </div>
      </div>
    </section>
  )
}
