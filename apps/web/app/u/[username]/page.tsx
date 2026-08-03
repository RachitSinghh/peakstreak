import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { Lock } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar"

import { FollowButton } from "@/components/follow-button"
import { PartnerButton } from "@/components/partner-button"
import { ProfileView } from "@/components/profile-view"
import { currentUserId } from "@/lib/auth"
import { canViewProfile, getFollowState } from "@/lib/follows"
import { getPartnerState } from "@/lib/partnerships"
import { getFullProfile, getProfileIdentity } from "@/lib/profile"

// Profiles are never public — always keep them out of search indexes.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>
}): Promise<Metadata> {
  const { username } = await params
  const identity = await getProfileIdentity(username)
  return {
    title: identity ? `${identity.displayName} on PeakStreak` : "Profile not found",
    robots: { index: false, follow: false },
  }
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = await params
  const identity = await getProfileIdentity(username)

  if (!identity) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <h1 className="mb-2 text-xl font-semibold">Profile not found</h1>
        <Link href="/" className="text-primary text-sm underline underline-offset-4">
          Go to PeakStreak
        </Link>
      </div>
    )
  }

  const viewerId = await currentUserId()
  if (viewerId === identity.userId) redirect("/profile")

  const [canView, followState, partnerState] = await Promise.all([
    viewerId ? canViewProfile(viewerId, identity.userId) : Promise.resolve(false),
    viewerId ? getFollowState(viewerId, identity.userId) : Promise.resolve("none" as const),
    viewerId ? getPartnerState(viewerId, identity.userId) : Promise.resolve("none" as const),
  ])

  // Reachable by username when claimed, else by user id.
  const handle = identity.username ?? identity.userId
  const followButton = <FollowButton targetId={identity.userId} initialState={followState} />

  if (!canView) {
    return (
      <div className="mx-auto flex max-w-sm flex-col items-center gap-4 py-16 text-center">
        <Avatar size="lg" className="size-20">
          {identity.image && <AvatarImage src={identity.image} alt="" />}
          <AvatarFallback className="text-xl">
            {identity.displayName.slice(0, 1).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-xl font-semibold">{identity.displayName}</h1>
          {identity.username && (
            <p className="text-muted-foreground text-sm">@{identity.username}</p>
          )}
        </div>
        {identity.bio && <p className="text-muted-foreground text-sm">{identity.bio}</p>}
        <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
          <Lock className="size-3.5" />
          This profile is private. Follow to see their activity.
        </p>
        {followButton}
      </div>
    )
  }

  const profile = await getFullProfile(identity.userId)
  if (!profile) redirect("/dashboard")

  const counts = (
    <div className="flex flex-wrap items-center gap-4">
      <div className="text-muted-foreground flex items-center gap-4 text-sm">
        <Link href={`/u/${handle}/followers`} className="hover:text-foreground">
          <span className="text-foreground font-semibold">{profile.followerCount}</span> followers
        </Link>
        <Link href={`/u/${handle}/following`} className="hover:text-foreground">
          <span className="text-foreground font-semibold">{profile.followingCount}</span> following
        </Link>
      </div>
      <div className="flex items-center gap-2">
        {followButton}
        <PartnerButton targetId={identity.userId} initialState={partnerState} />
      </div>
    </div>
  )

  return <ProfileView profile={profile} actions={counts} />
}
