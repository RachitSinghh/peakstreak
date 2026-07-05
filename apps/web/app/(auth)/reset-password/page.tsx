import type { Metadata } from "next"
import Link from "next/link"

import { ResetPasswordForm } from "@/components/reset-password-form"

export const metadata: Metadata = { title: "Choose a new password" }

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams

  if (!token) {
    return (
      <>
        <h1 className="mb-1 text-center text-xl font-semibold">Reset link needed</h1>
        <p className="text-muted-foreground mt-4 text-center text-sm">
          This page needs a valid reset link.{" "}
          <Link href="/forgot-password" className="text-primary hover:underline">
            Request a new one
          </Link>
          .
        </p>
      </>
    )
  }

  return (
    <>
      <h1 className="mb-1 text-center text-xl font-semibold">Choose a new password</h1>
      <p className="text-muted-foreground mb-6 text-center text-sm">
        Enter a new password for your account.
      </p>
      <ResetPasswordForm token={token} />
    </>
  )
}
