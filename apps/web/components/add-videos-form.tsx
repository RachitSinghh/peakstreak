"use client"

import { useState, useTransition } from "react"

import { Alert, AlertDescription } from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import { Textarea } from "@workspace/ui/components/textarea"

import { addVideosToCustomPlaylist } from "@/app/(app)/playlists/actions"

export function AddVideosForm({ enrollmentId }: { enrollmentId: string }) {
  const [urls, setUrls] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  function submit() {
    if (urls.trim() === "" || pending) return
    setError(null)
    start(async () => {
      const result = await addVideosToCustomPlaylist({ enrollmentId, urls })
      // Success redirects; reaching here means it returned an error.
      if (result?.error) setError(result.error)
    })
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <Textarea
        value={urls}
        onChange={(e) => setUrls(e.target.value)}
        placeholder={"One YouTube video link per line…\nhttps://youtu.be/…\nhttps://www.youtube.com/watch?v=…"}
        rows={6}
        autoFocus
      />
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Button onClick={submit} disabled={urls.trim() === "" || pending} className="self-start">
        {pending ? "Adding…" : "Add videos"}
      </Button>
    </div>
  )
}
