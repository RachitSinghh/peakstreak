"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { Clock, NotebookPen, Play, Trash2, X } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@workspace/ui/components/button"
import { Textarea } from "@workspace/ui/components/textarea"
import { cn } from "@workspace/ui/lib/utils"

export interface NoteEntry {
  id: string
  timestampSeconds: number | null
  body: string
  createdAt: string
}

function formatTimestamp(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m)
  return `${h > 0 ? `${h}:` : ""}${mm}:${String(s % 60).padStart(2, "0")}`
}

/** Timed notes first (ascending), then untimed by creation time. */
function compareEntries(a: NoteEntry, b: NoteEntry): number {
  if (a.timestampSeconds != null && b.timestampSeconds != null) {
    return a.timestampSeconds - b.timestampSeconds
  }
  if (a.timestampSeconds != null) return -1
  if (b.timestampSeconds != null) return 1
  return a.createdAt.localeCompare(b.createdAt)
}

/**
 * PS-9 (v2): timestamped note entries. You write a note, it captures the
 * video moment you started writing, and on Save it drops into a seekable log
 * below the player. Render with key={videoId} so switching videos resets the
 * composer cleanly. `getPlayerTime`/`onSeek` wire the notes to the player.
 */
export function NotesPanel({
  videoId,
  enrollmentId,
  className,
  getPlayerTime,
  onSeek,
}: {
  videoId: string
  enrollmentId: string
  className?: string
  getPlayerTime?: () => number | null
  onSeek?: (seconds: number) => void
}) {
  const [entries, setEntries] = useState<NoteEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState("")
  // The video moment this in-progress note pins to (captured when the user
  // starts writing). null = an untimed note.
  const [draftTimestamp, setDraftTimestamp] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  const draftKey = `note-draft:${videoId}`
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Load entries; restore any unsaved composer draft from a previous visit.
  useEffect(() => {
    let cancelled = false
    void fetch(`/api/notes?videoId=${videoId}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("load failed"))))
      .then((data: { entries: NoteEntry[] }) => {
        if (cancelled) return
        setEntries(data.entries)
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })

    try {
      // Restore an unsaved draft *after* mount, not via a lazy useState
      // initializer — localStorage doesn't exist during SSR, and seeding
      // initial state from it would cause a hydration mismatch.
      const saved = localStorage.getItem(draftKey)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved) setDraft(saved)
    } catch {
      /* localStorage may be unavailable; drafts are best-effort */
    }
    return () => {
      cancelled = true
    }
  }, [videoId, draftKey])

  function onDraftChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
    const next = event.target.value
    // Capture the video moment the note refers to the instant writing begins.
    if (draft.trim() === "" && next.trim() !== "" && draftTimestamp == null) {
      const t = getPlayerTime?.()
      if (t != null) setDraftTimestamp(Math.floor(t))
    }
    setDraft(next)
    try {
      if (next.trim() === "") localStorage.removeItem(draftKey)
      else localStorage.setItem(draftKey, next)
    } catch {
      /* ignore */
    }
  }

  const saveEntry = useCallback(async () => {
    const body = draft.trim()
    if (!body || saving) return
    setSaving(true)
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ videoId, enrollmentId, body, timestampSeconds: draftTimestamp }),
      })
      if (!res.ok) throw new Error(`save failed: ${res.status}`)
      const { entry } = (await res.json()) as { entry: NoteEntry }
      setEntries((prev) => [...prev, entry].sort(compareEntries))
      setDraft("")
      setDraftTimestamp(null)
      try {
        localStorage.removeItem(draftKey)
      } catch {
        /* ignore */
      }
      textareaRef.current?.focus()
    } catch {
      toast.error("Couldn't save note", { description: "Check your connection and try again." })
    } finally {
      setSaving(false)
    }
  }, [draft, saving, videoId, enrollmentId, draftTimestamp, draftKey])

  async function deleteEntry(id: string) {
    setPendingDeleteId(null)
    const prev = entries
    setEntries((cur) => cur.filter((e) => e.id !== id)) // optimistic
    try {
      const res = await fetch("/api/notes", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      })
      if (!res.ok) throw new Error("delete failed")
    } catch {
      setEntries(prev) // roll back
      toast.error("Couldn't delete note")
    }
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    // ⌘/Ctrl+Enter saves without reaching for the mouse.
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault()
      void saveEntry()
    }
  }

  const canStamp = Boolean(getPlayerTime)

  return (
    <div className={cn("border-border bg-card flex flex-col rounded-xl border", className)}>
      <div className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-2.5">
        <span className="text-muted-foreground inline-flex items-center gap-2 text-sm font-medium">
          <NotebookPen className="size-4" />
          Notes
          {entries.length > 0 && (
            <span className="text-muted-foreground/70 font-mono text-xs">{entries.length}</span>
          )}
        </span>
      </div>

      {/* Composer */}
      <div className="flex flex-col gap-2 p-3">
        <Textarea
          ref={textareaRef}
          value={draft}
          onChange={onDraftChange}
          onKeyDown={onKeyDown}
          placeholder={
            canStamp
              ? "Jot a thought — we'll stamp the moment in the video you're at. ⌘↵ to save."
              : "Jot a thought and save it."
          }
          className="min-h-[80px] resize-y font-sans leading-relaxed"
        />
        <div className="flex items-center justify-between gap-2">
          {canStamp && draftTimestamp != null ? (
            <button
              type="button"
              onClick={() => setDraftTimestamp(null)}
              title="Remove the timestamp — save as an untimed note"
              className="text-primary border-primary/40 bg-primary/10 hover:bg-primary/15 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-xs transition-colors"
            >
              <Clock className="size-3" />
              {formatTimestamp(draftTimestamp)}
              <X className="size-3" />
            </button>
          ) : canStamp ? (
            <button
              type="button"
              onClick={() => {
                const t = getPlayerTime?.()
                if (t != null) setDraftTimestamp(Math.floor(t))
              }}
              title="Stamp the current video time onto this note"
              className="text-muted-foreground hover:text-foreground border-border inline-flex items-center gap-1 rounded-full border border-dashed px-2 py-0.5 text-xs transition-colors"
            >
              <Clock className="size-3" />
              Add timestamp
            </button>
          ) : (
            <span />
          )}
          <Button size="sm" disabled={!draft.trim() || saving} onClick={() => void saveEntry()}>
            {saving ? "Saving…" : "Save note"}
          </Button>
        </div>
      </div>

      {/* Saved entries — the log that fills the space below the video. */}
      <div className="border-t border-border/70">
        {loading ? (
          <p className="text-muted-foreground px-4 py-6 text-center text-sm">Loading notes…</p>
        ) : entries.length === 0 ? (
          <p className="text-muted-foreground px-4 py-6 text-center text-sm">
            No notes yet. What you save shows up here, in video order.
          </p>
        ) : (
          <ul className="flex flex-col">
            <AnimatePresence initial={false}>
              {entries.map((entry) => (
                <motion.li
                  key={entry.id}
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.18 }}
                  className="group flex items-start gap-3 border-b border-border/50 px-4 py-3 last:border-b-0"
                >
                  {entry.timestampSeconds != null && onSeek ? (
                    <button
                      type="button"
                      onClick={() => onSeek(entry.timestampSeconds!)}
                      title={`Jump to ${formatTimestamp(entry.timestampSeconds)}`}
                      className="text-muted-foreground hover:text-primary hover:border-primary/40 border-border bg-secondary/60 mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-xs transition-colors"
                    >
                      <Play className="size-2.5 fill-current" />
                      {formatTimestamp(entry.timestampSeconds)}
                    </button>
                  ) : (
                    <span className="text-muted-foreground/50 mt-0.5 shrink-0 font-mono text-xs">
                      —
                    </span>
                  )}

                  <p className="text-secondary-foreground min-w-0 flex-1 text-sm whitespace-pre-wrap">
                    {entry.body}
                  </p>

                  {pendingDeleteId === entry.id ? (
                    <span className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => void deleteEntry(entry.id)}
                        className="text-destructive text-xs font-medium"
                      >
                        Delete
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingDeleteId(null)}
                        className="text-muted-foreground text-xs"
                      >
                        Cancel
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setPendingDeleteId(entry.id)}
                      title="Delete note"
                      className="text-muted-foreground/60 hover:text-destructive mt-0.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </div>
  )
}
