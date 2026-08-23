import { sql } from "drizzle-orm"

import { db } from "@/lib/db"

// Percent of enrollees who finished. Zero enrolled → 0, never NaN.
export function completionRate(completed: number, enrolled: number): number {
  if (enrolled <= 0) return 0
  return Math.round((completed / enrolled) * 100)
}

export interface ContentRow {
  playlistId: string
  title: string
  channel: string | null
  isCustom: boolean
  enrolled: number
  completed: number
  completionRate: number
  avgProgress: number
}

// Playlists ranked by enrollment, with completion and average progress.
// avgProgress = mean of (completed videos / video_count) across enrollments.
export async function getContentStats(limit = 50): Promise<ContentRow[]> {
  const res = await db.execute(sql`
    with per_enrollment as (
      select up.id, up.playlist_id, up.status,
             count(vp.id) filter (where vp.completed_at is not null)::int as done
      from user_playlists up
      left join video_progress vp on vp.user_playlist_id = up.id
      group by up.id, up.playlist_id, up.status
    )
    select p.id as playlist_id, p.title as title, p.channel_title as channel,
           (p.youtube_playlist_id is null) as is_custom,
           p.video_count as video_count,
           count(pe.id)::int as enrolled,
           count(pe.id) filter (where pe.status = 'completed')::int as completed,
           coalesce(avg(case when p.video_count > 0
             then pe.done::float / p.video_count else 0 end), 0) as avg_progress
    from playlists p
    join per_enrollment pe on pe.playlist_id = p.id
    group by p.id, p.title, p.channel_title, p.youtube_playlist_id, p.video_count
    order by enrolled desc
    limit ${limit}
  `)

  return (
    res.rows as {
      playlist_id: string
      title: string
      channel: string | null
      is_custom: boolean
      enrolled: number
      completed: number
      avg_progress: number
    }[]
  ).map((r) => ({
    playlistId: r.playlist_id,
    title: r.title,
    channel: r.channel,
    isCustom: r.is_custom,
    enrolled: r.enrolled,
    completed: r.completed,
    completionRate: completionRate(r.completed, r.enrolled),
    avgProgress: Math.round(Number(r.avg_progress) * 100),
  }))
}

// ponytail: no video-level drop-off (where inside a playlist people stall) —
// that needs a second video_progress sweep. Add getPlaylistDropoff if needed.
