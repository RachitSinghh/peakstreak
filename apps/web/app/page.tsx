import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { Button } from "@workspace/ui/components/button"

import { SiteHeader } from "@/components/landing/site-header"
import { SiteFooter } from "@/components/site-footer"
import { Hero } from "@/components/landing/hero"
import { Features } from "@/components/landing/features"
import { StreakBand } from "@/components/landing/streak-band"
import { TaglineReveal } from "@/components/landing/tagline-reveal"
import { Testimonials } from "@/components/landing/testimonials"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

// SoftwareApplication + Organization structured data for rich results. Kept in
// sync with the metadata in app/layout.tsx.
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: "PeakStreak",
      url: APP_URL,
      applicationCategory: "EducationalApplication",
      operatingSystem: "Web",
      description:
        "Paste a YouTube playlist. See exactly how long it takes. Actually finish it — with a real finish date, a daily streak, and a nudge the moment you slip.",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
    {
      "@type": "Organization",
      name: "PeakStreak",
      url: APP_URL,
    },
  ],
}

// No auth() call here — the "logged-in → dashboard" redirect lives in proxy.ts,
// which keeps this marketing page statically prerendered (best TTFB/LCP).
export default function LandingPage() {
  return (
    <div className="min-h-svh overflow-x-clip">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SiteHeader />

      <main>
        <Hero />
        <Features />
        <StreakBand />
        <TaglineReveal />
        <Testimonials />

        {/* closing CTA */}
        <section className="mx-auto max-w-5xl px-4 pt-20 pb-28 text-center sm:pt-28">
          <div className="border-border bg-card/60 relative overflow-hidden rounded-3xl border px-6 py-20">
            {/* lavender wash echoing the hero glow — the last premium beat */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(70% 120% at 50% 0%, rgba(94,106,210,0.16), transparent 60%)",
              }}
            />
            <div className="relative">
              <h2 className="mx-auto max-w-xl bg-gradient-to-r from-white to-[#9b9b9b] bg-clip-text text-2xl font-semibold tracking-tight text-balance text-transparent sm:text-3xl">
                Stop saving playlists. Start finishing them.
              </h2>
              <div className="mt-8 flex justify-center">
                <Button size="lg" render={<Link href="/signup" />}>
                  Create your free account
                  <ArrowRight className="size-4" />
                </Button>
              </div>
              <p className="text-muted-foreground mt-4 font-mono text-[11px]">
                Free forever · no card · start in under a minute
              </p>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
