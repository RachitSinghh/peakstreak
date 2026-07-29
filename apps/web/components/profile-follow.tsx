"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { toast } from "sonner"

import { Button } from "@workspace/ui/components/button"

import { followUser, unfollowUser } from "@/app/u/[username]/actions"

/**
 * SOC-02: follower/following counts plus the Follow/Unfollow button. Client so
 * the follower count and button label flip optimistically; the server action
 * revalidates the page so a reload agrees. No button on your own profile;
 * logged-out visitors get a link to sign in first.
 */
export function ProfileFollow(props: {
  username: string
  isOwnProfile: boolean
  isAuthenticated: boolean
  initialIsFollowing: boolean
  followerCount: number
  followingCount: number
}) {
  const [following, setFollowing] = useState(props.initialIsFollowing)
  const [followers, setFollowers] = useState(props.followerCount)
  const [pending, startTransition] = useTransition()

  function toggle() {
    const next = !following
    // Optimistic: flip immediately, roll back on error.
    setFollowing(next)
    setFollowers((n) => n + (next ? 1 : -1))
    startTransition(async () => {
      const result = await (next ? followUser : unfollowUser)(props.username)
      if (result.error) {
        setFollowing(!next)
        setFollowers((n) => n + (next ? -1 : 1))
        toast.error(result.error)
      }
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="text-muted-foreground flex items-center gap-4 text-sm">
        <Link href={`/u/${props.username}/followers`} className="hover:text-foreground">
          <span className="text-foreground font-semibold">{followers}</span> followers
        </Link>
        <Link href={`/u/${props.username}/following`} className="hover:text-foreground">
          <span className="text-foreground font-semibold">{props.followingCount}</span> following
        </Link>
      </div>

      {!props.isOwnProfile &&
        (props.isAuthenticated ? (
          <Button
            size="sm"
            variant={following ? "outline" : "default"}
            disabled={pending}
            onClick={toggle}
          >
            {following ? "Following" : "Follow"}
          </Button>
        ) : (
          <Button
            size="sm"
            render={<Link href={`/login?callbackUrl=/u/${props.username}`} />}
          >
            Follow
          </Button>
        ))}
    </div>
  )
}
