import { sql } from "drizzle-orm"

import { db } from "@/lib/db"

// Which return-windows a given "days since signup" counts toward. Signup day
// (0) counts for nothing; a window includes activity from day 1 up to and
// including day N. So D1 ⊆ D7 ⊆ D30.
export function retentionWindows(daysSinceSignup: number): ("d1" | "d7" | "d30")[] {
  if (daysSinceSignup < 1) return []
  const out: ("d1" | "d7" | "d30")[] = []
  if (daysSinceSignup <= 1) out.push("d1")
  if (daysSinceSignup <= 7) out.push("d7")
  if (daysSinceSignup <= 30) out.push("d30")
  return out
}

export interface CohortRow {
  week: string
  size: number
  d1: number | null
  d7: number | null
  d30: number | null
}

// Weekly signup cohorts with D1/D7/D30 return rates. A window is null when the
// cohort's whole week is younger than that window (denominator not yet fair).
export async function getRetention(): Promise<CohortRow[]> {
  const res = await db.execute(sql`
    with cohort as (
      select id,
             to_char(date_trunc('week', created_at), 'YYYY-MM-DD') as week,
             created_at::date as signup_date
      from users
    ),
    activity as (
      select distinct user_id, activity_date
      from daily_activity
      where videos_completed >= 1 or is_frozen
    ),
    hits as (
      select c.week, c.id,
             count(a.activity_date) filter (
               where a.activity_date > c.signup_date
                 and a.activity_date <= c.signup_date + 1) as d1,
             count(a.activity_date) filter (
               where a.activity_date > c.signup_date
                 and a.activity_date <= c.signup_date + 7) as d7,
             count(a.activity_date) filter (
               where a.activity_date > c.signup_date
                 and a.activity_date <= c.signup_date + 30) as d30,
             (now()::date - c.signup_date) as age_days
      from cohort c
      left join activity a on a.user_id = c.id
      group by c.week, c.id, c.signup_date
    )
    select week,
           count(*)::int as size,
           round(100.0 * count(*) filter (where d1 > 0)
             / nullif(count(*) filter (where age_days >= 1), 0)) as d1,
           round(100.0 * count(*) filter (where d7 > 0)
             / nullif(count(*) filter (where age_days >= 7), 0)) as d7,
           round(100.0 * count(*) filter (where d30 > 0)
             / nullif(count(*) filter (where age_days >= 30), 0)) as d30
    from hits
    group by week
    order by week desc
  `)

  return (
    res.rows as {
      week: string
      size: number
      d1: string | null
      d7: string | null
      d30: string | null
    }[]
  ).map((r) => ({
    week: r.week,
    size: r.size,
    d1: r.d1 === null ? null : Number(r.d1),
    d7: r.d7 === null ? null : Number(r.d7),
    d30: r.d30 === null ? null : Number(r.d30),
  }))
}
