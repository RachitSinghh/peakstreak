"use client"

// FT-PM1/PM2/PM5: Pomodoro engine. All state lives client-side in
// localStorage; the source of truth for "time left" is a start timestamp,
// so the timer survives tab switches and page refreshes (we recompute
// remaining = duration - (now - startedAt) rather than trusting a JS
// interval that pauses on background tabs).

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

import { setStudying } from "@/lib/study-signal"

export type Phase = "idle" | "work" | "short_break" | "long_break" | "done"

export type PomodoroSettings = {
  workMinutes: number
  shortBreakMinutes: number
  longBreakMinutes: number
  cyclesBeforeLongBreak: number
  soundEnabled: boolean
  animationsEnabled: boolean
}

export const DEFAULT_SETTINGS: PomodoroSettings = {
  workMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  cyclesBeforeLongBreak: 4,
  soundEnabled: true,
  animationsEnabled: true,
}

type TimerState = {
  phase: Phase
  // Epoch ms the current phase started. null while idle/paused.
  startedAt: number | null
  // Seconds left, captured on pause. null while running.
  pausedRemaining: number | null
  // Work intervals completed in the current run (drives long-break cadence).
  completedWorkCount: number
  // FT-PM5: an auto-scheduled run bound to a todo.
  taskId: string | null
  taskLabel: string | null
  targetCycles: number | null
}

const IDLE: TimerState = {
  phase: "idle",
  startedAt: null,
  pausedRemaining: null,
  completedWorkCount: 0,
  taskId: null,
  taskLabel: null,
  targetCycles: null,
}

const STATE_KEY = "ps-pomodoro-state"
const SETTINGS_KEY = "ps-pomodoro-settings"

function phaseSeconds(phase: Phase, s: PomodoroSettings): number {
  switch (phase) {
    case "work":
      return s.workMinutes * 60
    case "short_break":
      return s.shortBreakMinutes * 60
    case "long_break":
      return s.longBreakMinutes * 60
    default:
      return 0
  }
}

function beep(freq: number) {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0.15, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4)
    osc.start()
    osc.stop(ctx.currentTime + 0.4)
    osc.onended = () => void ctx.close()
  } catch {
    /* audio is a nicety, never fatal */
  }
}

type PomodoroContextValue = {
  ready: boolean
  settings: PomodoroSettings
  saveSettings: (next: PomodoroSettings) => void
  phase: Phase
  remaining: number // seconds left in current phase
  total: number // phase length in seconds
  running: boolean
  completedWorkCount: number
  taskId: string | null
  taskLabel: string | null
  targetCycles: number | null
  // FT-PM2: bump on each *natural* work completion. Widget watches this.
  celebrationKey: number
  isStudying: boolean // FT-S1 seam: true while a work interval is running
  start: () => void
  pause: () => void
  resume: () => void
  reset: () => void
  skip: () => void
  startForTask: (task: { id: string; label: string; cycles: number }) => void
}

const PomodoroContext = createContext<PomodoroContextValue | null>(null)

export function PomodoroProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)
  const [settings, setSettings] = useState<PomodoroSettings>(DEFAULT_SETTINGS)
  const [state, setState] = useState<TimerState>(IDLE)
  const [now, setNow] = useState(0)
  const [celebrationKey, setCelebrationKey] = useState(0)
  // When true, the schedule just hit its target — widget prompts to mark done.
  const [scheduleDoneTask, setScheduleDoneTask] = useState<{ id: string; label: string } | null>(
    null,
  )

  // Load persisted state/settings once on mount (avoids SSR hydration mismatch).
  useEffect(() => {
    try {
      const rawS = localStorage.getItem(SETTINGS_KEY)
      if (rawS) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(rawS) })
      const rawT = localStorage.getItem(STATE_KEY)
      if (rawT) setState({ ...IDLE, ...JSON.parse(rawT) })
    } catch {
      /* corrupt storage → defaults */
    }
    setNow(Date.now())
    setReady(true)
  }, [])

  // Persist timer state whenever it changes.
  useEffect(() => {
    if (!ready) return
    try {
      localStorage.setItem(STATE_KEY, JSON.stringify(state))
    } catch {
      /* ignore quota errors */
    }
  }, [state, ready])

  const running = state.phase !== "idle" && state.phase !== "done" && state.startedAt !== null

  // 1s ticker only while running — just forces a re-render; the real clock
  // is Date.now() vs startedAt, so a throttled/backgrounded tab stays correct.
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [running])

  const total = phaseSeconds(state.phase, settings)
  const remaining =
    state.pausedRemaining != null
      ? state.pausedRemaining
      : state.startedAt != null
        ? Math.max(0, total - Math.floor((now - state.startedAt) / 1000))
        : total

  // Advance to the next phase when the clock runs out.
  const advance = useCallback(
    (natural: boolean) => {
      setState((prev) => {
        const startNow = Date.now()
        if (prev.phase === "work") {
          const done = natural ? prev.completedWorkCount + 1 : prev.completedWorkCount
          if (natural) {
            setCelebrationKey((k) => k + 1)
            if (settings.soundEnabled) beep(660)
            // FT-S2: bank this completed focus interval toward today's study time.
            void fetch("/api/study-time/focus", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ seconds: phaseSeconds("work", settings) }),
              keepalive: true,
            }).catch(() => {})
          }
          // FT-PM5: scheduled run finished all its work intervals.
          if (natural && prev.targetCycles != null && done >= prev.targetCycles) {
            if (prev.taskId) setScheduleDoneTask({ id: prev.taskId, label: prev.taskLabel ?? "" })
            return { ...IDLE, phase: "done", completedWorkCount: done }
          }
          return {
            ...prev,
            phase: isLongBreak(done, settings.cyclesBeforeLongBreak) ? "long_break" : "short_break",
            startedAt: startNow,
            pausedRemaining: null,
            completedWorkCount: done,
          }
        }
        // A break ended (or was skipped) → back to work.
        if (settings.soundEnabled && (prev.phase === "short_break" || prev.phase === "long_break")) {
          beep(520)
        }
        return { ...prev, phase: "work", startedAt: startNow, pausedRemaining: null }
      })
    },
    [settings],
  )

  // Fire the transition exactly once when remaining hits 0.
  const advancedForRef = useRef<number | null>(null)
  useEffect(() => {
    if (!running || state.startedAt == null) return
    if (remaining <= 0 && advancedForRef.current !== state.startedAt) {
      advancedForRef.current = state.startedAt
      advance(true)
    }
  }, [running, remaining, state.startedAt, advance])

  // FT-S1: a running work interval means the user is studying.
  useEffect(() => {
    setStudying("pomodoro", running && state.phase === "work")
  }, [running, state.phase])

  const start = useCallback(() => {
    setState((prev) => ({
      ...prev,
      phase: "work",
      startedAt: Date.now(),
      pausedRemaining: null,
    }))
  }, [])

  const pause = useCallback(() => {
    setState((prev) => {
      if (prev.startedAt == null) return prev
      const t = phaseSeconds(prev.phase, settings)
      const rem = Math.max(0, t - Math.floor((Date.now() - prev.startedAt) / 1000))
      return { ...prev, pausedRemaining: rem, startedAt: null }
    })
  }, [settings])

  const resume = useCallback(() => {
    setState((prev) => {
      if (prev.pausedRemaining == null) return prev
      const t = phaseSeconds(prev.phase, settings)
      // Backdate startedAt so the recomputed remaining equals what was paused.
      const startedAt = Date.now() - (t - prev.pausedRemaining) * 1000
      return { ...prev, startedAt, pausedRemaining: null }
    })
  }, [settings])

  const reset = useCallback(() => {
    setScheduleDoneTask(null)
    setState(IDLE)
  }, [])

  const skip = useCallback(() => advance(false), [advance])

  const startForTask = useCallback(
    (task: { id: string; label: string; cycles: number }) => {
      setScheduleDoneTask(null)
      setState({
        ...IDLE,
        phase: "work",
        startedAt: Date.now(),
        taskId: task.id,
        taskLabel: task.label,
        targetCycles: Math.max(1, Math.round(task.cycles)),
      })
    },
    [],
  )

  const saveSettings = useCallback((next: PomodoroSettings) => {
    setSettings(next)
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(next))
    } catch {
      /* ignore */
    }
  }, [])

  const value = useMemo<PomodoroContextValue>(
    () => ({
      ready,
      settings,
      saveSettings,
      phase: state.phase,
      remaining,
      total,
      running,
      completedWorkCount: state.completedWorkCount,
      taskId: state.taskId,
      taskLabel: state.taskLabel,
      targetCycles: state.targetCycles,
      celebrationKey,
      isStudying: running && state.phase === "work",
      start,
      pause,
      resume,
      reset,
      skip,
      startForTask,
    }),
    [
      ready,
      settings,
      saveSettings,
      state,
      remaining,
      total,
      running,
      celebrationKey,
      start,
      pause,
      resume,
      reset,
      skip,
      startForTask,
    ],
  )

  return (
    <PomodoroContext.Provider value={value}>
      {children}
      {scheduleDoneTask ? (
        <ScheduleDonePrompt task={scheduleDoneTask} onClose={() => setScheduleDoneTask(null)} />
      ) : null}
    </PomodoroContext.Provider>
  )
}

export function usePomodoro(): PomodoroContextValue {
  const ctx = useContext(PomodoroContext)
  if (!ctx) throw new Error("usePomodoro must be used within a PomodoroProvider")
  return ctx
}

// FT-PM5: after all scheduled cycles complete, confirm marking the task done
// (never automatic). Lives here so the engine can raise it from anywhere.
import { CheckCircle2 } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { toast } from "sonner"

import { isLongBreak } from "@/lib/pomodoro"

function ScheduleDonePrompt({
  task,
  onClose,
}: {
  task: { id: string; label: string }
  onClose: () => void
}) {
  const [pending, setPending] = useState(false)
  async function markDone() {
    setPending(true)
    try {
      const res = await fetch(`/api/todos/${task.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ completed: true }),
      })
      if (!res.ok) throw new Error()
      toast.success("Task marked done 🎉")
      onClose()
    } catch {
      toast.error("Couldn't update the task")
      setPending(false)
    }
  }
  return (
    <div className="fixed inset-x-0 bottom-24 z-50 mx-auto flex w-[min(92vw,26rem)] flex-col gap-3 rounded-xl border border-border bg-background p-4 shadow-lg sm:right-6 sm:left-auto sm:mx-0">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="text-success size-5" />
        <p className="text-sm font-semibold">All cycles done!</p>
      </div>
      <p className="text-muted-foreground text-sm">
        You finished the Pomodoro schedule for{" "}
        <span className="text-foreground font-medium">{task.label || "your task"}</span>. Mark it
        complete?
      </p>
      <div className="flex gap-2">
        <Button size="sm" onClick={markDone} disabled={pending}>
          Mark done
        </Button>
        <Button size="sm" variant="ghost" onClick={onClose} disabled={pending}>
          Not yet
        </Button>
      </div>
    </div>
  )
}
