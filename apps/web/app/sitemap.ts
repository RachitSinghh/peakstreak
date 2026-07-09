import type { MetadataRoute } from "next"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

// Only the publicly-reachable, indexable pages. Everything else lives behind
// auth (see proxy.ts) and is disallowed in robots.ts.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${APP_URL}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${APP_URL}/signup`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${APP_URL}/login`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${APP_URL}/feedback`, changeFrequency: "monthly", priority: 0.3 },
  ]
}
