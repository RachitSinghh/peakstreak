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
  // Set when the task is created from a video already in the user's library.
  videoId: z.string().uuid().optional(),
  enrollmentId: z.string().uuid().optional(),
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
      videoId: input.videoId ?? null,
      enrollmentId: input.enrollmentId ?? null,
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

export interface EnrollablePlaylist {
  enrollmentId: string
  playlistTitle: string
  videos: { videoId: string; title: string; durationSeconds: number }[]
}

/**
 * The user's own videos, grouped by the playlist they're enrolled in — the
 * source for the "add an existing video as a task" picker. Durations come
 * straight from what we already store, so no YouTube call is needed.
 */
export async function listEnrollableVideos(userId: string): Promise<EnrollablePlaylist[]> {
  const rows = await db
    .select({
      enrollmentId: schema.userPlaylists.id,
      playlistTitle: schema.playlists.title,
      startedAt: schema.userPlaylists.startedAt,
      position: schema.playlistVideos.position,
      videoId: schema.videos.id,
      title: schema.videos.title,
      durationSeconds: schema.videos.durationSeconds,
    })
    .from(schema.userPlaylists)
    .innerJoin(schema.playlists, eq(schema.userPlaylists.playlistId, schema.playlists.id))
    .innerJoin(
      schema.playlistVideos,
      eq(schema.playlistVideos.playlistId, schema.userPlaylists.playlistId),
    )
    .innerJoin(schema.videos, eq(schema.playlistVideos.videoId, schema.videos.id))
    .where(and(eq(schema.userPlaylists.userId, userId), eq(schema.videos.isAvailable, true)))
    .orderBy(
      sql`${schema.userPlaylists.startedAt} desc`,
      asc(schema.playlistVideos.position),
    )

  const byEnrollment = new Map<string, EnrollablePlaylist>()
  for (const r of rows) {
    let group = byEnrollment.get(r.enrollmentId)
    if (!group) {
      group = { enrollmentId: r.enrollmentId, playlistTitle: r.playlistTitle, videos: [] }
      byEnrollment.set(r.enrollmentId, group)
    }
    group.videos.push({ videoId: r.videoId, title: r.title, durationSeconds: r.durationSeconds })
  }
  return [...byEnrollment.values()]
}

/** Tasks linked to a given video (any playlist) — for the watch-page badge. */
export async function getTodosForVideo(userId: string, videoId: string): Promise<Todo[]> {
  return db
    .select()
    .from(schema.todos)
    .where(and(eq(schema.todos.userId, userId), eq(schema.todos.videoId, videoId)))
    .orderBy(asc(schema.todos.completed), asc(schema.todos.createdAt))
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
