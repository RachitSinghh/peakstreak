"use client"

import Link from "next/link"
import { useActionState } from "react"

import { Alert, AlertDescription } from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"

import { requestPasswordResetAction, type ForgotPasswordState } from "@/app/(auth)/actions"

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState<ForgotPasswordState, FormData>(
    requestPasswordResetAction,
    {},
  )

  if (state.sent) {
    return (
      <p className="text-muted-foreground mt-4 text-center text-sm">
        If an account exists for that address, a reset link is on its way.{" "}
        <Link href="/login" className="text-primary hover:underline">
          Back to login
        </Link>
      </p>
    )
  }

  return (
    <>
      <p className="text-muted-foreground mb-6 text-center text-sm">
        Enter your email and we&apos;ll send you a reset link.
      </p>
      <form action={formAction} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
          />
        </div>

        {state.error && (
          <Alert variant="destructive">
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Sending…" : "Send reset link"}
        </Button>
      </form>
      <p className="text-muted-foreground mt-4 text-center text-sm">
        <Link href="/login" className="hover:underline">
          Back to login
        </Link>
      </p>
    </>
  )
}
