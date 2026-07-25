"use client"

import { useEffect, useState, useTransition } from "react"
import { Check, Copy, Share2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"

import { createShareLink } from "@/app/(app)/playlists/actions"

/** Controlled share dialog — fetches the link the first time it opens. */
export function ShareDialog({
  playlistId,
  open,
  onOpenChange,
}: {
  playlistId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [url, setUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (!open || url) return // fetched once per session
    startTransition(async () => {
      const result = await createShareLink(playlistId)
      if (result.error) {
        toast.error(result.error)
        onOpenChange(false)
        return
      }
      setUrl(result.url ?? null)
    })
  }, [open, url, playlistId, onOpenChange])

  async function copy() {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error("Couldn't copy — select the link and copy manually.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share this playlist</DialogTitle>
          <DialogDescription>
            Anyone with this link can save their own copy to edit.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2">
          <Input
            readOnly
            value={pending ? "Generating link…" : (url ?? "")}
            onFocus={(e) => e.currentTarget.select()}
          />
          <Button
            size="icon"
            variant="outline"
            onClick={copy}
            disabled={!url}
            aria-label="Copy link"
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** Standalone Share button (watch page header). */
export function ShareButton({ playlistId }: { playlistId: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Share2 className="size-4" />
        Share
      </Button>
      <ShareDialog playlistId={playlistId} open={open} onOpenChange={setOpen} />
    </>
  )
}
