"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"

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

import { updateSettings } from "@/app/(app)/settings/actions"

function timezoneOptions(current: string): string[] {
  const zones =
    typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : []
  return zones.includes(current) ? zones : [current, ...zones]
}

function hourLabel(hour: number): string {
  const h12 = hour % 12 === 0 ? 12 : hour % 12
  return `${h12}:00 ${hour < 12 ? "AM" : "PM"}`
}

export function SettingsForm(props: {
  timezone: string
  remindersEnabled: boolean
  reminderHourLocal: number
  showOnLeaderboard: boolean
  displayName: string
}) {
  const [timezone, setTimezone] = useState(props.timezone)
  const [remindersEnabled, setRemindersEnabled] = useState(props.remindersEnabled)
  const [hour, setHour] = useState(props.reminderHourLocal)
  const [showOnLeaderboard, setShowOnLeaderboard] = useState(props.showOnLeaderboard)
  const [displayName, setDisplayName] = useState(props.displayName)
  const [pending, startTransition] = useTransition()

  function submit() {
    startTransition(async () => {
      const result = await updateSettings({
        timezone,
        remindersEnabled,
        reminderHourLocal: hour,
        showOnLeaderboard,
        displayName: displayName.trim(),
      })
      if (result.error) toast.error(result.error)
      else toast.success("Settings saved")
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label>Timezone</Label>
        <Select value={timezone} onValueChange={(v) => v && setTimezone(v)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {timezoneOptions(props.timezone).map((zone) => (
              <SelectItem key={zone} value={zone}>
                {zone.replaceAll("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-muted-foreground text-xs">
          Streak days run midnight-to-midnight in this timezone.
        </p>
      </div>

      <div className="border-border bg-card flex items-center justify-between rounded-xl border p-4">
        <div>
          <Label htmlFor="reminders-toggle">Daily email reminder</Label>
          <p className="text-muted-foreground mt-0.5 text-xs">
            One email on days you haven&apos;t watched anything — never more.
          </p>
        </div>
        <input
          id="reminders-toggle"
          type="checkbox"
          checked={remindersEnabled}
          onChange={(e) => setRemindersEnabled(e.target.checked)}
          className="accent-primary size-5"
        />
      </div>

      {remindersEnabled && (
        <div className="flex flex-col gap-2">
          <Label>Reminder time</Label>
          <Select value={String(hour)} onValueChange={(v) => setHour(Number(v))}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {Array.from({ length: 24 }, (_, h) => (
                <SelectItem key={h} value={String(h)}>
                  {hourLabel(h)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="border-border flex flex-col gap-4 border-t pt-6">
        <div className="border-border bg-card flex items-center justify-between rounded-xl border p-4">
          <div>
            <Label htmlFor="leaderboard-toggle">Show me on the leaderboard</Label>
            <p className="text-muted-foreground mt-0.5 text-xs">
              Your activity appears under a display name only — never your email.
            </p>
          </div>
          <input
            id="leaderboard-toggle"
            type="checkbox"
            checked={showOnLeaderboard}
            onChange={(e) => setShowOnLeaderboard(e.target.checked)}
            className="accent-primary size-5"
          />
        </div>

        {showOnLeaderboard && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="display-name">Display name</Label>
            <Input
              id="display-name"
              value={displayName}
              maxLength={40}
              placeholder="Defaults to your first name"
              onChange={(e) => setDisplayName(e.target.value)}
            />
            <p className="text-muted-foreground text-xs">
              Leave blank to use your first name, or an anonymous label if you have none.
            </p>
          </div>
        )}
      </div>

      <Button onClick={submit} disabled={pending} className="self-start">
        {pending ? "Saving…" : "Save settings"}
      </Button>
    </div>
  )
}
