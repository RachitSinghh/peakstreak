import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"

import { getUserDetail } from "@/lib/admin-users"
import { ContributionGraph } from "@/components/contribution-graph"

export const metadata: Metadata = { title: "User · Admin", robots: { index: false } }
export const dynamic = "force-dynamic"

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const u = await getUserDetail(id)
  if (!u) notFound()

  return (
    <div className="space-y-6">
      <Link
        href="/admin/users"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
      >
        <ArrowLeft className="size-4" /> All users
      </Link>

      <div className="flex flex-wrap items-baseline gap-3">
        <h1 className="text-2xl font-semibold">{u.label}</h1>
        {u.role === "admin" ? (
          <span className="text-primary text-xs uppercase">admin</span>
        ) : null}
        {u.username ? (
          <Link
            href={`/u/${u.username}`}
            className="text-primary text-sm hover:underline"
            target="_blank"
          >
            View profile →
          </Link>
        ) : null}
      </div>

      <div className="text-muted-foreground grid gap-1 text-sm sm:grid-cols-2">
        <span>Email: {u.email}</span>
        <span>Timezone: {u.timezone}</span>
        <span>Joined: {u.joined.toISOString().slice(0, 10)}</span>
        <span>Onboarded: {u.onboardedAt ? u.onboardedAt.toISOString().slice(0, 10) : "no"}</span>
        <span>Notes: {u.notesCount}</span>
        <span>Todos: {u.todosCount}</span>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Current streak" value={u.currentStreak} />
        <Stat label="Longest streak" value={u.longestStreak} />
        <Stat label="Enrollments" value={u.enrollments.length} />
        <Stat label="Feedback" value={u.feedback.length} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <ContributionGraph days={u.graphDays} today={u.today} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Enrollments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {u.enrollments.length === 0 ? (
            <p className="text-muted-foreground text-sm">None.</p>
          ) : (
            u.enrollments.map((e, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="truncate">{e.title}</span>
                <span className="text-muted-foreground tabular-nums">
                  {e.progressPct}% · {e.status}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {u.feedback.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Feedback</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {u.feedback.map((f, i) => (
              <div key={i} className="text-sm">
                <p>{f.message}</p>
                <p className="text-muted-foreground text-xs">
                  {f.path ?? ""} · {f.createdAt.toISOString().slice(0, 10)}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
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
