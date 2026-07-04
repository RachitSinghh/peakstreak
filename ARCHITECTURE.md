# PeakStreak — Technical Architecture Document

**Companion to:** PRD.md (Draft v1.0)
**Status:** v1.0
**Scope:** MVP as defined in PRD Section 7. Phase-2 items (skim detection, AI tutor, payments) are noted only where a v1 decision keeps the door open for them.

---

## 1. Architecture Overview

PeakStreak's MVP is a classic three-surface product:

1. **A web app** (dashboard, watch view, notes) — interactive, session-based.
2. **A metadata pipeline** (YouTube Data API → local cache) — read-mostly, quota-constrained.
3. **A time-driven loop** (streak evaluation, reminder emails) — cron-based, timezone-aware.

None of these justifies microservices at MVP scale. The recommendation is a **single deployable full-stack app (Next.js) + Postgres + a transactional email provider + platform cron**. Every piece below is chosen so that one developer can build, deploy, and debug the whole system, while leaving clean seams for the Phase-2 features.

```
┌─────────────────────────────────────────────────────────────┐
│  Browser                                                     │
│  ├─ Dashboard / playlist cards / contribution graph          │
│  ├─ Watch view: YouTube IFrame Player + notes panel          │
│  └─ Heartbeat: POST watch progress every ~20s while playing  │
└──────────────┬──────────────────────────────────────────────┘
               │ HTTPS
┌──────────────▼──────────────────────────────────────────────┐
│  Next.js (Vercel) — one deployable                           │
│  ├─ Server Components + Route Handlers (API)                 │
│  ├─ Auth.js (Google OAuth + email magic link)                │
│  ├─ /api/cron/reminders   ◄── Vercel Cron (every 15 min)     │
│  ├─ /api/cron/streaks     ◄── Vercel Cron (every 15 min)     │
│  └─ lib/youtube.ts ──► YouTube Data API v3 (server API key)  │
└───────┬───────────────────────────────┬─────────────────────┘
        │                               │
┌───────▼────────────┐        ┌─────────▼──────────┐
│  Postgres (Neon)   │        │  Resend / Postmark  │
│  Drizzle ORM       │        │  (transactional     │
│  + playlist cache  │        │   reminder emails)  │
└────────────────────┘        └────────────────────┘
```

---

## 2. Recommended Tech Stack (with reasoning)

### 2.1 Application framework — **Next.js 15 (App Router) + TypeScript**

- **Why one full-stack framework:** The product is one web app plus a handful of API endpoints and two cron jobs. A separate SPA + API server doubles deploy targets, auth plumbing, and CORS surface for zero MVP benefit.
- **Why Next.js specifically:** Server Components render the dashboard (streak count, progress bars, heatmap) directly from the database with no client data-fetching layer; Route Handlers cover the API surface (playlist import, progress heartbeat, notes autosave, cron endpoints); the ecosystem (Auth.js, Vercel Cron, React Email) removes whole workstreams.
- **Why TypeScript everywhere:** The trickiest logic in this product (streak state machine, timezone day-boundary math, pace/ETA calculation) is exactly the kind of code where shared types between DB, server, and client prevent an entire class of bugs.

### 2.2 Database — **PostgreSQL** (managed: Neon or Supabase)

- **Why relational:** The data is inherently relational (users → enrollments → per-video progress → daily activity), and the streak system needs **transactional integrity**: "mark video complete + upsert today's activity + update streak" must be one atomic unit, or users will see phantom/broken streaks — the single most trust-destroying bug this product can have.
- **Why Postgres over MySQL/SQLite:** first-class `date`/`timestamptz`/interval handling (this product is 40% timezone math), partial/unique indexes for idempotency guarantees, and every serverless host supports it.
- **Why Neon (recommended) or Supabase:** serverless-friendly connection pooling (critical with Vercel's many short-lived functions), branching databases for safe migration testing, generous free tier for MVP.

### 2.3 ORM & migrations — **Drizzle ORM + drizzle-kit**

- Schema is defined in TypeScript and *is* the source of truth; migrations are generated SQL you can read and review.
- Thin enough that the timezone-sensitive queries (contribution graph aggregation, reminder-window selection) can drop to raw SQL without fighting the ORM — Prisma makes this noticeably more awkward.
- Zero runtime engine/binary, which matters in serverless cold starts.

### 2.4 Authentication — **Auth.js (NextAuth v5)** with Google OAuth + email magic link

- PRD Section 6 calls for Google sign-in; Auth.js's Google provider plus its Drizzle adapter is a day of work, not a week.
- **Important correction to a PRD assumption:** the PRD suggests Google OAuth "conveniently gives you YouTube API access." For v1 **you don't need any YouTube OAuth scope at all** — public playlist metadata is fetched server-side with a plain API key (see 2.6). Requesting YouTube scopes at sign-in would trigger Google's sensitive-scope verification review and scare users at the consent screen, for no benefit. Sign-in requests only `openid email profile`.
- Email magic link (via the same email provider as reminders) covers users who won't use Google.
- **Why not Clerk/Auth0:** perfectly fine products, but they add a paid external dependency and user-data split for a need Auth.js covers in-repo. Revisit if you later need orgs/SAML (you won't for this product).

### 2.5 UI — **Tailwind CSS + shadcn/ui + Recharts (or hand-rolled SVG) for the heatmap**

- Tailwind + shadcn/ui gives accessible primitives (dialogs, forms, toasts) without a design-system project.
- The contribution graph is best built as a small hand-rolled SVG/CSS grid component (~150 lines) — it's a fixed 53×7 grid of colored cells with a tooltip; charting libraries fight you on this exact shape.
- The streak flame, progress bars, and pace picker are bespoke components anyway — this is where the product's personality lives, budget real design time here.

### 2.6 YouTube integration — **Data API v3 (server-side API key) + IFrame Player API (client)**

- **Data API v3** (`playlistItems.list` + `videos.list`) fetches playlist contents and per-video durations. Both cost **1 quota unit per page of 50** — a 200-video playlist costs ~8 units against a default daily quota of 10,000. The quota risk in the PRD's Open Questions is real but is solved by the cache-first design in Section 5 (playlists table is a shared cache; a playlist already imported by any user costs zero quota for the next user).
- **IFrame Player API** on the watch page provides play/pause/rate/seek events and `getCurrentTime()`. The client accumulates watched seconds locally and POSTs a heartbeat every ~20s and on pause/unload. The server treats heartbeats as untrusted hints and enforces the 80% completion threshold itself (`seconds_watched ≥ 0.8 × duration`). This is deliberately the "simple version" from PRD 5.2 — the schema still leaves room for a Phase-2 engagement score.
- **ToS note:** stay strictly on official embed + official APIs; never proxy or download video/transcript content in v1.

### 2.7 Email — **Resend + React Email** (Postmark as the equally good alternative)

- Daily reminder email is a P0 retention mechanic (PRD Feature 2), so deliverability is a product feature, not an ops detail. Both Resend and Postmark are transactional-grade (dedicated IPs available later, real bounce/complaint handling). **Do not use Gmail SMTP or a marketing-email tool** — the PRD's spam-flag worry is legitimate.
- React Email lets you build the reminder template as a React component with a plain-text fallback, previewable in dev.
- Open-tracking pixel + a `sent → user returned within 2h` join against `daily_activity` gives you the "streak save" metric from PRD Section 8 with no extra infrastructure.

### 2.8 Scheduled jobs — **Vercel Cron → authenticated route handlers**

- Two cron routes, each hit **every 15 minutes**, each doing a timezone-windowed batch (details in Section 6):
  - `/api/cron/reminders` — users whose *local* time just entered their reminder hour and who have no activity today.
  - `/api/cron/streaks` — users whose *local* day just rolled over: evaluate yesterday, consume a streak freeze or break the streak.
- **Why not a queue/worker (Inngest, Trigger.dev, BullMQ + Redis) yet:** batch sizes at MVP scale are tiny, and both jobs are written to be **idempotent** (unique DB constraints make re-runs harmless), which removes the main reason to need a durable queue. Inngest is the drop-in upgrade path if/when a batch outgrows a single function invocation.

### 2.9 Hosting & operations

- **Vercel** for the app + cron (or Railway/Fly.io if you prefer a long-running Node process — nothing in this design requires serverless).
- **Sentry** for error tracking from day one — silent failures in the cron loop are invisible otherwise and directly kill retention.
- **PostHog** (free tier) for the PRD Section 8 funnel metrics (activation %, D7 retention). Product analytics via SQL alone gets painful exactly when you most need the numbers.

### 2.10 Explicitly deferred (matching PRD Section 9)

| Not in v1 | Architectural seam left open |
|---|---|
| Skim/engagement detection | `video_progress` already stores max position + watched seconds; add an events table later, don't collect raw events now |
| AI tutor | Notes are per-video rows — a future RAG pipeline can index them + transcripts without schema change |
| Payments | `users` is the only table Stripe would need to reference; nothing to pre-build |
| Redis / caching layer | Postgres *is* the YouTube cache (Section 5); add Redis only if the dashboard query ever measurably hurts |

---

## 3. Project File & Folder Structure

```
peakstreak/
├── PRD.md
├── ARCHITECTURE.md
├── .env.example                  # every var from Section 7, with comments, no secrets
├── .env.local                    # gitignored — real dev secrets
├── drizzle.config.ts             # drizzle-kit config (reads DATABASE_URL)
├── next.config.ts
├── package.json
├── tailwind.config.ts
├── tsconfig.json
├── vercel.json                   # cron schedules for /api/cron/* routes
│
├── drizzle/                      # generated SQL migrations — committed, never hand-edited
│   └── 0000_init.sql …
│
├── public/                       # static assets (logo, og-image, favicon)
│
└── src/
    ├── middleware.ts             # auth guard: everything under /(app) requires session
    │
    ├── app/
    │   ├── layout.tsx            # root layout: fonts, providers, toaster
    │   ├── globals.css
    │   │
    │   ├── (marketing)/          # public, unauthenticated
    │   │   ├── page.tsx          # landing page: paste-a-link hero → sign-up
    │   │   └── privacy/page.tsx  # required for Google OAuth app verification
    │   │
    │   ├── (app)/                # authenticated product surface
    │   │   ├── layout.tsx        # app shell: nav, streak flame in header
    │   │   ├── dashboard/
    │   │   │   └── page.tsx      # playlist cards, streak, contribution graph
    │   │   ├── playlists/
    │   │   │   ├── new/page.tsx  # paste URL → estimate screen → confirm pace
    │   │   │   └── [enrollmentId]/
    │   │   │       ├── page.tsx  # playlist detail: video checklist, ETA, notes index
    │   │   │       └── watch/[videoId]/
    │   │   │           └── page.tsx   # embedded player + notes panel
    │   │   ├── settings/page.tsx      # timezone, reminder hour, email opt-out
    │   │   └── completed/[enrollmentId]/page.tsx  # completion celebration + notes export
    │   │
    │   ├── login/page.tsx
    │   │
    │   └── api/
    │       ├── auth/[...nextauth]/route.ts   # Auth.js handler
    │       ├── playlists/
    │       │   ├── route.ts                  # POST: import playlist (fetch/cache + enroll)
    │       │   └── preview/route.ts          # POST: URL → estimate (pre-signup teaser too)
    │       ├── progress/
    │       │   └── heartbeat/route.ts        # POST: watch-time heartbeat (throttled)
    │       ├── videos/[videoId]/complete/route.ts  # POST: manual mark-complete
    │       ├── notes/route.ts                # PUT: autosave note (debounced client-side)
    │       ├── email/unsubscribe/route.ts    # GET: one-click, token-authed, no login
    │       └── cron/
    │           ├── reminders/route.ts        # Vercel Cron, guarded by CRON_SECRET
    │           ├── streaks/route.ts          # Vercel Cron, guarded by CRON_SECRET
    │           └── refresh-playlists/route.ts # daily: re-sync stale playlist metadata
    │
    ├── components/
    │   ├── ui/                   # shadcn/ui primitives (button, dialog, …)
    │   ├── playlist-card.tsx
    │   ├── contribution-graph.tsx    # hand-rolled SVG heatmap
    │   ├── streak-flame.tsx
    │   ├── pace-picker.tsx           # "30 min/day" / "1 video/day" / custom
    │   ├── estimate-summary.tsx      # total runtime → finish-date projection
    │   ├── video-player.tsx          # IFrame API wrapper + heartbeat loop (client)
    │   └── notes-editor.tsx          # autosaving textarea/markdown editor (client)
    │
    ├── lib/
    │   ├── db/
    │   │   ├── index.ts          # drizzle client (pooled)
    │   │   └── schema.ts         # ALL tables — single source of truth (Section 4)
    │   ├── auth.ts               # Auth.js config (Google + email provider, Drizzle adapter)
    │   ├── youtube/
    │   │   ├── client.ts         # Data API fetchers, pagination, ISO-8601 duration parsing
    │   │   ├── cache.ts          # get-or-fetch playlist through the playlists table
    │   │   └── url.ts            # playlist-URL parsing/validation (list= extraction)
    │   ├── streaks.ts            # THE streak state machine — pure functions, heavily tested
    │   ├── pace.ts               # ETA math: pace × playback speed → finish date
    │   ├── dates.ts              # all timezone/day-boundary helpers (wraps date-fns-tz)
    │   ├── email/
    │   │   ├── send.ts           # Resend wrapper + email_log writes + frequency cap
    │   │   └── templates/
    │   │       ├── reminder.tsx  # "Your streak is about to cool down 🔥"
    │   │       └── magic-link.tsx
    │   └── analytics.ts          # PostHog server/client helpers
    │
    └── tests/
        ├── streaks.test.ts       # every boundary case: freeze, DST, late-night, gaps
        ├── pace.test.ts
        └── dates.test.ts
```

**Structural principles**

- **All business logic lives in `src/lib/`, not in route handlers.** Routes parse/authenticate/respond; `streaks.ts`, `pace.ts`, `dates.ts` are pure and unit-tested. This is non-negotiable for the streak logic — it has too many edge cases (DST, freezes, day boundaries) to test through HTTP.
- **`schema.ts` is the single schema source of truth**; migrations are generated from it and committed.
- Route groups `(marketing)` / `(app)` split public vs. authenticated layouts; `middleware.ts` enforces the boundary.

---

## 4. Database Schema

Conventions: every table has `id` (UUID, default `gen_random_uuid()`), `created_at`/`updated_at` (`timestamptz`). All timestamps stored in UTC; "which calendar day was that for this user" is always computed with the user's IANA timezone. Below, each table is explained in plain English first, then its fields.

### 4.1 `users` — one row per human

The account record, plus the settings the habit loop needs: their timezone (so we know when *their* day ends) and when they want to be nudged.

| Field | Type | Meaning |
|---|---|---|
| `id` | uuid PK | |
| `email` | text, unique, not null | Login + reminder destination |
| `name` | text | Display name from Google or onboarding |
| `image_url` | text | Avatar |
| `timezone` | text, not null, default `'Asia/Kolkata'` | IANA zone (e.g. `Asia/Kolkata`), captured from browser at signup; defines their day boundary and reminder window |
| `reminder_hour_local` | smallint, not null, default `19` | Local hour (0–23) reminders may fire; 19:00 default |
| `reminders_enabled` | boolean, not null, default `true` | Master opt-out |
| `unsubscribe_token` | uuid, unique, not null | One-click unsubscribe from email without logging in (list-unsubscribe compliance) |
| `onboarded_at` | timestamptz | Null until first playlist added — feeds the activation metric |

Plus the standard **Auth.js adapter tables** (`accounts`, `sessions`, `verification_tokens`) exactly as the Drizzle adapter defines them — they store the Google OAuth link and magic-link tokens; don't customize them.

### 4.2 `playlists` — shared cache of YouTube playlist metadata

**Not user-owned.** One row per YouTube playlist that *anyone* has ever imported. This table is the quota-protection layer: the second user to paste the same course pays zero YouTube API quota. Relationship: many `users` connect to one `playlists` row through `enrollments`.

| Field | Type | Meaning |
|---|---|---|
| `id` | uuid PK | |
| `youtube_playlist_id` | text, unique, not null | The `list=` ID from the URL — the natural key |
| `title` | text, not null | |
| `channel_title` | text | Creator name, shown on cards |
| `thumbnail_url` | text | |
| `video_count` | integer, not null | Count of *available* videos (excludes private/deleted) |
| `total_duration_seconds` | integer, not null | Sum of video durations — the headline estimate number |
| `last_synced_at` | timestamptz, not null | Cache freshness; re-sync when older than `PLAYLIST_SYNC_TTL_HOURS` |
| `sync_status` | text enum: `ok` / `partial` / `failed` | `partial` when some videos were private/region-locked — UI shows "3 videos unavailable" |

### 4.3 `videos` — shared cache of individual video metadata

One row per YouTube video we've seen, also globally shared (a video can appear in several playlists).

| Field | Type | Meaning |
|---|---|---|
| `id` | uuid PK | |
| `youtube_video_id` | text, unique, not null | Natural key |
| `title` | text, not null | |
| `duration_seconds` | integer, not null | Parsed from the API's ISO-8601 (`PT1H2M3S`) format |
| `thumbnail_url` | text | |
| `is_available` | boolean, default `true` | Flipped false if the video later goes private/deleted; progress math skips it |

### 4.4 `playlist_videos` — ordering join table

Connects playlists to videos and remembers the order, because "next unwatched video" (PRD flow step 8) depends entirely on position.

| Field | Type | Meaning |
|---|---|---|
| `playlist_id` | uuid FK → playlists, not null | |
| `video_id` | uuid FK → videos, not null | |
| `position` | integer, not null | 0-based order within the playlist |

Constraints: unique `(playlist_id, video_id)`, unique `(playlist_id, position)`.

### 4.5 `enrollments` — a user's commitment to a playlist

The heart of the data model: "this user is working through this playlist at this pace." Playlist cards, progress bars, and ETAs all render from here. One user ↔ one playlist at most once (unique pair).

| Field | Type | Meaning |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK → users, not null | |
| `playlist_id` | uuid FK → playlists, not null | |
| `pace_type` | text enum: `minutes_per_day` / `videos_per_day` | The commitment style they chose on the estimate screen |
| `pace_value` | integer, not null | e.g. 30 (minutes) or 1 (video) |
| `playback_speed` | numeric(2,1), default `1.0` | 1.0–2.0; divides effective runtime in the ETA math |
| `status` | text enum: `active` / `completed` / `archived`, default `active` | `archived` = user gave up without deleting history |
| `started_at` | timestamptz, not null | |
| `completed_at` | timestamptz | Set when last available video completes — drives the completion screen & completion-rate metric |

Constraint: unique `(user_id, playlist_id)`. Note the ETA/finish date is **always computed, never stored** — it changes with every completed video and pace edit; storing it invites staleness bugs.

### 4.6 `video_progress` — per-user, per-video watch state

One row per (enrollment, video), created lazily on first heartbeat. This is what the checklist, progress bar, and streak trigger read.

| Field | Type | Meaning |
|---|---|---|
| `id` | uuid PK | |
| `enrollment_id` | uuid FK → enrollments, not null | Scoping through enrollment (not user) keeps history correct if a user re-adds a playlist later |
| `video_id` | uuid FK → videos, not null | |
| `seconds_watched` | integer, not null, default 0 | Accumulated watch time from heartbeats (capped at duration) |
| `furthest_position_seconds` | integer, default 0 | Max playhead reached — resume point, and Phase-2 skim-analysis raw material |
| `is_completed` | boolean, not null, default false | Set by server when `seconds_watched ≥ 80%` of duration, or by manual mark-complete |
| `completed_at` | timestamptz | |
| `completed_manually` | boolean, default false | Distinguishes "watched to threshold" from "user checked the box" — useful honesty signal later |
| `last_watched_at` | timestamptz | Powers "Continue where you left off" |

Constraint: unique `(enrollment_id, video_id)`.

### 4.7 `daily_activity` — one row per user per active local day

The materialized "did something today" record. Powers the contribution graph directly (no aggregation query over raw events), the streak evaluation, and reminder suppression ("already active today → no email"). The date is **the user's local calendar date at the moment of the activity** — computed once at write time, so later timezone changes don't rewrite history.

| Field | Type | Meaning |
|---|---|---|
| `user_id` | uuid FK → users, not null | |
| `activity_date` | date, not null | Local date in the user's timezone when it happened |
| `videos_completed` | integer, not null, default 0 | Heatmap intensity |
| `seconds_watched` | integer, not null, default 0 | |
| `notes_edited` | integer, not null, default 0 | Feeds the engagement-depth metric |
| `counts_for_streak` | boolean, not null, default false | True once ≥1 video completed that day (the PRD's streak rule); kept separate so partial watching still shows on the heatmap |

Constraint: **unique `(user_id, activity_date)`** — this constraint is what makes every write path (heartbeats, completions, cron re-runs) safely idempotent via upsert.

### 4.8 `streaks` — one row per user, current streak state

Kept in its own 1:1 table (not on `users`) so the cron job's row locks never contend with auth/session reads. Updated in the same transaction as the video completion that triggers it.

| Field | Type | Meaning |
|---|---|---|
| `user_id` | uuid PK, FK → users | 1:1 with users |
| `current_streak` | integer, not null, default 0 | Consecutive qualifying days (freezes count as continuity) |
| `longest_streak` | integer, not null, default 0 | All-time best — cheap motivator on the dashboard |
| `last_qualified_date` | date | Most recent local date that counted (activity or freeze) |
| `freezes_available` | integer, not null, default 1 | PRD 5.1: one grace day; replenished weekly by the streak cron, capped at 1 |
| `freezes_used_total` | integer, not null, default 0 | Churn-analysis signal (PRD Section 8: "churn after first missed streak") |

**Streak rules implemented in `lib/streaks.ts` (pure functions):**
1. A day "qualifies" when `daily_activity.counts_for_streak` is true for that local date.
2. On first qualifying completion of a day: if yesterday qualified (or was frozen), `current_streak += 1`; if not, streak restarts at 1. All inside the completion transaction.
3. The nightly streak cron looks at users whose local day just ended without qualifying: if a freeze is available it consumes one and marks the day frozen (streak survives); otherwise `current_streak = 0`.
4. Freezes replenish to 1 every Monday (user-local) if below cap.

### 4.9 `streak_freeze_uses` — audit log of consumed freezes

Small append-only log so the UI can show "streak freeze used on Jul 3 🧊" and so debugging a user's streak history is possible. One row per freeze consumed: `user_id`, `frozen_date` (the local date it covered), `created_at`. Unique `(user_id, frozen_date)` — doubles as the cron's idempotency guard.

### 4.10 `notes` — one note document per user per video

PRD Feature 4: a private, autosaved note attached to each lecture. Modeled as **one document per (user, video)** rather than many timestamped snippets — simpler autosave semantics, and it maps directly to the "export notes as a summary doc" completion feature.

| Field | Type | Meaning |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK → users, not null | |
| `video_id` | uuid FK → videos, not null | |
| `enrollment_id` | uuid FK → enrollments, not null | Lets the export query pull a whole playlist's notes ordered by position |
| `content` | text, not null, default `''` | Markdown |
| `updated_at` | timestamptz | Shown as "saved 2m ago" |

Constraint: unique `(user_id, video_id)`.

### 4.11 `email_log` — every email we send

Deliverability protection (frequency capping), the unsubscribe audit trail, and the raw material for the PRD's "streak save" metric (join `sent_at` against the user's next `daily_activity` row; returned within 2h = save).

| Field | Type | Meaning |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK → users, not null | |
| `type` | text enum: `daily_reminder` / `magic_link` / `completion` | |
| `sent_on_local_date` | date, not null | User-local date it counts against |
| `sent_at` | timestamptz, not null | |
| `provider_message_id` | text | Correlates with Resend/Postmark webhooks (bounces, opens) |
| `opened_at` | timestamptz | From provider webhook — open-rate metric |

Constraint: unique `(user_id, type, sent_on_local_date)` — **this is the frequency cap**: the reminder cron can run 96 times a day and a user can still only ever receive one reminder per local day, enforced by the database, not by application logic.

### 4.12 Relationship summary (plain English)

- A **user** enrolls in many **playlists**; each enrollment is one commitment with its own pace.
- **Playlists** and **videos** are a *shared, user-agnostic cache* of YouTube metadata, joined in order by **playlist_videos**. User data never lives on them.
- Each **enrollment** accumulates **video_progress** rows as the user watches; completions roll up into **daily_activity** (one row per user-day), which feeds both the contribution graph and the **streaks** state (1:1 with user, with **streak_freeze_uses** as its audit log).
- **notes** hang off (user, video) with an enrollment pointer for export.
- **email_log** records every send and enforces one-reminder-per-day at the constraint level.

### 4.13 Indexes beyond the constraints above

- `enrollments (user_id, status)` — dashboard's "active playlists" query.
- `video_progress (enrollment_id, is_completed)` — progress bars and "next unwatched."
- `daily_activity (user_id, activity_date DESC)` — contribution graph (last 365 days) and "active today?" checks.
- `email_log (user_id, sent_at DESC)` — recent-sends lookups.
- `streaks (last_qualified_date)` — the streak cron's candidate scan.

---

## 5. YouTube Quota & Caching Design (day-one requirement per PRD §10)

1. **Import path:** URL → extract playlist ID → if a `playlists` row exists and `last_synced_at` is fresher than `PLAYLIST_SYNC_TTL_HOURS` (default 24), serve entirely from Postgres — zero quota. Otherwise fetch `playlistItems.list` (paginated, 50/page) then one batched `videos.list` per 50 IDs for durations, upsert into `playlists`/`videos`/`playlist_videos`, stamp `last_synced_at`.
2. **Cost reality check:** importing a 200-video playlist ≈ 8 units; 10,000 units/day ≈ 1,200 *cold* imports daily. With the shared cache, popular courses (exactly your target content) are imported once, ever.
3. **Drift handling:** the daily `refresh-playlists` cron re-syncs only playlists with at least one `active` enrollment, oldest-synced first, under a per-run unit budget. Videos that disappear get `is_available = false` and are excluded from denominators (never delete rows — users may have notes/progress attached).
4. **Watch page costs nothing:** the IFrame Player is a client-side embed; heartbeats hit your own API only.

---

## 6. Timezone & Cron Design (the part that's "easy to get wrong, hard to migrate")

- **The rule:** store UTC timestamps everywhere; store the user's IANA timezone on `users`; compute the *local calendar date* at write time and persist it (`daily_activity.activity_date`, `email_log.sent_on_local_date`). Never re-derive historical local dates from timestamps later — a user changing timezone must not rewrite their heatmap.
- **Day boundary (PRD 5.1 decision, made concrete):** a streak day = **local midnight to local midnight** in the user's stored timezone, softened by the streak-freeze system rather than a grace window. One mechanism (freezes), not two (freezes + grace hours), keeps the state machine testable.
- **Windowed crons:** both cron routes run every 15 minutes and ask "for which IANA timezones did [reminder hour / midnight] occur in the last 15 minutes?" — then process only users in those zones. This is ~40 lines with `date-fns-tz` and handles DST automatically because it evaluates real zone offsets at runtime.
- **Idempotency over exactly-once:** cron invocations can overlap, retry, or double-fire. Every effect is an upsert guarded by a unique constraint (`email_log`, `streak_freeze_uses`, `daily_activity`), so duplicate runs are no-ops. This is the design choice that lets you skip a job queue in v1.
- **Cron auth:** the routes verify a `Authorization: Bearer ${CRON_SECRET}` header (Vercel Cron sends it automatically once configured); they must not be callable by the public.

---

## 7. Environment Variables & Configuration Notes

`.env.example` (commit this; never commit `.env.local`):

```bash
# ── App ─────────────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=http://localhost:3000   # absolute URLs in emails & OAuth callbacks

# ── Database (Neon) ─────────────────────────────────────────────
DATABASE_URL=postgresql://user:pass@host/peakstreak?sslmode=require
# Use the POOLED connection string (pgbouncer) for the app runtime.
# drizzle-kit migrations need the DIRECT (unpooled) string:
DIRECT_DATABASE_URL=postgresql://user:pass@host/peakstreak?sslmode=require

# ── Auth.js ─────────────────────────────────────────────────────
AUTH_SECRET=                 # `openssl rand -base64 32`
GOOGLE_CLIENT_ID=            # Google Cloud Console → OAuth client (Web)
GOOGLE_CLIENT_SECRET=

# ── YouTube Data API v3 ─────────────────────────────────────────
YOUTUBE_API_KEY=             # plain API key, server-side only — NOT an OAuth credential
PLAYLIST_SYNC_TTL_HOURS=24

# ── Email (Resend) ──────────────────────────────────────────────
RESEND_API_KEY=
EMAIL_FROM="PeakStreak <nudge@mail.peakstreak.app>"   # subdomain, not root domain

# ── Cron ────────────────────────────────────────────────────────
CRON_SECRET=                 # `openssl rand -hex 32`; set the same value in vercel.json env

# ── Observability (optional but recommended) ────────────────────
SENTRY_DSN=
NEXT_PUBLIC_POSTHOG_KEY=
```

**Setup notes to be aware of before you start building:**

1. **Google Cloud project:** enable *YouTube Data API v3* (for the API key) and create an *OAuth 2.0 Web client* (for sign-in) in the same project. Restrict the API key to the YouTube Data API. OAuth consent screen needs only non-sensitive scopes (`openid email profile`) → no Google verification review required. Add both `http://localhost:3000` and your production callback URLs.
2. **Two database URLs are not optional:** serverless functions must use the pooled (pgbouncer) Neon URL or you'll exhaust connections under trivial load; drizzle-kit must use the direct URL because pgbouncer breaks its migration session.
3. **Email domain hygiene before the first reminder ships:** send from a subdomain (`mail.peakstreak.app`), configure SPF + DKIM + DMARC in DNS, include a `List-Unsubscribe` header pointing at `/api/email/unsubscribe?token=…`. Doing this on day one is cheap; recovering a burned domain reputation is not.
4. **`NEXT_PUBLIC_` prefix discipline:** only the app URL and PostHog key are public. The YouTube API key must stay server-side — leaked keys get quota-drained by scrapers within days.
5. **Timezone capture:** grab `Intl.DateTimeFormat().resolvedOptions().timeZone` in the browser during onboarding and save it to `users.timezone`; expose it in settings. Everything in Section 6 depends on this being populated.
6. **`vercel.json` cron block** (schedules are UTC; the windowing logic makes that fine):
   ```json
   {
     "crons": [
       { "path": "/api/cron/reminders",         "schedule": "*/15 * * * *" },
       { "path": "/api/cron/streaks",           "schedule": "*/15 * * * *" },
       { "path": "/api/cron/refresh-playlists", "schedule": "0 3 * * *" }
     ]
   }
   ```
7. **Test the streak module in isolation first.** `lib/streaks.ts` and `lib/dates.ts` should be written and unit-tested (freeze consumption, DST transitions, multi-day gaps, day-boundary completions at 11:59 PM) *before* wiring any UI. Every hard bug in this product will live in those two files.

---

## 8. Suggested Build Order

1. Scaffold Next.js + Drizzle + schema + migrations; deploy the empty shell (CI/CD working on day one).
2. Auth (Google + magic link) → `users` populated with timezone.
3. Playlist import pipeline + estimate screen (the acquisition hook — PRD Feature 1).
4. Watch page: IFrame player + heartbeat + completion threshold + `video_progress`.
5. `daily_activity` + streak transaction + streak cron (+ its unit tests).
6. Dashboard: cards, progress, flame, contribution graph.
7. Reminder cron + email template + unsubscribe flow.
8. Notes editor + autosave + completion screen with notes export.

Each step ships something visible, and the riskiest external dependency (YouTube API) is de-risked in step 3, right after auth.

---

*End of document.*
