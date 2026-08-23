import { desc, eq, sql } from "drizzle-orm"

import { db, schema } from "@/lib/db"

// DB-backed blog. Posts live in the blog_posts table, edited at /admin/blog.
// Body is Markdown rendered by components/blog/markdown.tsx. Public reads are
// published-only; the admin surface (lib/admin-blog.ts) sees all statuses.

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

export type BlogPostRow = typeof schema.blogPosts.$inferSelect

export function estimateReadingMinutes(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 220))
}

// Pure row → BlogPost mapping so pages and the editor preview agree on shape.
export function rowToBlogPost(row: BlogPostRow): BlogPost {
  return {
    slug: row.slug,
    frontmatter: {
      title: row.title,
      description: row.description,
      slug: row.slug,
      targetKeyword: row.targetKeyword ?? undefined,
      secondaryKeywords: (row.secondaryKeywords as string[]) ?? [],
      intent: row.intent ?? undefined,
      status: row.status,
      order: row.order ?? undefined,
    },
    content: row.content,
    readingMinutes: estimateReadingMinutes(row.content),
  }
}

// Published posts for the public site: by `order` (nulls last), then newest.
export async function getAllPosts(): Promise<BlogPost[]> {
  const rows = await db
    .select()
    .from(schema.blogPosts)
    .where(eq(schema.blogPosts.status, "published"))
    .orderBy(sql`${schema.blogPosts.order} asc nulls last`, desc(schema.blogPosts.publishedAt))
  return rows.map(rowToBlogPost)
}

export async function getPost(slug: string): Promise<BlogPost | null> {
  const row = await db.query.blogPosts.findFirst({
    where: (p, { and }) => and(eq(p.slug, slug), eq(p.status, "published")),
  })
  return row ? rowToBlogPost(row) : null
}
