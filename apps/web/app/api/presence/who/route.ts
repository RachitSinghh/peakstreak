import { currentUserId } from "@/lib/auth"
import { getWhosStudying } from "@/lib/whos-studying"

/**
 * FT-S3 sidebar poll. Returns the whole "who's studying" list (audience +
 * live status + today's hours) so the client polls one endpoint. The audience
 * is derived server-side from the leaderboard set — the client sends nothing.
 *
 * ponytail: recomputes presence + a small GROUP BY every poll. Fine at
 * current scale; cache the audience/hours (refresh presence only) if the
 * active-user set grows into the thousands.
 */
export async function GET() {
  const userId = await currentUserId()
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 })

  return Response.json({ people: await getWhosStudying(userId) })
}
