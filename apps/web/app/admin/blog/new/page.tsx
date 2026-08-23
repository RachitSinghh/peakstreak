import type { Metadata } from "next"

import { BlogEditor } from "@/components/admin/blog-editor"

export const metadata: Metadata = { title: "New post · Admin", robots: { index: false } }
export const dynamic = "force-dynamic"

export default function NewBlogPostPage() {
  return (
    <BlogEditor
      initial={{
        slug: "",
        title: "",
        description: "",
        secondaryKeywords: [],
        status: "draft",
        content: "",
      }}
    />
  )
}
