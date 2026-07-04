import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, NotebookPen } from "lucide-react"

import { requireUserId } from "@/lib/auth"
import { requireEnrollment } from "@/lib/dashboard"
import { getPlaylistNotes } from "@/lib/notes"

export const metadata: Metadata = { title: "All notes" }

function clockLabel(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m)
  return `${h > 0 ? `${h}:` : ""}${mm}:${String(s % 60).padStart(2, "0")}`
}

export default async function PlaylistNotesPage({
  params,
}: {
  params: Promise<{ enrollmentId: string }>
}) {
  const userId = await requireUserId()
  const { enrollmentId } = await params

  const enrollment = await requireEnrollment(userId, enrollmentId)
  if (!enrollment) notFound()

  const { playlistTitle, notes } = await getPlaylistNotes(userId, enrollmentId)

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <Link
          href="/dashboard"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="size-4" />
          Dashboard
        </Link>
        <h1 className="mt-2 text-xl font-semibold">Notes — {playlistTitle}</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Everything you wrote, in playlist order. Only you can see this.
        </p>
      </div>

      {notes.length === 0 ? (
        <div className="border-border text-muted-foreground flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center text-sm">
          <NotebookPen className="size-8" />
          No notes yet — open a video and start writing in the panel beside the player.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {notes.map((group) => (
            <article key={group.videoId} className="border-border bg-card rounded-xl border p-5">
              <h2 className="mb-3 text-sm font-semibold">
                <Link
                  href={`/playlists/${enrollmentId}/watch/${group.videoId}`}
                  className="hover:text-primary"
                >
                  {group.position + 1}. {group.videoTitle}
                </Link>
              </h2>
              <ul className="flex flex-col gap-2.5">
                {group.entries.map((entry) => (
                  <li key={entry.id} className="flex items-start gap-3">
                    {entry.timestampSeconds != null ? (
                      <span className="text-muted-foreground border-border bg-secondary/60 mt-0.5 inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 font-mono text-xs">
                        {clockLabel(entry.timestampSeconds)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/50 mt-0.5 shrink-0 font-mono text-xs">
                        —
                      </span>
                    )}
                    <p className="text-secondary-foreground min-w-0 flex-1 text-sm whitespace-pre-wrap">
                      {entry.body}
                    </p>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
