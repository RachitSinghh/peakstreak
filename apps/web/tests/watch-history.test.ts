import { beforeEach, describe, expect, it } from "vitest"
import { and, eq } from "drizzle-orm"

import { resetDb, db, schema, seedUser } from "./helpers"

import { syncCompletedFromHistory } from "@/lib/watch-history"

let n = 0

/** Two playlists that share ONE video, both enrolled by the same user. */
async function sharedVideoSetup() {
  n++
  const user = await seedUser()
  const [video] = await db
    .insert(schema.videos)
    .values({ youtubeVideoId: `wh-vid-${n}-${Date.now()}`, title: "Shared", durationSeconds: 600 })
    .returning()
  const playlists = await Promise.all(
    ["A", "B"].map(async (tag) => {
      const [p] = await db
        .insert(schema.playlists)
        .values({
          youtubePlaylistId: `wh-${tag}-${n}-${Date.now()}`,
          title: tag,
          videoCount: 1,
          totalDurationSeconds: 600,
        })
        .returning()
      await db.insert(schema.playlistVideos).values({ playlistId: p!.id, videoId: video!.id, position: 0 })
      const [enr] = await db
        .insert(schema.userPlaylists)
        .values({ userId: user.id, playlistId: p!.id, paceType: "videos_per_day", paceValue: 1 })
        .returning()
      return enr!
    }),
  )
  return { user, video: video!, enrA: playlists[0]!, enrB: playlists[1]! }
}

async function completedIn(enrollmentId: string, videoId: string) {
  const row = await db.query.videoProgress.findFirst({
    where: and(
      eq(schema.videoProgress.userPlaylistId, enrollmentId),
      eq(schema.videoProgress.videoId, videoId),
    ),
  })
  return row?.isCompleted === true
}

describe("syncCompletedFromHistory", () => {
  beforeEach(resetDb)

  it("marks a shared video complete in the other enrollment", async () => {
    const { user, video, enrA, enrB } = await sharedVideoSetup()
    // Finished it in A only.
    await db
      .insert(schema.videoProgress)
      .values({ userPlaylistId: enrA.id, videoId: video.id, isCompleted: true, completedAt: new Date() })

    expect(await completedIn(enrB.id, video.id)).toBe(false)
    const marked = await syncCompletedFromHistory(user.id)
    expect(marked).toBe(1)
    expect(await completedIn(enrB.id, video.id)).toBe(true)
  })

  it("never touches daily_activity or streaks", async () => {
    const { user, video, enrA } = await sharedVideoSetup()
    await db
      .insert(schema.videoProgress)
      .values({ userPlaylistId: enrA.id, videoId: video.id, isCompleted: true, completedAt: new Date() })

    await syncCompletedFromHistory(user.id)

    const activity = await db
      .select()
      .from(schema.dailyActivity)
      .where(eq(schema.dailyActivity.userId, user.id))
    expect(activity).toHaveLength(0)
  })

  it("is idempotent", async () => {
    const { user, video, enrA } = await sharedVideoSetup()
    await db
      .insert(schema.videoProgress)
      .values({ userPlaylistId: enrA.id, videoId: video.id, isCompleted: true, completedAt: new Date() })

    expect(await syncCompletedFromHistory(user.id)).toBe(1)
    expect(await syncCompletedFromHistory(user.id)).toBe(0)
  })

  it("does nothing when the user has completed nothing", async () => {
    const { user } = await sharedVideoSetup()
    expect(await syncCompletedFromHistory(user.id)).toBe(0)
  })
})
