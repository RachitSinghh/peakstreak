import type { Metadata } from "next"
import Link from "next/link"

import { auth } from "@/lib/auth"
import { FeedbackForm } from "@/components/feedback-form"

export const metadata: Metadata = { title: "Feedback" }

export default async function FeedbackPage() {
  const session = await auth()
  const signedIn = Boolean(session?.user)

  return (
    <div className="mx-auto flex min-h-svh max-w-md flex-col justify-center px-4 py-16">
      <Link
        href={signedIn ? "/dashboard" : "/"}
        className="mb-8 text-center text-base font-semibold tracking-tight"
      >
        Peak<span className="text-primary">Streak</span>
      </Link>
      <h1 className="mb-1 text-center text-xl font-semibold">Send feedback</h1>
      <p className="text-muted-foreground mb-6 text-center text-sm">
        Tell us what&apos;s working, what isn&apos;t, and what you wish existed.
      </p>
      <FeedbackForm defaultEmail={session?.user?.email ?? null} signedIn={signedIn} />
    </div>
  )
}
