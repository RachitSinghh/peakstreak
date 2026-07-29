import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { Pencil } from "lucide-react"

import { requireUserId } from "@/lib/auth"
import { getActivityFeed } from "@/lib/feed"
import { getIncomingRequests } from "@/lib/follows"
import { getFullProfile } from "@/lib/profile"
import { ActivityFeed } from "@/components/activity-feed"
import { FollowRequests } from "@/components/follow-requests"
import { ProfileView } from "@/components/profile-view"

export const metadata: Metadata = { title: "Profile" }

export default async function MyProfilePage() {
  const userId = await requireUserId()
  const [profile, feed, requests] = await Promise.all([
    getFullProfile(userId),
    getActivityFeed(userId),
    getIncomingRequests(userId),
  ])
  if (!profile) redirect("/dashboard")

  // Reachable by username when claimed, else by user id.
  const handle = profile.username ?? profile.userId

  const actions = (
    <div className="flex flex-wrap items-center gap-4 text-sm">
      <span className="text-muted-foreground">
        <Link href={`/u/${handle}/followers`} className="hover:text-foreground">
          <span className="text-foreground font-semibold">{profile.followerCount}</span> followers
        </Link>{" "}
        ·{" "}
        <Link href={`/u/${handle}/following`} className="hover:text-foreground">
          <span className="text-foreground font-semibold">{profile.followingCount}</span> following
        </Link>
      </span>

      <Link
        href="/settings"
        className="text-primary inline-flex items-center gap-1 hover:underline"
      >
        <Pencil className="size-3.5" />
        Edit profile
      </Link>
    </div>
  )

  return (
    <div className="flex flex-col gap-6">
      <ProfileView profile={profile} actions={actions} />

      {profile.username ? (
        <p className="text-muted-foreground text-xs">
          Others can find and follow you at{" "}
          <span className="text-foreground font-mono">/u/{profile.username}</span>
        </p>
      ) : (
        <p className="text-muted-foreground text-xs">
          Claim a username in{" "}
          <Link href="/settings" className="text-primary underline">
            settings
          </Link>{" "}
          for a friendlier profile link — people can already find you from the leaderboard.
        </p>
      )}

      <FollowRequests requests={requests} />

      <ActivityFeed items={feed.items} followsAnyone={feed.followsAnyone} />
    </div>
  )
}
