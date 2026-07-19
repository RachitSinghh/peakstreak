import { z } from "zod"

import { currentUserId } from "@/lib/auth"
import { fetchVideosByIds } from "@/lib/youtube/client"
import { parseVideoInput } from "@/lib/youtube/url"

const bodySchema = z.object({ url: z.string().trim().min(1).max(500) })

/**
 * FT-PM4: resolve a YouTube URL to its length so a todo's estimate can be
 * prefilled. Fails soft — the client falls back to manual entry on any error.
 */
export async function POST(request: Request) {
  const userId = await currentUserId()
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: "invalid_body" }, { status: 400 })

  const videoId = parseVideoInput(parsed.data.url)
  if (!videoId) return Response.json({ error: "unsupported_url" }, { status: 422 })

  try {
    const [video] = await fetchVideosByIds([videoId])
    if (!video || video.durationSeconds <= 0) {
      return Response.json({ error: "not_found" }, { status: 422 })
    }
    return Response.json({
      videoId,
      title: video.title,
      minutes: Math.max(1, Math.round(video.durationSeconds / 60)),
    })
  } catch {
    return Response.json({ error: "fetch_failed" }, { status: 502 })
  }
}
