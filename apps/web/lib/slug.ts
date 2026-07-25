export const ALIAS_MAX = 60
const SUFFIX_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789"

/** Readable URL slug from a playlist title. Empty/emoji-only → "playlist". */
export function slugify(title: string): string {
  const slug = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip combining accents left by NFKD
    .replace(/[^a-z0-9]+/g, "-") // non-alphanumerics (incl. emojis) → hyphen
    .replace(/^-+|-+$/g, "")
    .slice(0, ALIAS_MAX)
    .replace(/-+$/g, "") // slice may leave a trailing hyphen
  return slug || "playlist"
}

export function randomSuffix(): string {
  let out = ""
  for (let i = 0; i < 4; i++) {
    out += SUFFIX_CHARS[Math.floor(Math.random() * SUFFIX_CHARS.length)]
  }
  return out
}
