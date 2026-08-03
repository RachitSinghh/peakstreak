import type { Metadata } from "next"
import Link from "next/link"

import { requireUserId } from "@/lib/auth"
import { getGroupPage } from "@/lib/groups"
import { GroupView } from "@/components/group-view"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const userId = await requireUserId()
  const group = await getGroupPage(slug, userId)
  return {
    title: group ? group.name : "Group not found",
    robots: { index: false, follow: false },
  }
}

export default async function GroupPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const userId = await requireUserId()
  const group = await getGroupPage(slug, userId)

  if (!group) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <h1 className="mb-2 text-xl font-semibold">Group not found</h1>
        <Link href="/groups" className="text-primary text-sm underline underline-offset-4">
          Back to groups
        </Link>
      </div>
    )
  }

  return <GroupView group={group} />
}
