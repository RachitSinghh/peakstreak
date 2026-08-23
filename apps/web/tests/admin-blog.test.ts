import "./env-bootstrap"

import { beforeEach, describe, expect, it } from "vitest"

import { db, resetDb, schema } from "./helpers"
import { getAllPosts, getPost, rowToBlogPost } from "@/lib/blog"
import {
  deletePost,
  getPostAdmin,
  importFilePosts,
  listPostsAdmin,
  savePost,
} from "@/lib/admin-blog"

async function insertPost(overrides: Partial<typeof schema.blogPosts.$inferInsert> = {}) {
  const [row] = await db
    .insert(schema.blogPosts)
    .values({
      slug: overrides.slug ?? "test-post",
      title: overrides.title ?? "Test Post",
      description: overrides.description ?? "A test.",
      content: overrides.content ?? "Body text here.",
      status: overrides.status ?? "published",
      ...overrides,
    })
    .returning()
  return row
}

describe("blog reader", () => {
  beforeEach(resetDb)

  it("rowToBlogPost maps fields and computes reading minutes", async () => {
    const row = await insertPost({ content: "word ".repeat(440).trim() })
    const post = rowToBlogPost(row)
    expect(post.slug).toBe("test-post")
    expect(post.frontmatter.title).toBe("Test Post")
    expect(post.readingMinutes).toBe(2) // 440 words / 220
  })

  it("getAllPosts returns published only", async () => {
    await insertPost({ slug: "pub", status: "published" })
    await insertPost({ slug: "dra", status: "draft" })
    const posts = await getAllPosts()
    expect(posts.map((p) => p.slug)).toEqual(["pub"])
  })

  it("getPost returns null for a draft slug", async () => {
    await insertPost({ slug: "hidden", status: "draft" })
    expect(await getPost("hidden")).toBeNull()
  })
})

describe("admin blog CRUD", () => {
  beforeEach(resetDb)

  const base = {
    slug: "guide",
    title: "Guide",
    description: "d",
    secondaryKeywords: [] as string[],
    status: "draft" as const,
    content: "hello world",
  }

  it("savePost inserts then updates the same row", async () => {
    const { id } = await savePost(base)
    const { id: id2 } = await savePost({ ...base, id, title: "Guide v2" })
    expect(id2).toBe(id)
    const row = await getPostAdmin(id)
    expect(row?.title).toBe("Guide v2")
  })

  it("sets publishedAt only on the first publish and keeps it", async () => {
    const { id } = await savePost(base) // draft → null
    expect((await getPostAdmin(id))?.publishedAt).toBeNull()
    await savePost({ ...base, id, status: "published" })
    const firstPublish = (await getPostAdmin(id))!.publishedAt
    expect(firstPublish).not.toBeNull()
    await savePost({ ...base, id, status: "draft" }) // unpublish
    expect((await getPostAdmin(id))?.publishedAt?.getTime()).toBe(firstPublish!.getTime())
  })

  it("rejects a duplicate slug on a different post", async () => {
    await savePost(base)
    await expect(savePost({ ...base, slug: "guide", title: "Other" })).rejects.toThrow(/slug/i)
  })

  it("listPostsAdmin returns all statuses; deletePost removes", async () => {
    const { id } = await savePost({ ...base, slug: "a", status: "draft" })
    await savePost({ ...base, slug: "b", status: "published" })
    expect((await listPostsAdmin()).length).toBe(2)
    await deletePost(id)
    expect((await listPostsAdmin()).length).toBe(1)
  })
})

describe("importFilePosts", () => {
  beforeEach(resetDb)

  it("imports the repo's markdown posts and is idempotent", async () => {
    const first = await importFilePosts()
    expect(first.imported).toBeGreaterThanOrEqual(5)
    const second = await importFilePosts()
    expect(second.imported).toBe(first.imported) // no duplicates on re-run
  })
})
