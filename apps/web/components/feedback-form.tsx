"use client"

import Link from "next/link"
import { useActionState, useEffect, useRef } from "react"
import { CheckCircle2 } from "lucide-react"

import { Alert, AlertDescription } from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Textarea } from "@workspace/ui/components/textarea"

import { submitFeedbackAction, type FeedbackState } from "@/app/feedback/actions"

export function FeedbackForm({
  defaultEmail,
  signedIn,
}: {
  defaultEmail: string | null
  signedIn: boolean
}) {
  const [state, formAction, pending] = useActionState<FeedbackState, FormData>(
    submitFeedbackAction,
    {},
  )
  const pathRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // The page they came from, for context — not the /feedback page itself.
    if (pathRef.current) {
      try {
        pathRef.current.value = document.referrer
          ? new URL(document.referrer).pathname
          : ""
      } catch {
        pathRef.current.value = ""
      }
    }
  }, [])

  if (state.sent) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <CheckCircle2 className="text-success size-8" />
        <p className="text-sm font-medium">Thanks — we read every note.</p>
        <Button variant="outline" render={<Link href={signedIn ? "/dashboard" : "/"} />}>
          {signedIn ? "Back to dashboard" : "Back home"}
        </Button>
      </div>
    )
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="path" ref={pathRef} />
      <div className="flex flex-col gap-2">
        <Label htmlFor="message">What&apos;s on your mind?</Label>
        <Textarea
          id="message"
          name="message"
          required
          rows={5}
          placeholder="A bug, an idea, something that annoyed you — all of it helps."
        />
      </div>

      {!signedIn && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">
            Email <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={defaultEmail ?? ""}
            autoComplete="email"
            placeholder="you@example.com — if you'd like a reply"
          />
        </div>
      )}
      {signedIn && defaultEmail && <input type="hidden" name="email" value={defaultEmail} />}

      {state.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Sending…" : "Send feedback"}
      </Button>
    </form>
  )
}
