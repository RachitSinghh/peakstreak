import { z } from "zod"

import { currentUserId } from "@/lib/auth"
import { addFocusSeconds } from "@/lib/study-time"
import { getUser } from "@/lib/user"

// Cap a single report at ~2h so a bad client can't inflate totals; a real
// Pomodoro work interval is minutes, reported one completed interval at a time.
const bodySchema = z.object({ seconds: z.number().min(0).max(7200) })

/** FT-S2: record completed Pomodoro focus seconds against today. */
export async function POST(request: Request) {
  const userId = await currentUserId()
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: "invalid_body" }, { status: 400 })

  const user = await getUser(userId)
  await addFocusSeconds(userId, parsed.data.seconds, user.timezone)
  return Response.json({ ok: true })
}
