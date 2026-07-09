import "server-only"

import fs from "node:fs"
import path from "node:path"

import matter from "gray-matter"

// File-based blog. Posts are Markdown files in content/blog with YAML
// frontmatter, read at build time (no dynamic APIs), so /blog and every post
// stay statically prerendered like the landing page. A CMS/posting surface can
// replace this reader later without changing the page components.
const BLOG_DIR = path.join(process.cwd(), "content/blog")

export type BlogFrontmatter = {
  title: string
  description: string
  slug: string
  targetKeyword?: string
  secondaryKeywords?: string[]
  intent?: "informational" | "transactional" | "commercial"
  status?: "draft" | "published"
  order?: number
}

export type BlogPost = {
  slug: string
  frontmatter: BlogFrontmatter
  content: string
  readingMinutes: number
}

function estimateReadingMinutes(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 220))
}

function loadPost(fileName: string): BlogPost {
  const raw = fs.readFileSync(path.join(BLOG_DIR, fileName), "utf8")
  const { data, content } = matter(raw)
  const frontmatter = data as BlogFrontmatter
  const slug = frontmatter.slug ?? fileName.replace(/\.md$/, "")

  // Strip the leading H1 — the page renders the title from frontmatter, so a
  // duplicate top-level heading in the body would show the title twice.
  const body = content.replace(/^\s*#\s+.*\r?\n+/, "")

  return {
    slug,
    frontmatter: { ...frontmatter, slug },
    content: body,
    readingMinutes: estimateReadingMinutes(body),
  }
}

export function getAllPosts(): BlogPost[] {
  if (!fs.existsSync(BLOG_DIR)) return []

  return fs
    .readdirSync(BLOG_DIR)
    .filter((file) => file.endsWith(".md"))
    .map(loadPost)
    .sort(
      (a, b) =>
        (a.frontmatter.order ?? Number.MAX_SAFE_INTEGER) -
        (b.frontmatter.order ?? Number.MAX_SAFE_INTEGER),
    )
}

export function getPost(slug: string): BlogPost | null {
  return getAllPosts().find((post) => post.slug === slug) ?? null
}
