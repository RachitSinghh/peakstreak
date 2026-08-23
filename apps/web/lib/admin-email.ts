import { count, eq, sql } from "drizzle-orm"

import { db, schema } from "@/lib/db"

export interface EmailHealth {
  totalSent: number
  byType: { type: string; n: number }[]
  openRate: number
  optOut: number
  daily: { day: string; n: number }[]
}

// Email deliverability at a glance. openedAt is populated by the provider
// webhook (app/api/email/webhook/route.ts), so open rate is real data.
export async function getEmailHealth(): Promise<EmailHealth> {
  const [totals, byType, optOut, daily] = await Promise.all([
    db
      .select({
        total: count(),
        opened: count(sql`case when ${schema.emailLog.openedAt} is not null then 1 end`),
      })
      .from(schema.emailLog),

    db
      .select({ type: schema.emailLog.type, n: count() })
      .from(schema.emailLog)
      .groupBy(schema.emailLog.type),

    db
      .select({ n: count() })
      .from(schema.emailPreferences)
      .where(eq(schema.emailPreferences.remindersEnabled, false)),

    // Zero-filled daily send counts over the last 14 days.
    db.execute(sql`
      select to_char(d.day, 'YYYY-MM-DD') as day, count(e.id)::int as n
      from generate_series(
        date_trunc('day', now()) - interval '13 days',
        date_trunc('day', now()),
        interval '1 day'
      ) as d(day)
      left join ${schema.emailLog} e on date_trunc('day', e.sent_at) = d.day
      group by 1
      order by 1
    `),
  ])

  const total = totals[0]?.total ?? 0
  const opened = totals[0]?.opened ?? 0

  return {
    totalSent: total,
    byType: byType.map((r) => ({ type: r.type, n: r.n })),
    openRate: total > 0 ? Math.round((opened / total) * 100) : 0,
    optOut: optOut[0]?.n ?? 0,
    daily: (daily.rows as { day: string; n: number }[]).map((r) => ({
      day: r.day,
      n: Number(r.n),
    })),
  }
}
