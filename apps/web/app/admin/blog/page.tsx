import type { Metadata } from "next"
import Link from "next/link"

import { Card, CardContent } from "@workspace/ui/components/card"

import { listPostsAdmin } from "@/lib/admin-blog"
import { importPostsAction } from "./actions"

export const metadata: Metadata = { title: "Blog · Admin", robots: { index: false } }
export const dynamic = "force-dynamic"

export default async function AdminBlogPage() {
  const posts = await listPostsAdmin()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Blog</h1>
          <p className="text-muted-foreground text-sm">
            {posts.length} posts. Drafts are hidden from the public site.
          </p>
        </div>
        <Link
          href="/admin/blog/new"
          className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium hover:opacity-90"
        >
          New post
        </Link>
      </div>

      {posts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-10 text-center text-sm">
            <p className="text-muted-foreground">No posts yet.</p>
            <form action={importPostsAction}>
              <button className="border-border rounded-lg border px-4 py-2 text-sm hover:bg-secondary">
                Import existing markdown posts
              </button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="text-muted-foreground border-border border-b text-left text-xs">
                <tr>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Slug</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Order</th>
                  <th className="px-4 py-3 font-medium">Updated</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((p) => (
                  <tr key={p.id} className="border-border/50 hover:bg-secondary/50 border-b">
                    <td className="px-4 py-3">
                      <Link href={`/admin/blog/${p.id}/edit`} className="hover:underline">
                        {p.title}
                      </Link>
                    </td>
                    <td className="text-muted-foreground px-4 py-3">{p.slug}</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          p.status === "published" ? "text-primary" : "text-muted-foreground"
                        }
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="text-muted-foreground px-4 py-3 tabular-nums">
                      {p.order ?? "—"}
                    </td>
                    <td className="text-muted-foreground px-4 py-3">
                      {p.updatedAt.toISOString().slice(0, 10)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
