import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, ArrowRight } from "lucide-react"

import { SiteHeader } from "@/components/landing/site-header"
import { Markdown } from "@/components/blog/markdown"
import { getAllPosts, getPost } from "@/lib/blog"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

export function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const post = getPost(slug)
  if (!post) return {}

  const { title, description } = post.frontmatter
  const url = `/blog/${post.slug}`
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: "article", url, title, description },
    twitter: { card: "summary_large_image", title, description },
  }
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const post = getPost(slug)
  if (!post) notFound()

  const { title, description, status, intent } = post.frontmatter

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: title,
    description,
    url: `${APP_URL}/blog/${post.slug}`,
    author: { "@type": "Organization", name: "PeakStreak" },
    publisher: { "@type": "Organization", name: "PeakStreak" },
    mainEntityOfPage: `${APP_URL}/blog/${post.slug}`,
  }

  return (
    <div className="min-h-svh overflow-x-clip">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SiteHeader />

      <main className="mx-auto max-w-2xl px-4 pt-28 pb-24 sm:pt-36">
        <Link
          href="/blog"
          className="text-muted-foreground hover:text-foreground mb-10 inline-flex items-center gap-1.5 text-sm"
        >
          <ArrowLeft className="size-4" />
          All posts
        </Link>

        <article>
          <header className="mb-10">
            <div className="text-muted-foreground mb-4 flex items-center gap-2 font-mono text-[11px] tracking-wide">
              <span className="text-primary uppercase">{intent}</span>
              <span aria-hidden>·</span>
              <span>{post.readingMinutes} min read</span>
              {status === "draft" && (
                <>
                  <span aria-hidden>·</span>
                  <span className="border-border rounded border px-1.5 py-0.5 uppercase">Draft</span>
                </>
              )}
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              {title}
            </h1>
            <p className="text-muted-foreground mt-4 text-base leading-7 text-balance">
              {description}
            </p>
          </header>

          <Markdown>{post.content}</Markdown>
        </article>

        <div className="border-border bg-card/60 mt-16 flex flex-col items-center gap-5 rounded-3xl border px-6 py-12 text-center">
          <h2 className="max-w-md text-xl font-semibold tracking-tight text-balance sm:text-2xl">
            Turn this into a plan you finish.
          </h2>
          <Link
            href="/"
            className="bg-primary text-primary-foreground inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium hover:opacity-90"
          >
            Paste your playlist
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </main>

      <footer className="border-border text-muted-foreground flex flex-col items-center gap-2 border-t py-8 text-center text-xs">
        <p>PeakStreak — for people who save playlists with real intent.</p>
        <div className="flex items-center gap-4">
          <Link href="/" className="hover:text-foreground underline-offset-4 hover:underline">
            Home
          </Link>
          <Link href="/blog" className="hover:text-foreground underline-offset-4 hover:underline">
            Blog
          </Link>
        </div>
      </footer>
    </div>
  )
}
