# Product Requirements Document
## Project Codename: "PeakStreak" (working title)

**Author:** Product Team
**Status:** Draft v1.0
**Last Updated:** July 2026

---

## 1. Executive Summary

PeakStreak is a learning-accountability dashboard for people who use YouTube playlists as a self-study tool (courses, tutorials, lecture series). The user pastes a YouTube playlist link, the app tells them how long it will realistically take to finish, and then keeps them coming back every day — through streaks, email nudges, and progress visualization — until they complete it.

This is fundamentally a **habit and accountability product** wrapped around a **video-consumption tracker**. The playlist estimation is the hook that gets someone to sign up; the streak/reminder/notes system is what makes them stay.

---

## 2. Problem Statement

People save YouTube playlists ("100 Days of Code," a full ML course, a language-learning series) with real intent to finish them — and then stop after video 3, often without noticing. There is no:

- Sense of *how much time commitment* they're actually signing up for.
- External accountability loop reminding them to come back.
- Visible, motivating record of progress (unlike GitHub streaks, Duolingo streaks, gym trackers).
- Way to tell the difference between "I watched this" and "I actually learned this" (skimming vs. real engagement).

**Core insight:** YouTube is built for *discovery and watch-time*, not for *completion of a learning goal*. This product exists to fill that gap.

---

## 3. Target Users

**Primary persona — "The Serial Bookmarker"**
Self-directed learners (students, early-career developers, competitive exam aspirants, upskillers) who consume long-form educational playlists but have a track record of abandoning them 20–30% through.

**Secondary persona — "The Structured Learner"**
People doing a bootcamp-style self-paced course who want a lightweight LMS-like layer on top of free YouTube content, including notes and progress tracking.

**Not the target user (for v1):** Casual entertainment viewers, people who want social/community learning features, teams/cohorts.

---

## 4. Goals & Non-Goals

**Goals for v1**
- Make it trivially easy to see "how long will this playlist actually take me."
- Get users into a daily-return habit loop within their first week.
- Give users a private record of what they've learned (notes) so the effort compounds.

**Non-Goals for v1**
- Building a social/community layer (leaderboards, sharing, cohorts).
- Replacing YouTube's player with a custom video experience.
- Being a full LMS (quizzes, certificates, grading).
- Monetization optimization — payments exist only as a placeholder, not a growth lever, in v1.

---

## 5. Core Features: Must-Have vs. Nice-to-Have

I've regrouped your 7 ideas by build complexity and habit-loop importance, not just by the order you listed them. A couple of notes are called out below the table because they need product decisions, not just engineering.

| # | Feature | Classification | Why |
|---|---------|-----------------|-----|
| 1 | Paste playlist → get length, estimated finish time (adjusted for user's chosen speed) | **Must-have (P0)** | This is the core value prop and acquisition hook. Nothing else matters if this isn't fast and accurate. |
| 2 | Daily email reminder | **Must-have (P0)** | Cheapest, highest-leverage retention mechanic. Low engineering cost (cron + email service) relative to impact. |
| 3 | Streak system with daily reset logic | **Must-have (P0)** | This is the emotional core of the habit loop — see Section 5.1 for a scoped-down version of your spec. |
| 4 | Notes per lecture/video | **Must-have (P1)** | Simple CRUD feature, but it's what makes users treat this as "my learning tool" rather than a glorified timer. |
| 5 | Contribution graph (GitHub-style activity heatmap) | **Should-have (P1)** | High motivational value for relatively low engineering cost — mostly a visualization on top of data you're already capturing for the streak. |
| 6 | Skim/engagement detection ("did they actually watch it") | **Nice-to-have / Phase 2** | Conceptually great, technically the hardest and most fragile item on this list. See Section 5.2 — I'd explicitly cut this from v1. |
| 7 | AI guidance (open-source LLM) if user is confused | **Nice-to-have / Phase 2** | Valuable but scope-creeps fast (needs transcript access, RAG over lecture content, moderation). Ship it once the core loop is proven. |
| 8 | Payments / credits system | **Not in v1** | You said this yourself — "can come later." Don't build billing infra before you have retained users to charge. |

### 5.1 Streak system — scoped for v1

Your spec ("streaks cool down at 5 AM/PM IST, light up when a video is completed") is good instinct but needs two decisions before engineering can build it:

- **Reset time:** You wrote "5 PM" in one place and "early morning" in another — pick one. I'd recommend a **fixed local reset at midnight or a personal "day boundary" the user sets** (Duolingo uses a rolling 24h+grace window, not a fixed clock time, precisely to handle people in different timezones and late-night sessions). Recommend: streak day = midnight IST to midnight IST for v1 simplicity, with a grace-period buffer (see below) rather than a hard 5 AM/PM cliff.
- **What counts as "one video":** Full playback duration watched (see engagement problem in 5.2), or just marked-as-done? For v1, **user-marked-complete + minimum watch-time threshold** (e.g., 80% of duration, tracked via YouTube IFrame Player API `getCurrentTime()`) is the pragmatic middle ground — accurate enough, buildable in v1, doesn't require the harder skim-detection system.
- **Streak freeze:** Duolingo's biggest lesson — one missed day permanently killing a 40-day streak is a huge churn trigger. Recommend a "streak freeze" (1 free grace day per week) from day one.

### 5.2 Why "skim detection" is a Phase 2 item, not v1

Detecting whether someone is *actually* absorbing a lecture (vs. speed-skimming) is a genuinely hard problem, and I'd push back on building it now:

- YouTube's embedded IFrame Player API gives you play/pause/seek/playback-rate events and current timestamp — it does **not** give you eye-tracking, tab-focus-only-as-proxy, or comprehension data. The best you can do in v1 is *behavioral proxies* (seek-skipping, playback speed, whether the tab was focused).
- Any proxy you ship will have false positives (someone genuinely reviewing at 2x speed because they already know the material) — this can feel punitive/annoying, which is exactly the opposite of what a habit product wants.
- Recommendation: ship the **simple version** in v1 — just watch-time-based completion — and revisit an "engagement score" once you have real usage data on how people actually watch.

---

## 6. User Flow (End to End)

1. **Landing / Sign up** — user signs up (email or Google OAuth — Google OAuth also conveniently gives you YouTube API access for playlist metadata).
2. **Paste playlist link** — user pastes a YouTube playlist URL.
3. **Instant estimate screen** — app fetches playlist via YouTube Data API, shows: total videos, total runtime, and an estimated finish date based on either (a) a default pace or (b) a pace the user selects ("I can do 30 min/day" / "1 video/day" / custom).
4. **Playlist added to dashboard** — shows as a card with progress bar (0/42 videos), estimated completion date, and "Continue" button.
5. **Watching a video** — user clicks "Continue," gets a lightweight in-app view: embedded YouTube player + a notes panel beside it (per-video notes, autosaved).
6. **Marking progress** — once watch-time threshold is hit (or user manually marks complete), that video is checked off, streak flame lights up for the day, contribution graph cell fills in for today.
7. **Daily reminder loop** — if the user hasn't watched anything by a set time in the evening (their local time), they get an email: "Your streak is about to cool down 🔥 — pick up where you left off in [Playlist Name]."
8. **Return visit** — dashboard shows streak count, days remaining at current pace, and next unwatched video pre-queued so there's zero friction to resume.
9. **Playlist completion** — completion screen with total time invested, notes exported as a summary doc, and a nudge to start the next playlist.

---

## 7. MVP Definition

The MVP is the smallest version that proves the core loop: **estimate → commit → daily nudge → streak → completion.**

**In MVP:**
- Paste playlist → fetch metadata → time estimate (Feature 1)
- Dashboard with active playlists + progress
- Watch-time-based video completion tracking
- Streak system with freeze/grace logic (Feature 3, scoped per 5.1)
- Daily email reminder (Feature 2)
- Per-video notes (Feature 4)
- Contribution/activity graph (Feature 5)

**Explicitly out of MVP** (see Section 9 for full reasoning):
- Skim/engagement detection beyond basic watch-time
- AI guidance / LLM tutor
- Payments/credits
- Any social features

This MVP is deliberately narrow: it's a complete, usable product on its own (someone could genuinely use just this and get value), not a stripped demo.

---

## 8. Success Metrics

| Category | Metric | Why it matters |
|---|---|---|
| **Activation** | % of signups who paste a playlist within first session | Tests whether the core value prop lands immediately |
| **Habit formation** | Day 7 retention / % of users with a streak ≥ 3 days | This *is* the product — if streaks don't form, the product hasn't found its loop |
| **Reminder effectiveness** | Email open rate + % of "streak saves" (user returns *because of* the reminder, e.g. within 2 hrs of email) | Tells you if the reminder mechanic is actually doing its job vs. just being noise |
| **Core outcome** | Playlist completion rate (% of added playlists eventually finished) | The actual promise of the product — did we help people finish what they started |
| **Engagement depth** | Notes created per active user | Signals whether people are using this as a real study tool vs. a passive tracker |
| **Long-term health** | 30-day retention, churn after first missed streak | Streak-based products live or die on how gracefully they handle failure — watch this closely |

Vanity metrics to explicitly *ignore* early on: total signups, total playlists added (without completion follow-through), raw DAU without retention context.

---

## 9. What We Are Deliberately NOT Building in v1

Being explicit about this now will save you from scope creep later:

1. **AI tutor / lecture guidance** — Needs transcript ingestion, a RAG pipeline over lecture content, and content moderation for an open-source model's outputs. High cost, high risk, unproven demand — validate the core loop first.
2. **Skim/attention detection beyond basic watch-time** — Technically fragile and risks feeling punitive to genuine learners (see 5.2).
3. **Payments, credits, or any monetization infrastructure** — Don't build billing before you have users worth charging.
4. **Social features** — no leaderboards, friend streaks, sharing, or public profiles. These add real complexity (privacy, moderation, growth-loop design) unrelated to the core "finish your playlist" promise.
5. **Multi-platform video support** (Vimeo, Coursera, etc.) — YouTube-only for v1; the YouTube Data API and IFrame Player API integration is already a full workstream on its own.
6. **Native mobile apps** — a responsive web app is sufficient to validate the loop; native apps are a retention investment for *after* you know the loop works.
7. **Custom video player replacing YouTube's** — legally and technically unnecessary; embed the official player.

---

## 10. Open Questions / Risks

- **YouTube API quota limits** — the Data API has daily quota caps; at scale, fetching playlist metadata and durations repeatedly needs caching design from day one.
- **YouTube ToS on tracking watch behavior** — worth a legal/ToS review before building anything beyond the standard IFrame Player API events.
- **Email deliverability** — "mandatory daily email" at scale needs a real transactional email provider (e.g., Postmark, SES) and unsubscribe/frequency-capping thought, or you'll get flagged as spam and hurt your own open rates.
- **Streak reset time zone handling** — needs a clear decision (see 5.1) before engineering starts, since this is easy to get wrong and hard to migrate later without frustrating early users.

---

*End of document.*