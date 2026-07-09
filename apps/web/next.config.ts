import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  transpilePackages: ["@workspace/ui"],
  images: {
    // YouTube Data API serves all thumbnails from i.ytimg.com. Allowing it lets
    // next/image proxy + resize + re-encode them (AVIF/WebP) instead of us
    // shipping full-size JPEGs straight from YouTube.
    remotePatterns: [{ protocol: "https", hostname: "i.ytimg.com" }],
    formats: ["image/avif", "image/webp"],
  },
  // Tree-shake lucide's barrel so only the icons actually used are bundled.
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
}

export default nextConfig
