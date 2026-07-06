import Link from "next/link"
import { redirect } from "next/navigation"
import { Trophy } from "lucide-react"

import { Button } from "@workspace/ui/components/button"

import { auth } from "@/lib/auth"
import { UserMenu } from "@/components/user-menu"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  return (
    <div className="min-h-svh">
      <header className="border-border bg-background/80 sticky top-0 z-40 border-b backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="text-base font-semibold tracking-tight">
              Peak<span className="text-primary">Streak</span>
            </Link>
            <Link
              href="/leaderboard"
              className="text-foreground hover:bg-secondary inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors"
            >
              <Trophy className="text-primary size-4" />
              <span className="hidden sm:inline">Leaderboard</span>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Button size="sm" render={<Link href="/playlists/new" />}>
              Add playlist
            </Button>
            <UserMenu
              name={session.user.name ?? null}
              email={session.user.email ?? null}
              image={session.user.image ?? null}
            />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  )
}
