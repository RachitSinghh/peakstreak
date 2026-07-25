import { eq } from "drizzle-orm"

import { db, schema } from "@/lib/db"
import { env } from "@/lib/env"
import { ALIAS_MAX, randomSuffix, slugify } from "@/lib/slug"

/**
 * A unique alias from the title. Retries with a random suffix on collision;
 * the caller still relies on the DB unique constraint as the real guard
 * against races (two same-named playlists shared at the same instant).
 */
export async function generateAlias(title: string): Promise<string> {
  const base = slugify(title)
  const existing = await db.query.playlistShareLinks.findFirst({
    where: eq(schema.playlistShareLinks.alias, base),
    columns: { id: true },
  })
  if (!existing) return base
  return `${base.slice(0, ALIAS_MAX - 5)}-${randomSuffix()}`
}

/** Absolute share URL for an alias. */
export function shareUrl(alias: string): string {
  return `${env().NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/p/${alias}`
}

/**
 * The playlist behind a share alias, or null if the alias is unknown or its
 * playlist was deleted (cascade removes the link, but a stale alias in a URL
 * still lands here). Two plain queries — the schema declares no relations.
 */
export async function resolveAlias(
  alias: string,
): Promise<typeof schema.playlists.$inferSelect | null> {
  const link = await db.query.playlistShareLinks.findFirst({
    where: eq(schema.playlistShareLinks.alias, alias),
    columns: { playlistId: true },
  })
  if (!link) return null
  const playlist = await db.query.playlists.findFirst({
    where: eq(schema.playlists.id, link.playlistId),
  })
  return playlist ?? null
}
