import { env } from "@/lib/env"

export interface ReminderTemplateInput {
  name: string | null
  playlistTitle: string
  currentStreak: number
  watchUrl: string
  unsubscribeUrl: string
}

/** The streak-jeopardy reminder (PS-12). Plain, fast, single CTA. */
export function reminderEmail(input: ReminderTemplateInput) {
  const firstName = input.name?.split(" ")[0] ?? "there"
  const streakLine =
    input.currentStreak > 0
      ? `Your ${input.currentStreak}-day streak is about to cool down 🔥`
      : "Your streak is waiting to be lit 🔥"

  const subject =
    input.currentStreak > 0
      ? `Your ${input.currentStreak}-day streak is about to cool down 🔥`
      : `Pick up where you left off in “${input.playlistTitle}”`

  const text = [
    `Hey ${firstName},`,
    ``,
    `${streakLine} — you haven't watched anything today.`,
    ``,
    `Pick up where you left off in “${input.playlistTitle}”:`,
    input.watchUrl,
    ``,
    `One video keeps the streak alive.`,
    ``,
    `— PeakStreak`,
    ``,
    `Unsubscribe: ${input.unsubscribeUrl}`,
  ].join("\n")

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#010102;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <div style="max-width:480px;margin:0 auto;padding:32px 24px;">
      <p style="color:#f7f8f8;font-size:16px;font-weight:600;margin:0 0 4px;">Peak<span style="color:#5e6ad2;">Streak</span></p>
      <h1 style="color:#f7f8f8;font-size:20px;margin:24px 0 8px;">${streakLine}</h1>
      <p style="color:#8a8f98;font-size:14px;line-height:1.6;margin:0 0 24px;">
        Hey ${firstName} — you haven't watched anything today. One video keeps the streak alive.
      </p>
      <a href="${input.watchUrl}"
         style="display:inline-block;background:#5e6ad2;color:#ffffff;text-decoration:none;font-size:14px;font-weight:500;padding:10px 20px;border-radius:8px;">
        Continue “${escapeHtml(input.playlistTitle)}”
      </a>
      <p style="color:#62666d;font-size:12px;margin:32px 0 0;">
        Getting these at the wrong time? <a href="${env().NEXT_PUBLIC_APP_URL}/settings" style="color:#8a8f98;">Change your reminder hour</a>
        or <a href="${input.unsubscribeUrl}" style="color:#8a8f98;">unsubscribe</a>.
      </p>
    </div>
  </body>
</html>`

  return { subject, html, text }
}

export interface PasswordResetTemplateInput {
  name: string | null
  resetUrl: string
  /** How long the link stays valid, e.g. "1 hour". */
  expiresIn: string
}

/** The password-reset link email. Single CTA, neutral, expiry stated. */
export function passwordResetEmail(input: PasswordResetTemplateInput) {
  const firstName = input.name?.split(" ")[0] ?? "there"
  const subject = "Reset your PeakStreak password"

  const text = [
    `Hey ${firstName},`,
    ``,
    `We got a request to reset your PeakStreak password. Open this link to choose a new one:`,
    input.resetUrl,
    ``,
    `The link expires in ${input.expiresIn}. If you didn't ask for this, you can safely ignore this email — your password won't change.`,
    ``,
    `— PeakStreak`,
  ].join("\n")

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#010102;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <div style="max-width:480px;margin:0 auto;padding:32px 24px;">
      <p style="color:#f7f8f8;font-size:16px;font-weight:600;margin:0 0 4px;">Peak<span style="color:#5e6ad2;">Streak</span></p>
      <h1 style="color:#f7f8f8;font-size:20px;margin:24px 0 8px;">Reset your password</h1>
      <p style="color:#8a8f98;font-size:14px;line-height:1.6;margin:0 0 24px;">
        Hey ${escapeHtml(firstName)} — we got a request to reset your password. Choose a new one below.
      </p>
      <a href="${input.resetUrl}"
         style="display:inline-block;background:#5e6ad2;color:#ffffff;text-decoration:none;font-size:14px;font-weight:500;padding:10px 20px;border-radius:8px;">
        Reset password
      </a>
      <p style="color:#62666d;font-size:12px;line-height:1.6;margin:32px 0 0;">
        This link expires in ${escapeHtml(input.expiresIn)}. Didn't request it? You can safely ignore this email — your password won't change.
      </p>
    </div>
  </body>
</html>`

  return { subject, html, text }
}

export interface FeedbackTemplateInput {
  message: string
  fromEmail: string | null
  userId: string | null
  path: string | null
}

/** Internal notification sent to FEEDBACK_TO for each submission. */
export function feedbackEmail(input: FeedbackTemplateInput) {
  const from = input.fromEmail ?? "anonymous"
  const subject = `PeakStreak feedback from ${from}`

  const lines = [
    input.message,
    ``,
    `— from: ${from}`,
    `— user: ${input.userId ?? "signed out"}`,
    `— page: ${input.path ?? "n/a"}`,
  ]
  const text = lines.join("\n")

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#010102;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <div style="max-width:520px;margin:0 auto;padding:32px 24px;">
      <p style="color:#f7f8f8;font-size:16px;font-weight:600;margin:0 0 16px;">Peak<span style="color:#5e6ad2;">Streak</span> · new feedback</p>
      <div style="color:#f7f8f8;font-size:14px;line-height:1.7;white-space:pre-wrap;background:#0f1011;border:1px solid #23252a;border-radius:8px;padding:16px;">${escapeHtml(input.message)}</div>
      <p style="color:#62666d;font-size:12px;line-height:1.8;margin:16px 0 0;">
        From: ${escapeHtml(from)}<br/>
        User: ${escapeHtml(input.userId ?? "signed out")}<br/>
        Page: ${escapeHtml(input.path ?? "n/a")}
      </p>
    </div>
  </body>
</html>`

  return { subject, html, text }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}
