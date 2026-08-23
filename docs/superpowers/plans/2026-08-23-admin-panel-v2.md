# Admin Panel v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add five read-only operational surfaces to `/admin` (users list, user detail, retention cohorts, content leaderboard, email health), all backed by existing tables.

**Architecture:** One flat `lib/admin-*.ts` file per surface (matches `lib/groups.ts`/`lib/feed.ts`), each exporting query functions. Pages are `force-dynamic` server components under `app/admin/`, gated by the existing `requireAdmin()` in `app/admin/layout.tsx`. Non-trivial math lives in pure helpers with unit tests; SQL read queries are verified by build + manual visit.

**Tech Stack:** Next.js App Router (server components), Drizzle ORM (Postgres), Vitest, Tailwind, `@workspace/ui` card primitives.

## Global Constraints

- No new database tables or migrations — every query reads existing schema (`lib/db/schema.ts`).
- `lib/admin.ts` stays untouched (holds `getTestimonials`, imported by the landing page).
- Every new page: `export const dynamic = "force-dynamic"` and `metadata.robots = { index: false }`.
- Never render a user's raw email as their display label — use `resolveDisplayName(displayName, name, userId)` (`lib/leaderboard-shared.ts`). Email is fine to show in admin table/detail columns explicitly labelled "email".
- Code comments: one line, ≤20 words.
- Final gate before "done": `pnpm --filter web build` (catches client/server boundary errors), plus `pnpm --filter web test` and `pnpm --filter web lint`.
- Tests use the repo harness: `import { db, resetDb, schema, seedUser } from "./helpers"`, `vitest`. Pure helpers need no DB.

**Reusable signatures (verified in codebase):**
- `computeStreaks(days: ActivityDay[], today: string): StreakStats` where `ActivityDay = { activityDate: string; videosCompleted: number; isFrozen: boolean }` and `StreakStats = { currentStreak: number; longestStreak: number; activeToday: boolean }` (`lib/streaks.ts`).
- `ContributionGraph({ days, today }: { days: GraphDay[]; today: string })` where `GraphDay = { activityDate: string; videosCompleted: number; isFrozen: boolean; secondsWatched: number }` (`components/contribution-graph.tsx`).
- `resolveDisplayName(displayName, name, userId): string` (`lib/leaderboard-shared.ts`).
- `localDateString(instant: Date, timeZone: string): string` (`lib/dates.ts`).
- `db.execute(sql\`...\`)` returns `{ rows }` — untyped, cast `res.rows as T[]` (pattern in `lib/admin.ts:63`).

---

## File Structure

| File | Responsibility |
|------|----------------|
| `apps/web/lib/admin-users.ts` | `getUsers`, `getUserDetail` |
| `apps/web/lib/admin-retention.ts` | pure `retentionWindows`, `getRetention` |
| `apps/web/lib/admin-content.ts` | pure `completionRate`, `getContentStats` |
| `apps/web/lib/admin-email.ts` | `getEmailHealth` |
| `apps/web/app/admin/users/page.tsx` | users list + search + pagination |
| `apps/web/app/admin/users/[id]/page.tsx` | user detail |
| `apps/web/app/admin/retention/page.tsx` | cohort table |
| `apps/web/app/admin/content/page.tsx` | content leaderboard table |
| `apps/web/app/admin/email/page.tsx` | email health cards + bars |
| `apps/web/components/admin-nav.tsx` | add 4 nav items (one per task) |
| `apps/web/tests/admin-retention.test.ts` | `retentionWindows` boundaries |
| `apps/web/tests/admin-content.test.ts` | `completionRate` cases |

Nav final order: Analytics, Users, Retention, Content, Email, Feedback. Each task inserts its own nav item so no task leaves a link pointing at a missing page.

---

## Task 1: Users list

**Files:**
- Create: `apps/web/lib/admin-users.ts` (getUsers only this task)
- Create: `apps/web/app/admin/users/page.tsx`
- Modify: `apps/web/components/admin-nav.tsx`

**Interfaces:**
- Produces: `getUsers(opts: { q?: string; limit?: number; offset?: number }): Promise<{ rows: AdminUserRow[]; total: number }>` where
  ```ts
  interface AdminUserRow {
    id: string
    label: string        // resolveDisplayName output
    email: string
    role: "user" | "admin"
    joined: Date
    currentStreak: number
    activePlaylists: number
    completedPlaylists: number
    lastActive: string | null  // YYYY-MM-DD, max activity_date
  }
  ```

- [ ] **Step 1: Write `getUsers` in `apps/web/lib/admin-users.ts`**

```ts
import { and, count, desc, eq, ilike, or, sql } from "drizzle-orm"

import { db, schema } from "@/lib/db"
import { computeStreaks } from "@/lib/streaks"
import { resolveDisplayName } from "@/lib/leaderboard-shared"
import { localDateString } from "@/lib/dates"

export interface AdminUserRow {
  id: string
  label: string
  email: string
  role: "user" | "admin"
  joined: Date
  currentStreak: number
  activePlaylists: number
  completedPlaylists: number
  lastActive: string | null
}

// Read-only user directory. Streaks computed per listed user from one batched
// activity query, so this is O(page size) round trips, never N+1.
export async function getUsers({
  q,
  limit = 50,
  offset = 0,
}: {
  q?: string
  limit?: number
  offset?: number
}): Promise<{ rows: AdminUserRow[]; total: number }> {
  const search = q?.trim()
  const where = search
    ? or(ilike(schema.users.name, `%${search}%`), ilike(schema.users.email, `%${search}%`))
    : undefined

  const [totals, page] = await Promise.all([
    db.select({ n: count() }).from(schema.users).where(where),
    db
      .select({
        id: schema.users.id,
        name: schema.users.name,
        displayName: schema.users.displayName,
        email: schema.users.email,
        role: schema.users.role,
        timezone: schema.users.timezone,
        joined: schema.users.createdAt,
      })
      .from(schema.users)
      .where(where)
      .orderBy(desc(schema.users.createdAt))
      .limit(limit)
      .offset(offset),
  ])

  const ids = page.map((u) => u.id)
  if (ids.length === 0) return { rows: [], total: totals[0]?.n ?? 0 }

  // Batched aggregates for just this page of users.
  const [enrollCounts, activity] = await Promise.all([
    db
      .select({
        userId: schema.userPlaylists.userId,
        status: schema.userPlaylists.status,
        n: count(),
      })
      .from(schema.userPlaylists)
      .where(sql`${schema.userPlaylists.userId} = any(${ids})`)
      .groupBy(schema.userPlaylists.userId, schema.userPlaylists.status),
    db
      .select({
        userId: schema.dailyActivity.userId,
        activityDate: schema.dailyActivity.activityDate,
        videosCompleted: schema.dailyActivity.videosCompleted,
        isFrozen: schema.dailyActivity.isFrozen,
      })
      .from(schema.dailyActivity)
      .where(sql`${schema.dailyActivity.userId} = any(${ids})`),
  ])

  const activeByUser = new Map<string, number>()
  const completedByUser = new Map<string, number>()
  for (const r of enrollCounts) {
    if (r.status === "active") activeByUser.set(r.userId, r.n)
    if (r.status === "completed") completedByUser.set(r.userId, r.n)
  }

  const daysByUser = new Map<string, typeof activity>()
  for (const r of activity) {
    const arr = daysByUser.get(r.userId) ?? []
    arr.push(r)
    daysByUser.set(r.userId, arr)
  }

  const rows: AdminUserRow[] = page.map((u) => {
    const days = daysByUser.get(u.id) ?? []
    const today = localDateString(new Date(), u.timezone)
    const streak = computeStreaks(days, today)
    const lastActive = days.reduce<string | null>(
      (max, d) => (!max || d.activityDate > max ? d.activityDate : max),
      null,
    )
    return {
      id: u.id,
      label: resolveDisplayName(u.displayName, u.name, u.id),
      email: u.email,
      role: u.role,
      joined: u.joined,
      currentStreak: streak.currentStreak,
      activePlaylists: activeByUser.get(u.id) ?? 0,
      completedPlaylists: completedByUser.get(u.id) ?? 0,
      lastActive,
    }
  })

  return { rows, total: totals[0]?.n ?? 0 }
}
```

- [ ] **Step 2: Create `apps/web/app/admin/users/page.tsx`**

```tsx
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
```

- [ ] **Step 3: Add the Users nav item in `apps/web/components/admin-nav.tsx`**

Change the import line and `ITEMS` array:

```tsx
import { BarChart3, Inbox, Users } from "lucide-react"

const ITEMS = [
  { href: "/admin", label: "Analytics", icon: BarChart3 },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/feedback", label: "Feedback", icon: Inbox },
]
```

- [ ] **Step 4: Verify build + lint**

Run: `pnpm --filter web build && pnpm --filter web lint`
Expected: build succeeds, 0 lint errors. Manually: visit `/admin/users`, search a name, page through. The active-nav highlight uses `pathname === href`, so `/admin/users/[id]` won't keep Users highlighted — acceptable (matches existing exact-match behavior).

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/admin-users.ts apps/web/app/admin/users/page.tsx apps/web/components/admin-nav.tsx
git commit -m "feat(admin): users list with search and pagination"
```

---

## Task 2: User detail

**Files:**
- Modify: `apps/web/lib/admin-users.ts` (add `getUserDetail`)
- Create: `apps/web/app/admin/users/[id]/page.tsx`

**Interfaces:**
- Consumes: nothing from Task 1's runtime; reuses `computeStreaks`, `ContributionGraph`, `resolveDisplayName`, `localDateString`.
- Produces: `getUserDetail(userId: string): Promise<AdminUserDetail | null>` where
  ```ts
  interface AdminUserDetail {
    id: string
    label: string
    email: string
    username: string | null
    role: "user" | "admin"
    timezone: string
    joined: Date
    onboardedAt: Date | null
    currentStreak: number
    longestStreak: number
    graphDays: GraphDay[]   // from components/contribution-graph
    today: string
    enrollments: { title: string; status: string; progressPct: number; startedAt: Date; completedAt: Date | null }[]
    feedback: { message: string; path: string | null; createdAt: Date }[]
    notesCount: number
    todosCount: number
  }
  ```

- [ ] **Step 1: Add `getUserDetail` to `apps/web/lib/admin-users.ts`**

Add these imports to the existing import block: `import type { GraphDay } from "@/components/contribution-graph"`. Then append:

```ts
export interface AdminUserDetail {
  id: string
  label: string
  email: string
  username: string | null
  role: "user" | "admin"
  timezone: string
  joined: Date
  onboardedAt: Date | null
  currentStreak: number
  longestStreak: number
  graphDays: GraphDay[]
  today: string
  enrollments: {
    title: string
    status: string
    progressPct: number
    startedAt: Date
    completedAt: Date | null
  }[]
  feedback: { message: string; path: string | null; createdAt: Date }[]
  notesCount: number
  todosCount: number
}

// Full read-only picture of one user. Returns null for an unknown id so the
// page can render notFound().
export async function getUserDetail(userId: string): Promise<AdminUserDetail | null> {
  const user = await db.query.users.findFirst({
    where: eq(schema.users.id, userId),
    columns: {
      id: true,
      name: true,
      displayName: true,
      email: true,
      username: true,
      role: true,
      timezone: true,
      createdAt: true,
      onboardedAt: true,
    },
  })
  if (!user) return null

  const [days, enrollRows, feedbackRows, notesN, todosN] = await Promise.all([
    db
      .select({
        activityDate: schema.dailyActivity.activityDate,
        videosCompleted: schema.dailyActivity.videosCompleted,
        isFrozen: schema.dailyActivity.isFrozen,
        secondsWatched: schema.dailyActivity.secondsWatched,
      })
      .from(schema.dailyActivity)
      .where(eq(schema.dailyActivity.userId, userId)),
    // Enrollment rows with completed-video count and the playlist's total.
    db.execute(sql`
      select p.title as title, up.status as status, up.started_at as started_at,
             up.completed_at as completed_at, p.video_count as video_count,
             count(vp.id) filter (where vp.completed_at is not null)::int as completed
      from ${schema.userPlaylists} up
      join ${schema.playlists} p on p.id = up.playlist_id
      left join ${schema.videoProgress} vp on vp.user_playlist_id = up.id
      where up.user_id = ${userId}
      group by up.id, p.title, up.status, up.started_at, up.completed_at, p.video_count
      order by up.started_at desc
    `),
    db
      .select({
        message: schema.feedback.message,
        path: schema.feedback.path,
        createdAt: schema.feedback.createdAt,
      })
      .from(schema.feedback)
      .where(eq(schema.feedback.userId, userId))
      .orderBy(desc(schema.feedback.createdAt)),
    db.select({ n: count() }).from(schema.noteEntries).where(eq(schema.noteEntries.userId, userId)),
    db.select({ n: count() }).from(schema.todos).where(eq(schema.todos.userId, userId)),
  ])

  const today = localDateString(new Date(), user.timezone)
  const streak = computeStreaks(days, today)

  const enrollments = (
    enrollRows.rows as {
      title: string
      status: string
      started_at: Date
      completed_at: Date | null
      video_count: number
      completed: number
    }[]
  ).map((r) => ({
    title: r.title,
    status: r.status,
    progressPct: r.video_count > 0 ? Math.round((r.completed / r.video_count) * 100) : 0,
    startedAt: r.started_at,
    completedAt: r.completed_at,
  }))

  return {
    id: user.id,
    label: resolveDisplayName(user.displayName, user.name, user.id),
    email: user.email,
    username: user.username,
    role: user.role,
    timezone: user.timezone,
    joined: user.createdAt,
    onboardedAt: user.onboardedAt,
    currentStreak: streak.currentStreak,
    longestStreak: streak.longestStreak,
    graphDays: days,
    today,
    enrollments,
    feedback: feedbackRows,
    notesCount: notesN[0]?.n ?? 0,
    todosCount: todosN[0]?.n ?? 0,
  }
}
```

Note: `noteEntries.userId` (schema.ts:394) and `todos.userId` (schema.ts:495) both exist and are `notNull` — the counts join directly, no assumption to check.

- [ ] **Step 2: Create `apps/web/app/admin/users/[id]/page.tsx`**

```tsx
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
```

- [ ] **Step 3: Verify build + lint**

Run: `pnpm --filter web build && pnpm --filter web lint`
Expected: build succeeds, 0 lint errors. Manually: click a user from `/admin/users`; unknown id (e.g. `/admin/users/nope`) → 404.

- [ ] **Step 4: Commit**

```bash
git add apps/web/lib/admin-users.ts "apps/web/app/admin/users/[id]/page.tsx"
git commit -m "feat(admin): read-only user detail page"
```

---

## Task 3: Retention cohorts

**Files:**
- Create: `apps/web/lib/admin-retention.ts`
- Create: `apps/web/tests/admin-retention.test.ts`
- Create: `apps/web/app/admin/retention/page.tsx`
- Modify: `apps/web/components/admin-nav.tsx`

**Interfaces:**
- Produces:
  - `retentionWindows(daysSinceSignup: number): ("d1" | "d7" | "d30")[]` — pure; which windows an activity day counts toward.
  - `getRetention(): Promise<CohortRow[]>` where `CohortRow = { week: string; size: number; d1: number | null; d7: number | null; d30: number | null }` (percentages 0–100, or null when the cohort is too young for that window).

- [ ] **Step 1: Write the failing test `apps/web/tests/admin-retention.test.ts`**

```ts
import { describe, expect, it } from "vitest"

import { retentionWindows } from "@/lib/admin-retention"

describe("retentionWindows", () => {
  it("excludes signup day (day 0)", () => {
    expect(retentionWindows(0)).toEqual([])
  })
  it("day 1 counts toward all three windows", () => {
    expect(retentionWindows(1)).toEqual(["d1", "d7", "d30"])
  })
  it("day 7 counts toward d7 and d30 but not d1", () => {
    expect(retentionWindows(7)).toEqual(["d7", "d30"])
  })
  it("day 8 counts only toward d30", () => {
    expect(retentionWindows(8)).toEqual(["d30"])
  })
  it("day 30 still counts toward d30", () => {
    expect(retentionWindows(30)).toEqual(["d30"])
  })
  it("day 31 counts toward nothing", () => {
    expect(retentionWindows(31)).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter web test admin-retention`
Expected: FAIL — cannot import `retentionWindows` (module/file does not exist).

- [ ] **Step 3: Write `apps/web/lib/admin-retention.ts`**

```ts
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

  return (res.rows as { week: string; size: number; d1: string | null; d7: string | null; d30: string | null }[]).map(
    (r) => ({
      week: r.week,
      size: r.size,
      d1: r.d1 === null ? null : Number(r.d1),
      d7: r.d7 === null ? null : Number(r.d7),
      d30: r.d30 === null ? null : Number(r.d30),
    }),
  )
}
```

Note: `retentionWindows` documents the window semantics the SQL `filter` clauses implement; it is the unit-tested source of truth for the day boundaries. The SQL mirrors it (`> signup_date` excludes day 0; `<= signup_date + N` includes day N).

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter web test admin-retention`
Expected: PASS (6 tests).

- [ ] **Step 5: Create `apps/web/app/admin/retention/page.tsx`**

```tsx
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
```

- [ ] **Step 6: Add the Retention nav item in `apps/web/components/admin-nav.tsx`**

```tsx
import { BarChart3, Inbox, LineChart, Users } from "lucide-react"

const ITEMS = [
  { href: "/admin", label: "Analytics", icon: BarChart3 },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/retention", label: "Retention", icon: LineChart },
  { href: "/admin/feedback", label: "Feedback", icon: Inbox },
]
```

- [ ] **Step 7: Verify build + lint**

Run: `pnpm --filter web build && pnpm --filter web lint && pnpm --filter web test admin-retention`
Expected: all pass. Manually: `/admin/retention` shows one row per signup week, young cohorts show "—" for D30.

- [ ] **Step 8: Commit**

```bash
git add apps/web/lib/admin-retention.ts apps/web/tests/admin-retention.test.ts apps/web/app/admin/retention/page.tsx apps/web/components/admin-nav.tsx
git commit -m "feat(admin): weekly retention cohorts (D1/D7/D30)"
```

---

## Task 4: Content leaderboard

**Files:**
- Create: `apps/web/lib/admin-content.ts`
- Create: `apps/web/tests/admin-content.test.ts`
- Create: `apps/web/app/admin/content/page.tsx`
- Modify: `apps/web/components/admin-nav.tsx`

**Interfaces:**
- Produces:
  - `completionRate(completed: number, enrolled: number): number` — pure, 0–100, divide-by-zero safe.
  - `getContentStats(limit?: number): Promise<ContentRow[]>` where `ContentRow = { playlistId: string; title: string; channel: string | null; isCustom: boolean; enrolled: number; completed: number; completionRate: number; avgProgress: number }`.

- [ ] **Step 1: Write the failing test `apps/web/tests/admin-content.test.ts`**

```ts
import { describe, expect, it } from "vitest"

import { completionRate } from "@/lib/admin-content"

describe("completionRate", () => {
  it("returns 0 when nobody is enrolled", () => {
    expect(completionRate(0, 0)).toBe(0)
  })
  it("returns 0 when enrolled but none completed", () => {
    expect(completionRate(0, 5)).toBe(0)
  })
  it("returns 100 when everyone completed", () => {
    expect(completionRate(5, 5)).toBe(100)
  })
  it("rounds to the nearest percent", () => {
    expect(completionRate(1, 3)).toBe(33)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter web test admin-content`
Expected: FAIL — cannot import `completionRate`.

- [ ] **Step 3: Write `apps/web/lib/admin-content.ts`**

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter web test admin-content`
Expected: PASS (4 tests).

- [ ] **Step 5: Create `apps/web/app/admin/content/page.tsx`**

```tsx
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
```

- [ ] **Step 6: Add the Content nav item in `apps/web/components/admin-nav.tsx`**

```tsx
import { BarChart3, Inbox, LineChart, ListVideo, Users } from "lucide-react"

const ITEMS = [
  { href: "/admin", label: "Analytics", icon: BarChart3 },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/retention", label: "Retention", icon: LineChart },
  { href: "/admin/content", label: "Content", icon: ListVideo },
  { href: "/admin/feedback", label: "Feedback", icon: Inbox },
]
```

- [ ] **Step 7: Verify build + lint + test**

Run: `pnpm --filter web build && pnpm --filter web lint && pnpm --filter web test admin-content`
Expected: all pass. Manually: `/admin/content` lists playlists, most-enrolled first.

- [ ] **Step 8: Commit**

```bash
git add apps/web/lib/admin-content.ts apps/web/tests/admin-content.test.ts apps/web/app/admin/content/page.tsx apps/web/components/admin-nav.tsx
git commit -m "feat(admin): content leaderboard (enroll + completion)"
```

---

## Task 5: Email health

**Files:**
- Create: `apps/web/lib/admin-email.ts`
- Create: `apps/web/app/admin/email/page.tsx`
- Modify: `apps/web/components/admin-nav.tsx`

**Interfaces:**
- Produces: `getEmailHealth(): Promise<EmailHealth>` where
  ```ts
  interface EmailHealth {
    totalSent: number
    byType: { type: string; n: number }[]
    openRate: number          // 0–100
    optOut: number            // reminders disabled
    daily: { day: string; n: number }[]  // zero-filled last 14 days
  }
  ```

- [ ] **Step 1: Write `apps/web/lib/admin-email.ts`**

```ts
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
```

- [ ] **Step 2: Create `apps/web/app/admin/email/page.tsx`**

```tsx
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
```

- [ ] **Step 3: Add the Email nav item in `apps/web/components/admin-nav.tsx`** (final nav)

```tsx
import { BarChart3, Inbox, LineChart, ListVideo, Mail, Users } from "lucide-react"

const ITEMS = [
  { href: "/admin", label: "Analytics", icon: BarChart3 },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/retention", label: "Retention", icon: LineChart },
  { href: "/admin/content", label: "Content", icon: ListVideo },
  { href: "/admin/email", label: "Email", icon: Mail },
  { href: "/admin/feedback", label: "Feedback", icon: Inbox },
]
```

- [ ] **Step 4: Verify full build + lint + tests**

Run: `pnpm --filter web build && pnpm --filter web lint && pnpm --filter web test`
Expected: build succeeds, 0 lint errors, all tests pass (including existing suite). Manually: `/admin/email` shows totals, open rate, opt-outs, and the 14-day bars.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/admin-email.ts apps/web/app/admin/email/page.tsx apps/web/components/admin-nav.tsx
git commit -m "feat(admin): email health (sends, open rate, opt-outs)"
```

---

## Post-implementation

- [ ] Update `feature-tickets.md` with an entry for this work (per project convention), status done, note the build/test/lint gates that passed.
- [ ] Update `FOR-Rachit.md` teaching breakdown (per TEACHER MODE rule).

## Self-Review notes

- **Spec coverage:** Users list (T1), user detail + view-profile link (T2), retention D1/D7/D30 (T3), content leaderboard + deferred drop-off note (T4), email health with real open rate (T5). All five surfaces + nav covered.
- **Deferred items from spec** (admin actions, real impersonation, video drop-off) intentionally absent — drop-off has a `ponytail:` marker in `lib/admin-content.ts`.
- **Type consistency:** `AdminUserRow`/`AdminUserDetail` in `lib/admin-users.ts`; `retentionWindows`/`CohortRow` in `lib/admin-retention.ts`; `completionRate`/`ContentRow` in `lib/admin-content.ts`; `EmailHealth` in `lib/admin-email.ts`. `completionRate` used consistently in query + test. `GraphDay` imported from the component that owns it.
- **Schema confirmed:** `noteEntries.userId` (schema.ts:394) and `todos.userId` (schema.ts:495) both exist and are notNull — no open assumptions.
