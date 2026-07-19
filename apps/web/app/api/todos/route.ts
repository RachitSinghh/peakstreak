import { currentUserId } from "@/lib/auth"
import { createTodo, createTodoSchema, listTodos } from "@/lib/todos"

export async function GET() {
  const userId = await currentUserId()
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 })
  return Response.json({ todos: await listTodos(userId) })
}

export async function POST(request: Request) {
  const userId = await currentUserId()
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const parsed = createTodoSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: "invalid_body" }, { status: 400 })

  const todo = await createTodo(userId, parsed.data)
  return Response.json({ todo }, { status: 201 })
}
