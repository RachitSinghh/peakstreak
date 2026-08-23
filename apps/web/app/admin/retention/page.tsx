import type { Metadata } from "next"

import { Card, CardContent } from "@workspace/ui/components/card"

import { getRetention } from "@/lib/admin-retention"

export const metadata: Metadata = { title: "Retention · Admin", robots: { index: false } }
export const dynamic = "force-dynamic"

export default async function AdminRetentionPage() {
  const cohorts = await getRetention()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Retention</h1>
        <p className="text-muted-foreground text-sm">
          Weekly signup cohorts. D1/D7/D30 = % of that week&apos;s signups who came back and studied
          within the window. Blank means the cohort is still too young for that window.
        </p>
      </div>

      {cohorts.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground py-10 text-center text-sm">
            No signups yet.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="text-muted-foreground border-border border-b text-left text-xs">
                <tr>
                  <th className="px-4 py-3 font-medium">Cohort (week of)</th>
                  <th className="px-4 py-3 font-medium">Size</th>
                  <th className="px-4 py-3 font-medium">D1</th>
                  <th className="px-4 py-3 font-medium">D7</th>
                  <th className="px-4 py-3 font-medium">D30</th>
                </tr>
              </thead>
              <tbody>
                {cohorts.map((c) => (
                  <tr key={c.week} className="border-border/50 border-b">
                    <td className="px-4 py-3">{c.week}</td>
                    <td className="px-4 py-3 tabular-nums">{c.size}</td>
                    <td className="px-4 py-3 tabular-nums">{c.d1 === null ? "—" : `${c.d1}%`}</td>
                    <td className="px-4 py-3 tabular-nums">{c.d7 === null ? "—" : `${c.d7}%`}</td>
                    <td className="px-4 py-3 tabular-nums">{c.d30 === null ? "—" : `${c.d30}%`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
