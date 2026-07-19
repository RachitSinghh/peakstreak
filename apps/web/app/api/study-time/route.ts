import { currentUserId } from "@/lib/auth"
import { getStudyTime, type StudyRange } from "@/lib/study-time"
import { getUser } from "@/lib/user"

/** FT-S2: active learning time for the signed-in user (today/week/all). */
export async function GET(request: Request) {
  const userId = await currentUserId()
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const raw = new URL(request.url).searchParams.get("range")
  const range: StudyRange = raw === "week" || raw === "all" ? raw : "today"

  const user = await getUser(userId)
  const seconds = await getStudyTime(userId, range, user.timezone)
  return Response.json({ range, seconds })
}
