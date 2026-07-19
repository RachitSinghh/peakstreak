import type { Metadata } from "next"

import { requireUserId } from "@/lib/auth"
import { listTodos } from "@/lib/todos"
import { TodoList } from "@/components/todo-list"

export const metadata: Metadata = { title: "Tasks" }

export default async function TasksPage() {
  const userId = await requireUserId()
  const todos = await listTodos(userId)

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-xl font-semibold">Tasks</h1>
      <p className="text-muted-foreground mt-1 mb-6 text-sm">
        Plan your work, estimate each task, then start a Pomodoro tuned to it.
      </p>
      <TodoList initialTodos={todos} />
    </div>
  )
}
