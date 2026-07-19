import { z } from "zod"

import { currentUserId } from "@/lib/auth"
import { deleteTodo, updateTodo, updateTodoSchema } from "@/lib/todos"

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const userId = await currentUserId()
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await ctx.params
  const parsed = updateTodoSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success || !z.string().uuid().safeParse(id).success) {
    return Response.json({ error: "invalid_body" }, { status: 400 })
  }

  const todo = await updateTodo(userId, id, parsed.data)
  if (!todo) return Response.json({ error: "not_found" }, { status: 404 })
  return Response.json({ todo })
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const userId = await currentUserId()
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await ctx.params
  if (!z.string().uuid().safeParse(id).success) {
    return Response.json({ error: "invalid_body" }, { status: 400 })
  }

  const ok = await deleteTodo(userId, id)
  if (!ok) return Response.json({ error: "not_found" }, { status: 404 })
  return Response.json({ ok: true })
}
