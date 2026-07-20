import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { requireAdmin } from "@/lib/auth"
import { Wordmark } from "@/components/wordmark"
import { AdminNav } from "@/components/admin-nav"

// One gate for the whole admin section. Non-admins get a 404 from here, so no
// admin page under this layout needs to re-check.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin()

  return (
    <div className="flex min-h-svh">
      <aside className="border-border bg-background/60 flex w-56 shrink-0 flex-col gap-6 border-r px-4 py-5">
        <div className="flex items-center gap-2">
          <Link href="/dashboard">
            <Wordmark className="text-sm" />
          </Link>
          <span className="bg-secondary text-muted-foreground rounded px-1.5 py-0.5 text-[10px] font-medium tracking-wide uppercase">
            Admin
          </span>
        </div>

        <AdminNav />

        <Link
          href="/dashboard"
          className="text-muted-foreground hover:text-foreground mt-auto inline-flex items-center gap-1.5 text-sm transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back to app
        </Link>
      </aside>

      <main className="min-w-0 flex-1 px-6 py-6">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  )
}
