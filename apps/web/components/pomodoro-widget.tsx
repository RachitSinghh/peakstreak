"use client"

// FT-PM1 UI + FT-PM2 celebration. Floating bottom-right timer widget.

import { useEffect, useRef, useState } from "react"
import {
  Coffee,
  Pause,
  Play,
  RotateCcw,
  Settings2,
  SkipForward,
  Timer as TimerIcon,
  X,
} from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog"

import { Confetti } from "@/components/confetti"
import { DEFAULT_SETTINGS, PomodoroSettings, usePomodoro } from "@/hooks/use-pomodoro"

function mmss(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
}

const PHASE_META = {
  work: { label: "Focus", tint: "text-primary", dot: "bg-primary" },
  short_break: { label: "Break earned 🎉", tint: "text-success", dot: "bg-success" },
  long_break: { label: "Long break 🎉", tint: "text-success", dot: "bg-success" },
  idle: { label: "Pomodoro", tint: "text-muted-foreground", dot: "bg-muted-foreground" },
  done: { label: "Done", tint: "text-success", dot: "bg-success" },
} as const

export function PomodoroWidget() {
  const p = usePomodoro()
  const [open, setOpen] = useState(false)
  const [celebrate, setCelebrate] = useState(false)
  const lastCeleb = useRef(0)

  // FT-PM2: fire confetti on each *natural* work completion.
  useEffect(() => {
    if (p.celebrationKey === 0 || p.celebrationKey === lastCeleb.current) return
    lastCeleb.current = p.celebrationKey
    if (!p.settings.animationsEnabled) return
    setCelebrate(true)
    const id = setTimeout(() => setCelebrate(false), 3500)
    return () => clearTimeout(id)
  }, [p.celebrationKey, p.settings.animationsEnabled])

  if (!p.ready) return null

  const meta = PHASE_META[p.phase]
  const idle = p.phase === "idle" || p.phase === "done"
  const onBreak = p.phase === "short_break" || p.phase === "long_break"

  // Collapsed pill when idle and not expanded.
  if (idle && !open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="border-border bg-background text-foreground hover:bg-muted fixed right-4 bottom-4 z-40 inline-flex items-center gap-2 rounded-full border py-2 pr-3 pl-2.5 text-sm font-medium shadow-lg transition-colors"
        aria-label="Open Pomodoro timer"
      >
        <TimerIcon className="text-primary size-4" />
        Pomodoro
      </button>
    )
  }

  return (
    <>
      {celebrate ? <Confetti key={p.celebrationKey} /> : null}
      <div className="border-border bg-background fixed right-4 bottom-4 z-40 flex w-[min(92vw,20rem)] flex-col gap-3 rounded-xl border p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`inline-block size-2 rounded-full ${meta.dot}`} />
            <span className={`text-sm font-semibold ${meta.tint}`}>{meta.label}</span>
          </div>
          <div className="flex items-center gap-1">
            <SettingsDialog settings={p.settings} onSave={p.saveSettings} />
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() => setOpen(false)}
              aria-label="Collapse"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>

        {p.taskLabel ? (
          <p className="text-muted-foreground -mt-1 truncate text-xs">
            Task: <span className="text-foreground">{p.taskLabel}</span>
            {p.targetCycles ? ` · ${p.completedWorkCount}/${p.targetCycles} cycles` : null}
          </p>
        ) : null}

        <div className="flex items-baseline justify-center">
          <span className="font-mono text-5xl font-bold tabular-nums">{mmss(p.remaining)}</span>
        </div>

        {onBreak ? (
          <p className="text-muted-foreground flex items-center justify-center gap-1.5 text-xs">
            <Coffee className="size-3.5" /> You earned this break.
          </p>
        ) : null}

        <div className="flex items-center justify-center gap-2">
          {idle ? (
            <Button size="sm" onClick={p.start}>
              <Play className="size-4" /> Start focus
            </Button>
          ) : p.running ? (
            <Button size="sm" variant="secondary" onClick={p.pause}>
              <Pause className="size-4" /> Pause
            </Button>
          ) : (
            <Button size="sm" onClick={p.resume}>
              <Play className="size-4" /> Resume
            </Button>
          )}
          {!idle ? (
            <Button size="sm" variant="ghost" onClick={p.skip} aria-label="Skip phase">
              <SkipForward className="size-4" /> Skip
            </Button>
          ) : null}
          {!idle ? (
            <Button size="sm" variant="ghost" onClick={p.reset} aria-label="Reset timer">
              <RotateCcw className="size-4" />
            </Button>
          ) : null}
        </div>
      </div>
    </>
  )
}

function SettingsDialog({
  settings,
  onSave,
}: {
  settings: PomodoroSettings
  onSave: (s: PomodoroSettings) => void
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(settings)

  // Re-sync when opening so we never edit stale values.
  useEffect(() => {
    if (open) setDraft(settings)
  }, [open, settings])

  function num(v: string, fallback: number): number {
    const n = Number(v)
    return Number.isFinite(n) && n > 0 ? Math.min(180, Math.round(n)) : fallback
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="icon-sm" variant="ghost" aria-label="Pomodoro settings">
            <Settings2 className="size-4" />
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pomodoro settings</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <Field
            label="Focus (min)"
            value={draft.workMinutes}
            onChange={(v) => setDraft({ ...draft, workMinutes: num(v, draft.workMinutes) })}
          />
          <Field
            label="Short break (min)"
            value={draft.shortBreakMinutes}
            onChange={(v) =>
              setDraft({ ...draft, shortBreakMinutes: num(v, draft.shortBreakMinutes) })
            }
          />
          <Field
            label="Long break (min)"
            value={draft.longBreakMinutes}
            onChange={(v) =>
              setDraft({ ...draft, longBreakMinutes: num(v, draft.longBreakMinutes) })
            }
          />
          <Field
            label="Cycles / long break"
            value={draft.cyclesBeforeLongBreak}
            onChange={(v) =>
              setDraft({ ...draft, cyclesBeforeLongBreak: num(v, draft.cyclesBeforeLongBreak) })
            }
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={draft.soundEnabled}
            onChange={(e) => setDraft({ ...draft, soundEnabled: e.target.checked })}
          />
          Sound cue on phase change
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={draft.animationsEnabled}
            onChange={(e) => setDraft({ ...draft, animationsEnabled: e.target.checked })}
          />
          Celebration animation
        </label>
        <DialogFooter>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDraft(DEFAULT_SETTINGS)}
            type="button"
          >
            Reset defaults
          </Button>
          <Button
            size="sm"
            onClick={() => {
              onSave(draft)
              setOpen(false)
            }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        min={1}
        max={180}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}
