import { and, asc, eq, sql } from "drizzle-orm"
import { z } from "zod"

import { db, schema } from "@/lib/db"

export type Todo = typeof schema.todos.$inferSelect

// Shared validation. estimate is capped at 24h; the client is never trusted.
export const createTodoSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  estimatedDurationMinutes: z.number().int().min(0).max(1440).default(0),
  sourceType: z.enum(["manual", "video"]).default("manual"),
  sourceUrl: z.string().url().max(500).optional(),
})

export const updateTodoSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(2000).nullable(),
    estimatedDurationMinutes: z.number().int().min(0).max(1440),
    completed: z.boolean(),
    sourceUrl: z.string().url().max(500).nullable(),
  })
  .partial()

export async function listTodos(userId: string): Promise<Todo[]> {
  return db
    .select()
    .from(schema.todos)
    .where(eq(schema.todos.userId, userId))
    .orderBy(asc(schema.todos.completed), asc(schema.todos.position), asc(schema.todos.createdAt))
}

export async function createTodo(
  userId: string,
  input: z.infer<typeof createTodoSchema>,
): Promise<Todo> {
  // New tasks go to the top of the incomplete list.
  const [minRow] = await db
    .select({ min: sql<number>`coalesce(min(${schema.todos.position}), 0)` })
    .from(schema.todos)
    .where(and(eq(schema.todos.userId, userId), eq(schema.todos.completed, false)))
  const position = (minRow?.min ?? 0) - 1

  const [row] = await db
    .insert(schema.todos)
    .values({
      userId,
      title: input.title,
      description: input.description ?? null,
      estimatedDurationMinutes: input.estimatedDurationMinutes,
      sourceType: input.sourceType,
      sourceUrl: input.sourceUrl ?? null,
      position,
    })
    .returning()
  return row!
}

export async function updateTodo(
  userId: string,
  id: string,
  patch: z.infer<typeof updateTodoSchema>,
): Promise<Todo | null> {
  const set: Partial<typeof schema.todos.$inferInsert> = { updatedAt: new Date() }
  if (patch.title !== undefined) set.title = patch.title
  if (patch.description !== undefined) set.description = patch.description
  if (patch.estimatedDurationMinutes !== undefined)
    set.estimatedDurationMinutes = patch.estimatedDurationMinutes
  if (patch.sourceUrl !== undefined) set.sourceUrl = patch.sourceUrl
  if (patch.completed !== undefined) {
    set.completed = patch.completed
    set.completedAt = patch.completed ? new Date() : null
  }

  const [row] = await db
    .update(schema.todos)
    .set(set)
    .where(and(eq(schema.todos.id, id), eq(schema.todos.userId, userId)))
    .returning()
  return row ?? null
}

export async function deleteTodo(userId: string, id: string): Promise<boolean> {
  const rows = await db
    .delete(schema.todos)
    .where(and(eq(schema.todos.id, id), eq(schema.todos.userId, userId)))
    .returning({ id: schema.todos.id })
  return rows.length > 0
}

// Persist a new drag order. Only ids owned by the user are touched; unknown
// ids are ignored (scoped by the userId filter on each update).
export async function reorderTodos(userId: string, orderedIds: string[]): Promise<void> {
  await db.transaction(async (tx) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await tx
        .update(schema.todos)
        .set({ position: i, updatedAt: new Date() })
        .where(and(eq(schema.todos.id, orderedIds[i]!), eq(schema.todos.userId, userId)))
    }
  })
}
