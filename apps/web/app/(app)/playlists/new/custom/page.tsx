import type { Metadata } from "next"

import { CreateCustomPlaylistFlow } from "@/components/create-custom-playlist-flow"

export const metadata: Metadata = { title: "Create a custom playlist" }

export default function NewCustomPlaylistPage() {
  return (
    <div className="py-6">
      <div className="mx-auto mb-8 max-w-2xl">
        <h1 className="text-xl font-semibold">Create a custom playlist</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Collect individual videos into one plan when no single playlist covers the topic. Track it
          with the same streaks, notes, and finish date.
        </p>
      </div>
      <CreateCustomPlaylistFlow />
    </div>
  )
}
