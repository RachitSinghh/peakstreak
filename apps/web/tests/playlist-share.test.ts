import { describe, expect, it } from "vitest"

import { slugify } from "@/lib/slug"

describe("slugify", () => {
  it("makes readable slugs from names", () => {
    expect(slugify("Summer Roadtrip Mix")).toBe("summer-roadtrip-mix")
  })
  it("strips accents, emojis and punctuation", () => {
    expect(slugify("Café ☕ Beats!!!")).toBe("cafe-beats")
  })
  it("falls back when nothing survives", () => {
    expect(slugify("🎧🔥")).toBe("playlist")
    expect(slugify("   ")).toBe("playlist")
  })
  it("trims to a URL-safe length with no trailing hyphen", () => {
    const s = slugify("word ".repeat(40))
    expect(s.length).toBeLessThanOrEqual(60)
    expect(s.endsWith("-")).toBe(false)
  })
})
