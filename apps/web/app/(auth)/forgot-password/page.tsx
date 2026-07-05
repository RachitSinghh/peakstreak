import type { Metadata } from "next"

import { ForgotPasswordForm } from "@/components/forgot-password-form"

export const metadata: Metadata = { title: "Reset password" }

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="mb-1 text-center text-xl font-semibold">Reset your password</h1>
      <ForgotPasswordForm />
    </>
  )
}
