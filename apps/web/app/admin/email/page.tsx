import type { Metadata } from "next"

import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"

import { getEmailHealth } from "@/lib/admin-email"

export const metadata: Metadata = { title: "Email · Admin", robots: { index: false } }
export const dynamic = "force-dynamic"

export default async function AdminEmailPage() {
  const e = await getEmailHealth()
  const peak = Math.max(1, ...e.daily.map((d) => d.n))

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Email</h1>
        <p className="text-muted-foreground text-sm">
          Reminder + completion email health. Open rate comes from provider open webhooks.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Stat label="Total sent" value={String(e.totalSent)} />
        <Stat label="Open rate" value={`${e.openRate}%`} />
        <Stat label="Reminder opt-outs" value={String(e.optOut)} />
      </div>

      {e.byType.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sent by type</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {e.byType.map((t) => (
              <div key={t.type} className="flex justify-between">
                <span className="text-muted-foreground">{t.type}</span>
                <span className="tabular-nums">{t.n}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sent, last 14 days</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-1.5" style={{ height: 96 }}>
            {e.daily.map((d) => (
              <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-muted-foreground text-[10px]">{d.n || ""}</span>
                <div
                  className="bg-primary/70 w-full rounded-sm"
                  style={{ height: `${(d.n / peak) * 72}px`, minHeight: d.n ? 3 : 0 }}
                  title={`${d.day}: ${d.n}`}
                />
                <span className="text-muted-foreground text-[10px]">{d.day.slice(5)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
        <p className="text-muted-foreground text-sm">{label}</p>
      </CardContent>
    </Card>
  )
}
