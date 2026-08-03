import type { Metadata } from "next"
import Link from "next/link"
import { Trophy } from "lucide-react"

import { track } from "@/lib/analytics"
import { requireUserId } from "@/lib/auth"
import { getFriendsLeaderboard, getLeaderboard } from "@/lib/leaderboard"
import { LeaderboardTable } from "@/components/leaderboard-table"
import { FadeUp } from "@/components/motion/fade-up"

export const metadata: Metadata = { title: "Leaderboard" }

export default async function LeaderboardPage() {
  const userId = await requireUserId()
  const [{ rows, currentUserHidden }, friends] = await Promise.all([
    getLeaderboard(userId),
    getFriendsLeaderboard(userId),
  ])
  void track("leaderboard_viewed", { userId })

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 py-2">
      <FadeUp>
        <div className="flex items-center gap-3">
          <Trophy className="text-primary size-6" />
          <div>
            <h1 className="text-xl font-semibold">Leaderboard</h1>
            <p className="text-muted-foreground text-sm">
              How the community is doing — ranked by what they&apos;ve finished.
            </p>
          </div>
        </div>
      </FadeUp>

      {currentUserHidden && (
        <FadeUp delay={0.04}>
          <div className="border-border bg-card text-muted-foreground rounded-xl border border-dashed p-4 text-sm">
            You&apos;re currently hidden from the leaderboard.{" "}
            <Link href="/settings" className="text-primary underline underline-offset-2">
              Turn it on in settings
            </Link>{" "}
            to appear here.
          </div>
        </FadeUp>
      )}

      <FadeUp delay={0.08}>
        <LeaderboardTable
          community={rows}
          friends={friends.rows}
          followedCount={friends.followedCount}
        />
      </FadeUp>
    </div>
  )
}
