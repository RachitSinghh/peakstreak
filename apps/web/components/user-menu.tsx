"use client"

import Link from "next/link"
import { Archive, LogOut, MessageSquare, Settings } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"

import { signOutAction } from "@/app/(auth)/actions"

export function UserMenu({
  name,
  email,
  image,
}: {
  name: string | null
  email: string | null
  image: string | null
}) {
  const initial = (name ?? email ?? "?").charAt(0).toUpperCase()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <Avatar className="size-8">
          {image && <AvatarImage src={image} alt={name ?? "Avatar"} />}
          <AvatarFallback>{initial}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {/* Base UI's GroupLabel throws unless it's inside a Group. */}
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-normal">
            <div className="truncate text-sm font-medium">{name ?? "Learner"}</div>
            <div className="text-muted-foreground truncate text-xs">{email}</div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/archived" />}>
          <Archive className="size-4" />
          Archived
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/settings" />}>
          <Settings className="size-4" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/feedback" />}>
          <MessageSquare className="size-4" />
          Send feedback
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {/* Base UI menu items take onClick — onSelect is a Radix prop it ignores. */}
        <DropdownMenuItem onClick={() => void signOutAction()}>
          <LogOut className="size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
