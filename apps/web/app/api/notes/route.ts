import { and, asc, eq } from "drizzle-orm"
import { z } from "zod"

import { track } from "@/lib/analytics"
import { currentUserId } from "@/lib/auth"
import { db, schema } from "@/lib/db"
import { requireEnrollment } from "@/lib/dashboard"
import { compareEntries, type NoteEntry } from "@/lib/notes"

/** Lists the caller's note entries for a video. Notes are strictly private. */
export async function GET(request: Request) {
  const userId = await currentUserId()
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const videoId = new URL(request.url).searchParams.get("videoId")
  if (!videoId || !z.string().uuid().safeParse(videoId).success) {
    return Response.json({ error: "invalid_params" }, { status: 400 })
  }

  const rows = await db
    .select({
      id: schema.noteEntries.id,
      timestampSeconds: schema.noteEntries.timestampSeconds,
      body: schema.noteEntries.body,
      createdAt: schema.noteEntries.createdAt,
    })
    .from(schema.noteEntries)
    .where(and(eq(schema.noteEntries.userId, userId), eq(schema.noteEntries.videoId, videoId)))
    .orderBy(asc(schema.noteEntries.createdAt))

  const entries = (rows as NoteEntry[]).sort(compareEntries)
  return Response.json({ entries: entries.map(serialize) })
}

const postSchema = z.object({
  videoId: z.string().uuid(),
  enrollmentId: z.string().uuid(),
  body: z.string().trim().min(1).max(10_000),
  // Video moment the note pins to. Omit/null for an untimed note.
  timestampSeconds: z.number().int().min(0).max(24 * 3600).nullable().optional(),
})

/** Creates one timestamped note entry. */
export async function POST(request: Request) {
  const userId = await currentUserId()
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const parsed = postSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: "invalid_body" }, { status: 400 })
  const { videoId, enrollmentId, body, timestampSeconds } = parsed.data

  // Ownership of the enrollment gates note creation.
  const enrollment = await requireEnrollment(userId, enrollmentId)
  if (!enrollment) return Response.json({ error: "not_found" }, { status: 404 })

  const [entry] = await db
    .insert(schema.noteEntries)
    .values({
      userId,
      videoId,
      userPlaylistId: enrollmentId,
      body,
      timestampSeconds: timestampSeconds ?? null,
    })
    .returning({
      id: schema.noteEntries.id,
      timestampSeconds: schema.noteEntries.timestampSeconds,
      body: schema.noteEntries.body,
      createdAt: schema.noteEntries.createdAt,
    })

  track("note_created", { userId, properties: { videoId, enrollmentId } })
  return Response.json({ entry: serialize(entry as NoteEntry) }, { status: 201 })
}

const deleteSchema = z.object({ id: z.string().uuid() })

/** Deletes one of the caller's note entries. */
export async function DELETE(request: Request) {
  const userId = await currentUserId()
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const parsed = deleteSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: "invalid_body" }, { status: 400 })

  // The user_id predicate makes this safe: one user can never delete another's.
  const deleted = await db
    .delete(schema.noteEntries)
    .where(and(eq(schema.noteEntries.id, parsed.data.id), eq(schema.noteEntries.userId, userId)))
    .returning({ id: schema.noteEntries.id })

  if (deleted.length === 0) return Response.json({ error: "not_found" }, { status: 404 })
  return Response.json({ deleted: true })
}

function serialize(entry: NoteEntry) {
  return {
    id: entry.id,
    timestampSeconds: entry.timestampSeconds,
    body: entry.body,
    createdAt: entry.createdAt instanceof Date ? entry.createdAt.toISOString() : entry.createdAt,
  }
}
