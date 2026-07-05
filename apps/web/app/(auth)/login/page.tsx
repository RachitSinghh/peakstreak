import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { auth } from "@/lib/auth"
import { googleOAuthEnabled } from "@/lib/env"
import { AuthForm } from "@/components/auth-form"

export const metadata: Metadata = { title: "Log in" }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; reset?: string }>
}) {
  const session = await auth()
  if (session?.user) redirect("/dashboard")
  const { callbackUrl, reset } = await searchParams

  return (
    <>
      <h1 className="mb-1 text-center text-xl font-semibold">Welcome back</h1>
      <p className="text-muted-foreground mb-6 text-center text-sm">
        Log in to keep your streak alive.
      </p>
      {reset && (
        <p className="border-success/30 bg-success/10 text-success mb-6 rounded-lg border px-3 py-2 text-center text-sm">
          Password updated — log in with your new password.
        </p>
      )}
      <AuthForm
        mode="login"
        googleEnabled={googleOAuthEnabled()}
        callbackUrl={callbackUrl?.startsWith("/") ? callbackUrl : "/dashboard"}
      />
    </>
  )
}
