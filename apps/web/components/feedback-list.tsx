"use client"

import { useState, useTransition } from "react"
import { Star } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"

import type { FeedbackRow } from "@/lib/admin"
import { setTestimonialApproval } from "@/app/admin/actions"

const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
})

const dayHeadingFmt = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
})

// "Today" / "Yesterday" / "March 3, 2026" for a section heading, in the
// viewer's local timezone.
function dayLabel(d: Date): string {
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const diff = Math.round((startOfDay(new Date()) - startOfDay(d)) / 86_400_000)
  if (diff === 0) return "Today"
  if (diff === 1) return "Yesterday"
  return dayHeadingFmt.format(d)
}

// Feedback arrives newest-first, so grouping in order keeps sections ordered.
function groupByDay(feedback: FeedbackRow[]): { label: string; items: FeedbackRow[] }[] {
  const groups: { label: string; items: FeedbackRow[] }[] = []
  for (const f of feedback) {
    const label = dayLabel(f.createdAt)
    const last = groups[groups.length - 1]
    if (last?.label === label) last.items.push(f)
    else groups.push({ label, items: [f] })
  }
  return groups
}

export function FeedbackList({ feedback }: { feedback: FeedbackRow[] }) {
  const [selected, setSelected] = useState<FeedbackRow | null>(null)
  const [approvedIds, setApprovedIds] = useState<Set<string>>(
    () => new Set(feedback.filter((f) => f.approved).map((f) => f.id)),
  )
  const [pending, startTransition] = useTransition()
  const sender = selected?.userName ?? selected?.email ?? "Anonymous"
  const isApproved = selected ? approvedIds.has(selected.id) : false

  function toggleApproval() {
    if (!selected) return
    const id = selected.id
    const next = !isApproved
    // Optimistic: flip locally now, reconcile if the server rejects.
    setApprovedIds((prev) => {
      const s = new Set(prev)
      if (next) s.add(id)
      else s.delete(id)
      return s
    })
    startTransition(async () => {
      try {
        await setTestimonialApproval(id, next)
      } catch {
        setApprovedIds((prev) => {
          const s = new Set(prev)
          if (next) s.delete(id)
          else s.add(id)
          return s
        })
      }
    })
  }

  return (
    <>
      <div className="space-y-6">
        {groupByDay(feedback).map((group) => (
          <section key={group.label} className="space-y-3">
            <h2 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              {group.label}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {group.items.map((f) => (
                <Card
                  key={f.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelected(f)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      setSelected(f)
                    }
                  }}
                  className="hover:border-primary/50 cursor-pointer transition-colors"
                >
                  <CardContent className="py-4">
                    <p className="line-clamp-3 text-sm">{f.message}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        ))}
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{sender}</DialogTitle>
            <DialogDescription>
              {selected?.email && selected.email !== sender ? `${selected.email} · ` : ""}
              {selected?.path ? `${selected.path} · ` : ""}
              {selected ? dateFmt.format(selected.createdAt) : ""}
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{selected?.message}</p>
          <DialogFooter>
            <Button
              variant={isApproved ? "secondary" : "default"}
              disabled={pending}
              onClick={toggleApproval}
            >
              <Star className={`size-4 ${isApproved ? "fill-current" : ""}`} />
              {isApproved ? "Approved · remove from testimonials" : "Approve as testimonial"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
