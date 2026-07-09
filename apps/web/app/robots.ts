import type { MetadataRoute } from "next"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Private, auth-gated surfaces — no value in crawling, and they just
      // redirect to /login for a bot anyway.
      disallow: ["/api/", "/dashboard", "/playlists", "/settings", "/completed", "/leaderboard"],
    },
    sitemap: `${APP_URL}/sitemap.xml`,
    host: APP_URL,
  }
}
