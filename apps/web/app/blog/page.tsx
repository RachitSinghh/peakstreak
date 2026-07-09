import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, ArrowUpRight } from "lucide-react"

import { SiteHeader } from "@/components/landing/site-header"
import { SiteFooter } from "@/components/site-footer"
import { Reveal } from "@/components/landing/reveal"
import { getAllPosts } from "@/lib/blog"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Field notes on finishing what you start — playlist length, learning consistency, and the tools that help you complete a YouTube course.",
  alternates: { canonical: "/blog" },
  openGraph: {
    type: "website",
    url: "/blog",
    title: "PeakStreak Blog",
    description:
      "Field notes on finishing what you start — playlist length, learning consistency, and the tools that help you complete a YouTube course.",
  },
}

export default function BlogIndexPage() {
  const posts = getAllPosts()

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "PeakStreak Blog",
    url: `${APP_URL}/blog`,
    blogPost: posts.map((p) => ({
      "@type": "BlogPosting",
      headline: p.frontmatter.title,
      description: p.frontmatter.description,
      url: `${APP_URL}/blog/${p.slug}`,
    })),
  }

  return (
    <div className="min-h-svh overflow-x-clip">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SiteHeader />

      <main className="mx-auto max-w-3xl px-4 pt-28 pb-24 sm:pt-36">
        <Reveal as="section">
          <span className="ps-reveal border-border bg-card/50 text-muted-foreground mb-6 inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[11px] tracking-wide">
            <span className="bg-primary size-1.5 rounded-full" />
            The PeakStreak blog
          </span>
          <h1 className="ps-reveal max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Field notes on finishing what you start.
          </h1>
          <p
            className="ps-reveal text-muted-foreground mt-4 max-w-xl text-base text-balance"
            style={{ "--ps-delay": "0.06s" } as React.CSSProperties}
          >
            Playlist length, learning consistency, and the honest trade-offs behind the tools that
            help you complete a YouTube course.
          </p>
        </Reveal>

        <Reveal as="section" className="mt-14 flex flex-col gap-4">
          {posts.map((post, i) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="ps-reveal group border-border bg-card/40 hover:bg-card/70 hover:border-primary/40 relative block rounded-2xl border p-6 transition-colors"
              style={{ "--ps-delay": `${Math.min(i, 6) * 0.06}s` } as React.CSSProperties}
            >
              <div className="text-muted-foreground mb-3 flex items-center gap-2 font-mono text-[11px] tracking-wide">
                <span className="text-primary uppercase">{post.frontmatter.intent}</span>
                <span aria-hidden>·</span>
                <span>{post.readingMinutes} min read</span>
                {post.frontmatter.status === "draft" && (
                  <>
                    <span aria-hidden>·</span>
                    <span className="border-border rounded border px-1.5 py-0.5 uppercase">
                      Draft
                    </span>
                  </>
                )}
              </div>
              <h2 className="text-lg font-semibold tracking-tight text-balance">
                {post.frontmatter.title}
              </h2>
              <p className="text-muted-foreground mt-2 text-sm leading-6">
                {post.frontmatter.description}
              </p>
              <span className="text-primary mt-4 inline-flex items-center gap-1 text-sm font-medium">
                Read
                <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </span>
            </Link>
          ))}
        </Reveal>

        <Reveal as="section" className="mt-16">
          <div className="border-border bg-card/60 flex flex-col items-center gap-5 rounded-3xl border px-6 py-12 text-center">
            <h2 className="ps-reveal max-w-md text-xl font-semibold tracking-tight text-balance sm:text-2xl">
              Stop saving playlists. Start finishing them.
            </h2>
            <Link
              href="/"
              className="ps-reveal bg-primary text-primary-foreground inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium hover:opacity-90"
            >
              Paste a playlist
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </Reveal>
      </main>

      <SiteFooter />
    </div>
  )
}
