import type { Metadata } from "next"
import Link from "next/link"

import { FollowList } from "@/components/follow-list"
import { getFollowList } from "@/lib/follows"
import { getPublicProfile } from "@/lib/profile"

export const metadata: Metadata = { title: "Followers", robots: { index: false, follow: false } }

export default async function FollowersPage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = await params
  const profile = await getPublicProfile(username)

  if (!profile) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <h1 className="mb-2 text-xl font-semibold">Profile not found</h1>
        <Link href="/" className="text-primary text-sm underline underline-offset-4">
          Go to PeakStreak
        </Link>
      </div>
    )
  }

  const entries = await getFollowList(profile.userId, "followers")
  return (
    <FollowList
      ownerUsername={profile.username}
      title={`Followers of ${profile.displayName}`}
      emptyLabel="No followers yet."
      entries={entries}
    />
  )
}
