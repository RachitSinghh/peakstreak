import { z } from "zod"

import { currentUserId } from "@/lib/auth"
import { setPresence } from "@/lib/presence"

const bodySchema = z.object({ status: z.enum(["online", "studying"]).default("online") })

/** FT-S1 heartbeat: the client re-stamps its presence key (~every 15s). */
export async function POST(request: Request) {
  const userId = await currentUserId()
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})))
  const status = parsed.success ? parsed.data.status : "online"

  await setPresence(userId, status)
  return Response.json({ ok: true })
}
