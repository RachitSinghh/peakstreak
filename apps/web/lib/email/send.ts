import nodemailer, { type Transporter } from "nodemailer"
import { Resend } from "resend"

import { env } from "@/lib/env"

export interface OutgoingEmail {
  to: string
  subject: string
  html: string
  text: string
  headers?: Record<string, string>
}

export type EmailTransport = (email: OutgoingEmail) => Promise<{ providerMessageId: string | null }>

let resend: Resend | null = null
let transporter: Transporter | null = null

/**
 * Single email entry point. Provider is chosen by the USE_RESEND toggle:
 *   - USE_RESEND=true  → Resend (once the domain is verified)
 *   - USE_RESEND=false → SMTP via nodemailer (interim, until Resend is ready)
 * If the selected provider isn't configured, falls back to console logging so
 * local dev and the reminder loop stay testable without any mail setup.
 */
export const sendEmail: EmailTransport = async (email) => {
  const e = env()

  if (e.USE_RESEND && e.RESEND_API_KEY) {
    resend ??= new Resend(e.RESEND_API_KEY)
    const { data, error } = await resend.emails.send({
      from: e.EMAIL_FROM,
      to: email.to,
      subject: email.subject,
      html: email.html,
      text: email.text,
      headers: email.headers,
    })
    if (error) throw new Error(`Resend error: ${error.message}`)
    return { providerMessageId: data?.id ?? null }
  }

  if (!e.USE_RESEND && e.SMTP_HOST) {
    transporter ??= nodemailer.createTransport({
      host: e.SMTP_HOST,
      port: e.SMTP_PORT,
      secure: e.SMTP_SECURE,
      auth: e.SMTP_USER ? { user: e.SMTP_USER, pass: e.SMTP_PASS } : undefined,
    })
    const info = await transporter.sendMail({
      from: e.EMAIL_FROM,
      to: email.to,
      subject: email.subject,
      html: email.html,
      text: email.text,
      headers: email.headers,
    })
    return { providerMessageId: info.messageId ?? null }
  }

  console.info(
    `[email] (dev, not sent) to=${email.to} subject="${email.subject}"\n${email.text.slice(0, 500)}`,
  )
  return { providerMessageId: null }
}
