"use client"

import { motion } from "motion/react"
import { Flame, Snowflake, Trophy } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"

import type { StreakSummary } from "@/lib/streaks"

function prettyShortDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number)
  return new Date(Date.UTC(y!, m! - 1, d!)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  })
}

export function StreakStrip({ streak }: { streak: StreakSummary }) {
  return (
    <div className="border-border bg-card flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl border px-5 py-4">
      <div className="flex items-center gap-2.5">
        {/* DESIGN.md §6.5: flame-lighting micro-animation when today is lit. */}
        <motion.div
          initial={streak.activeToday ? { scale: 0.4, rotate: -12 } : false}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 14 }}
        >
          <motion.div
            animate={streak.activeToday ? { scale: [1, 1.07, 1] } : { scale: 1 }}
            transition={{ repeat: Infinity, duration: 2.6, ease: "easeInOut" }}
          >
            <Flame
              className={cn(
                "size-7",
                streak.activeToday ? "fill-primary/30 text-primary" : "text-muted-foreground",
              )}
            />
          </motion.div>
        </motion.div>
        <div>
          <div className="font-mono text-xl leading-none font-semibold">
            {streak.currentStreak}
          </div>
          <div className="text-muted-foreground text-xs">
            day streak
            {streak.activeToday && <span className="text-primary ml-1">· lit today</span>}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Trophy className="text-muted-foreground size-4" />
        <span className="text-muted-foreground text-sm">
          Longest <span className="text-foreground font-mono font-medium">{streak.longestStreak}</span>
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Snowflake
          className={cn("size-4", streak.freezeAvailable ? "text-primary" : "text-muted-foreground")}
        />
        <span className="text-muted-foreground text-sm">
          {streak.freezeAvailable
            ? "Streak freeze available this week"
            : streak.frozenDateThisWeek
              ? `Freeze used ${prettyShortDate(streak.frozenDateThisWeek)}`
              : "Freeze used this week"}
        </span>
      </div>
    </div>
  )
}
