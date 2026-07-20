import type { Metadata } from "next"

import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"

import { getAdminOverview } from "@/lib/admin"

export const metadata: Metadata = { title: "Analytics · Admin", robots: { index: false } }

// Always fresh — this is a dashboard, not a cacheable page.
export const dynamic = "force-dynamic"

export default async function AdminAnalyticsPage() {
  const stats = await getAdminOverview()

  const peakDay = Math.max(1, ...stats.dailySignups.map((d) => d.n))
  const signedUp = stats.funnel[0]?.total ?? 0

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Analytics</h1>
        <p className="text-muted-foreground text-sm">
          Your numbers. Raw pageviews and visitors live in the{" "}
          <a
            href="https://vercel.com/dashboard"
            target="_blank"
            rel="noreferrer"
            className="text-primary underline underline-offset-2"
          >
            Vercel Analytics
          </a>{" "}
          dashboard.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Stat label="Total signups" value={stats.totalUsers} />
        <Stat label="New (30 days)" value={stats.usersLast30d} />
        <Stat label="Feedback" value={stats.feedbackCount} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Signups, last 14 days</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.dailySignups.length === 0 ? (
            <p className="text-muted-foreground text-sm">No signups yet.</p>
          ) : (
            <div className="flex items-end gap-1.5" style={{ height: 96 }}>
              {stats.dailySignups.map((d) => (
                <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-muted-foreground text-[10px]">{d.n || ""}</span>
                  <div
                    className="bg-primary/70 w-full rounded-sm"
                    style={{ height: `${(d.n / peakDay) * 72}px`, minHeight: d.n ? 3 : 0 }}
                    title={`${d.day}: ${d.n}`}
                  />
                  <span className="text-muted-foreground text-[10px]">{d.day.slice(5)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Activation funnel</CardTitle>
          <p className="text-muted-foreground text-xs">
            Big number is all-time. Bars show the last 14 days, so you can see each step rising or
            dropping.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            {stats.funnel.map((step) => (
              <FunnelStep
                key={step.name}
                label={step.label}
                total={step.total}
                pct={signedUp ? Math.round((step.total / signedUp) * 100) : 0}
                days={step.days}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function FunnelStep({
  label,
  total,
  pct,
  days,
}: {
  label: string
  total: number
  pct: number
  days: { day: string; n: number }[]
}) {
  const max = Math.max(1, ...days.map((d) => d.n))
  return (
    <div className="border-border rounded-lg border p-4">
      <div className="flex items-baseline justify-between">
        <span className="text-muted-foreground text-sm">{label}</span>
        <span className="text-muted-foreground text-xs tabular-nums">{pct}%</span>
      </div>
      <p className="text-2xl font-semibold tabular-nums">{total}</p>

      <div className="mt-3 flex items-end gap-0.5" style={{ height: 44 }}>
        {days.map((d) => (
          <div
            key={d.day}
            className={`flex-1 rounded-sm ${d.n ? "bg-primary/70" : "bg-secondary"}`}
            style={{ height: d.n ? `${(d.n / max) * 100}%` : 2, minHeight: 2 }}
            title={`${d.day}: ${d.n}`}
          />
        ))}
      </div>
      <div className="text-muted-foreground mt-1 flex justify-between text-[10px]">
        <span>{days[0]?.day.slice(5)}</span>
        <span>{days[days.length - 1]?.day.slice(5)}</span>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
        <p className="text-muted-foreground text-sm">{label}</p>
      </CardContent>
    </Card>
  )
}
