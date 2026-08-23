import fs from "node:fs"
import path from "node:path"

import { and, desc, eq, ne, sql } from "drizzle-orm"
import matter from "gray-matter"

import { db, schema } from "@/lib/db"
import type { BlogPostRow } from "@/lib/blog"

export interface AdminBlogRow {
  id: string
  slug: string
  title: string
  status: "draft" | "published"
  order: number | null
  updatedAt: Date
}

export interface SavePostInput {
  id?: string
  slug: string
  title: string
  description: string
  targetKeyword?: string
  secondaryKeywords: string[]
  intent?: "informational" | "transactional" | "commercial"
  status: "draft" | "published"
  order?: number
  content: string
}

export async function listPostsAdmin(): Promise<AdminBlogRow[]> {
  return db
    .select({
      id: schema.blogPosts.id,
      slug: schema.blogPosts.slug,
      title: schema.blogPosts.title,
      status: schema.blogPosts.status,
      order: schema.blogPosts.order,
      updatedAt: schema.blogPosts.updatedAt,
    })
    .from(schema.blogPosts)
    .orderBy(desc(schema.blogPosts.updatedAt))
}

export async function getPostAdmin(id: string): Promise<BlogPostRow | null> {
  const row = await db.query.blogPosts.findFirst({ where: eq(schema.blogPosts.id, id) })
  return row ?? null
}

// Upsert. publishedAt is stamped the first time status becomes published and
// never cleared, so unpublish→republish keeps the original date.
export async function savePost(input: SavePostInput): Promise<{ id: string }> {
  const clash = await db.query.blogPosts.findFirst({
    where: input.id
      ? and(eq(schema.blogPosts.slug, input.slug), ne(schema.blogPosts.id, input.id))
      : eq(schema.blogPosts.slug, input.slug),
    columns: { id: true },
  })
  if (clash) throw new Error("Slug already in use")

  const fields = {
    slug: input.slug,
    title: input.title,
    description: input.description,
    targetKeyword: input.targetKeyword ?? null,
    secondaryKeywords: input.secondaryKeywords,
    intent: input.intent ?? null,
    status: input.status,
    order: input.order ?? null,
    content: input.content,
    updatedAt: new Date(),
  }

  if (input.id) {
    const existing = await db.query.blogPosts.findFirst({
      where: eq(schema.blogPosts.id, input.id),
      columns: { publishedAt: true },
    })
    const publishedAt =
      existing?.publishedAt ?? (input.status === "published" ? new Date() : null)
    await db
      .update(schema.blogPosts)
      .set({ ...fields, publishedAt })
      .where(eq(schema.blogPosts.id, input.id))
    return { id: input.id }
  }

  const [row] = await db
    .insert(schema.blogPosts)
    .values({ ...fields, publishedAt: input.status === "published" ? new Date() : null })
    .returning({ id: schema.blogPosts.id })
  return { id: row!.id }
}

export async function deletePost(id: string): Promise<void> {
  await db.delete(schema.blogPosts).where(eq(schema.blogPosts.id, id))
}

// One-time migration of the file-based posts into the table. Idempotent: a
// slug that already exists is updated in place, so re-running never duplicates.
export async function importFilePosts(): Promise<{ imported: number }> {
  const dir = path.join(process.cwd(), "content/blog")
  if (!fs.existsSync(dir)) return { imported: 0 }

  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md"))
  for (const file of files) {
    const raw = fs.readFileSync(path.join(dir, file), "utf8")
    const { data, content } = matter(raw)
    const slug = (data.slug as string) ?? file.replace(/\.md$/, "")
    // Strip the leading H1; the page renders the title from frontmatter.
    const body = content.replace(/^\s*#\s+.*\r?\n+/, "")
    const existing = await db.query.blogPosts.findFirst({
      where: eq(schema.blogPosts.slug, slug),
      columns: { id: true },
    })
    await savePost({
      id: existing?.id,
      slug,
      title: data.title as string,
      description: data.description as string,
      targetKeyword: (data.targetKeyword as string) ?? undefined,
      secondaryKeywords: (data.secondaryKeywords as string[]) ?? [],
      intent: data.intent as SavePostInput["intent"],
      status: (data.status as SavePostInput["status"]) ?? "draft",
      order: typeof data.order === "number" ? data.order : undefined,
      content: body,
    })
  }

  const [totals] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.blogPosts)
  return { imported: Number(totals?.n ?? 0) }
}
