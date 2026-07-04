# PeakStreak — Feature Ticket List (v1 / MVP)

Tickets are ordered so that dependencies always appear before the tickets that need them. Each ticket is written to be self-contained enough to paste directly into an AI coding tool as a prompt.

**Priority labels:** `MUST-HAVE` (launch blocker) · `SHOULD-HAVE` (launch-week fast-follow) · `NICE-TO-HAVE` (Phase 2 backlog)

---

## PS-1: Project Scaffolding, Database, and Environments

**Priority:** MUST-HAVE
**Dependencies:** None

**Description**
Set up the foundational web application for PeakStreak, a learning-accountability dashboard for YouTube playlists. Create a responsive web app (no native mobile) with: a full-stack framework (e.g., Next.js with TypeScript), a relational database (Postgres) with a migrations system, and a schema covering the core domain: `users`, `playlists`, `videos`, `user_playlists` (a user's enrollment in a playlist, including chosen pace), `video_progress` (per-user per-video watch state), `daily_activity` (one row per user per active day, for streaks and the heatmap), `notes`, and `email_preferences`. Include local dev setup docs, environment variable handling (`.env.example` with placeholders for YouTube API key, OAuth credentials, email provider key, database URL), and a deployable production configuration.

**Acceptance criteria**
- [ ] App boots locally with one documented command; README covers setup end to end.
- [ ] All tables above exist via migrations, with foreign keys and indexes on the obvious lookup paths (`video_progress` by user+playlist, `daily_activity` by user+date).
- [ ] `daily_activity` stores the activity date as a date in the user's streak timezone (store the user's timezone on `users`, default `Asia/Kolkata`), not a raw UTC timestamp — this is load-bearing for streak correctness later.
- [ ] `.env.example` lists every required secret; app fails fast with a clear error when one is missing.
- [ ] A health-check endpoint returns 200 and confirms DB connectivity.

---

## PS-2: Authentication (Email + Google OAuth)

**Priority:** MUST-HAVE
**Dependencies:** PS-1

**Description**
Implement user signup and login with two methods: email/password and Google OAuth. Google OAuth should request only baseline profile scopes for v1 (playlist metadata will be fetched with a server-side YouTube Data API key, not user OAuth tokens — keep the door open to adding YouTube scopes later). Include session management, a signed-in layout shell (nav with user menu, sign out), and route protection so all app pages except landing/login require auth. On signup, create the user row with defaults: timezone `Asia/Kolkata`, email reminders enabled.

**Acceptance criteria**
- [ ] User can sign up and log in with email/password (passwords hashed, standard reset-flow stub or full flow).
- [ ] User can sign up and log in with Google; the two methods link to one account when emails match.
- [ ] Unauthenticated requests to app routes redirect to login; API routes return 401.
- [ ] Sessions persist across browser restarts and support explicit logout.
- [ ] New users get default timezone and reminder settings written on first signup.

---

## PS-3: Playlist Ingestion — Paste Link → Fetch Metadata (with Caching)

**Priority:** MUST-HAVE
**Dependencies:** PS-1, PS-2

**Description**
Build the core acquisition hook: a user pastes a YouTube playlist URL and the app fetches its full metadata via the YouTube Data API v3. Parse and validate the URL (accept `playlist?list=`, watch URLs containing `&list=`, and bare playlist IDs). Fetch playlist title, channel, thumbnail, and every video's ID, title, position, and duration (durations come from the `videos` endpoint in batches of 50; handle pagination for playlists over 50 items). Persist playlist and video rows. **Caching is a day-one requirement** due to API quota caps: if a playlist was fetched within the last 24 hours, reuse stored data instead of re-hitting the API; multiple users adding the same playlist share one cached copy. Handle failure modes explicitly: invalid URL, private/deleted playlist, region-blocked or deleted videos inside a playlist (skip them and record how many were skipped), and quota exhaustion (friendly "try again later" error).

**Acceptance criteria**
- [ ] Pasting any valid playlist URL format yields the parsed playlist; invalid input shows an inline validation error, not a crash.
- [ ] Playlists with >50 videos are fully ingested (pagination verified with a 100+ video playlist).
- [ ] Total video count and summed runtime match the actual playlist.
- [ ] Re-adding a playlist already fetched <24h ago performs zero YouTube API calls (verify via logs/counter).
- [ ] Private/deleted playlists and quota errors each produce a distinct, user-readable error message.
- [ ] Unavailable videos within a playlist are excluded from counts and the UI notes "N videos unavailable."

---

## PS-4: Time Estimate Screen + Pace Selection

**Priority:** MUST-HAVE
**Dependencies:** PS-3

**Description**
After a playlist is ingested, show the instant-estimate screen — the product's "wow" moment. Display: total video count, total runtime (human-formatted, e.g. "14h 32m"), and an estimated finish date computed from a pace the user picks. Pace options: "30 min/day", "1 hour/day", "1 video/day", "2 videos/day", and a custom input (minutes per day or videos per day). Also offer a playback-speed adjuster (1x / 1.25x / 1.5x / 2x) that scales the effective runtime before computing the estimate. When the user confirms ("Start this playlist"), persist the enrollment in `user_playlists` with pace, playback speed, start date, and computed target finish date, then route to the dashboard. Recompute the estimate live as the user changes pace or speed — no page reload.

**Acceptance criteria**
- [ ] Estimate screen renders within a spinner-bounded load after pasting a link; shows count, runtime, and finish date.
- [ ] Changing pace or playback speed updates the finish date instantly client-side.
- [ ] Finish-date math is correct: e.g., 10h playlist at 30 min/day at 1x = 20 days from today; at 2x = 10 days. Unit tests cover time-based pace, video-count pace, and speed scaling.
- [ ] Custom pace rejects nonsense input (0, negative, absurd values) with inline validation.
- [ ] Confirming creates the `user_playlists` row and lands the user on the dashboard with the new playlist visible.

---

## PS-5: Dashboard — Active Playlists, Progress, Zero-Friction Resume

**Priority:** MUST-HAVE
**Dependencies:** PS-4

**Description**
Build the authenticated home screen. Each enrolled playlist renders as a card showing: thumbnail, title, progress bar with fraction ("7/42 videos"), current estimated completion date **recomputed from actual pace** (based on completions so far, falling back to the chosen pace when there's no history yet), days remaining, and a primary "Continue" button that deep-links straight to the next unwatched video's watch view (pre-queued — zero friction to resume, per the PRD's user flow step 8). Above the cards, show a header strip with the user's current streak count (flame icon + number; wire to real data once PS-8 lands, hardcode 0 until then) and a prominent "Add playlist" action. Include an empty state for new users that funnels them into pasting their first link. Support archiving/removing a playlist (soft delete — keep progress data).

**Acceptance criteria**
- [ ] Dashboard lists all active enrollments with accurate progress fractions and progress bars.
- [ ] "Continue" opens the watch view on the lowest-position uncompleted video of that playlist.
- [ ] Estimated completion date updates as videos are completed (recomputed from actual observed pace).
- [ ] Empty state renders for zero playlists with a clear paste-a-link CTA.
- [ ] Archiving a playlist removes it from the dashboard without deleting progress rows; it can be restored.
- [ ] Layout is responsive and usable on a 375px-wide mobile viewport.

---

## PS-6: Watch View — Embedded Player + Watch-Time Completion Tracking

**Priority:** MUST-HAVE
**Dependencies:** PS-5

**Description**
Build the in-app watching experience: a page with the official YouTube IFrame Player API embed on the left/top and a notes panel beside it (notes panel itself is PS-9; render a placeholder slot for now), plus the playlist's video list as a sidebar/drawer with completion checkmarks and the current video highlighted. Track genuine watch time using player events: poll `getCurrentTime()` on an interval while state is PLAYING, and accumulate *watched seconds* in a way that is robust to seeking (count time actually spent playing, not the raw playhead position — a user who seeks to 90% has not watched 90%). When accumulated watch time crosses **80% of video duration**, automatically mark the video complete. Also provide a manual "Mark complete" button (per PRD 5.1, user-marked-complete is a first-class path) and an "Unmark" for mistakes. Persist watch progress periodically (e.g., every 15–30s and on page hide) so a refresh doesn't lose it. On completion, show a satisfying confirmation moment (check animation + "Next video" CTA) and record the completion event — this event is the trigger the streak system (PS-8) and activity graph (PS-10) will consume. Stay within standard IFrame Player API events only (ToS constraint from the PRD).

**Acceptance criteria**
- [ ] Video plays in the embedded official player; no custom player.
- [ ] Watching 80% of a video's duration (accumulated playing time) auto-marks it complete exactly once.
- [ ] Seeking to the end without watching does NOT trigger auto-completion.
- [ ] Manual "Mark complete" and "Unmark" both work and persist.
- [ ] Refreshing mid-video restores accumulated watch progress within one save interval.
- [ ] Completion writes a `video_progress` update and inserts/updates today's `daily_activity` row for the user.
- [ ] "Next video" advances to the following uncompleted video; completing the last video routes to the completion screen (PS-11, stub route acceptable until it exists).

---

## PS-7: Progress Engine — Completion Events, Pace Recalculation

**Priority:** MUST-HAVE
**Dependencies:** PS-6

**Description**
Centralize progress logic in one server-side module so streaks, the dashboard, emails, and the heatmap all read from a single source of truth. Responsibilities: (1) an idempotent `recordCompletion(userId, videoId)` that updates `video_progress`, upserts `daily_activity` for the user's *local* date (using their stored timezone), and returns what changed (first-completion-today? playlist finished?); (2) an `uncomplete` counterpart that correctly rolls back `daily_activity` only if no other completion exists that day; (3) pace/ETA recalculation: given completions to date and remaining runtime, compute updated finish date and "days ahead/behind schedule"; (4) playlist-completion detection. Cover this module with unit tests, especially date-boundary cases (completion at 11:58 PM vs 12:02 AM IST land on different days; a UTC-stored timestamp must not shift the local date).

**Acceptance criteria**
- [ ] `recordCompletion` is idempotent — double-firing (e.g., auto-complete + manual click racing) produces one completion and one activity day.
- [ ] Local-date attribution is correct across the midnight boundary in the user's timezone (unit-tested with IST and at least one other timezone).
- [ ] Unmarking the only completion of a day removes that day's activity; unmarking one of several does not.
- [ ] ETA recalculation returns correct finish date and ahead/behind delta (unit-tested).
- [ ] Completing the final video flags the enrollment as completed with a completion timestamp.

---

## PS-8: Streak System with Freeze/Grace Logic

**Priority:** MUST-HAVE
**Dependencies:** PS-7

**Description**
Implement the emotional core of the product. Rules (per PRD 5.1 decisions): a streak day runs midnight-to-midnight in the user's timezone (default IST); completing ≥1 video on a given local date makes that day count; consecutive active days form the streak. **Streak freeze:** every user earns 1 free grace day per calendar week — if exactly one day is missed and a freeze is available, the streak survives (mark that date as "frozen" in `daily_activity` so the heatmap can render it differently) and the freeze is consumed; two consecutive missed days, or a miss with no freeze available, resets the streak to 0. Compute current streak and longest streak. Design the computation to be derivable from `daily_activity` history (a pure function over the date series) rather than a fragile incrementing counter, and run freeze-consumption as part of a daily server-side job (shared with PS-12's cron) so streak state is correct even if the user never opens the app. Surface on the dashboard: flame + current streak, longest streak, freeze available/used this week, and a subtle "streak extended!" moment on the first completion of each day.

**Acceptance criteria**
- [ ] Completing a video on N consecutive local days yields streak = N; multiple videos in one day count once.
- [ ] Missing one day with a freeze available: streak continues, freeze consumed, day marked frozen. Missing a second day that week: streak resets to 0.
- [ ] Freeze allowance resets weekly (1 per calendar week, non-stacking).
- [ ] Streak is computed as a pure function of activity history — recomputing from scratch always matches displayed state (unit-tested with generated date sequences including timezone edges).
- [ ] Dashboard shows current streak, longest streak, and freeze status; first completion of the day triggers the streak-lit celebration state.
- [ ] Streak state is correct on login even after days of absence (no dependence on the user opening the app for resets to apply).

---

## PS-9: Per-Video Notes with Autosave

**Priority:** MUST-HAVE
**Dependencies:** PS-6

**Description**
Add the notes panel beside the player in the watch view. One note document per user per video: a plain-text/markdown textarea with debounced autosave (save ~1.5s after typing stops, plus on blur and page hide), a visible save-state indicator ("Saving… / Saved"), and last-edited timestamp. Notes are strictly private to the user. Add a per-playlist "All notes" view listing every note grouped by video in playlist order, so the effort compounds visibly. Handle the offline/failed-save case gracefully (retain text locally, retry, warn before unload if unsaved).

**Acceptance criteria**
- [ ] Typing in the notes panel autosaves without any explicit save button; indicator reflects save state truthfully.
- [ ] Notes persist and reload correctly per video; switching videos in the watch view swaps notes without loss.
- [ ] A failed save does not lose text; user is warned if they try to leave with unsaved changes.
- [ ] "All notes" playlist view shows notes in video order with video titles.
- [ ] Notes are only readable/writable by their owner (verified by an authorization test).

---

## PS-10: Contribution Graph (GitHub-Style Activity Heatmap)

**Priority:** SHOULD-HAVE
**Dependencies:** PS-7 (uses `daily_activity`; benefits from PS-8's frozen-day marker)

**Description**
Render a GitHub-style heatmap on the dashboard: the last ~26–52 weeks (responsive — fewer weeks on mobile) as a grid of day cells, colored by intensity = videos completed that day (0 / 1 / 2–3 / 4+ buckets), with frozen streak days rendered in a distinct style (e.g., outlined/blue). Hovering (or tapping) a cell shows a tooltip: date, videos completed, minutes watched if available. Dates must be bucketed in the user's timezone — reuse `daily_activity` directly rather than re-deriving from timestamps. Include a small legend and current/longest streak summary alongside.

**Acceptance criteria**
- [ ] Heatmap renders from `daily_activity` with correct weekday/week alignment and today as the last cell.
- [ ] Intensity buckets map correctly (verified with seeded data: 0, 1, 3, 5 completions render distinct levels).
- [ ] Frozen days are visually distinct from active and empty days.
- [ ] Tooltip shows exact date and completion count per cell.
- [ ] Renders acceptably on mobile (scrollable or reduced week-range, no layout break).

---

## PS-11: Playlist Completion Screen + Notes Export

**Priority:** SHOULD-HAVE
**Dependencies:** PS-7, PS-9

**Description**
When a user completes the final video of a playlist, route them to a celebration screen: confetti/animation moment, stats summary (total videos, total watch time invested, days taken vs. original estimate, longest streak during the run), and a one-click **notes export** that compiles all their notes for that playlist into a single downloadable markdown document (playlist title, then each video title as a heading with its note). End with a nudge CTA: "Start your next playlist" → paste-link flow. The completed playlist moves to a "Completed" section on the dashboard.

**Acceptance criteria**
- [ ] Completing the last video routes to the completion screen with accurate stats.
- [ ] Notes export downloads a well-formatted `.md` file containing every note in playlist order; videos without notes are omitted or marked.
- [ ] Completed playlists appear in a separate dashboard section with a "completed on" date, not among active cards.
- [ ] CTA routes to the add-playlist flow.
- [ ] Screen is reachable again later from the completed playlist card (not a one-time-only view).

---

## PS-12: Daily Email Reminder System

**Priority:** MUST-HAVE
**Dependencies:** PS-7, PS-8 (email copy references streak state); PS-2 (email prefs)

**Description**
Build the retention loop: a scheduled job (cron, hourly granularity) that, for each user whose local evening reminder time has arrived (default 7 PM local, user-configurable), checks whether they've completed any video today (via `daily_activity`); if not, sends one email via a transactional provider (Postmark or SES): subject/body in the streak-jeopardy voice — "Your streak is about to cool down 🔥 — pick up where you left off in *[Playlist Name]*" — deep-linking to the next unwatched video of their most recently active playlist. Hard requirements: **max one reminder email per user per day** (dedupe via a sent-log table, so a re-run cron doesn't double-send); a working one-click unsubscribe link plus a settings page toggle (reminders on/off, time picker); `List-Unsubscribe` header; skip users with no active playlists or all playlists completed; log sends and outcomes. Track email opens (provider webhook or pixel) into an `email_events` table so "streak saves" (return within 2 hrs of email) can be measured per the PRD's success metrics.

**Acceptance criteria**
- [ ] A user with no activity today receives exactly one email at their configured local hour; a user who already watched today receives none.
- [ ] Running the cron twice in the same hour cannot double-send (verified by test).
- [ ] Email deep-link lands an authenticated user directly on their next unwatched video.
- [ ] Unsubscribe link works without login and immediately stops reminders; settings toggle and time picker persist.
- [ ] `List-Unsubscribe` header present; sends logged with timestamp and delivery status.
- [ ] Users with zero active playlists are never emailed.
- [ ] Same cron run also executes the daily streak/freeze maintenance from PS-8.

---

## PS-13: Landing Page + Onboarding Funnel

**Priority:** SHOULD-HAVE
**Dependencies:** PS-2, PS-3, PS-4

**Description**
Build the public landing page selling the core value prop ("Paste a playlist. See exactly how long it takes. Actually finish it.") with a paste-a-playlist input **above the fold as the primary CTA** — the activation metric is "% of signups who paste a playlist in first session," so the funnel should let a visitor paste a link *first*, see the estimate as a teaser (count + runtime + finish date), and only then be asked to sign up to save it and start tracking. Carry the pasted playlist through the signup redirect so it's auto-added after auth completes. Include a brief how-it-works section (estimate → streak → finish) and screenshots/mock of the dashboard.

**Acceptance criteria**
- [ ] Anonymous visitor can paste a playlist link on the landing page and see the real estimate without an account.
- [ ] Signing up from that state auto-enrolls the pasted playlist — user lands on the dashboard with it already added.
- [ ] Page is responsive and loads fast (no blocking on YouTube API for initial render).
- [ ] Clear CTA hierarchy: paste input primary, sign-in secondary.

---

## PS-14: Product Analytics Instrumentation

**Priority:** SHOULD-HAVE
**Dependencies:** PS-3 through PS-12 (instruments their events)

**Description**
Instrument the PRD's success metrics so launch decisions are data-driven. Fire and store (self-hosted table or a product-analytics tool) these events with user + timestamp: `signup`, `playlist_pasted`, `playlist_enrolled`, `video_completed`, `streak_extended`, `streak_frozen`, `streak_reset`, `note_created`, `reminder_sent`, `reminder_opened`, `session_started`, `playlist_completed`. Build a minimal internal metrics view (or documented SQL queries) answering: activation rate (paste within first session), D7 retention, % users with streak ≥3, email open rate, streak-save rate (session within 2h of reminder), playlist completion rate, notes per active user.

**Acceptance criteria**
- [ ] Every listed event fires at the correct moment (spot-verified end-to-end for the full user journey).
- [ ] Each PRD success metric has a working query or dashboard tile.
- [ ] "Streak save" is measurable: sessions are attributable to a reminder sent within the prior 2 hours.
- [ ] No PII beyond user ID in event payloads.

---

## Phase 2 backlog (do not build for v1 — tracked so they don't leak into scope)

## PS-15: Engagement / Skim Detection Score

**Priority:** NICE-TO-HAVE (Phase 2)
**Dependencies:** PS-6 (player event stream), plus real usage data post-launch

**Description**
Layer an "engagement score" on top of watch-time completion using behavioral proxies available from the IFrame Player API: seek-skip frequency, playback rate, tab visibility during playback. Score is informational only (shown to the user privately), never punitive — it must not block completions or streaks. Requires a ToS review before build (per PRD risk section) and should be designed against real watch-behavior data collected in v1.

**Acceptance criteria**
- [ ] Deferred — write full criteria when scheduled. Guardrail already decided: engagement score can never revoke a completion or break a streak.

## PS-16: AI Guidance / Lecture Tutor

**Priority:** NICE-TO-HAVE (Phase 2)
**Dependencies:** PS-6, PS-9; transcript ingestion pipeline (new)

**Description**
An in-watch-view assistant that answers "I'm confused about this part" using the video transcript (transcript ingestion + RAG over lecture content + output moderation). Explicitly out of v1 per PRD §9.1 — do not start until the core loop shows retention.

## PS-17: Payments / Credits

**Priority:** NICE-TO-HAVE (Phase 2)
**Dependencies:** Retained user base

**Description**
Billing infrastructure placeholder. Per PRD: do not build before there are retained users worth charging. No v1 work beyond avoiding schema decisions that would block it later.

---

## Suggested build order

```
PS-1 → PS-2 → PS-3 → PS-4 → PS-5 → PS-6 → PS-7 → PS-8 → PS-9 → PS-12 → PS-10 → PS-11 → PS-13 → PS-14
└────────── core value prop ──────────┘   └── habit loop ──┘        └────── launch polish ──────┘
```

The MVP launch gate is PS-1 through PS-9 plus PS-12 (all MUST-HAVE). PS-10, PS-11, PS-13, PS-14 are SHOULD-HAVE — ship in launch week. PS-15–17 stay in the backlog until the core loop proves retention.
