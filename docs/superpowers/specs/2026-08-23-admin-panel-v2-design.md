# Admin panel v2 — 5 new surfaces

**Status:** design approved (Rachit). No new tables. Everything reads from existing schema.

## Summary

Extend the `/admin` section (currently Analytics + Feedback) with five read-only
operational surfaces, all backed by data the app already stores:

1. **Users list** — searchable, paginated table of every user.
2. **User detail** — read-only per-user picture + a link to their public profile.
3. **Retention cohorts** — weekly signup cohorts with D1/D7/D30 return rates.
4. **Content leaderboard** — playlists ranked by enrollment and completion.
5. **Email health** — send volume, open rate, and reminder opt-out counts.

The admin section is already gated: `app/admin/layout.tsx` calls `requireAdmin()`
(`lib/auth.ts:144`), which renders a 404 for non-admins. Every new page lives under
`app/admin/`, so it inherits that gate. No new auth code.

## Reuse (grounded in existing code)

- `computeStreaks(days, today)` (`lib/streaks.ts`) — current + longest streak, pure.
- `resolveDisplayName(displayName, name, userId)` (`lib/leaderboard-shared.ts`) — label
  that never leaks email.
- `ContributionGraph` (`components/contribution-graph.tsx`) — read-only heatmap, reused
  on the user-detail page with the same `GraphDay[]` shape the dashboard passes.
- `db.execute(sql\`...\`)` returning `{ rows }` — the query style already used in
  `lib/admin.ts` (`generate_series` + join for zero-filled daily series).
- `Card` / `CardContent` / `CardHeader` (`@workspace/ui/components/card`), `AdminNav`
  (`components/admin-nav.tsx`), and the `Stat` / bar-chart primitives already in
  `app/admin/page.tsx`.

## Data layer

One flat lib file per surface (matches `lib/groups.ts` / `lib/feed.ts` convention).
`lib/admin.ts` is left untouched — it holds `getTestimonials`, imported by the landing
page, and moving it is pointless churn.

| File | Exports |
|------|---------|
| `lib/admin-users.ts` | `getUsers({ q, limit, offset })`, `getUserDetail(userId)` |
| `lib/admin-retention.ts` | `getRetention()` |
| `lib/admin-content.ts` | `getContentStats()` |
| `lib/admin-email.ts` | `getEmailHealth()` |

Any non-trivial math (retention window boundaries, completion-rate) lives in a small
pure helper so it can be unit-tested without a DB.

## Routes & nav

`AdminNav` gains four items. All pages are `export const dynamic = "force-dynamic"`
server components (dashboards, not cacheable), `robots: { index: false }`.

```
/admin              Analytics       (existing)
/admin/users        Users list + search
/admin/users/[id]   User detail (read-only)
/admin/retention    Retention cohorts
/admin/content      Content leaderboard
/admin/email        Email health
/admin/feedback     Feedback        (existing)
```

## Feature detail

### 1. Users list — `lib/admin-users.ts` `getUsers`

Reads `users` left-joined with per-user aggregates. Columns rendered: display name,
email, signup date, current streak, active + completed enrollment counts, last-active
date (max `daily_activity.activity_date`).

- Search `q`: `ilike` on `users.name` OR `users.email` (nullable name handled).
- Pagination: `limit` (default 50) + `offset`, driven by URL search params. Total count
  returned so the page can show "showing X–Y of N".
- Streak per row: fetch each listed user's `daily_activity` days in one batched query
  keyed by user id, then `computeStreaks` per user (bounded by page size, never N+1).
- Row links to `/admin/users/[id]`.

### 2. User detail — `lib/admin-users.ts` `getUserDetail(userId)`

Read-only. Returns null → the page renders `notFound()`. Shape:

- **Identity:** name, email, username, timezone, role, joined (`createdAt`),
  onboarded (`onboardedAt`).
- **Streak:** current + longest via `computeStreaks`, plus the `GraphDay[]` for
  `ContributionGraph`.
- **Enrollments:** `user_playlists` joined to `playlists` — title, status, progress %
  (completed `video_progress` rows / `playlists.videoCount`), started / completed dates.
- **Feedback:** this user's `feedback` rows (message, path, createdAt).
- **Counts:** notes entries, todos.

Page header shows a link to `/u/[username]` (external-style link into the app) only
when `username` is set. No edit, no impersonation, no session swap.

### 3. Retention cohorts — `lib/admin-retention.ts` `getRetention()`

Weekly cohorts by `date_trunc('week', users.created_at)`. For each cohort:

- **size** — users who signed up that week.
- **D1 / D7 / D30** — % of the cohort with at least one `daily_activity` row where
  `activity_date` falls in `(signup, signup + N days]`. "Active" = a row exists for the
  day (any `videos_completed`/`seconds_watched`), matching how the funnel counts activity.

One SQL query: cohort CTE (user id + signup week + signup date) left-joined to
`daily_activity`, aggregated with `count(distinct ...) filter (where ...)` per window.
Only cohorts old enough for a window contribute to that window's denominator (a cohort
younger than 30 days shows "—" for D30, not a deflated 0%).

Pure helper `retentionWindows(signupDate, activityDate)` → which of D1/D7/D30 an activity
day counts toward; unit-tested for the boundary (day 0 excluded, day 1 included, day 30
included, day 31 excluded).

### 4. Content leaderboard — `lib/admin-content.ts` `getContentStats()`

Playlists ranked by enrollment. Per row: title, channel, enrolled count
(`user_playlists`), completed count (status = completed), completion rate %
(completed / enrolled), average progress across active enrollments. Top ~50 by
enrollment. Custom playlists (null `youtubePlaylistId`) included; label as custom.

Pure helper `completionRate(completed, enrolled)` (guards divide-by-zero) — the one
calc worth a test.

**Deferred:** video-level drop-off (where inside a playlist people stall) needs a
second heavier `video_progress` sweep. Skipped for v1; a `ponytail:` note in the lib
file marks it as the upgrade path.

### 5. Email health — `lib/admin-email.ts` `getEmailHealth()`

From `email_log` + `email_preferences`:

- **Sent** — total, split by `type` (daily_reminder / completion).
- **Open rate** — `openedAt is not null` / total sent. `openedAt` is populated by the
  provider webhook (`app/api/email/webhook/route.ts`), so this is real data, not a stub.
- **Opt-out** — count of `email_preferences.reminders_enabled = false`.
- **Last 14 days** — zero-filled daily send counts (reuse the `generate_series` bar
  pattern from `app/admin/page.tsx`).

## Testing

Per project convention (`pnpm --filter web build` is the real gate — catches
client/server boundary errors), plus focused unit tests for the two pure helpers:

- `tests/admin-retention.test.ts` — `retentionWindows` boundary cases.
- `tests/admin-content.test.ts` — `completionRate` zero-enroll / normal / all-complete.

SQL read queries themselves are not unit-tested (no logic beyond the query; YAGNI).

## Out of scope (deliberate)

- **Admin actions** (make-admin, ban, streak adjust) — Rachit deferred (#3 from the
  brainstorm). Promotion stays a manual SQL statement for now.
- **Real impersonation** (session swap) — security-sensitive, needs an audit trail;
  the "view profile" link covers the debugging need.
- **Video-level drop-off** — see Content section.
