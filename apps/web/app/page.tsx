import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { Button } from "@workspace/ui/components/button"

import { SiteHeader } from "@/components/landing/site-header"
import { SiteFooter } from "@/components/site-footer"
import { Hero } from "@/components/landing/hero"
import { Features } from "@/components/landing/features"
import { StreakBand } from "@/components/landing/streak-band"

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

        {/* closing CTA */}
        <section className="mx-auto max-w-5xl px-4 pb-28 text-center">
          <div className="border-border bg-card/60 relative overflow-hidden rounded-3xl border px-6 py-16">
            <h2 className="mx-auto max-w-xl text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
              Stop saving playlists. Start finishing them.
            </h2>
            <div className="mt-8 flex justify-center">
              <Button size="lg" render={<Link href="/signup" />}>
                Create your free account
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
