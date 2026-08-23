import type { Metadata } from "next"

import { Card, CardContent } from "@workspace/ui/components/card"

import { getContentStats } from "@/lib/admin-content"

export const metadata: Metadata = { title: "Content · Admin", robots: { index: false } }
export const dynamic = "force-dynamic"

export default async function AdminContentPage() {
  const rows = await getContentStats()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Content</h1>
        <p className="text-muted-foreground text-sm">
          Playlists ranked by enrollment. Completion = share of enrollees who finished; avg
          progress = mean completion across all enrollments.
        </p>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground py-10 text-center text-sm">
            No enrollments yet.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="text-muted-foreground border-border border-b text-left text-xs">
                <tr>
                  <th className="px-4 py-3 font-medium">Playlist</th>
                  <th className="px-4 py-3 font-medium">Enrolled</th>
                  <th className="px-4 py-3 font-medium">Completed</th>
                  <th className="px-4 py-3 font-medium">Completion</th>
                  <th className="px-4 py-3 font-medium">Avg progress</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.playlistId} className="border-border/50 border-b">
                    <td className="px-4 py-3">
                      <span className="line-clamp-1">{r.title}</span>
                      <span className="text-muted-foreground text-xs">
                        {r.isCustom ? "custom" : (r.channel ?? "")}
                      </span>
                    </td>
                    <td className="px-4 py-3 tabular-nums">{r.enrolled}</td>
                    <td className="px-4 py-3 tabular-nums">{r.completed}</td>
                    <td className="px-4 py-3 tabular-nums">{r.completionRate}%</td>
                    <td className="px-4 py-3 tabular-nums">{r.avgProgress}%</td>
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
