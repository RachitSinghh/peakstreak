# Blog Playbook

**Status:** Binding convention. Every blog post written for PeakStreak, in any session, follows this document. Do not deviate without the owner (Rachit) explicitly changing it here first.

This playbook exists because the first three posts (`content/blog/*.md`) were written to a specific standard and with a specific SEO method, and that standard must repeat. When asked to write or edit a blog post, read this file first and treat it as the spec.

The three reference posts, written to this bar, are:

- `apps/web/content/blog/how-to-finish-a-youtube-playlist-course.md` (informational)
- `apps/web/content/blog/how-long-does-it-take-to-finish-a-youtube-playlist.md` (transactional)
- `apps/web/content/blog/best-youtube-playlist-progress-trackers.md` (commercial)

Match their voice, depth, and structure. When in doubt, open one and copy the pattern.

---

## Part 1 — Writing rules (non-negotiable)

### Strictly avoid

- **Em dashes.** None. Use a period, a comma, or restructure the sentence.
- **Excessive colons.** A colon to introduce a list is fine occasionally. Do not put a colon in every heading or use them to stitch clauses.
- **Unnecessary parentheses.** If an aside matters, make it a sentence. If it does not, cut it.
- **Generic AI phrasing.** No "in today's world", "let's dive in", "it's important to note", "unlock", "game-changer", "when it comes to", "the world of".
- **Surface-level explanations.** Do not restate the obvious. Assume the reader is technically capable.
- **Marketing buzzwords.** No "leverage", "seamless", "supercharge", "revolutionary", "highest-leverage", "effortless", "powerful".
- **Filler.** Every sentence must carry information. Delete anything that only sets up the next sentence.
- **Repetitive sentence patterns.** Vary length and structure. Do not open three paragraphs in a row the same way.
- **Overexplaining basics.** Link out or assume knowledge instead of teaching first principles the audience already has.
- **Robotic transitions.** No "furthermore", "moreover", "in conclusion", "as we can see".

### Before writing

- Analyze the topic from both the **engineering** and the **business** perspective.
- Focus on **implementation realities** and **technical decision-making**, not theory.
- Include practical engineering insight where relevant (how the API actually behaves, real constraints, real trade-offs).
- Assume the audience is **technically experienced**. Write so it stays credible to engineers, CTOs, and technical leaders.

### During writing

- **Lead with the answer.** State the takeaway in the first paragraph, then expand with supporting context. Do not bury the conclusion.
- **Explain trade-offs, not one "best" solution.** Present the options and the cost of each. Recommend, but show the reasoning.
- Use **concrete examples, workflows, and implementation details.** Numbers, code, real tool names.
- Include **semantic entities and related concepts naturally.** Do not force keywords. Name the real things (APIs, formats, competing tools, techniques) that a topic authority would name.
- Optimize for **topical completeness**, not keyword density.
- Write so **AI search engines can extract a concise answer** (clear question-shaped headings, direct first sentences) while the article stays valuable to a human reader.
- **Support claims with evidence or reasoning.** If you cite a statistic, it must be real and attributable. Never fabricate a number. If you cannot verify a figure, describe the direction honestly instead ("completion rates are low, in the low double digits") and flag it for a citation before publishing.
- Prefer **short, clear paragraphs** over long blocks.
- Do not repeat the same idea in different words.
- Write with the depth of someone who **actually worked on the problem.**

### After writing

- Reread and delete anything that sounds generic or AI-generated.
- Confirm **every section adds unique value.** If two sections make the same point, merge them.
- Make sure the piece **demonstrates expertise** rather than defining terms.

---

## Part 2 — SEO method (how we decide what to write)

This is the method used to produce the first three posts. Follow it for every new post.

1. **Ground in live SERP research. Never invent competitors.** Use `WebSearch` to see what actually ranks for the target keyword, and `WebFetch` to read the strongest one or two competitors and extract their real subtopic coverage. If a page blocks the fetch, say so and work from the search snippets rather than guessing.

2. **Separate search intent, one page per intent.** The same topic can front different SERPs:
   - **Transactional** (someone wants a tool now) — e.g. "youtube playlist length calculator".
   - **Informational** (someone wants to learn how) — e.g. "how to stay consistent on youtube".
   - **Commercial** (someone is comparing before choosing) — e.g. "best youtube playlist tracker free".
   Do not try to rank one page for two intents. It ranks for neither.

3. **Run a content-gap analysis against the ranking pages.** List the subtopics competitors cover that we do not, and rank them by impact (table-stakes for that SERP vs. nice-to-have), not by how many competitors mention them.

4. **Cover entities, do not stuff keywords.** Name the real APIs, formats, techniques, and competing products that establish topical authority (YouTube Data API, IFrame Player API, ISO 8601 duration, spaced repetition, active recall, TrackMyCourse, YTCourse, etc.).

5. **Target long-tail, low-difficulty keywords.** A new site cannot outrank entrenched tool domains on head terms. Pick specific phrases where we can realistically win.

6. **Thread the real product differentiator as the wedge.** PeakStreak's genuine white space is the **streak / accountability loop** (contribution graph, streak freeze, daily nudge). No competitor owns it. Every post leads back to it honestly, not as a bolt-on pitch.

7. **FAQ block at the end, written as literal question-answer pairs.** This is what search engines lift into featured snippets. Questions should match how people actually search.

8. **Cross-link.** Every post links to the other relevant posts and to the tool (the landing `/`). Internal links use app-relative paths (`/blog/<slug>`, `/`).

---

## Part 3 — How to add a post to this codebase

The blog is file-based and statically prerendered. One Markdown file is one post.

### Steps

1. Create `apps/web/content/blog/<slug>.md`. The filename should equal the slug.
2. Add frontmatter (schema below).
3. Write the body in Markdown, starting with a single `# H1`. The first H1 is stripped automatically because the page renders the title from frontmatter, so it will not duplicate.
4. Use `##` for sections, `###` for sub-sections. Tables, code fences, bold, blockquotes, and links all render.
5. Refresh (`next dev`) or rebuild (`pnpm --filter web build`) to see it.

### Frontmatter schema

```yaml
---
title: "The Post Title"            # required — H1 + <title> + card
description: "One sentence."        # required — meta description + card subtitle
slug: the-post-title               # required — the URL is /blog/<slug>
targetKeyword: "main keyword"       # the primary phrase this post targets
secondaryKeywords:                  # related phrases (optional)
  - related phrase one
  - related phrase two
intent: informational               # informational | transactional | commercial
status: published                   # published = live; draft = shows a DRAFT chip
order: 4                            # lower sorts first on the /blog index
---
```

### What is automatic (do not hand-maintain)

- The route `/blog/<slug>` and its static prerender.
- The card on `/blog`, ordered by `order`.
- The entry in `sitemap.xml` (derived from `getAllPosts()`).
- SEO metadata and `BlogPosting` JSON-LD, built from frontmatter.

### Design

- The blog reuses the landing's look. Do not restyle it. `SiteHeader`, `SiteFooter`, and `Reveal` are shared; prose is styled with the app's design tokens in `components/blog/markdown.tsx`.
- Dark theme only, Inter + JetBrains Mono, one lavender accent. Do not touch the landing animations.

### Relevant files

- `apps/web/lib/blog.ts` — reads and parses the Markdown files.
- `apps/web/components/blog/markdown.tsx` — renders the body.
- `apps/web/app/blog/page.tsx` — the index.
- `apps/web/app/blog/[slug]/page.tsx` — a post.
- `apps/web/proxy.ts` — `/blog` is already in `PUBLIC_PAGE_PREFIXES`, so posts are reachable while logged out. Any new public section needs the same treatment.

---

## Part 4 — Pre-publish checklist

- [ ] Grounded in live SERP research, not invented competitors.
- [ ] One clear search intent for the post.
- [ ] Leads with the answer.
- [ ] Trade-offs shown, not a single "best" claim.
- [ ] Real engineering detail included where relevant.
- [ ] Zero em dashes. No buzzwords, filler, or robotic transitions.
- [ ] Every statistic is real and attributable, or honestly hedged and flagged.
- [ ] FAQ block present, phrased as real questions.
- [ ] Cross-links to related posts and to the tool.
- [ ] Frontmatter complete and valid. `status` set correctly.
- [ ] `pnpm --filter web typecheck` clean.
- [ ] `pnpm --filter web lint` has no new errors.
- [ ] `pnpm --filter web build` shows the post prerendered (`● /blog/[slug]`).
- [ ] The post loads at `/blog/<slug>` while logged out (HTTP 200).
