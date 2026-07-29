export const USERNAME_MIN = 3
export const USERNAME_MAX = 30

const USERNAME_RE = /^[a-z0-9-]+$/

// Top-level route segments and system words that must never become a profile
// slug (a `/u/:username` link must never collide with a real page).
export const RESERVED_USERNAMES = new Set([
  "admin", "api", "app", "auth", "dashboard", "settings", "login", "signup",
  "logout", "leaderboard", "tasks", "playlists", "completed", "archived",
  "feedback", "privacy", "terms", "blog", "u", "p", "g", "share", "new",
  "watch", "notes", "add", "forgot-password", "reset-password", "about",
  "help", "support", "me", "you", "null", "undefined", "peakstreak", "www",
  "root", "system", "static", "public", "favicon",
])

export type UsernameResult = { ok: true; value: string } | { ok: false; error: string }

/** Pure validation + normalization. Uniqueness is checked separately (DB). */
export function validateUsername(raw: string): UsernameResult {
  const value = raw.trim().toLowerCase()
  if (value.length < USERNAME_MIN || value.length > USERNAME_MAX)
    return { ok: false, error: `Username must be ${USERNAME_MIN}–${USERNAME_MAX} characters.` }
  if (!USERNAME_RE.test(value))
    return { ok: false, error: "Use lowercase letters, numbers, and hyphens only." }
  if (value.startsWith("-") || value.endsWith("-"))
    return { ok: false, error: "Username can't start or end with a hyphen." }
  if (RESERVED_USERNAMES.has(value)) return { ok: false, error: "That username is reserved." }
  return { ok: true, value }
}
