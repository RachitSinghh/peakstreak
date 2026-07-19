// Pure Pomodoro math, kept separate from the React engine so it's testable.

/**
 * FT-PM5: how many work cycles are needed to cover a task, rounding the final
 * partial interval up (the default behaviour). Always at least one cycle.
 */
export function cyclesForTask(estimateMinutes: number, workMinutes: number): number {
  const w = Math.max(1, Math.floor(workMinutes))
  return Math.max(1, Math.ceil(Math.max(0, estimateMinutes) / w))
}

/**
 * FT-PM1: after `completedWorkCount` finished work intervals, is the next
 * break the long one? Long break lands every Nth cycle.
 */
export function isLongBreak(completedWorkCount: number, cyclesBeforeLongBreak: number): boolean {
  const n = Math.max(1, Math.floor(cyclesBeforeLongBreak))
  return completedWorkCount > 0 && completedWorkCount % n === 0
}
