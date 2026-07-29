import Link from "next/link"

import { Wordmark } from "@/components/wordmark"

/** Shared chrome for the public profile, followers, and following pages. */
export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-svh">
      <header className="border-border border-b">
        <div className="mx-auto flex h-14 max-w-3xl items-center px-4">
          <Link href="/">
            <Wordmark className="text-sm" />
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10">{children}</main>
    </div>
  )
}
