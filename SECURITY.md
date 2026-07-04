# PeakStreak — Security & Access Document

**Companion to:** PRD.md (Draft v1.0) and ARCHITECTURE.md (v1.0)
**Status:** v1.0
**Audience:** Written in plain English for a non-technical founder. Where a technical term is unavoidable, it's explained the first time it appears.

---

## How to read this document

Security for a product like PeakStreak is not about hackers in hoodies — it's about five mundane questions:

1. **Who are you?** (Authentication — Section 1)
2. **What are you allowed to do?** (Roles & permissions — Section 2)
3. **Whose data can you see?** (Row-level security — Section 3)
4. **What happens when something breaks?** (Error handling — Section 4)
5. **What weird situations will happen in the real world?** (Edge cases — Section 5)

If your engineers implement Sections 1–3 exactly as written, PeakStreak launches with a security posture better than most funded seed-stage products. Sections 4–5 are what will make the product feel *trustworthy* rather than merely secure — for a streak product, a bug that wrongly kills someone's 40-day streak is a worse breach of trust than most technical vulnerabilities.

---

## 1. Authentication — How People Prove Who They Are

### 1.1 The recommendation

**Google Sign-In, plus an email "magic link" as the fallback. No passwords, ever.**

In plain English:

- **Google Sign-In:** the user clicks "Continue with Google," Google confirms who they are, and Google tells us their email, name, and photo. We never see or store a password.
- **Magic link:** for people who don't want to use Google, they type their email address and we send them a link. Clicking the link signs them in. Again — no password.

This is implemented with **Auth.js**, a widely used, actively maintained open-source library, running inside your own app (per ARCHITECTURE.md §2.4). You are not building your own login system, and you should never build your own login system.

### 1.2 Why this fits PeakStreak specifically

- **Your audience already lives in Google's world.** They're on YouTube all day — every one of them has a Google account. Friction at signup is your enemy (your #1 activation metric is "pasted a playlist in the first session"), and Google Sign-In is one click.
- **No passwords means no password breaches.** You cannot leak what you don't store. For a two-person startup, this eliminates an entire category of risk: password database theft, credential-stuffing attacks, "forgot password" flows, password reset abuse.
- **Magic links reuse infrastructure you already need.** You're already required to run a transactional email service for daily reminders. The magic-link login rides on the same service for free.

### 1.3 One critical decision: do NOT ask Google for YouTube access

⚠️ **Your documents currently contradict each other on this, and it must be resolved before any auth code is written.**

- **ARCHITECTURE.md §2.4 (correct):** sign-in asks Google only for the user's basic identity (email, name, photo). Playlist information is fetched separately by your server using a simple API key, because playlists are public data.
- **DESIGN.md §9.1 (outdated — should be revised):** describes requesting YouTube read access during sign-in, storing Google access/refresh tokens, and handling token refreshes.

**Follow ARCHITECTURE.md.** Here's why in plain terms:

1. **You don't need it.** Everything v1 fetches (playlist titles, video lists, durations, thumbnails) is public. A plain server-side API key gets all of it.
2. **Asking for it hurts you three ways:**
   - Google treats YouTube access as a "sensitive scope," which triggers a formal verification review of your app — weeks of delay and paperwork.
   - The consent screen becomes scarier ("PeakStreak wants to view your YouTube account"), which costs you signups.
   - You'd be storing Google access tokens for every user — valuable credentials you'd then be responsible for protecting. That's real security liability taken on for zero benefit.
3. **Security principle at work: ask for the minimum.** The less you're entrusted with, the less you can lose. This principle ("least privilege") appears throughout this document.

**Action item:** update DESIGN.md §9.1 to remove the `youtube.readonly` scope, the refresh-token handling, and the "Reconnect Google account" modal. Sign-in requests only `openid email profile`.

### 1.4 How sessions work (staying signed in)

Once someone signs in, the app needs to remember them. The rules:

- The "I'm signed in" proof lives in a **secure, httpOnly cookie** — a browser storage mechanism that JavaScript on the page *cannot read*. This matters because if a malicious browser extension or injected script runs on your page, it still can't steal the login.
- Cookies are marked **Secure** (only sent over encrypted connections) and **SameSite=Lax** (the browser won't send them when another website tricks the user's browser into calling your app — this blocks a classic attack called CSRF).
- **Session length: 30 days, refreshed on activity.** PeakStreak is a *daily-habit* product — forcing frequent re-login would sabotage the core loop. A 30-day rolling session means an active user never sees a login screen, and an abandoned account quietly logs out.
- **Sessions are stored in the database** (Auth.js's database-session mode, which the Drizzle adapter in ARCHITECTURE.md already gives you). This means you can *revoke* sessions: if a user says "someone has my account," you can log out all their devices instantly. Token-only sessions can't do that.
- Signing out deletes the session record — the cookie in the browser becomes a key to a lock that no longer exists.

### 1.5 Magic link safety rules

Magic links are login keys sent over email, so they need guardrails:

- **Expire in 15 minutes** and are **single-use** — a link that's been clicked once is dead.
- **Requesting a link is rate-limited** (e.g., max 3 per email address per 15 minutes) so nobody can bombard a victim's inbox or use your app as a spam cannon.
- The email says what to expect: "You asked to sign in to PeakStreak. If this wasn't you, ignore this email." Never include any other action in a login email.
- **Account linking rule:** if someone signs up with Google using `asha@gmail.com` and later requests a magic link for the same address, they must land in the *same account*, not a duplicate. Auth.js handles this if configured to match on verified email — make sure it's configured that way and tested, because duplicate accounts are a support nightmare and a data-confusion risk.

### 1.6 What we deliberately do NOT do in v1

- **No passwords** (explained above).
- **No two-factor authentication (2FA).** Justified because: there are no passwords to steal (both login methods already depend on the user's email or Google account, which have their own 2FA), and the data at stake is study notes, not money. Revisit if you ever store payment details.
- **No "Sign in with Apple / GitHub / etc."** Every extra provider is more code, more edge cases (email conflicts), more testing. Google + magic link covers 100% of your target users.
- **No phone numbers.** You don't need them; don't collect them. Every piece of personal data you don't collect is a breach you can't have.

---

## 2. User Roles — Who Can Do What

PeakStreak v1 has deliberately few roles. Resist inventing more; every role is a new set of rules to test and a new way to make mistakes.

### 2.1 The four roles

| Role | Who it is | How they're identified |
|---|---|---|
| **Visitor** | Anyone on the internet, not signed in | No session cookie |
| **Member** | A signed-in user (there is only one tier of user in v1) | Valid session cookie |
| **System (Cron)** | Your own scheduled jobs — the reminder sender and streak evaluator. Not a human. | Secret token (`CRON_SECRET`) sent with each request |
| **Admin (you)** | The founder/operator, for support and debugging | **Not an in-app role in v1** — see 2.5 |

### 2.2 Visitor — can and cannot

**CAN:**
- View the landing page, privacy policy, and terms.
- Paste a playlist URL and see the time estimate **(the pre-signup teaser from ARCHITECTURE.md's `/api/playlists/preview`)**. This is your acquisition hook, so it stays public — but it calls YouTube on your dime, so it must be rate-limited (see Section 5, edge case #18).
- Sign up / sign in.
- Use a one-click unsubscribe link from an email (see 2.6 — this works without login, on purpose).

**CANNOT:**
- See any dashboard, playlist, note, streak, or progress data — not their own (they have none) and not anyone else's.
- Save anything. The preview estimate is stateless; nothing persists until they create an account.
- Reach any API endpoint that reads or writes user data. The app's middleware sends them to the login page.

### 2.3 Member — can and cannot

**CAN (always and only on their own data):**
- Add a playlist to their dashboard (creating an *enrollment* — their personal commitment to that playlist).
- View their own dashboard: playlists, progress, streak, contribution graph.
- Watch videos and have watch progress recorded; manually mark a video complete.
- Create, edit, and delete their own per-video notes; export their own notes.
- Change their own settings: display name, timezone, reminder hour, email on/off.
- Archive or delete their own enrollments.
- Delete their own account (see edge case #18 in Section 5 — this must exist before launch).

**CANNOT:**
- See any other user's existence, email, notes, progress, streaks, or activity. There is no user directory, no public profile, no sharing in v1. **From any one user's perspective, they are the only user in the system.**
- Edit the shared playlist/video catalog (titles, durations, thumbnails fetched from YouTube). They can *trigger* a refresh of a playlist they're enrolled in (rate-limited), but the data itself comes only from YouTube — no user input ever writes to the shared catalog. This matters: the catalog is shared across all users, so if one user could edit it, they could deface or mislead everyone.
- Award themselves streaks or completions directly. Clients report *raw watch seconds*; the **server** decides whether the 80% threshold is met and whether the streak advances. (A manual "mark complete" exists per the PRD, but it's recorded as manual — `completed_manually = true` — so honest and dishonest usage are at least distinguishable in your metrics.)
- Call the cron endpoints, other users' unsubscribe links, or any admin function.
- Make the app send email to any address other than their own verified one.

### 2.4 System (Cron) — can and cannot

Your scheduled jobs (`/api/cron/reminders`, `/api/cron/streaks`, `/api/cron/refresh-playlists`) are the most privileged thing in the system — they touch *every* user's data. So they get strict rules:

**CAN:**
- Read any user's activity/streak/settings *for the sole purpose of* evaluating streaks, sending reminders, and refreshing playlist metadata.
- Update streak state, consume streak freezes, write email-log records.

**CANNOT:**
- Be called by anyone who doesn't present the correct `CRON_SECRET` token. A request without it gets rejected before any code runs. **This is the single most important line of code in the cron routes** — without it, anyone on the internet could trigger "evaluate everyone's streaks" or "send everyone email" at will.
- Do anything user-facing beyond its narrow job. The cron routes should not contain general-purpose data access "because it was convenient."

Two operational rules for this role:
- **The secret is long and random** (32+ random bytes), stored only in environment variables, never in code or Git.
- **Every cron action is idempotent** — safe to run twice. ARCHITECTURE.md already designs this via database uniqueness rules (one reminder per user per day *enforced by the database itself*, not by application logic). This is a security property too: a replayed or double-fired request cannot spam users or double-break streaks.

### 2.5 Admin — deliberately NOT an in-app role in v1

You will need to look at data to support users ("my streak broke and it shouldn't have!"). The temptation is to build an admin panel. **Don't, yet.** An admin panel is a high-privilege door that needs its own authentication, its own audit trail, and its own protection — a real project. Getting it slightly wrong is the classic startup breach story.

In v1, "admin" means: **you, connecting directly to the database** through your database provider's console (Neon's dashboard), which has its own login, its own access control, and its own audit log.

Rules for operating this way:

- Database console access is protected by your personal account **with 2FA turned on** (do this today).
- Only founders have access. When you hire, contractors get access to a *development* database, never production, until you've built proper tooling.
- Never edit user data by hand except to fix a verified bug (e.g., restoring a wrongly broken streak), and note what you changed and why in a shared log document. Boring, but it's what lets you answer "why does my data look different?" honestly.
- **Reading a user's notes requires their permission, even for you.** Notes are the most private thing in the product. Make this a written internal policy from day one — it's also a trust story you can tell users.
- Build the real admin panel when support volume justifies it, not before.

### 2.6 A fifth "pseudo-role": the unsubscribe link

One URL in the system works with **no login at all**: the one-click unsubscribe link in every email. This is on purpose (required by email standards, and by decency — someone locked out of their account must still be able to stop your emails). Its safety rules:

- Each user's link contains a long random token unique to them (the `unsubscribe_token` in ARCHITECTURE.md's schema). Guessing another person's token is statistically impossible.
- The link can do exactly one thing: turn that user's reminders off. It cannot read data, cannot turn anything on, cannot be used to confirm whether an email address has an account (the response looks identical either way).
- If a user forwards an email, the recipient could click their unsubscribe link. Acceptable: worst case is reminders turn off, which the user can re-enable in settings. This is the industry-standard trade-off.

---

## 3. Row-Level Security — Whose Data Can You See

### 3.1 The concept in one paragraph

Your database is one big set of tables shared by all users. "Row-level security" is the discipline of ensuring that every single read or write is scoped to *rows belonging to the requesting user*. The classic startup data leak is not a hacker breaking encryption — it's an engineer writing "fetch note by ID" instead of "fetch note by ID *belonging to this user*," and someone noticing that changing the number in the URL shows them a stranger's notes. That bug class is called an IDOR (insecure direct object reference), and it is the #1 thing this section exists to prevent.

### 3.2 Where the rules are enforced

Your stack (Neon Postgres + Drizzle, per ARCHITECTURE.md) enforces these rules **in the application layer**: every database query must include the ownership condition. Postgres does have a built-in feature also called "Row-Level Security" that enforces rules inside the database itself; it's most practical when the database is exposed directly to clients (the Supabase model). With your architecture — where *only your server* ever talks to the database — application-layer enforcement is the standard, workable approach, **on three conditions**:

1. **One shared "get current user" helper.** Every API route starts by asking the same single function "who is making this request?" — never re-implementing that check ad hoc.
2. **Ownership is part of every query, not checked afterwards.** The query itself says "find this note *where it belongs to user X*." If the note exists but belongs to someone else, the query simply finds nothing — same result as if it never existed. This also prevents leaking *existence* of other people's data (a "not yours" error confirms something is there; "not found" confirms nothing).
3. **Tests exist for cross-user access.** Before launch, there must be automated tests that create two users, have user A try to read and write every type of user B's data by ID, and assert the answer is always "not found." This is cheap to build and catches the exact class of bug most likely to actually happen. Treat this test suite as non-negotiable as the streak unit tests.

### 3.3 The rules, table by table

Plain-English access rules for every table in ARCHITECTURE.md §4. "Owner" means the user whose `user_id` is on the row (directly, or through their enrollment).

| Table | What it holds | Who can read | Who can write | Notes |
|---|---|---|---|---|
| `users` | Account + settings (email, timezone, reminder hour) | Owner only (their own row) | Owner: name, timezone, reminder settings only. **Never** email or the unsubscribe token via any API | Email changes are an account-takeover vector; exclude from v1 entirely. System reads rows in batches for reminders/streaks. |
| `accounts`, `sessions`, `verification_tokens` (login plumbing) | Google link, active sessions, magic-link tokens | **Nobody** via your API | Only the auth library itself | No API endpoint of yours should ever touch these. |
| `playlists`, `videos`, `playlist_videos` | Shared catalog of YouTube metadata | **Any member** (it's a shared cache of public data) | **Only the server's YouTube pipeline.** No user input ever writes here | One user's import benefits everyone — by design. Contains zero personal data, so shared read is safe. A member may *trigger* a rate-limited refresh for a playlist they're enrolled in. |
| `enrollments` | A user's commitment to a playlist (pace, status) | Owner only | Owner: create, change pace, archive, delete own rows only | The root of a user's private world — nearly everything else hangs off it. |
| `video_progress` | Per-video watch state | Owner only (via their enrollment) | Server-mediated: client sends raw watch seconds; **server** computes completion. Manual mark-complete allowed, flagged as manual | Client-supplied numbers are treated as *hints, never facts* — capped at video duration, threshold checked server-side. |
| `daily_activity` | One row per user per active day (heatmap data) | Owner only | **Server only, as a side effect** of progress/notes. No API writes it directly | If users could write it directly, streaks would be self-award-able. |
| `streaks` | Current/longest streak, freezes | Owner only | **Server only**: completion logic and nightly cron. **No user-facing endpoint modifies streaks. None.** | The emotional core of the product. Its integrity is the product. |
| `streak_freeze_uses` | Log of used freezes | Owner only (shows "freeze used Jul 3 🧊") | Server (cron) only, append-only — never edited or deleted | Append-only logs are how you debug streak complaints honestly. |
| `notes` | Private study notes | **Owner only — the most private data in the system** | Owner: create/edit/delete own notes only | Never in analytics, never in logs, never in emails beyond the user's own export. See internal-access policy in 2.5. |
| `email_log` | Record of every email sent | Not user-facing in v1 (internal) | Server only (send pipeline + provider webhooks) | Contains addresses + engagement data; treat as personal data — it's covered by deletion (edge case #18). |

### 3.4 Three cross-cutting rules

1. **The user ID always comes from the session, never from the request.** When the browser says "save this note for user 123," the server ignores the "123" and uses the identity on the session cookie. Any API that accepts a user ID as input is a bug by definition.
2. **Deleting a parent deletes its children.** Deleting an enrollment removes its progress rows and (per your product decision) its notes; deleting an account removes everything (see edge case #18). Configure the database to cascade these deletes so orphaned personal data can't linger by accident.
3. **The shared catalog never contains user data, ever.** The clean split in ARCHITECTURE.md — shared tables have no personal data, personal tables are always user-scoped — is your best structural defense. Guard it in code review: the moment someone proposes putting a user field on `playlists` "just for now," that's a design smell to reject.

---

## 4. Error Handling Guide — What Happens When Things Break

Principles first, then the specific failure points.

**The four principles:**

1. **Tell users what happened and what to do next, in their language.** "We couldn't load this playlist — it may be private or deleted. Double-check the link and try again." Never show raw technical errors (they confuse users *and* leak clues to attackers about how your system works).
2. **Fail safe, not open.** When an access check errors out for any reason, the answer is "no access" — never "let it through since we couldn't check."
3. **Never punish the user's streak for your failure.** If your servers, YouTube, or email provider break, the user must not lose progress they legitimately earned. When in doubt, decide in the user's favor — an unfairly kept streak costs you nothing; an unfairly broken one costs you the user.
4. **You hear about errors before users tell you.** Sentry (already in ARCHITECTURE.md) captures every server error from day one. Error reports must never include note contents or email bodies — configure scrubbing before launch, not after.

### 4.1 Failure point: Sign-in

| What breaks | What the user sees | What the system does |
|---|---|---|
| Google sign-in fails or is cancelled | "Google sign-in didn't complete. Try again, or sign in with your email instead." | Log the failure reason internally. Always offer the magic-link path as fallback — never a dead end. |
| Magic-link email doesn't arrive | After requesting: "Sent! Check spam if it's not there in 2 minutes." Plus a "resend" button (rate-limited) | Log every send + provider response. Alert yourself if magic-link failures spike — that's a "signups are broken" fire. |
| Expired/used magic link clicked | "This link has expired — enter your email for a fresh one," with the form right there | Old links must cleanly land on recovery, not a cryptic error. People click links hours later; this is a *common* path, not an edge case. |
| Session expired (30 days idle) | Redirected to login; after signing in, returned to the page they wanted | Deep links (e.g., from a reminder email) must survive the login round-trip — a reminder that dumps users on a login dead-end defeats its own purpose. |
| Rate limit hit on magic-link requests | "Too many attempts — wait 15 minutes." | Count by email *and* by requesting network address. |

### 4.2 Failure point: Playlist import (your acquisition moment — highest polish required)

| What breaks | What the user sees | What the system does |
|---|---|---|
| Not a valid YouTube playlist URL | Instant inline message: "That doesn't look like a YouTube playlist link. It should contain `list=`." Show an example | Validate the URL's *shape* in the browser before any server call. Reject non-YouTube URLs server-side too (never fetch arbitrary user-supplied URLs — that's an attack vector called SSRF). |
| Playlist is private or deleted | "This playlist looks private or unavailable. If it's yours, make it public or unlisted on YouTube first." | YouTube tells you this distinctly; map it to this message rather than a generic failure. |
| Some videos in the playlist are private/deleted | Import succeeds; estimate screen notes "3 videos unavailable — excluded from your estimate" | ARCHITECTURE.md's `partial` sync status. Excluded videos never count toward completion (edge case #4). |
| YouTube API is down or errors | "YouTube isn't responding right now — try again in a few minutes." | Retry a couple of times behind the scenes first (many API errors are momentary). Alert if failures persist. |
| **Daily YouTube quota exhausted** | "We're at capacity — try adding this playlist again after [time]." Honest and time-bound | Your cache means already-imported playlists still work fine — only *new* imports pause. Alert yourself at 80% of quota, *before* users feel it. Never silently show wrong/empty estimates. |
| Absurd input (a 5,000-video playlist) | "That playlist has 5,000 videos (about 400 hours) — sure?" Then import normally, or cap if needed | A cap protects your quota from abuse; make it generous (real courses run 300–500 videos). |

### 4.3 Failure point: Watch tracking (the heartbeat)

The watch page reports progress to your server every ~20 seconds. Networks drop, laptops sleep, tabs close — this will fail routinely and must be graceful.

| What breaks | What the user sees | What the system does |
|---|---|---|
| A heartbeat fails to send | Nothing — invisible | Keep the running total in the browser; the next successful heartbeat carries it. Losing 20 seconds of credit is acceptable; interrupting the video is not. |
| User closes the tab mid-video | Nothing | Send a final "flush" on tab close (browsers support a send-on-exit mechanism). Best-effort — combined with 20s heartbeats, worst case loses seconds. |
| Heartbeats fail repeatedly (server down, wifi out) | After ~2 minutes of failures, a quiet banner: "Having trouble saving progress — keep watching, we'll retry." | Retry with increasing gaps. **Never** pause the video or pop a modal over it. |
| Server receives a nonsense heartbeat (600 min watched on a 10-min video; negative numbers; timestamps from the future) | Nothing | Clamp every value to the possible range (0 to video duration, per-interval delta ≤ elapsed time × playback rate). Log wildly implausible ones — either a bug or someone probing (see edge case #13). |
| The video was completed but the confirmation didn't reach the browser | Flame animation may fire on next page load instead of instantly | Server state is truth; UI catches up on next load. Optimistic animation (DESIGN.md §9.3) is fine — just reconcile quietly if server disagrees. |

### 4.4 Failure point: Notes autosave

| What breaks | What the user sees | What the system does |
|---|---|---|
| Autosave request fails | "Saved" indicator switches to "Unsaved changes — retrying…" | Keep the text in the browser and retry. **Never discard typed text.** A lost note is a broken promise ("your effort compounds here"). |
| User edits the same note on two devices | Last save wins, whole-note | Acceptable for v1 — real-time merge is a huge project. Keep brief server-side history of the last few versions so support can recover a clobbered note. |
| Note is enormous (someone pastes a book) | At a generous limit (e.g., ~100k characters): "This note is too long — split it up." | A size cap is also a defense: unbounded input fields invite storage abuse. |

### 4.5 Failure point: Reminder emails & streak evaluation (the invisible machinery)

Failures here are the most dangerous kind: **silent**. No user sees an error page — people just quietly stop getting reminders, or wake up to a wrongly broken streak. Monitoring *is* the error handling.

| What breaks | Impact | What the system does |
|---|---|---|
| Email provider is down during a send window | Reminders late or skipped | Retry within the same evening window. If missed entirely: skip, don't send at 3 AM — a badly timed reminder is worse than none. Alert on any window with unusually low sends. |
| An email bounces (mailbox full, address dead) | User silently stops receiving reminders | Provider webhooks report bounces. After repeated hard bounces, stop sending and show an in-app notice: "Reminder emails are paused — update your email?" Continuing to send burns your sender reputation and can get *all* your email spam-foldered (deliverability is a shared resource across every user). |
| User marks the reminder as spam | Provider auto-suppresses them | Respect it instantly and permanently; never re-add. One spam complaint is feedback; a pattern means your copy or frequency is wrong. |
| Streak cron doesn't run (outage) | Streaks not evaluated at users' midnights | Design (per ARCHITECTURE.md) processes are idempotent and windowed: the next run picks up the missed window. Verify the catch-up window logic covers gaps of several hours. **Alert if a cron hasn't succeeded in 30+ minutes** — this is your most important alarm. |
| Cron crashes halfway through the user list | Some users evaluated, some not | Each user handled independently inside the run — one bad record must never abort everyone behind it. Failed user gets logged and retried next window. |
| A bug wrongly breaks streaks | Furious (rightly) users | The append-only logs (`streak_freeze_uses`, `daily_activity`, `email_log`) are your forensic record: reconstruct what should have happened and restore it manually. **Policy: user reports streak unfairly broken + logs are even ambiguous → restore the streak, no argument.** Goodwill is cheap; churn is not. |

### 4.6 Failure point: Database & platform

| What breaks | What the user sees | What the system does |
|---|---|---|
| Database briefly unreachable | Friendly error page: "Having trouble — back in a minute." | Never a raw stack trace (confusing + leaks internals). Serverless + connection pooling (ARCHITECTURE.md's pooled URL) is exactly to make this rare. |
| A write fails mid-way through "mark complete → update activity → update streak" | Nothing inconsistent — it all happened or none did | This is why ARCHITECTURE.md wraps these in a single database *transaction* (all-or-nothing). The half-updated alternative (video done but streak didn't move) is the most trust-destroying bug this product can have. Non-negotiable. |
| You deploy a bad migration / need to recover data | Depends | Neon keeps point-in-time restore; know how to use it *before* you need it. **Do one practice restore before launch.** A backup you've never restored is a hope, not a backup. |

---

## 5. Edge Cases to Handle Before Launch

Grouped by theme. Each says what happens, why it matters, and what to do.

### Time & streaks (your hardest, most product-defining category)

**1. User changes timezone (travel or settings).**
Their "day boundary" moves. If they log activity in Mumbai and land in San Francisco (where it's still "yesterday"), naive logic can double-count a day or wrongly break a streak. ARCHITECTURE.md's rule handles history correctly (each day's date is stamped at write time and never recomputed) — but you must also decide the transition-day rule: **timezone changes take effect going forward only; past days never re-labeled.** Test: log activity, change timezone across the date line both directions, confirm the streak survives.

**2. Daylight saving time.**
Twice a year, midnight math shifts for half your potential users. The 15-minute windowed cron design handles this *if* implemented with real timezone rules (the `date-fns-tz` approach in ARCHITECTURE.md) — but DST transition nights must be explicit unit-test cases: does anyone's day get evaluated twice or skipped on the night clocks change?

**3. The 11:59 PM completion.**
User finishes a video seconds before local midnight; by the time the server processes it, it's 12:00:04 AM. Which day gets credit? **Rule: the day credited is the user's local date at the moment the server accepts the qualifying event** — and the streak cron must not race against it (the completion transaction and the cron must serialize on the user's streak row; ARCHITECTURE.md's row-locking design covers this — make it an explicit test).

**4. Streak freeze edge cases.**
(a) Two consecutive missed days with one freeze → freeze covers day one, streak breaks day two — correct, but the UI must show *why* ("freeze used Tue; streak ended Wed"). (b) Freeze replenishes Mondays — user-local Monday, same windowed-cron logic. (c) User misses a day while `freezes_available` is being replenished the same night — order the two cron effects deterministically (evaluate the missed day *first*, then replenish).

**5. User completes zero videos but watches 79% of one.**
Heatmap shows activity (partial watching counts for the graph), but the streak doesn't advance (streak requires a completion) — per ARCHITECTURE.md's `counts_for_streak` flag. This *will* generate "my streak broke but I watched yesterday!" complaints. Handle in product copy: the reminder email and dashboard should say clearly "finish a video to keep your streak" — not just "do something."

### YouTube content changes under you

**6. A video in an active playlist is deleted or goes private.**
Never delete your record (notes/progress hang off it). Mark unavailable, exclude from the completion denominator (12/41 instead of 12/42), show "1 video no longer available" on the playlist page. **A user must never be stuck unable to "complete" a playlist because of a video that no longer exists.** Completion check = all *available* videos done.

**7. The playlist owner reorders, adds, or removes videos.**
Your daily re-sync (per ARCHITECTURE.md) picks this up. Rules: progress attaches to *videos*, not positions (already true in the schema — verify in code); new videos join the denominator (progress % can *drop* — a confusing-but-honest moment worth a small UI note: "3 new videos were added to this playlist"); a **completed** enrollment stays completed even if videos are added later (completion is an event that happened, not a live formula).

**8. The same video appears in two of a user's playlists.**
Progress is scoped per enrollment (ARCHITECTURE.md's design — correct). Watching it in course A does not auto-complete it in course B. But notes are per (user, video) — one note shared across both playlists. Fine, but make the UI honest about it so users aren't surprised to see the "same" note in both places.

**9. An entire playlist is deleted from YouTube.**
Enrollment survives; progress/notes/streak history survive; playlist marked unavailable ("This playlist was removed from YouTube"); videos already cached stay watchable if YouTube still serves them individually. Notes export must still work — that's the user's own work product.

**10. Embedding disabled by the video owner.**
Some channels block embedding; YouTube's player raises a specific error. Show "This creator doesn't allow playback outside YouTube — watch it there, then mark it complete here," with a link out and the manual-complete button. Without this, the watch page is a dead end and manual completion is the honest escape hatch.

### Accounts & identity

**11. Same person, two sign-in methods.**
Covered in 1.5 — Google and magic-link for the same verified email must converge on one account. Test both orders (Google first, email later; email first, Google later).

**12. User's Google account is compromised or their email changes hands.**
Someone controlling the email controls the PeakStreak account (true of ~every consumer app). Your mitigations: database-backed sessions let you revoke all sessions on request, and you have a support path (even just a founders' inbox) for "I lost access." Document the recovery procedure for yourselves before launch — improvising identity verification during an incident is how support gets social-engineered.

**13. A user tries to cheat their own streak.**
Fake heartbeats, marking everything complete without watching, script-driven requests. Perspective: they're cheating *themselves* — there's no leaderboard or payout in v1, so this is **not** a security emergency; don't build an anti-cheat arms race. Do the cheap things: server-side threshold (built), clamped heartbeat values (Section 4.3), `completed_manually` flag (built), and a per-user rate limit on completion events (nobody legitimately completes 50 videos in a minute). Log oddities; ignore the rest until social features exist — *then* it becomes a real problem (and it's listed in the PRD as explicitly out of v1).

**14. A user signs up with a typo'd email (magic-link path).**
Magic links self-verify (you can't sign in without receiving the link), so this mostly self-corrects. The failure mode is someone repeatedly requesting links to an address they don't own — rate limiting (1.5) plus the "if this wasn't you, ignore" line covers the recipient's side.

### Abuse & platform protection

**15. The public preview endpoint gets hammered.**
It's unauthenticated and spends your YouTube quota — the most attackable thing you'll ship on day one. Rate-limit by network address (e.g., a handful of previews per minute), cache repeat lookups of the same playlist (already designed), and alert on quota burn. If abused hard, require sign-in for preview temporarily — an acceptable lever because the estimate is also shown right after signup.

**16. Someone signs up with thousands of throwaway emails.**
Cost: your email sends + database noise. Magic-link rate limits and per-address send caps blunt it. Don't build CAPTCHAs preemptively — add them only if this actually happens (they cost real conversion).

**17. A user enrolls in 500 playlists.**
Dashboard grinds, reminder logic scans everything, and it's certainly not genuine use. A soft cap (e.g., 50 active enrollments — far above any real learner) with a friendly "archive some playlists first" message protects you and inconveniences no one real.

### Legal & lifecycle (not optional — required by law in most of your markets)

**18. Account deletion.**
Must exist at launch (GDPR and similar laws; also basic decency). One button in settings → confirm → permanently delete the user row and *everything* cascading from it: enrollments, progress, activity, streaks, notes, email logs. The shared playlist/video catalog stays (it contains nothing personal). Offer notes export *before* deletion. Delete or anonymize the user promptly in analytics and error-tracking tools too (PostHog, Sentry) — deletion that skips your side-channels isn't deletion.

**19. Data export.**
Same legal family as deletion. The completion-screen notes export nearly covers it; extend to "export all my data" (notes + progress + activity history) as a simple downloadable file. Cheap now, painful later.

**20. Privacy policy accuracy.**
You already need a privacy page for Google's OAuth screen (it's in ARCHITECTURE.md's file tree). Make it *true*: what you collect (email, name, photo, timezone, watch progress on YouTube videos, notes), what you don't (no YouTube account access, no payment data), who processes it for you (Vercel, Neon, Google, Resend/Postmark, PostHog, Sentry), and how deletion works. A short honest page beats ten pages of boilerplate.

**21. Minors.**
Study tools attract school-age users. Set an age line consistent with your legal advice (13+ is the common floor in the US; parts of the EU require higher for consent), state it in your terms, and don't knowingly market below it. You're not building age verification in v1 — just don't be careless in positioning.

### Pre-launch security checklist (the mechanical stuff, in one place)

- [ ] All traffic over HTTPS only (Vercel does this; verify no exceptions).
- [ ] Session cookies: httpOnly, Secure, SameSite=Lax (Section 1.4).
- [ ] Every environment secret (database URL, auth secret, YouTube key, email key, cron secret) lives only in environment variables; `.env.local` is gitignored; **scan the Git history to confirm no secret was ever committed** — a secret that ever touched Git is burned; rotate it.
- [ ] YouTube API key is restricted (YouTube Data API only) and server-side only — never in browser code (ARCHITECTURE.md §7.4).
- [ ] Cron routes reject requests without the correct secret — verified by an automated test.
- [ ] The two-users cross-access test suite (Section 3.2, condition 3) passes for every data type.
- [ ] Rate limits active on: magic-link requests, preview endpoint, playlist refresh, completion events.
- [ ] All user-visible text a user typed (notes, names) is rendered safely — React does this by default; the rule is: never bypass it (no `dangerouslySetInnerHTML` on user content). This blocks XSS — attackers planting scripts in fields other users' browsers render. Nearly free in your stack; verify no exceptions.
- [ ] Sentry scrubs note contents and email addresses from error reports.
- [ ] Alerts exist for: cron not succeeding 30+ min, YouTube quota at 80%, email bounce-rate spike, error-rate spike.
- [ ] One practice database restore completed.
- [ ] SPF, DKIM, DMARC configured on the sending subdomain before the first reminder (ARCHITECTURE.md §7.3) — deliverability hygiene, and it also stops others from spoofing email as you.
- [ ] Account deletion and data export work end-to-end.
- [ ] DESIGN.md §9.1 updated to remove the YouTube OAuth scope (Section 1.3).

---

## Closing note: your actual biggest risks, ranked

For a pre-launch product of this shape, in honest order:

1. **A cross-user data leak from a missing ownership check** (Section 3) — most likely *and* most damaging. The two-user test suite is your insurance.
2. **Silently broken cron machinery** eroding retention invisibly (Section 4.5) — not a "security" issue, but the failure you're most likely to actually suffer. Alerts are the fix.
3. **A leaked secret in Git or client code** — the classic startup incident. The checklist covers it; make history-scanning a habit, not a one-off.
4. **Unfairly broken streaks** destroying trust faster than any breach would (Sections 4.5, 5.1–5.5) — handled by transactions, idempotency, append-only logs, and a generous restore policy.
5. **Email reputation damage** from ignoring bounces/complaints (Section 4.5) — quietly kills your single most important retention channel.

Everything in this document serves those five, in that order.

*End of document.*
