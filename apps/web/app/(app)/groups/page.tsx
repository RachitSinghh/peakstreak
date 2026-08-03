import type { Metadata } from "next"
import Link from "next/link"
import { Users } from "lucide-react"

import { requireUserId } from "@/lib/auth"
import { getMyGroups } from "@/lib/groups"
import { CreateGroupForm } from "@/components/create-group-form"
import { FadeUp } from "@/components/motion/fade-up"

export const metadata: Metadata = { title: "Groups" }

export default async function GroupsPage() {
  const userId = await requireUserId()
  const groups = await getMyGroups(userId)

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 py-2">
      <FadeUp>
        <div className="flex items-center gap-3">
          <Users className="text-primary size-6" />
          <div>
            <h1 className="text-xl font-semibold">Study groups</h1>
            <p className="text-muted-foreground text-sm">
              Learn alongside people you know — share a link and keep each other going.
            </p>
          </div>
        </div>
      </FadeUp>

      <FadeUp delay={0.04}>
        <CreateGroupForm />
      </FadeUp>

      <FadeUp delay={0.08}>
        {groups.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            You&apos;re not in any groups yet. Create one above, or open an invite link a friend
            shared.
          </p>
        ) : (
          <ul className="border-border bg-card divide-border/60 divide-y overflow-hidden rounded-xl border">
            {groups.map((g) => (
              <li key={g.slug}>
                <Link
                  href={`/g/${g.slug}`}
                  className="hover:bg-secondary flex items-center justify-between px-4 py-3"
                >
                  <span className="font-medium">{g.name}</span>
                  <span className="text-muted-foreground text-sm">
                    {g.memberCount} member{g.memberCount === 1 ? "" : "s"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </FadeUp>
    </div>
  )
}
