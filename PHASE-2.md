# PeakStreak — Phase 2: Investigation & Implementation Plan

**Status:** Draft v1.0 (investigation complete, implementation not started)
**Scope:** Everything the PRD deliberately deferred from v1 — AI features (PRD §5 Feature 7 / PS-16), engagement scoring (PRD §5.2 / PS-15), payments (PS-17) — plus the AI provider strategy investigation that motivated this document.
**Prerequisite:** v1 deployed and the launch gate below is met. Do not start Phase 2 work before the gate — that rule comes from the PRD and it is correct.

---

## 1. The Gate — when Phase 2 starts

Phase 2 exists to deepen a loop that already retains. If the loop doesn't retain, AI/payments polish a product nobody returns to. All numbers come from queries that already exist in `apps/web/docs/analytics.md`.

| Signal | Threshold to unlock Phase 2 | Query source |
|---|---|---|
| D7 retention | ≥ 20% of signups active on day 7 | analytics.md §D7 |
| Streak formation | ≥ 25% of activated users reach a 3-day streak | analytics.md §streak≥3 |
| Notes usage | ≥ 30% of active users have written ≥ 1 note | analytics.md §notes-per-user |
| Scale sanity | ≥ 50 real signups (not friends-and-family only) | `events` table |

Notes usage matters most for the AI plan specifically: every AI feature below is built **on top of the user's own notes**. If nobody writes notes, build note-taking motivation first, not AI.

---

## 2. Investigation A — AI provider strategy (the "multiple agents, ek gaya toh dusra" question)

### 2.1 Terminology decision

What was asked for ("if one goes down, another takes over") is **provider failover**, not a multi-agent system. Every Phase 2 AI feature except the tutor is a *single prompt → single response* call. Verdict:

- **No agent framework** (smolagents, LangChain, CrewAI) for summarize/suggest/explain features. A framework adds a dependency tree and abstraction tax to what is one `fetch()` call.
- **Reconsider only for the tutor (P2-6)** *if* it turns out to need multi-step tool use (search notes → fetch metadata → answer). Even then, a hand-rolled loop over 2–3 tools is likely enough. Decision deferred to P2-6 kickoff.

### 2.2 Provider options evaluated

| Option | Cost | Quality | Reliability | Verdict |
|---|---|---|---|---|
| **Groq** (Llama 3.3 70B / Llama 4) | Free tier, generous RPM | Good for summaries | Occasional 429s at peak | **Primary** |
| **Google Gemini Flash** | Free tier (per-day quota) | Good | Solid | **Fallback #1** |
| **Hugging Face Inference Providers** | Small free monthly credits | Varies by model | Cold starts, slower | **Fallback #2** |
| **OpenRouter `:free` models** | Free (rotating set) | Varies | One key → many models; is itself a fallback layer | Alternative to the whole chain — evaluate at build time |
| **Anthropic Claude Haiku / OpenAI mini** | Paid (~$0.25–1.00 /M tokens) | Best | Best | **Switch-to when revenue or >~200 DAU** |
| **Self-host (HF TGI / Ollama on a VPS)** | $20–50/mo fixed + ops | Model-dependent | Our problem to keep alive | **Rejected for now** — fixed cost + ops burden before revenue is the wrong order |

### 2.3 Architecture decision: one client, N providers

All shortlisted providers speak the **OpenAI-compatible chat completions API**. So the whole strategy collapses into a small module:

```
lib/ai.ts
  PROVIDERS = [
    { name: "groq",   baseUrl: "https://api.groq.com/openai/v1",                        model: "llama-3.3-70b-versatile", keyEnv: "GROQ_API_KEY" },
    { name: "gemini", baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", model: "gemini-2.0-flash",       keyEnv: "GEMINI_API_KEY" },
    { name: "hf",     baseUrl: "https://router.huggingface.co/v1",                       model: "<pick at build time>",    keyEnv: "HF_TOKEN" },
  ]
  complete(prompt, opts): try each configured provider in order;
    on 429/5xx/timeout → next; all fail → return null (NEVER throw into product code)
```

Design rules (these follow patterns already established in v1):

1. **Feature-gating by env, like Google OAuth today:** a provider with no key in env simply isn't in the chain; zero keys = every AI feature invisible. No crash, no half-rendered UI (same pattern as `googleOAuthEnabled()` in `lib/env.ts`).
2. **AI is garnish, never load-bearing:** no AI call may sit between the user and a core action (completion, streak, notes save). All AI output is additive UI that hides on `null`.
3. **Observability from day one:** log `{provider, latencyMs, ok}` per call and `track("ai_call", …)` into the existing `events` table so provider flakiness is measurable before users complain.
4. **Timeouts are short (≤10s) and one retry max per provider** — the chain itself is the retry strategy.
5. **Privacy:** notes are private user data (PS-9 guarantee). Prompts containing note text go only to providers listed in the privacy policy; add a settings toggle "AI features" (default ON, but visible) at P2-2.

### 2.4 Cost model (why free tiers are enough to start)

Feature-level token math, assuming Llama-70B-class models:

| Feature | Calls/user/day (est.) | Tokens/call | Free-tier fit |
|---|---|---|---|
| Notes summarizer | ~0.05 (only on playlist completion) | 2–6k in, ~500 out | Trivial |
| Pace suggestion | ~0.2 (only on new enrollment) | ~300 in, ~100 out | Trivial |
| Explain-this-note | ~0.5 | ~500 in, ~400 out | Fine |
| Tutor (P2-6) | 2–10 | 3–8k in, ~800 out | **This is the one that breaks free tiers** — needs paid or revenue gate |

Conclusion: P2-1…P2-4 run indefinitely on free tiers for early scale. The tutor is the feature that should be **paid-plan-gated** (which is also the natural PS-17 hook).

---

## 3. Investigation B — transcripts & RAG (the hard truth about the tutor)

### 3.1 Transcript access is the tutor's real blocker, not the LLM

- The **official YouTube captions API requires OAuth from the video owner** — useless for third-party lecture playlists.
- Scraping `timedtext`/innertube endpoints for captions is **against YouTube ToS** (PRD §10 flagged exactly this; ARCHITECTURE §2.6 says "never proxy or download video/transcript content"). Popular libraries that do this get IP-blocked routinely. Building a core feature on a ToS violation is an existential product risk, not a shortcut.

**Decision: the v1 tutor does NOT use transcripts.** Its context is what we legitimately have:
1. The user's own `note_entries` for the video/playlist (timestamped — genuinely rich context),
2. Video title/position/duration + playlist title/channel (our cached metadata),
3. The user's question.

That's a "study buddy that has read your notes," which is honest, legal, and still useful. Transcript-powered answers become possible later only via (a) a formal ToS/legal review concluding otherwise, or (b) user-pasted context ("paste the part you're confused about").

### 3.2 RAG stack (when needed)

For per-video Q&A, plain prompting with that video's notes fits in context — **no vector store needed initially**. RAG becomes relevant only for cross-playlist "what did I learn about X?" search:

- **pgvector on the existing Postgres** (Neon supports it natively) — one `embeddings` column/table over `note_entries`, cosine similarity, done. **Chosen.**
- Dedicated vector DBs (Pinecone/Qdrant/Chroma) — rejected: new infra + new bill for < 100k rows of notes is unjustifiable.
- Embeddings via free tiers (Gemini `text-embedding-004` free tier, or HF models) through the same `lib/ai.ts` provider-chain pattern.

---

## 4. Investigation C — PS-15 engagement score (brief)

Most raw data is **already captured** in v1: `video_progress.seconds_watched` (wall-clock genuine watch time), `furthest_position_seconds`, `completed_manually`, per-day `daily_activity.seconds_watched`. Missing: seek-frequency and playback-rate distribution, which need a small client event stream.

Guardrail (already decided in TICKETS): the score is **informational and private, never punitive** — it can never revoke completions or break streaks. Formula proposal (tune against real data): `score = f(watch_ratio, seek_density, rate_profile, tab_visibility)` shown as a gentle 3-level indicator ("deep / normal / skim") on the user's own stats only. Requires the ToS review noted in PRD §10 before shipping the extra event collection.

## 5. Investigation D — PS-17 payments (brief)

- **Stripe Checkout + customer portal** (not custom billing UI). One `stripe_customers` table (user_id ↔ customer_id) + `subscriptions` status cache via webhook.
- Natural paywall found by this investigation: **the AI tutor** (the one feature whose marginal cost is real). Free: everything in v1 + AI garnish features. Paid ("PeakStreak Plus"): tutor + maybe longer history/exports.
- Build **nothing** until the gate in §1 *plus* evidence people ask for the tutor.

---

## 6. Implementation Plan — Phase 2 tickets (execute in this order)

Dependencies flow downward; each ticket is shippable alone. Estimates assume the current codebase conventions (lib-module + route-handler + tests, per v1).

### P2-1: `lib/ai.ts` — provider chain foundation
**Effort:** ~half day. **Deps:** none.
- Ordered provider chain (Groq → Gemini → HF) per §2.3; OpenAI-compatible `complete()` with zod-validated env keys (`GROQ_API_KEY`, `GEMINI_API_KEY`, `HF_TOKEN` — all optional, added to `.env.example` + `turbo.json` `globalEnv` **at the same time**, we've been burned by that once).
- `aiEnabled()` helper mirroring `googleOAuthEnabled()`.
- `track("ai_call")` events with provider/latency/outcome; unit tests with a fake fetch: fallback on 429, fallback on timeout, all-fail → null.
- **Acceptance:** killing provider N's key at runtime degrades to N+1 with no user-visible error; zero keys hides all AI UI.

### P2-2: Notes summarizer — "Your key takeaways" on the completion screen
**Effort:** ~half day. **Deps:** P2-1.
- On `/completed/[enrollmentId]`: server action pulls the user's `note_entries` for the enrollment (via existing `getPlaylistNotes`), prompts for a structured summary (key concepts, per-video one-liners), renders under the stats grid; cache result in a `summary` column or KV-style table so it's generated once.
- Add the summary section to the existing markdown export.
- Settings toggle "AI features" lands here (default on, visible, honest).
- **Acceptance:** completion screen with ≥3 notes shows takeaways within ~8s; no notes → section absent; AI failure → section absent, page otherwise perfect.

### P2-3: Smart pace suggestion on the estimate screen
**Effort:** ~2–3 hours. **Deps:** P2-1.
- One call with playlist title/channel/count/runtime → suggested pace + one-line reasoning ("Dense DSA course — 30 min/day sticks better than 2 videos/day"). Renders as a dismissible hint above the pace picker; **never auto-selects** (pace choice stays the user's commitment moment).
- **Acceptance:** suggestion appears < 3s after estimate; picker works identically with AI off.

### P2-4: "Explain this" on note entries
**Effort:** ~3–4 hours. **Deps:** P2-1.
- Button per note entry in the watch view feed → prompt = note text + video/playlist titles → plain-language explanation in a popover. Rate-limit per user/day (simple `events` count check) to protect free tiers.
- **Acceptance:** works offline-gracefully; rate limit returns a friendly "come back tomorrow" state.

### P2-5: pgvector + note embeddings (RAG foundation)
**Effort:** ~1 day. **Deps:** P2-1; Neon pgvector extension.
- Migration: enable `vector`, add `note_entry_embeddings` (entry_id PK/FK, embedding vector, model tag). Backfill job + on-save embedding via provider chain. Similarity search helper in `lib/ai-search.ts` with tests.
- **Acceptance:** "find my notes about X" query returns relevant entries across playlists in <500ms for 10k notes.

### P2-6: The tutor (PS-16, scoped per §3.1 — notes-based, no transcripts)
**Effort:** ~3–4 days. **Deps:** P2-1, P2-5; the §1 gate genuinely met; paid provider key OR PS-17 gating decided.
- Watch-view side panel "Ask about this lecture": context = current video's notes + neighbors (P2-5 retrieval) + metadata. Streaming responses; conversation NOT persisted in v1 of the tutor (privacy-simple, cheaper). Output moderation: system-prompt constraints + provider safety settings; log `ai_tutor_asked` events.
- Explicit UI honesty: "Answers are based on your notes and the video's metadata — I haven't watched the video."
- **Acceptance:** answers grounded in the user's actual notes (spot-check eval set of 20 Q&As); degradation path when AI unavailable; cost per active tutor-user measured via events before widening access.

### P2-7: Engagement score (PS-15)
**Effort:** ~2 days + a ToS review *before* starting. **Deps:** real usage data; independent of AI tickets.
- Client: sample seek/rate/visibility events into a compact per-session payload piggybacked on existing heartbeats (no new endpoint). Server: nightly scoring into a `video_progress.engagement_bucket`. UI: private, gentle, 3-level. **Hard rule enforced in code:** scoring can never mutate `is_completed` or `daily_activity`.

### P2-8: Payments (PS-17)
**Effort:** ~2–3 days. **Deps:** tutor demand proven (e.g., `ai_tutor_asked` events from >30% of WAU or a waitlist).
- Stripe Checkout + webhook → `subscriptions` cache table; `isPlus(userId)` helper; tutor behind it. No custom billing UI.

---

## 7. Risks & open questions

| Risk | Mitigation |
|---|---|
| Free-tier rate limits hit as users grow | Fallback chain + per-user daily caps (P2-4 pattern) + events-based monitoring → switch tutor to paid key when P2-8 lands |
| Notes (private data) sent to third-party LLMs | Settings toggle, privacy policy update at P2-2, provider list documented; never send email/name in prompts — ids only alongside note text |
| Transcript temptation | §3.1 decision is binding until a legal/ToS review says otherwise. Do not "just use" a transcript-scraping library. |
| AI slop cheapens the product voice | All AI surfaces are opt-in-visible, clearly labeled, and deletable; completion summary is cached & editable later if users want |
| Model deprecations (free models rotate often) | Model names live in env/config, not code; `ai_call` events surface failures within a day |

**Open questions to resolve at P2-1 kickoff:** final model pick per provider (check current free-tier lineup — it shifts monthly); OpenRouter-instead-of-hand-rolled-chain (one dependency vs. one fewer account); whether Vercel Hobby's function timeout (10s default, 60s max config) forces streaming for the summarizer.

---

## 8. Success metrics for Phase 2 (add to docs/analytics.md when built)

- **Summary engagement:** % of completion screens where takeaways are expanded/exported.
- **Tutor pull:** `ai_tutor_asked` per active user; repeat-usage rate (asked on ≥3 distinct days).
- **Provider health:** fallback rate per provider per day (from `ai_call` events).
- **Score sanity (PS-15):** distribution of engagement buckets vs. completion rate — if "skim" correlates with *higher* completion, the formula is wrong, not the users.
- **Conversion (PS-17):** tutor-paywall view → checkout rate.

---

*End of document. Written 2026-07-05; free-tier limits and model names WILL have drifted by build time — re-verify §2.2 and §2.4 before starting P2-1.*
