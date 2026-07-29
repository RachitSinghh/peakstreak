import type { Metadata } from "next"
import Link from "next/link"

import { FollowList } from "@/components/follow-list"
import { currentUserId } from "@/lib/auth"
import { canViewProfile, getFollowList } from "@/lib/follows"
import { getProfileIdentity } from "@/lib/profile"

export const metadata: Metadata = { title: "Followers", robots: { index: false, follow: false } }

export default async function FollowersPage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = await params
  const identity = await getProfileIdentity(username)
  const viewerId = await currentUserId()
  const canView = identity && viewerId ? await canViewProfile(viewerId, identity.userId) : false

  if (!identity || !canView) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <h1 className="mb-2 text-xl font-semibold">Not available</h1>
        <Link href="/" className="text-primary text-sm underline underline-offset-4">
          Go to PeakStreak
        </Link>
      </div>
    )
  }

  const entries = await getFollowList(identity.userId, "followers")
  return (
    <FollowList
      ownerUsername={identity.username ?? identity.userId}
      title={`Followers of ${identity.displayName}`}
      emptyLabel="No followers yet."
      entries={entries}
    />
  )
}
