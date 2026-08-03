import type { Metadata } from "next"
import Link from "next/link"
import { ListPlus } from "lucide-react"

import { Button } from "@workspace/ui/components/button"

import { requireUserId } from "@/lib/auth"
import { getDashboard, type DashboardEnrollment } from "@/lib/dashboard"
import { getUnseenNudges } from "@/lib/nudges"
import { getPartnerCard } from "@/lib/partnerships"
import { PlaylistCard } from "@/components/playlist-card"
import { StreakStrip } from "@/components/streak-strip"
import { NudgeInbox } from "@/components/nudge-inbox"
import { PartnerCard } from "@/components/partner-card"
import { WatchHistorySync } from "@/components/watch-history-sync"
import { FadeUp } from "@/components/motion/fade-up"

export const metadata: Metadata = { title: "Dashboard" }

function toCardProps(e: DashboardEnrollment) {
  return {
    id: e.id,
    playlistId: e.playlistId,
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

export default async function DashboardPage() {
  const userId = await requireUserId()
  const [{ active, completed, streak }, nudges, partnerCard] = await Promise.all([
    getDashboard(userId),
    getUnseenNudges(userId),
    getPartnerCard(userId),
  ])

  // Archived playlists live on their own page, so they don't count here.
  const isEmpty = active.length === 0 && completed.length === 0

  return (
    <div className="flex flex-col gap-6">
      <WatchHistorySync />
      <FadeUp>
        <StreakStrip streak={streak} />
      </FadeUp>

      {nudges.length > 0 && (
        <FadeUp delay={0.04}>
          <NudgeInbox nudges={nudges} />
        </FadeUp>
      )}

      <FadeUp delay={0.06}>
        <PartnerCard card={partnerCard} />
      </FadeUp>

      {isEmpty ? (
        <FadeUp delay={0.1}>
          <div className="border-border bg-card flex flex-col items-center gap-4 rounded-xl border border-dashed px-6 py-20 text-center">
            <ListPlus className="text-muted-foreground size-10" />
            <div>
              <h2 className="text-lg font-semibold">Paste your first playlist</h2>
              <p className="text-muted-foreground mx-auto mt-1 max-w-sm text-sm">
                Drop in any YouTube playlist link — we&apos;ll tell you exactly how long it takes to
                finish, and keep you honest about it.
              </p>
            </div>
            <Button size="lg" render={<Link href="/playlists/new" />}>
              Add a playlist
            </Button>
          </div>
        </FadeUp>
      ) : (
        <>
          {active.length > 0 && (
            <section>
              <FadeUp delay={0.16}>
                <h2 className="text-muted-foreground mb-3 text-sm font-medium">In progress</h2>
              </FadeUp>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {active.map((e, i) => (
                  <PlaylistCard key={e.id} index={i} {...toCardProps(e)} />
                ))}
              </div>
            </section>
          )}

          {completed.length > 0 && (
            <section>
              <FadeUp delay={0.2}>
                <h2 className="text-muted-foreground mb-3 text-sm font-medium">Completed</h2>
              </FadeUp>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {completed.map((e, i) => (
                  <PlaylistCard key={e.id} index={i} {...toCardProps(e)} />
                ))}
              </div>
            </section>
          )}

        </>
      )}
    </div>
  )
}
