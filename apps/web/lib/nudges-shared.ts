/**
 * Pure, dependency-free nudge copy and types. Kept separate from `lib/nudges.ts`
 * (which imports db/email/rate-limit → `next/headers`, server-only) so client
 * components can import the labels and kind without pulling server code into
 * the browser bundle. Mirrors the `leaderboard-shared.ts` split.
 */

export type NudgeKind = "cheer" | "streak"

/** Prewritten copy per kind. No free text (avoids moderation). */
export const NUDGE_KINDS: Record<NudgeKind, { label: string; message: string }> = {
  cheer: { label: "Cheer on", message: "is cheering you on — keep going! 💪" },
  streak: { label: "Nudge", message: "wants you to keep your streak alive today 🔥" },
}

/** The one-line message a nudge shows, e.g. "Ada is cheering you on…". */
export function nudgeMessage(fromName: string, kind: NudgeKind): string {
  return `${fromName} ${NUDGE_KINDS[kind]?.message ?? NUDGE_KINDS.cheer.message}`
}
