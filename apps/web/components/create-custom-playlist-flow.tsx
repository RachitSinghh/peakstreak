"use client"

import { useState, useTransition } from "react"

import { Alert, AlertDescription } from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Textarea } from "@workspace/ui/components/textarea"
import { cn } from "@workspace/ui/lib/utils"

import { createCustomPlaylistAction } from "@/app/(app)/playlists/actions"
import { PLAYBACK_SPEEDS, validatePace, type Pace, type PaceType } from "@/lib/pace"

// ponytail: pace/speed UI mirrors add-playlist-flow.tsx. Extract a <PacePicker>
// only if a third caller shows up — two isn't worth destabilizing that flow.
const PACE_PRESETS: Array<{ label: string; pace: Pace }> = [
  { label: "30 min / day", pace: { type: "minutes_per_day", value: 30 } },
  { label: "1 hour / day", pace: { type: "minutes_per_day", value: 60 } },
  { label: "1 video / day", pace: { type: "videos_per_day", value: 1 } },
  { label: "2 videos / day", pace: { type: "videos_per_day", value: 2 } },
]

export function CreateCustomPlaylistFlow() {
  const [name, setName] = useState("")
  const [urls, setUrls] = useState("")
  const [presetIndex, setPresetIndex] = useState<number | "custom">(2)
  const [customValue, setCustomValue] = useState("1")
  const [customType, setCustomType] = useState<PaceType>("videos_per_day")
  const [speed, setSpeed] = useState<number>(1)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const pace: Pace =
    presetIndex === "custom"
      ? { type: customType, value: Number(customValue) }
      : PACE_PRESETS[presetIndex]!.pace
  const paceError = presetIndex === "custom" ? validatePace(pace) : null

  const canSubmit = name.trim() !== "" && urls.trim() !== "" && !paceError && !pending

  function submit() {
    if (!canSubmit) return
    setError(null)
    start(async () => {
      const result = await createCustomPlaylistAction({
        name,
        urls,
        paceType: pace.type,
        paceValue: pace.value,
        playbackSpeed: speed,
      })
      // Success redirects; reaching here means it returned an error.
      if (result?.error) setError(result.error)
    })
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="border-border bg-card flex flex-col gap-5 rounded-xl border p-5">
        <div>
          <Label htmlFor="cp-name" className="mb-2 block">
            Playlist name
          </Label>
          <Input
            id="cp-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. CI/CD from scratch"
            autoFocus
          />
        </div>

        <div>
          <Label htmlFor="cp-urls" className="mb-2 block">
            Video links
          </Label>
          <Textarea
            id="cp-urls"
            value={urls}
            onChange={(e) => setUrls(e.target.value)}
            placeholder={"One YouTube video link per line…\nhttps://youtu.be/…\nhttps://www.youtube.com/watch?v=…"}
            rows={6}
          />
          <p className="text-muted-foreground mt-1.5 text-xs">
            Paste one link per line. Order is kept; unavailable videos are skipped.
          </p>
        </div>
      </div>

      <div className="border-border bg-card rounded-xl border p-5">
        <Label className="mb-2.5 block">Your pace</Label>
        <div className="flex flex-wrap gap-2">
          {PACE_PRESETS.map((preset, i) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => setPresetIndex(i)}
              className={cn(
                "border-border rounded-lg border px-3 py-1.5 text-sm transition-colors",
                presetIndex === i
                  ? "border-primary bg-primary/10 text-foreground"
                  : "text-muted-foreground hover:bg-secondary",
              )}
            >
              {preset.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPresetIndex("custom")}
            className={cn(
              "border-border rounded-lg border px-3 py-1.5 text-sm transition-colors",
              presetIndex === "custom"
                ? "border-primary bg-primary/10 text-foreground"
                : "text-muted-foreground hover:bg-secondary",
            )}
          >
            Custom
          </button>
        </div>

        {presetIndex === "custom" && (
          <div className="mt-3 flex items-center gap-2">
            <Input
              type="number"
              inputMode="numeric"
              value={customValue}
              onChange={(e) => setCustomValue(e.target.value)}
              className="w-24"
              aria-label="Custom pace value"
            />
            <Select value={customType} onValueChange={(v) => setCustomType(v as PaceType)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="minutes_per_day">minutes / day</SelectItem>
                <SelectItem value="videos_per_day">videos / day</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        {paceError && <p className="text-destructive mt-2 text-sm">{paceError}</p>}

        <Label className="mt-5 mb-2.5 block">Playback speed</Label>
        <div className="flex gap-2">
          {PLAYBACK_SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSpeed(s)}
              className={cn(
                "border-border rounded-lg border px-3 py-1.5 font-mono text-sm transition-colors",
                speed === s
                  ? "border-primary bg-primary/10 text-foreground"
                  : "text-muted-foreground hover:bg-secondary",
              )}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button onClick={submit} disabled={!canSubmit} size="lg" className="self-start">
        {pending ? "Creating…" : "Create playlist"}
      </Button>
    </div>
  )
}
