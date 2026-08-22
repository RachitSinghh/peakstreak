/**
 * Pure, dependency-free group constants and types. Separate from `lib/groups.ts`
 * (which imports db → server-only) so client components can import the cap and
 * the view types without pulling server code into the browser bundle. Mirrors
 * the `nudges-shared.ts` / `leaderboard-shared.ts` split.
 */

export const GROUP_SIZE_CAP = 20

export type GroupRole = "owner" | "member" | null

export interface GroupSummary {
  slug: string
  name: string
  memberCount: number
}

export interface GroupMemberStatus {
  userId: string
  displayName: string
  username: string | null
  image: string | null
  role: "owner" | "member"
  currentStreak: number
  studiedToday: boolean
  /** Videos this member has completed on the group goal (0 when no goal). */
  goalCompletedCount: number
}

/** SOC-07: the shared goal, present only when an owner has set one. */
export interface GroupGoal {
  title: string
  videoCount: number
  streakThreshold: number
  groupStreak: number
  /** Average completion across members, 0–100. */
  avgCompletionPct: number
}

export interface GroupPage {
  slug: string
  name: string
  description: string | null
  memberCount: number
  isFull: boolean
  viewerRole: GroupRole
  /** Populated only when the viewer is a member (privacy). */
  members: GroupMemberStatus[]
  goal: GroupGoal | null
  /** Owner's playlists to pick a goal from — only when viewer is owner and no goal yet. */
  ownerPlaylistOptions: { playlistId: string; title: string }[]
}

export type GroupActionResult = { ok: true; slug?: string } | { error: string }
