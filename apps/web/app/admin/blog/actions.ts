"use server"

import { revalidatePath } from "next/cache"

import { requireAdmin } from "@/lib/auth"
import { deletePost, importFilePosts, savePost, type SavePostInput } from "@/lib/admin-blog"

function revalidateBlog(slug?: string) {
  revalidatePath("/blog")
  revalidatePath("/admin/blog")
  if (slug) revalidatePath(`/blog/${slug}`)
}

// Returns {error} instead of throwing so the client form can show it inline.
export async function savePostAction(
  input: SavePostInput,
): Promise<{ id?: string; error?: string }> {
  await requireAdmin()
  try {
    const { id } = await savePost(input)
    revalidateBlog(input.slug)
    return { id }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not save" }
  }
}

export async function deletePostAction(id: string): Promise<void> {
  await requireAdmin()
  await deletePost(id)
  revalidateBlog()
}

export async function importPostsAction(): Promise<void> {
  await requireAdmin()
  await importFilePosts()
  revalidateBlog()
}
