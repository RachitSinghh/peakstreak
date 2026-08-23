import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { getPostAdmin } from "@/lib/admin-blog"
import { BlogEditor } from "@/components/admin/blog-editor"

export const metadata: Metadata = { title: "Edit post · Admin", robots: { index: false } }
export const dynamic = "force-dynamic"

export default async function EditBlogPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const row = await getPostAdmin(id)
  if (!row) notFound()

  return (
    <BlogEditor
      initial={{
        id: row.id,
        slug: row.slug,
        title: row.title,
        description: row.description,
        targetKeyword: row.targetKeyword ?? undefined,
        secondaryKeywords: (row.secondaryKeywords as string[]) ?? [],
        intent: row.intent ?? undefined,
        status: row.status,
        order: row.order ?? undefined,
        content: row.content,
      }}
    />
  )
}
