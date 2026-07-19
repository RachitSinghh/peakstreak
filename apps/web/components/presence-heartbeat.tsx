"use client"

// FT-S1: keeps the current user's presence key fresh. Pings every 15s (< the
// 45s TTL) and again immediately whenever the studying signal flips, so other
// people see the change quickly. Mounted once in the app layout.

import { useEffect } from "react"

import { useIsStudying } from "@/lib/study-signal"

const PING_MS = 15_000

export function PresenceHeartbeat() {
  const studying = useIsStudying()

  // Re-runs when `studying` flips: pings immediately (snappy for others) and
  // restarts the steady 15s heartbeat, so the interval always sends the
  // current status. Status flips are rare, so resetting the timer is cheap.
  useEffect(() => {
    function ping() {
      void fetch("/api/presence", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: studying ? "studying" : "online" }),
        keepalive: true,
      }).catch(() => {})
    }
    ping()
    const id = setInterval(ping, PING_MS)
    return () => clearInterval(id)
  }, [studying])

  return null
}
