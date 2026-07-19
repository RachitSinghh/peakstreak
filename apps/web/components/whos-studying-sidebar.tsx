"use client"

// FT-S3: "Who's Studying" drawer. Polls one endpoint every 5s while open;
// rows are memoized so a single status tick re-renders only that row.

import { memo, useEffect, useRef, useState } from "react"
import { Users, X } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"
import type { StudyingPerson } from "@/lib/whos-studying"

const POLL_MS = 5_000

function fmtHours(seconds: number): string {
  const m = Math.round(seconds / 60)
  if (m <= 0) return "0m"
  const h = Math.floor(m / 60)
  const rem = m % 60
  return h ? `${h}h ${rem}m` : `${rem}m`
}

const DOT: Record<StudyingPerson["status"], string> = {
  studying: "bg-success",
  online: "bg-amber-500",
  offline: "bg-muted-foreground/40",
}

function statusLine(p: StudyingPerson): string {
  if (p.status === "studying") return `Studying · ${fmtHours(p.studySecondsToday)} today`
  if (p.status === "online")
    return p.studySecondsToday > 0 ? `Online · ${fmtHours(p.studySecondsToday)} today` : "Online"
  return "Offline"
}

const PersonRow = memo(function PersonRow({ person }: { person: StudyingPerson }) {
  const dim = person.status === "offline"
  return (
    <li className="flex items-center gap-3 px-1 py-2">
      <span className={cn("size-2.5 shrink-0 rounded-full", DOT[person.status])} />
      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-sm font-medium", dim && "text-muted-foreground")}>
          {person.displayName}
        </p>
        <p className="text-muted-foreground truncate text-xs">{statusLine(person)}</p>
      </div>
    </li>
  )
})

export function WhosStudyingSidebar() {
  const [open, setOpen] = useState(false)
  const [people, setPeople] = useState<StudyingPerson[] | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    async function load() {
      try {
        const res = await fetch("/api/presence/who")
        if (!res.ok) return
        const data = (await res.json()) as { people: StudyingPerson[] }
        if (!cancelled) setPeople(data.people)
      } catch {
        /* keep last known list on a transient error */
      }
    }
    load()
    timerRef.current = setInterval(load, POLL_MS)
    return () => {
      cancelled = true
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [open])

  const studyingCount = people?.filter((p) => p.status === "studying").length ?? 0

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-foreground hover:bg-secondary relative inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors"
        aria-label="Who's studying"
      >
        <Users className="text-primary size-4" />
        <span className="hidden sm:inline">Studying</span>
        {studyingCount > 0 && (
          <span className="bg-success text-background inline-flex min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold">
            {studyingCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <aside className="border-border bg-background fixed top-0 right-0 z-50 flex h-svh w-[min(88vw,20rem)] flex-col border-l shadow-xl">
            <div className="border-border flex items-center justify-between border-b px-4 py-3">
              <h2 className="text-sm font-semibold">Who&apos;s studying</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-2">
              {people === null ? (
                <ul className="flex flex-col gap-2 py-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <li key={i} className="flex items-center gap-3 px-1 py-2">
                      <span className="bg-muted size-2.5 rounded-full" />
                      <div className="flex-1">
                        <div className="bg-muted h-3 w-24 rounded" />
                        <div className="bg-muted mt-1.5 h-2.5 w-16 rounded" />
                      </div>
                    </li>
                  ))}
                </ul>
              ) : people.length === 0 ? (
                <p className="text-muted-foreground px-1 py-8 text-center text-sm">
                  No study buddies yet. When people in the community start studying, they&apos;ll
                  show up here.
                </p>
              ) : (
                <ul className="flex flex-col">
                  {people.map((p) => (
                    <PersonRow key={p.userId} person={p} />
                  ))}
                </ul>
              )}
            </div>
          </aside>
        </>
      )}
    </>
  )
}
