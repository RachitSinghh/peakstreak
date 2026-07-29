import type { Metadata } from "next"
import Link from "next/link"
import { Flame, ListChecks, Timer, Trophy } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar"

import { ContributionGraph } from "@/components/contribution-graph"
import { ProfileFollow } from "@/components/profile-follow"
import { currentUserId } from "@/lib/auth"
import { isFollowing } from "@/lib/follows"
import { formatDuration } from "@/lib/pace"
import { getPublicProfile } from "@/lib/profile"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>
}): Promise<Metadata> {
  const { username } = await params
  const profile = await getPublicProfile(username)
  if (!profile) return { title: "Profile not found", robots: { index: false, follow: false } }
  return {
    title: `${profile.displayName} on PeakStreak`,
    description: profile.bio ?? `${profile.displayName}'s learning streak on PeakStreak.`,
  }
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="border-border bg-card flex flex-col gap-1 rounded-xl border p-4">
      <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
        {icon}
        {label}
      </span>
      <span className="text-2xl font-semibold">{value}</span>
    </div>
  )
}

export default async function PublicProfilePage({
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
        <p className="text-muted-foreground mb-6 text-sm">
          This profile doesn&apos;t exist or is private.
        </p>
        <Link href="/" className="text-primary text-sm underline underline-offset-4">
          Go to PeakStreak
        </Link>
      </div>
    )
  }

  const viewerId = await currentUserId()
  const isOwnProfile = viewerId === profile.userId
  const viewerFollows =
    viewerId && !isOwnProfile ? await isFollowing(viewerId, profile.userId) : false

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Avatar size="lg" className="size-16">
          {profile.image && <AvatarImage src={profile.image} alt="" />}
          <AvatarFallback className="text-lg">
            {profile.displayName.slice(0, 1).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-semibold">{profile.displayName}</h1>
          <p className="text-muted-foreground text-sm">@{profile.username}</p>
        </div>
      </div>

      {profile.bio && <p className="text-sm">{profile.bio}</p>}

      <ProfileFollow
        username={profile.username}
        isOwnProfile={isOwnProfile}
        isAuthenticated={!!viewerId}
        initialIsFollowing={viewerFollows}
        followerCount={profile.followerCount}
        followingCount={profile.followingCount}
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat
          icon={<Flame className="text-primary size-3.5" />}
          label="Current streak"
          value={`${profile.currentStreak}d`}
        />
        <Stat
          icon={<Trophy className="text-primary size-3.5" />}
          label="Longest streak"
          value={`${profile.longestStreak}d`}
        />
        <Stat
          icon={<ListChecks className="text-primary size-3.5" />}
          label="Playlists done"
          value={String(profile.playlistsCompleted)}
        />
        <Stat
          icon={<Timer className="text-primary size-3.5" />}
          label="Learning time"
          value={formatDuration(profile.totalWatchSeconds)}
        />
      </div>

      <ContributionGraph days={profile.activityDays} today={profile.today} />
    </div>
  )
}
