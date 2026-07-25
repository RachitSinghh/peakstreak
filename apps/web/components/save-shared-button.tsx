"use client"

import { useTransition } from "react"
import { toast } from "sonner"

import { Button } from "@workspace/ui/components/button"

import { cloneSharedPlaylist } from "@/app/(app)/playlists/actions"

export function SaveSharedButton({ alias }: { alias: string }) {
  const [pending, startTransition] = useTransition()

  function save() {
    startTransition(async () => {
      // Resolves only on error — success redirects to /dashboard server-side.
      const result = await cloneSharedPlaylist(alias)
      if (result?.error) toast.error(result.error)
    })
  }

  return (
    <Button onClick={save} disabled={pending} className="w-full">
      {pending ? "Saving…" : "Save to My Playlists"}
    </Button>
  )
}
