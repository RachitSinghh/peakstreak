"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

import { Button } from "@workspace/ui/components/button"

/**
 * Landing header. Transparent over the hero, then settles into a blurred,
 * bordered bar once the user scrolls past the fold. The entrance is a CSS
 * animation (`.ps-header-in`); the only JS is a passive scroll listener that
 * toggles `data-stuck` — no animation library needed.
 */
export function SiteHeader() {
  const [stuck, setStuck] = useState(false)

  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 24)
    onScroll() // sync initial state (e.g. on refresh mid-page)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <header
      data-stuck={stuck}
      className="ps-header-in data-[stuck=true]:border-border data-[stuck=true]:bg-background/70 fixed inset-x-0 top-0 z-50 border-b border-transparent transition-colors duration-300 data-[stuck=true]:backdrop-blur-xl"
    >
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        <Link href="/dashboard" className="text-base font-semibold tracking-tight">
          Peak<span className="text-primary">Streak</span>
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="ghost" render={<Link href="/login" />}>
            Log in
          </Button>
          <Button variant="outline" render={<Link href="/signup" />}>
            Sign up
          </Button>
        </div>
      </div>
    </header>
  )
}
