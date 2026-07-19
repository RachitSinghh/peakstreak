"use client"

// A tiny cross-tree signal for "is the user actively studying right now?".
// Multiple sources contribute (the Pomodoro timer during a work interval, the
// video player while playing); the user counts as studying if ANY source is
// active. Lives outside React so any component can set it without prop
// drilling or a shared context — read it with useIsStudying().

import { useSyncExternalStore } from "react"

const sources = new Set<string>()
const listeners = new Set<() => void>()

export function setStudying(source: string, active: boolean): void {
  const had = sources.has(source)
  if (active === had) return // no change
  if (active) sources.add(source)
  else sources.delete(source)
  listeners.forEach((l) => l())
}

function subscribe(l: () => void): () => void {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function useIsStudying(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => sources.size > 0,
    () => false, // server snapshot
  )
}
