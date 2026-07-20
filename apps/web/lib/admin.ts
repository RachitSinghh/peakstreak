import { and, count, desc, eq, gte, inArray, sql } from "drizzle-orm"

import { db, schema } from "@/lib/db"
import { resolveDisplayName } from "@/lib/leaderboard-shared"

// The activation funnel we care about at launch, in order. Names come straight
// from the events written by track() in lib/analytics.ts.
const FUNNEL: { name: string; label: string }[] = [
  { name: "signup", label: "Signed up" },
  { name: "playlist_pasted", label: "Pasted a playlist" },
  { name: "playlist_enrolled", label: "Enrolled" },
  { name: "video_completed", label: "Completed a video" },
]

export interface AdminOverview {
  totalUsers: number
  usersLast30d: number
  feedbackCount: number
  dailySignups: { day: string; n: number }[]
  // One entry per funnel step: all-time total plus a zero-filled 14-day
  // daily series so each step can show its own trend (rising / dropping).
  funnel: { label: string; name: string; total: number; days: { day: string; n: number }[] }[]
}

// ponytail: funnel counts are raw event rows, not distinct users — fine for a
// launch gut-check. Switch to count(distinct user_id) if a number looks inflated.
export async function getAdminOverview(): Promise<AdminOverview> {
  const [totals, feedbackCount, daily, events, series] = await Promise.all([
    db
      .select({
        total: count(),
        last30d: count(
          sql`case when ${schema.users.createdAt} >= now() - interval '30 days' then 1 end`,
        ),
      })
      .from(schema.users),

    db.select({ n: count() }).from(schema.feedback),

    db
      .select({
        day: sql<string>`to_char(date_trunc('day', ${schema.users.createdAt}), 'YYYY-MM-DD')`,
        n: count(),
      })
      .from(schema.users)
      .where(gte(schema.users.createdAt, sql`now() - interval '14 days'`))
      .groupBy(sql`1`)
      .orderBy(sql`1`),

    db
      .select({ name: schema.events.name, n: count() })
      .from(schema.events)
      .where(
        inArray(
          schema.events.name,
          FUNNEL.map((s) => s.name),
        ),
      )
      .groupBy(schema.events.name),

    // Zero-filled daily counts per funnel event over the last 14 days.
    // generate_series builds every day so gaps render as empty bars, not holes.
    db.execute(sql`
      select to_char(d.day, 'YYYY-MM-DD') as day, e.name as name, count(ev.id)::int as n
      from generate_series(
        date_trunc('day', now()) - interval '13 days',
        date_trunc('day', now()),
        interval '1 day'
      ) as d(day)
      cross join (values ${sql.join(
        FUNNEL.map((f) => sql`(${f.name})`),
        sql`, `,
      )}) as e(name)
      left join ${schema.events} ev
        on ev.name = e.name and date_trunc('day', ev.created_at) = d.day
      group by 1, 2
      order by 1
    `),
  ])

  const byName = new Map(events.map((e) => [e.name, e.n]))
  const seriesRows = series.rows as { day: string; name: string; n: number }[]
  const daysByEvent = new Map<string, { day: string; n: number }[]>()
  for (const r of seriesRows) {
    const arr = daysByEvent.get(r.name) ?? []
    arr.push({ day: r.day, n: Number(r.n) })
    daysByEvent.set(r.name, arr)
  }

  return {
    totalUsers: totals[0]?.total ?? 0,
    usersLast30d: totals[0]?.last30d ?? 0,
    feedbackCount: feedbackCount[0]?.n ?? 0,
    dailySignups: daily,
    funnel: FUNNEL.map((s) => ({
      label: s.label,
      name: s.name,
      total: byName.get(s.name) ?? 0,
      days: daysByEvent.get(s.name) ?? [],
    })),
  }
}

export interface FeedbackRow {
  id: string
  message: string
  email: string | null
  userName: string | null
  path: string | null
  createdAt: Date
  approved: boolean
}

export async function getFeedback(limit = 100): Promise<FeedbackRow[]> {
  return db
    .select({
      id: schema.feedback.id,
      message: schema.feedback.message,
      email: schema.feedback.email,
      userName: schema.users.name,
      path: schema.feedback.path,
      createdAt: schema.feedback.createdAt,
      approved: schema.feedback.approvedAsTestimonial,
    })
    .from(schema.feedback)
    .leftJoin(schema.users, eq(schema.feedback.userId, schema.users.id))
    .orderBy(desc(schema.feedback.createdAt))
    .limit(limit)
}

export interface Testimonial {
  id: string
  message: string
  name: string
}

// Marker email for locally-seeded demo testimonials. These are hidden in
// production so practice/seed data can never leak onto the live landing page.
export const SEED_TESTIMONIAL_EMAIL = "seed@peakstreak.test"

/** Approved testimonials for the public landing marquee. Name only, never email. */
export async function getTestimonials(limit = 20): Promise<Testimonial[]> {
  const where = [eq(schema.feedback.approvedAsTestimonial, true)]
  if (process.env.NODE_ENV === "production") {
    where.push(sql`${schema.feedback.email} is distinct from ${SEED_TESTIMONIAL_EMAIL}`)
  }

  const rows = await db
    .select({
      id: schema.feedback.id,
      message: schema.feedback.message,
      userId: schema.feedback.userId,
      name: schema.users.name,
      displayName: schema.users.displayName,
    })
    .from(schema.feedback)
    .leftJoin(schema.users, eq(schema.feedback.userId, schema.users.id))
    .where(and(...where))
    .orderBy(desc(schema.feedback.approvedAt))
    .limit(limit)

  return rows.map((r) => ({
    id: r.id,
    message: r.message,
    // Anonymous submissions (no user) fall back to a neutral label.
    name: r.userId ? resolveDisplayName(r.displayName, r.name, r.userId) : "A learner",
  }))
}
