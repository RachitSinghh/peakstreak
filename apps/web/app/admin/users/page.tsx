import type { Metadata } from "next"
import Link from "next/link"

import { Card, CardContent } from "@workspace/ui/components/card"

import { getUsers } from "@/lib/admin-users"

export const metadata: Metadata = { title: "Users · Admin", robots: { index: false } }
export const dynamic = "force-dynamic"

const PAGE = 50

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  const sp = await searchParams
  const q = sp.q?.trim() || undefined
  const pageNum = Math.max(1, Number(sp.page) || 1)
  const offset = (pageNum - 1) * PAGE
  const { rows, total } = await getUsers({ q, limit: PAGE, offset })

  const from = total === 0 ? 0 : offset + 1
  const to = offset + rows.length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Users</h1>
        <p className="text-muted-foreground text-sm">
          Showing {from}–{to} of {total}. Click a row for the full picture.
        </p>
      </div>

      <form className="flex gap-2">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search name or email"
          className="border-border bg-background w-full max-w-sm rounded-lg border px-3 py-2 text-sm"
        />
      </form>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground py-10 text-center text-sm">
            No users found.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="text-muted-foreground border-border border-b text-left text-xs">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Joined</th>
                  <th className="px-4 py-3 font-medium">Streak</th>
                  <th className="px-4 py-3 font-medium">Playlists</th>
                  <th className="px-4 py-3 font-medium">Last active</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => (
                  <tr key={u.id} className="border-border/50 hover:bg-secondary/50 border-b">
                    <td className="px-4 py-3">
                      <Link href={`/admin/users/${u.id}`} className="hover:underline">
                        {u.label}
                        {u.role === "admin" ? (
                          <span className="text-primary ml-1.5 text-[10px] uppercase">admin</span>
                        ) : null}
                      </Link>
                    </td>
                    <td className="text-muted-foreground px-4 py-3">{u.email}</td>
                    <td className="text-muted-foreground px-4 py-3">
                      {u.joined.toISOString().slice(0, 10)}
                    </td>
                    <td className="px-4 py-3 tabular-nums">{u.currentStreak}</td>
                    <td className="text-muted-foreground px-4 py-3 tabular-nums">
                      {u.activePlaylists} active / {u.completedPlaylists} done
                    </td>
                    <td className="text-muted-foreground px-4 py-3">{u.lastActive ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between text-sm">
        {pageNum > 1 ? (
          <Link
            href={`/admin/users?${new URLSearchParams({ ...(q ? { q } : {}), page: String(pageNum - 1) })}`}
            className="text-primary hover:underline"
          >
            ← Prev
          </Link>
        ) : (
          <span />
        )}
        {to < total ? (
          <Link
            href={`/admin/users?${new URLSearchParams({ ...(q ? { q } : {}), page: String(pageNum + 1) })}`}
            className="text-primary hover:underline"
          >
            Next →
          </Link>
        ) : (
          <span />
        )}
      </div>
    </div>
  )
}
