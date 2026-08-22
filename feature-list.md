# PeakStreak — Feature Ticket List (v2 → v100 roadmap)

**What this is:** the backlog for taking PeakStreak from "0 to 10" (done) to "10 to 100". Every ticket is standalone and buildable, written so it can be pasted directly into an AI coding tool as a prompt. The plan is one shippable version per week, each version a coherent step, not a grab bag.

**Four pillars:**
- **SOC — Social Accountability.** Turn solo streaks into shared ones. The PRD deferred this on purpose, so it is genuine white space, and "accountability" only means something when other people can see it.
- **AI — AI Study Companion.** The Phase-2 roadmap plus new learning features. Deepens the "I actually learned this" promise. All AI is additive garnish, never load-bearing (see PHASE-2.md).
- **GRO — Growth Engine.** Loops that pull new users in. Builds on Share Playlist, already shipped.
- **REV — Revenue / Plus.** Turn engagement into a business. Gated last, on purpose.

**Ground rules carried from v1 (apply to every ticket):**
- Stack: Next.js App Router, Drizzle ORM + Postgres (Neon), NextAuth v5. Auth via `requireUserId()` / `currentUserId()`; edge gating in `proxy.ts` (public routes must be added to its allow-list). Analytics via `track()` into the `events` table. Migrations via `pnpm db:generate` then `pnpm db:migrate`.
- Custom playlist means `playlists.youtubePlaylistId === null`. Videos are a shared cache, not user-owned.
- Every new surface degrades gracefully: a missing key, a failed call, or an empty state never breaks a core action (completion, streak, notes save).
- Every ticket ships with at least one test and does not regress `pnpm typecheck` / `pnpm lint` / `pnpm test`.

---

## Suggested Version Roadmap (one per week)

| Version | Theme | Tickets |
|---------|-------|---------|
| **v2** | You have a public identity | SOC-01 |
| **v3** | Learn with people you know | SOC-02, SOC-03 |
| **v4** | Friendly pressure | SOC-04, SOC-08, GRO-06 |
| **v5** | Bragging rights | GRO-01, GRO-02 |
| **v6** | Invite loop | GRO-03, GRO-04, GRO-05 |
| **v7** | Accountability partner | SOC-05 |
| **v8** | Study groups | SOC-06, SOC-07 |
| **v9** | AI foundation + first wins | AI-01, AI-02, AI-03 |
| **v10** | Active recall | AI-04, AI-07 |
| **v11** | Your study buddy | AI-05, AI-06 |
| **v12** | Never forget | AI-08 |
| **v13** | Make it a business | REV-01, REV-02, REV-03 |
| **v14** | Depth for the paid tier | REV-04, REV-05, REV-06 |

**Why this order:** social and growth first, because they raise retention and bring the real users the Phase-2 gate requires (D7 ≥ 20%, 25% reach a 3-day streak, 50+ real signups). AI depth comes once there is a base to serve. Revenue comes last, once there is something worth paying for and demand to prove it. Reorder freely, the dependency notes on each ticket are the real constraint.

---

# Pillar B — AI Study Companion (AI)

> Sourced from PHASE-2.md. Respect the launch gate before starting: retention and notes-usage thresholds should be met, since every AI feature builds on the user's own notes. All providers are OpenAI-compatible; the chain is the retry strategy.

## AI-01 — Provider Chain Foundation (`lib/ai.ts`)

**Priority:** Must-have (blocks every other AI ticket)

**Description:**
A single `complete()` function that tries an ordered list of OpenAI-compatible providers (Groq, then Gemini, then Hugging Face) and returns `null` if all fail, never throwing into product code. Providers with no env key are simply absent from the chain. This is PHASE-2 P2-1.

**Prompt for AI coding tool:**
"Create `lib/ai.ts` exporting `complete(prompt, opts)` that iterates an ordered provider array (Groq `llama-3.3-70b-versatile`, Gemini `gemini-2.0-flash`, HF), each configured by an optional env key. On 429, 5xx, or timeout (max 10s, one retry per provider), fall through to the next; if all fail, return `null`. Add `aiEnabled()` mirroring `googleOAuthEnabled()`. Add the keys to env schema, `.env.example`, and `turbo.json` globalEnv together. Log `{provider, latencyMs, ok}` via `track('ai_call', ...)`. Unit-test with a fake fetch: fallback on 429, fallback on timeout, all-fail returns null, zero-keys means aiEnabled is false. Re-verify current free-tier model names at build time, they drift."

**Acceptance criteria:**
- [ ] Removing provider N's key at runtime degrades to N+1 with no user-visible error.
- [ ] Zero keys means `aiEnabled()` is false and all AI UI hides.
- [ ] All failures return `null`, never throw.
- [ ] `ai_call` events record provider, latency, and outcome.

**Dependencies:** None.

---

## AI-02 — Notes Summarizer ("Your key takeaways")

**Priority:** Should-have

**Description:**
On the playlist completion screen, generate a structured summary of the user's own notes for that playlist: key concepts and a one-line takeaway per video. Cached so it generates once. PHASE-2 P2-2.

**Prompt for AI coding tool:**
"On `/completed/[enrollmentId]`, a server action pulls the user's note entries for the enrollment (existing `getPlaylistNotes`), prompts `complete()` for a structured summary (key concepts plus per-video one-liners), and renders it under the stats grid. Cache the result in a `summary` column or small table so it generates once. Add the summary to the existing markdown export. Add a visible 'AI features' settings toggle (default on) here. If there are no notes or AI returns null, omit the section and render the page perfectly otherwise."

**Acceptance criteria:**
- [ ] A completion screen with 3+ notes shows takeaways within ~8s, generated once and cached.
- [ ] No notes or AI failure means the section is absent, page otherwise perfect.
- [ ] The summary appears in the markdown export.
- [ ] The AI-features settings toggle works.

**Dependencies:** AI-01.

---

## AI-03 — Smart Pace Suggestion

**Priority:** Nice-to-have

**Description:**
On the estimate screen, suggest a realistic daily pace with one line of reasoning based on the playlist's title, channel, length, and video count. A dismissible hint, never auto-selected, because the pace choice is the user's commitment moment. PHASE-2 P2-3.

**Prompt for AI coding tool:**
"On the estimate screen, one `complete()` call with playlist title, channel, video count, and runtime returns a suggested pace and a one-line reason ('Dense DSA course, 30 min/day sticks better than 2 videos/day'). Render as a dismissible hint above the pace picker. Never auto-select. The picker works identically with AI off."

**Acceptance criteria:**
- [ ] A suggestion with reasoning appears within ~3s of the estimate.
- [ ] It is dismissible and never changes the picker value automatically.
- [ ] The picker behaves identically when AI is disabled.

**Dependencies:** AI-01.

---

## AI-04 — Explain This Note

**Priority:** Nice-to-have

**Description:**
A per-note "Explain this" button in the watch view that returns a plain-language explanation of a confusing note, using the note text plus video and playlist titles for context. Rate-limited to protect free tiers. PHASE-2 P2-4.

**Prompt for AI coding tool:**
"Add an 'Explain this' button per note entry in the watch view. Prompt = note text plus video and playlist titles. Show the explanation in a popover. Rate-limit per user per day via an `events` count check; when exceeded, show a friendly 'come back tomorrow' state. Degrade gracefully when AI is unavailable."

**Acceptance criteria:**
- [ ] The button returns a relevant explanation in a popover.
- [ ] The daily rate limit shows a friendly message when hit.
- [ ] Works gracefully when AI is off or returns null.

**Dependencies:** AI-01.

---

## AI-05 — Note Embeddings + Vector Search (RAG foundation)

**Priority:** Should-have

**Description:**
Enable pgvector on the existing Postgres and embed note entries so users can search their notes semantically across playlists ("what did I learn about backpropagation?"). Foundation for the tutor. PHASE-2 P2-5.

**Prompt for AI coding tool:**
"Migration: enable the `vector` extension on Neon, add `note_entry_embeddings` (entry_id PK/FK, embedding vector, model tag). Embed notes on save via the provider chain, plus a backfill job for existing notes. Add `lib/ai-search.ts` with a cosine-similarity search helper and tests. Build a 'search my notes' UI that returns relevant entries across all playlists."

**Acceptance criteria:**
- [ ] Vector extension enabled; embeddings created on save and backfilled.
- [ ] "Find my notes about X" returns relevant entries across playlists in under ~500ms for 10k notes.
- [ ] Search helper is tested.

**Dependencies:** AI-01, Neon pgvector.

---

## AI-06 — Notes-Based Tutor

**Priority:** Should-have

**Description:**
A "Ask about this lecture" side panel in the watch view. Context is the user's own notes for the current video and its neighbors (via AI-05 retrieval) plus video metadata. Honest by design: it has read your notes, it has not watched the video. No transcripts (ToS). PHASE-2 P2-6.

**Prompt for AI coding tool:**
"Watch-view side panel 'Ask about this lecture'. Context = current video's notes + retrieved neighbor notes (AI-05) + video and playlist metadata + the question. Stream responses. Do not persist the conversation in v1. Constrain output via system prompt and provider safety settings. Show the honesty line: 'Answers are based on your notes and the video's metadata, not the video itself.' Log `ai_tutor_asked`. Provide a clear degradation path when AI is unavailable. Consider gating behind a paid plan (REV) given real token cost."

**Acceptance criteria:**
- [ ] Answers are grounded in the user's actual notes (spot-check 20 Q&As).
- [ ] The honesty disclaimer is always visible.
- [ ] Graceful degradation when AI is unavailable.
- [ ] `ai_tutor_asked` events recorded for cost monitoring.

**Dependencies:** AI-01, AI-05, launch gate met.

---

## AI-07 — Auto Quiz / Flashcards from Notes

**Priority:** Should-have

**Description:**
Generate active-recall questions and flashcards from a user's notes for a video or playlist. Watching is passive; being quizzed is where learning sticks. This turns notes into a study tool and creates a fresh reason to return.

**Prompt for AI coding tool:**
"Add a 'Quiz me' action on a playlist or video with notes. A `complete()` call turns the user's notes into 5 to 10 question-answer pairs (mix of recall and short-answer). Store generated cards in a `flashcards` table (user_id, playlist_id, video_id nullable, front, back, created_at) so they persist and can feed spaced repetition (AI-08). Render a simple flip-card review UI with self-graded correct/incorrect. Degrade gracefully with too few notes or AI off. Track `quiz_generated`, `flashcard_reviewed`."

**Acceptance criteria:**
- [ ] "Quiz me" generates relevant cards from the user's own notes and persists them.
- [ ] The review UI supports flipping and self-grading.
- [ ] Too few notes or AI off yields a clear, non-broken state.

**Dependencies:** AI-01. (Better with AI-05 for context, but not required.)

---

## AI-08 — Spaced Repetition Review Queue

**Priority:** Nice-to-have

**Description:**
A daily review queue that resurfaces flashcards (AI-07) on a spaced-repetition schedule. Completing a review counts toward the daily streak, giving people a reason to return even on days they are not watching new videos. This directly attacks the retention problem.

**Prompt for AI coding tool:**
"Add spaced-repetition scheduling to flashcards: store `ease`, `interval_days`, `due_date`, `last_reviewed` per card and apply a simple SM-2-style update on each self-grade. Build a 'Review' page showing today's due cards across all playlists. A completed review session counts as activity for the streak and contribution graph, reusing the existing daily-activity path (do not fork streak logic). Show due-count on the dashboard. Track `review_session_completed`."

**Acceptance criteria:**
- [ ] Cards become due on a spaced schedule and appear in the review queue.
- [ ] Self-grading updates the schedule (harder cards return sooner).
- [ ] A completed review session extends the streak via the existing activity path.
- [ ] Dashboard shows the count of cards due today.

**Dependencies:** AI-07, existing streak/activity system.

---

# Pillar C — Growth Engine (GRO)

## GRO-01 — Shareable Milestone Cards (dynamic OG images)

**Priority:** Must-have

**Description:**
Auto-generated, good-looking images for milestones worth bragging about: finishing a playlist, hitting a streak length, total hours learned. These are the unit of organic growth on X and LinkedIn. Because Share Playlist links are login-gated and show no preview, milestone cards are how PeakStreak shows up in feeds.

**Prompt for AI coding tool:**
"Use Next.js dynamic OG image generation (`ImageResponse`) to render milestone cards at public routes like `/share/streak/:username/:days` and `/share/completed/:enrollmentId`. Cards show the achievement, the user's display name/avatar, and PeakStreak branding, in the dark/lavender brand style. These image routes must be publicly reachable (add to `proxy.ts`, mirroring the existing `/opengraph-image` handling) and must expose no private data beyond the achievement itself. Provide a matching public share page with correct OG meta tags so pasting the link unfurls the card."

**Acceptance criteria:**
- [ ] Milestone image routes render correct, on-brand cards and are publicly reachable.
- [ ] Pasting a share link into X/LinkedIn/WhatsApp unfurls the card.
- [ ] No private data beyond the achievement is exposed.

**Dependencies:** SOC-01 (for username/identity on the card).

---

## GRO-02 — One-Tap Completion Share

**Priority:** Should-have

**Description:**
On the completion and streak-milestone screens, a one-tap "Share" that opens X/LinkedIn with prefilled text and the GRO-01 card link. Capture people at their proudest moment, when they are most likely to post.

**Prompt for AI coding tool:**
"On the completion screen and on streak-milestone moments, add share buttons that open X and LinkedIn intent URLs with prefilled honest text (no buzzwords, no em dashes) and the GRO-01 card URL. Include a copy-link fallback reusing the existing clipboard pattern. Track `milestone_shared` with the platform and milestone type."

**Acceptance criteria:**
- [ ] Share buttons open the correct platform with prefilled text and card link.
- [ ] Copy-link fallback works.
- [ ] `milestone_shared` events recorded with platform and type.

**Dependencies:** GRO-01.

---

## GRO-03 — Referral Loop

**Priority:** Should-have

**Description:**
Give each user an invite link. When a new user signs up through it, reward both sides (a streak freeze is the natural, on-brand reward). Referral is the cheapest paid-feeling growth channel when the product already retains.

**Prompt for AI coding tool:**
"Add a per-user referral code (short, unique) and an invite link `/?ref=CODE`. On signup, if a valid ref cookie/param is present, record the referral (`referrals` table: referrer_id, referred_id, created_at, rewarded_at) and grant both users a reward (e.g. one streak freeze) exactly once, guarded against self-referral and duplicates. Show the user their invite link and referral count in settings. Track `referral_signup`, `referral_rewarded`."

**Acceptance criteria:**
- [ ] A new signup via an invite link is attributed and both parties rewarded once.
- [ ] Self-referral and duplicate rewards are prevented.
- [ ] The user can see their invite link and referral count.

**Dependencies:** SOC-01 (identity), existing streak-freeze mechanic.

---

## GRO-04 — Public Profile SEO

**Priority:** Nice-to-have

**Description:**
Make public profiles indexable so they become organic search surface: proper meta tags, `BlogPosting`-style structured data where relevant, and inclusion in the sitemap. Each public profile is a page Google can rank.

**Prompt for AI coding tool:**
"For public profiles (SOC-01), add per-profile SEO metadata (title, description, canonical), profile structured data (JSON-LD `ProfilePage`/`Person`), and include public profiles in `sitemap.xml` via the existing sitemap generator. Private profiles must never be indexed (noindex) or listed. Ensure `/u/:username` returns 200 while logged out for public profiles."

**Acceptance criteria:**
- [ ] Public profiles have correct meta tags and structured data and appear in the sitemap.
- [ ] Private profiles carry noindex and are excluded from the sitemap.
- [ ] Public profiles load with HTTP 200 while logged out.

**Dependencies:** SOC-01.

---

## GRO-05 — Embeddable Streak Widget

**Priority:** Nice-to-have

**Description:**
A GitHub-README-style SVG badge showing the user's current streak, served from a public endpoint. People embed it in READMEs, portfolios, and Twitter bios, which markets the product passively.

**Prompt for AI coding tool:**
"Create a public endpoint `/api/widget/:username/streak.svg` returning a cacheable SVG badge with the user's current streak in the brand style. Respect profile visibility (private users get a generic 'private' badge or 404). Add the route to `proxy.ts` public API prefixes. Provide copy-paste Markdown and HTML embed snippets in settings. Cache the SVG with a short TTL."

**Acceptance criteria:**
- [ ] The endpoint returns a valid, cacheable SVG for a public user.
- [ ] Private users are not exposed.
- [ ] Settings shows working copy-paste embed snippets.

**Dependencies:** SOC-01.

---

## GRO-06 — Weekly Recap Email

**Priority:** Should-have

**Description:**
A weekly email summarizing the user's week: days studied, videos completed, hours, streak status, and how they compare to their friends. Retention and re-engagement in one, and shareable. Extends the existing daily-reminder infrastructure.

**Prompt for AI coding tool:**
"Add a weekly recap email sent via the existing cron + email infrastructure. Content: days active this week, videos completed, hours learned, current streak, and a friends comparison line if the user follows anyone (SOC-02). Respect existing email preferences and unsubscribe. Include a link to a shareable weekly summary. Track `weekly_recap_sent` and open/click via the existing email logging."

**Acceptance criteria:**
- [ ] Eligible users receive an accurate weekly recap on schedule.
- [ ] Email preferences and unsubscribe are respected.
- [ ] The friends-comparison line appears only when the user follows people.

**Dependencies:** Existing email/cron; SOC-02 for the comparison line.

---

# Pillar D — Revenue / Plus (REV)

> Build last, on purpose. The natural paywall is the AI tutor (the one feature with real marginal cost) plus depth features. Build nothing here until the Phase-2 gate is met and there is evidence people want the paid features.

## REV-01 — Stripe Checkout + Subscription Cache

**Priority:** Must-have (for this pillar)

**Description:**
Payment rails using Stripe Checkout and the customer portal, with a local cache of subscription status kept fresh by webhooks. No custom billing UI. PHASE-2 P2-8 infrastructure.

**Prompt for AI coding tool:**
"Integrate Stripe Checkout and the customer portal. Add `stripe_customers` (user_id, customer_id) and `subscriptions` (user_id, status, current_period_end, price_id) updated via a Stripe webhook handler. Server actions to start checkout and open the portal, guarded by `requireUserId()`. Store keys in the env schema and `.env.example`/`turbo.json` together. Do not build custom billing UI; use Stripe's hosted pages. Handle webhook signature verification and idempotency."

**Acceptance criteria:**
- [ ] A user can subscribe via Stripe Checkout and manage billing via the portal.
- [ ] Webhooks keep the local subscription status accurate, with signature verification and idempotency.
- [ ] No custom billing UI is built.

**Dependencies:** None (but gate applies).

---

## REV-02 — `isPlus` Helper + Feature Gating

**Priority:** Must-have (for this pillar)

**Description:**
A single source of truth for "is this user on a paid plan," plus a clean way to gate features and render upgrade prompts. Everything paid checks this one helper.

**Prompt for AI coding tool:**
"Add `isPlus(userId)` reading the `subscriptions` cache from REV-01 (active or trialing = plus). Provide a server guard and a client hook/component for gated UI that renders an upgrade prompt instead of the feature when the user is free. Ensure gating fails closed (unknown status = free) and never blocks a core v1 action, only paid extras."

**Acceptance criteria:**
- [ ] `isPlus` correctly reflects subscription status and fails closed.
- [ ] Gated features show an upgrade prompt for free users and the real feature for Plus.
- [ ] No core v1 action is ever gated.

**Dependencies:** REV-01.

---

## REV-03 — PeakStreak Plus Tier + Paywall UX

**Priority:** Must-have (for this pillar)

**Description:**
Define what Plus includes, price it, and build the pricing/paywall pages. Free stays genuinely useful (all of v1 plus AI garnish); Plus adds the tutor, deeper stats, and pro exports.

**Prompt for AI coding tool:**
"Build a pricing page and paywall components. Plus includes: AI tutor (AI-06), advanced stats (REV-05), and pro exports (REV-06). Gate those features behind `isPlus` (REV-02). Write honest pricing copy (no buzzwords, no em dashes). Add an upgrade entry point in settings and contextually where gated features are hit. Track `paywall_viewed`, `checkout_started`."

**Acceptance criteria:**
- [ ] The pricing page clearly states what Plus includes.
- [ ] Gated features route free users to the paywall; Plus users get the feature.
- [ ] Upgrade entry points exist in settings and at gated features.

**Dependencies:** REV-01, REV-02, and the features being gated (AI-06, REV-05, REV-06).

---

## REV-04 — Engagement Score

**Priority:** Nice-to-have

**Description:**
A private, informational "deep / normal / skim" indicator per video, from watch behavior. Never punitive: it can never revoke a completion or break a streak. Can be shown free or as a Plus insight. PHASE-2 P2-7. Needs a ToS review before collecting the extra client events.

**Prompt for AI coding tool:**
"Sample seek, playback-rate, and tab-visibility events into a compact per-session payload piggybacked on the existing watch heartbeat (no new endpoint). Nightly job scores each video into `video_progress.engagement_bucket` (deep/normal/skim). Show a gentle, private 3-level indicator on the user's own stats. Hard rule enforced in code: scoring can never mutate `is_completed` or `daily_activity`. Requires a ToS review before shipping the extra event collection."

**Acceptance criteria:**
- [ ] Engagement is scored into a private 3-level indicator from watch behavior.
- [ ] Scoring provably cannot change completion or streak state (test this).
- [ ] The indicator is private to the user.

**Dependencies:** Real usage data; ToS review. Independent of AI tickets.

---

## REV-05 — Advanced Stats / Insights (Plus)

**Priority:** Should-have

**Description:**
A deeper analytics view for the user: learning time by day/week/topic, best focus hours, pace vs. plan, completion trends, and engagement distribution (REV-04). The kind of self-quantified depth committed learners pay for.

**Prompt for AI coding tool:**
"Build an insights page (Plus-gated via REV-02) with charts over the user's own data: learning minutes by day and week, best-performing hours of day, pace vs. target across playlists, completion-rate trend, and engagement-bucket distribution if REV-04 exists. Reuse existing aggregate queries where possible; add efficient new ones where needed. Follow the dataviz guidance for consistent, theme-aware charts. Free users see a locked preview."

**Acceptance criteria:**
- [ ] Plus users see accurate charts over their own learning data.
- [ ] Free users see a locked preview that routes to the paywall.
- [ ] Charts are theme-aware and consistent.

**Dependencies:** REV-02; optionally REV-04.

---

## REV-06 — Pro Exports

**Priority:** Nice-to-have

**Description:**
Let Plus users export their notes and progress in richer formats: full notes as Markdown/PDF per playlist, a portfolio-style "learning log," and structured data (JSON/CSV). The v1 markdown export stays free; pro formats are Plus.

**Prompt for AI coding tool:**
"Extend the existing export with Plus-gated formats: per-playlist notes as PDF, a combined 'learning log' document, and JSON/CSV of progress and notes. Gate via `isPlus` (REV-02); keep the existing free markdown export unchanged. Generate files server-side and stream them. Track `pro_export`."

**Acceptance criteria:**
- [ ] Plus users can export the new formats; the free markdown export is unchanged.
- [ ] Exports contain correct, complete data.
- [ ] Free users hit the paywall for pro formats.

**Dependencies:** REV-02, existing export.

---

## Cross-Cutting Build Notes

- **Identity is the keystone.** SOC-01 (usernames + public profiles) unblocks almost all of SOC, GRO, and the "compare with friends" hooks. Build it first.
- **AI-01 gates all AI.** Nothing in Pillar B starts until the provider chain exists and the launch gate is met.
- **REV is last.** Rails (REV-01) and the helper (REV-02) are cheap, but do not design the paywall until there is a feature worth paying for (AI-06) and demand to prove it.
- **Never fork core logic.** Streaks, activity, enrollment, and clone already exist. Group streaks, review sessions, and shared goals must reuse them, not reimplement them.
- **Privacy is a feature.** Public surfaces (profiles, widgets, OG cards) expose only what the user opted into. Notes are private and only leave the app to AI providers listed in the privacy policy.

---

# ✅ Done

*Newest on top — move each shipped ticket's full section here as it lands, so the pillars above stay focused on what's next. Build details live in `feature-tickets.md`.*

**Pillar A — Social Accountability (SOC): complete (SOC-01 → SOC-08).**

## SOC-07 — Group Shared Goal + Group Streak

**Priority:** Should-have

**Description:**
A group can adopt a shared playlist as its goal. The group page then shows collective progress and a group streak that stays alive as long as enough members study each day. Shared goals turn a group from a list of names into a team.

**Prompt for AI coding tool:**
"Let a group owner attach a playlist as the group goal (clone-per-member using the existing Share Playlist clone action so each member gets their own editable copy and progress). On the group page, show collective progress (average or total completion across members) and a 'group streak': the number of consecutive days at least K members studied (make K configurable, default 1). Compute the group streak from existing `daily_activity`, not a new tracking system. Show each member's individual progress on the shared goal."

**Acceptance criteria:**
- [x] An owner can set a group goal and each member gets their own clone to track.
- [x] The group page shows collective progress and each member's individual progress.
- [x] The group streak is computed correctly from daily activity and the K threshold.
- [x] Group streak survives if the threshold is met, breaks if it is not.

**Dependencies:** SOC-06, Share Playlist clone (shipped).

---

## SOC-06 — Study Groups

**Priority:** Should-have

**Description:**
Let users create and join small study groups with a shared name and a member list. A group has a public-ish page showing members and their streaks. This is the container that group goals and group streaks (SOC-07) hang off.

**Prompt for AI coding tool:**
"Create `study_groups` (id, name, slug, description, owner_id, created_at) and `group_members` (group_id, user_id, role owner/member, joined_at). Build create-group, a shareable join link (`/g/:slug/join`, reuse the alias pattern from Share Playlist), join, leave, and an owner-only remove-member. Group page at `/g/:slug` lists members with their current streaks and studied-today status. Cap group size (e.g. 20) for v1. Add `/g/` to `proxy.ts` if the group page should be viewable pre-join. Track `group_created`, `group_joined`, `group_left`."

**Acceptance criteria:**
- [x] A user can create a group, share a join link, and others can join and leave.
- [x] The group page lists members with accurate streaks and today-status.
- [x] Owner can remove members; non-owners cannot.
- [x] Group size cap is enforced.

**Dependencies:** SOC-01.

---

## SOC-05 — Accountability Partner (Study Buddy)

**Priority:** Should-have

**Description:**
Let two users pair up as accountability partners. Each sees the other's daily status (studied today or not, current streak) front and center on the dashboard, and can send a one-tap nudge. One focused partner beats a crowd for accountability.

**Prompt for AI coding tool:**
"Build a mutual accountability-partner pairing on top of the follow system. Add a `partner_requests` flow (request, accept, decline) and a `partnerships` table (exactly one active partner per user for v1; reject a second active pairing with a clear message). On the dashboard, show a partner card: partner's name, whether they studied today, their current streak, and a 'Send a nudge' button. Reuse the nudge mechanic from SOC-08. Allow ending a partnership. Track `partner_requested`, `partner_accepted`, `partner_ended`."

**Acceptance criteria:**
- [x] A user can request, accept, decline, and end a partnership.
- [x] Only one active partner per user; a second attempt is rejected clearly.
- [x] The dashboard partner card shows accurate today-status and streak.
- [x] The nudge button works and reuses SOC-08.

**Dependencies:** SOC-02, SOC-08.

---

## SOC-08 — Nudge / Encouragement

**Priority:** Should-have

**Description:**
Let a user send a one-tap encouragement to a friend, partner, or group member, especially someone whose streak is about to cool down. Delivered in-app and optionally by email. Small, human, and a strong re-engagement trigger.

**Prompt for AI coding tool:**
"Add a `nudges` table (from_user, to_user, kind, created_at) and a server action `sendNudge(toUserId, kind)` guarded by `requireUserId()`, rate-limited per sender-recipient pair per day using the existing `lib/rate-limit.ts`. Deliver an in-app notification and, if the recipient has reminder emails enabled, a short email reusing the existing email infrastructure. Prewritten friendly messages only for v1 (no free text, avoids moderation). Surface a 'nudge' button wherever a friend appears (feed, leaderboard, partner card). Track `nudge_sent`."

**Acceptance criteria:**
- [x] A user can nudge a friend and the recipient sees it in-app.
- [x] Email is sent only if the recipient opted into reminder emails.
- [x] Rate limiting prevents spam between the same pair.
- [x] No free-text input in v1.

**Dependencies:** SOC-02, existing email + rate-limit infrastructure.

---

## SOC-04 — Friends Leaderboard

**Priority:** Should-have

**Description:**
Extend the existing global leaderboard with a "Friends" tab that ranks only the people you follow (plus you). A global leaderboard is intimidating and impersonal; ranking against people you know is the accountability sweet spot.

**Prompt for AI coding tool:**
"Add a 'Friends' tab to the existing leaderboard page. It ranks the current user and everyone they follow by the same metric the global board uses (streak or weekly learning time, match the existing board). Reuse the existing leaderboard query and ranking logic, filtered to the follow graph. Highlight the current user's row. Empty or near-empty state when the user follows fewer than 2 people, nudging them to follow more."

**Acceptance criteria:**
- [x] The Friends tab ranks only followed users plus the current user, by the existing metric.
- [x] The current user's row is visually highlighted.
- [x] Ranking logic is shared with the global board, not duplicated.
- [x] Sensible empty state when the friend set is too small to rank.

**Dependencies:** SOC-02, existing leaderboard.

---

## SOC-03 — Friend Activity Feed

**Priority:** Must-have

**Description:**
A feed on the dashboard showing what the people you follow are doing: who studied today, who extended a streak, who completed a playlist, who started a new one. This is the payoff of following someone. It makes the app feel alive and creates gentle social pressure.

**Prompt for AI coding tool:**
"Build an activity feed of the people the current user follows. Derive events from existing data where possible (daily activity for 'studied today', enrollment completion for 'finished a playlist', enrollment creation for 'started a playlist', streak milestones). Render a compact feed on the dashboard: avatar, name, action, playlist name, relative time. Keep it read-only for v1. Paginate or cap to the most recent 30 items. If the user follows nobody, show an empty state prompting them to find people to follow. Query must be efficient: one round trip with a join on `follows`, not N queries per followee."

**Acceptance criteria:**
- [x] The feed shows recent activity only from people the user follows, most recent first.
- [x] Each item links to the relevant profile and playlist where applicable.
- [x] Empty state appears when the user follows nobody.
- [x] The feed loads in a single efficient query, not one per followee.

**Dependencies:** SOC-02.

---

## SOC-02 — Follow System

**Priority:** Must-have

**Description:**
Let users follow each other. Following is one-directional (like Twitter), which is simpler than mutual friend requests and still powers the activity feed and friends leaderboard. Show follower and following counts on the profile.

**Prompt for AI coding tool:**
"Create a `follows` table (`follower_id`, `followee_id`, `created_at`, primary key on the pair, both FK to users with cascade delete). Add server actions `followUser(username)` and `unfollowUser(username)` guarded by `requireUserId()`, rejecting self-follow. On the `/u/:username` profile, show a Follow/Unfollow button (hidden on your own profile) and live follower/following counts. Add a `/u/:username/followers` and `/u/:username/following` list. Track `user_followed` events."

**Acceptance criteria:**
- [x] A user can follow and unfollow another user; the state persists and the button reflects it.
- [x] Self-follow is rejected.
- [x] Follower and following counts are accurate and update immediately.
- [x] Follower and following lists render and link to profiles.

**Dependencies:** SOC-01.

*Note: later pivoted to private-by-default follow requests — see `feature-tickets.md`.*

---

## SOC-01 — Usernames + Public Profile Page

**Priority:** Must-have

**Description:**
Give each user a claimable unique username and a public profile at `/u/:username` that shows their learning identity: display name, avatar, bio, current streak, longest streak, playlists completed, total learning hours, and a public version of the contribution graph. This is the foundation for every other social and growth feature. Profiles are private by default; the user opts in to make theirs public.

**Prompt for AI coding tool:**
"Add a `username` (unique, nullable), `bio`, and `profileVisibility` (enum `private`/`public`, default `private`) to the `users` table via a Drizzle migration. Build a settings section where a logged-in user claims a unique username (validate: 3 to 30 chars, lowercase alphanumeric plus hyphen, reject reserved words and duplicates) and toggles visibility. Create a route `/u/:username` that renders a read-only profile from existing data: current streak, longest streak, count of completed playlists, total learning hours (sum of watched seconds), and a read-only contribution graph reusing the existing graph component. If the profile is private or the username does not exist, show a clean 'profile not found' state. Add `/u/` handling to `proxy.ts` so public profiles are reachable while logged out, but return the not-found state for private ones without leaking any data."

**Acceptance criteria:**
- [x] A user can claim a unique username and it is enforced unique at the database level.
- [x] `/u/:username` renders the correct public stats for a public profile.
- [x] A private profile (or unknown username) shows a friendly not-found state and exposes no private data, even to logged-out visitors.
- [x] The contribution graph renders read-only with no interactive controls.

**Dependencies:** None (uses existing streak, activity, and completion data).

---

*End of document. This is a living backlog. Reprioritize as real usage data comes in, the Phase-2 gate is the honest arbiter of when Pillars B and D begin.*
