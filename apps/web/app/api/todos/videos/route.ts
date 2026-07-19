import { currentUserId } from "@/lib/auth"
import { listEnrollableVideos } from "@/lib/todos"

/** Videos from the user's playlists, for the "add existing video" picker. */
export async function GET() {
  const userId = await currentUserId()
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 })
  return Response.json({ playlists: await listEnrollableVideos(userId) })
}
