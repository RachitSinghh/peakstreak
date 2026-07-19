import { z } from "zod"

import { currentUserId } from "@/lib/auth"
import { reorderTodos } from "@/lib/todos"

const bodySchema = z.object({ orderedIds: z.array(z.string().uuid()).max(500) })

export async function POST(request: Request) {
  const userId = await currentUserId()
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: "invalid_body" }, { status: 400 })

  await reorderTodos(userId, parsed.data.orderedIds)
  return Response.json({ ok: true })
}
