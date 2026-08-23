# Blog CMS — DB-backed posts + admin editor

**Status:** design approved (Rachit). Replaces the file-based blog reader with a DB store and a browser editor at `/admin/blog`.

## Problem

Posts are Markdown files in `apps/web/content/blog/*.md`, read at build time by `lib/blog.ts`. Publishing means writing a file and redeploying. On Vercel the runtime filesystem is read-only, so a dashboard "write a file" flow is impossible. The fix is to move posts into the database and edit them in the browser.

`lib/blog.ts` already anticipates this: *"A CMS/posting surface can replace this reader later without changing the page components."*

## Approach

DB-backed posts + an admin editor. Rendering is unchanged — `<Markdown>{string}</Markdown>` (`components/blog/markdown.tsx`, react-markdown + remark-gfm) takes a markdown string whether it comes from a file or a row. Only the source changes.

Two deliberate behavior changes (approved):
- Public blog shows only `published` posts (today it lists drafts with a badge). Admin sees all statuses.
- Existing 5 `.md` posts are imported into the table once; the DB becomes the source of truth. The `.md` files stay in the repo as history/backup but are no longer read.

## Schema — `blog_posts`

Mirrors `BlogFrontmatter` + body. Add to `lib/db/schema.ts`:

```
id            uuid pk default random
slug          text unique not null
title         text not null
description   text not null
targetKeyword text            (nullable)
secondaryKeywords jsonb not null default []   (string[])
intent        text enum informational|transactional|commercial (nullable)
status        text enum draft|published not null default 'draft'
order         integer         (nullable, sort key)
content       text not null   (markdown body)
publishedAt   timestamptz     (nullable; set when first published)
...timestamps (createdAt, updatedAt)
```

Migration via `pnpm --filter web db:generate`; Rachit runs `db:migrate`.

## Data layer

`lib/blog.ts` rewritten to read the DB (functions become async, same `BlogPost` / `BlogFrontmatter` types so pages change only by adding `await`):

- `getAllPosts(): Promise<BlogPost[]>` — **published only**, ordered by `order` then `publishedAt` desc. Used by public pages.
- `getPost(slug): Promise<BlogPost | null>` — published only.
- Drop `fs`/`gray-matter`/`server-only` from the runtime path (gray-matter still used by the one-time import).

`lib/admin-blog.ts` (admin surface, all statuses):

- `listPostsAdmin(): Promise<AdminBlogRow[]>` — id, slug, title, status, order, updatedAt.
- `getPostAdmin(id): Promise<BlogPostRow | null>` — full row for the editor.
- `savePost(input): Promise<{ id }>` — upsert by id (insert when no id). Validates required fields + unique slug; sets `publishedAt` the first time status flips to `published`. Bumps `updatedAt`.
- `deletePost(id)`.
- `rowToBlogPost(row)` — maps a DB row to the `BlogPost` shape (frontmatter + `readingMinutes` via the existing `estimateReadingMinutes`). Pure, unit-tested.

## Pages — ISR + on-demand revalidate

`app/blog/page.tsx`, `app/blog/[slug]/page.tsx`, and `generateStaticParams` become async (await the readers). Build-time prerender still works (DB reachable at build). New/edited posts stay fresh without a deploy via on-demand revalidation in the save action:

```ts
revalidatePath("/blog")
revalidatePath(`/blog/${slug}`)
```

`dynamicParams` stays default (true) so a slug created after deploy renders on demand.

## Admin editor — `/admin/blog`

- `app/admin/blog/page.tsx` — list of all posts (status badge, order), "New post" link, edit link per row, delete.
- `app/admin/blog/new/page.tsx` and `app/admin/blog/[id]/edit/page.tsx` — render the shared editor client component.
- `components/admin/blog-editor.tsx` (client) — frontmatter inputs (title, slug, description, targetKeyword, secondaryKeywords comma field, intent select, status select, order) + a markdown `<textarea>` beside a **live preview** that reuses `<Markdown>` directly (react-markdown runs client-side; importing the component into a client tree bundles it there — no duplicate prose styles). Calls the `savePost` / `deletePost` server actions in `app/admin/blog/actions.ts` (`requireAdmin`, revalidate, redirect back to the list).

Nav: add a "Blog" item to `components/admin-nav.tsx`.

## One-time import of existing posts

`lib/admin-blog.ts` `importFilePosts()` — reads `content/blog/*.md` with gray-matter and upserts each into `blog_posts` (keyed on slug, idempotent). Exposed as a guarded admin action or a `scripts/` one-shot run once after the migration. Existing posts keep their slugs, so URLs and SEO are unchanged.

## Testing

- `tests/admin-blog.test.ts` — `rowToBlogPost` maps fields + computes `readingMinutes`; `savePost` sets `publishedAt` only on the first publish and never clears it; slug uniqueness rejected. (DB-backed via the repo `helpers` harness.)
- Public-reader filter: `getAllPosts` excludes `draft`. (DB-backed.)
- Gate: `pnpm --filter web build` (client/server boundary — the editor is a client component importing a server-adjacent Markdown renderer), plus `test` + `lint`.

## Out of scope (deliberate)

- Image uploads (posts use external image URLs / none today).
- Rich WYSIWYG editor (markdown textarea + preview matches the current authoring flow).
- Scheduled publishing, revisions/history, multi-author. Add later if needed.
