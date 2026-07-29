import { and, eq, sql } from "drizzle-orm"

import { db, schema } from "@/lib/db"
import { resolveDisplayName } from "@/lib/leaderboard-shared"

/**
 * SOC-03: the friend activity feed. There is no stored event stream — items
 * are derived on read from the same source-of-truth rows the dashboard uses
 * (enrollment start/completion + daily activity), filtered to the people the
 * current user follows. The feed is ONE query (a UNION ALL over the three
 * sources joined to a `followees` CTE), not a query per followee.
 */

export type FeedKind = "started" | "completed" | "studied"

export interface FeedItem {
  kind: FeedKind
  /** ISO timestamp of the activity. */
  ts: string
  username: string
  displayName: string
  image: string | null
  playlistTitle: string | null
  videosCompleted: number
}

interface FeedRow {
  kind: FeedKind
  ts: string
  playlist_title: string | null
  videos_completed: number
  name: string | null
  display_name: string | null
  username: string
  image: string | null
  owner_id: string
}

export async function getActivityFeed(
  userId: string,
  limit = 30,
): Promise<{ items: FeedItem[]; followsAnyone: boolean }> {
  const [feed, follows] = await Promise.all([
    db.execute(sql`
      with followees as (
        select followee_id from follows
        where follower_id = ${userId} and status = 'accepted'
      ),
      feed as (
        select up.user_id as uid, 'started'::text as kind, up.started_at as ts,
               p.title as playlist_title, 0 as videos_completed
        from user_playlists up
        join playlists p on p.id = up.playlist_id
        where up.user_id in (select followee_id from followees)
        union all
        select up.user_id, 'completed', up.completed_at,
               p.title, 0
        from user_playlists up
        join playlists p on p.id = up.playlist_id
        where up.status = 'completed' and up.completed_at is not null
          and up.user_id in (select followee_id from followees)
        union all
        select da.user_id, 'studied', da.updated_at,
               null, da.videos_completed
        from daily_activity da
        where da.videos_completed >= 1
          and da.user_id in (select followee_id from followees)
      )
      select f.kind, f.ts, f.playlist_title, f.videos_completed,
             u.name, u.display_name, u.username, u.image, u.id as owner_id
      from feed f
      join users u on u.id = f.uid
      order by f.ts desc
      limit ${limit}
    `),
    db.query.follows.findFirst({
      where: and(eq(schema.follows.followerId, userId), eq(schema.follows.status, "accepted")),
    }),
  ])

  const items = (feed.rows as unknown as FeedRow[]).map((r) => ({
    kind: r.kind,
    ts: typeof r.ts === "string" ? r.ts : new Date(r.ts).toISOString(),
    username: r.username,
    displayName: resolveDisplayName(r.display_name, r.name, r.owner_id),
    image: r.image,
    playlistTitle: r.playlist_title,
    videosCompleted: Number(r.videos_completed),
  }))

  return { items, followsAnyone: !!follows }
}
