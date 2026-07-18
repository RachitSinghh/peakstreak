import type { Metadata } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"

import "@workspace/ui/globals.css"
import { Toaster } from "@workspace/ui/components/sonner"
import { cn } from "@workspace/ui/lib/utils"

import { ThemeProvider } from "@/components/theme-provider"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
const DESCRIPTION =
  "Paste a YouTube playlist. See exactly how long it takes. Actually finish it."

export const metadata: Metadata = {
  // Required so OG/Twitter/canonical relative URLs resolve to absolute ones.
  metadataBase: new URL(APP_URL),
  title: {
    default: "PeakStreak — actually finish the playlists you save",
    template: "%s · PeakStreak",
  },
  description: DESCRIPTION,
  applicationName: "PeakStreak",
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "PeakStreak",
    title: "PeakStreak — actually finish the playlists you save",
    description: DESCRIPTION,
    // og:image is auto-injected by app/opengraph-image.tsx (file convention).
  },
  twitter: {
    card: "summary_large_image",
    title: "PeakStreak — actually finish the playlists you save",
    description: DESCRIPTION,
    // twitter:image is auto-injected from app/opengraph-image.tsx too.
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("antialiased", fontMono.variable, "font-sans", inter.variable)}
    >
      <body>
        {/* Dark-only in v1 per DESIGN.md — no light theme exists yet. */}
        <ThemeProvider forcedTheme="dark">
          {children}
          <Toaster />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
