import { Flame, ListChecks, Timer, Trophy } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar"

import { ContributionGraph, type GraphDay } from "@/components/contribution-graph"
import { formatDuration } from "@/lib/pace"

export interface ProfileViewData {
  username: string | null
  displayName: string
  bio: string | null
  image: string | null
  currentStreak: number
  longestStreak: number
  playlistsCompleted: number
  totalWatchSeconds: number
  activityDays: GraphDay[]
  today: string
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

/**
 * Shared profile body used by the public `/u/:username` page and the owner's
 * `/profile` page. `actions` is the slot under the name — a follow button on
 * public profiles, count links / edit links on your own.
 */
export function ProfileView({
  profile,
  actions,
}: {
  profile: ProfileViewData
  actions?: React.ReactNode
}) {
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
          {profile.username ? (
            <p className="text-muted-foreground text-sm">@{profile.username}</p>
          ) : (
            <p className="text-muted-foreground text-sm">No public username yet</p>
          )}
        </div>
      </div>

      {actions}

      {profile.bio && <p className="text-sm">{profile.bio}</p>}

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
