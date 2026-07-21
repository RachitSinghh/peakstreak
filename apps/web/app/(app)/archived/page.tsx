import type { Metadata } from "next"
import Link from "next/link"
import { Archive, ArrowLeft } from "lucide-react"

import { requireUserId } from "@/lib/auth"
import { getDashboard, type DashboardEnrollment } from "@/lib/dashboard"
import { PlaylistCard } from "@/components/playlist-card"

export const metadata: Metadata = { title: "Archived" }

function toCardProps(e: DashboardEnrollment) {
  return {
    id: e.id,
    status: e.status,
    title: e.title,
    channelTitle: e.channelTitle,
    thumbnailUrl: e.thumbnailUrl,
    videoCount: e.videoCount,
    completedCount: e.completedCount,
    totalDurationSeconds: e.totalDurationSeconds,
    projectedFinishDate: e.eta.projectedFinishDate,
    daysRemaining: e.eta.daysRemaining,
    aheadDays: e.eta.aheadDays,
    continueVideoId: e.continueVideoId,
    isCustom: e.isCustom,
    completedAtLabel: e.completedAt
      ? e.completedAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : null,
  }
}

export default async function ArchivedPage() {
  const userId = await requireUserId()
  const { archived } = await getDashboard(userId)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/dashboard"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="size-4" />
          Dashboard
        </Link>
        <h1 className="mt-2 text-lg font-semibold">Archived playlists</h1>
      </div>

      {archived.length === 0 ? (
        <div className="border-border bg-card flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-20 text-center">
          <Archive className="text-muted-foreground size-10" />
          <p className="text-muted-foreground max-w-sm text-sm">
            Nothing archived. Archive a playlist from its card menu to tuck it away here — your
            progress is kept.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {archived.map((e, i) => (
            <PlaylistCard key={e.id} index={i} {...toCardProps(e)} />
          ))}
        </div>
      )}
    </div>
  )
}
