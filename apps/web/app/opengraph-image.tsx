import { ImageResponse } from "next/og"

// Dynamically-generated social share image (1200×630). Next wires this up as
// og:image and twitter:image automatically — no static asset to maintain.

export const alt = "PeakStreak — actually finish the playlists you save"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#010102",
          padding: "72px",
          fontFamily: "sans-serif",
        }}
      >
        {/* soft lavender glow, top-right */}
        <div
          style={{
            position: "absolute",
            top: "-160px",
            right: "-120px",
            width: "520px",
            height: "520px",
            borderRadius: "9999px",
            background: "radial-gradient(circle, rgba(94,106,210,0.35), transparent 62%)",
          }}
        />
        <div style={{ display: "flex", fontSize: 30, fontWeight: 600, color: "#f7f8f8" }}>
          Peak<span style={{ color: "#8b95e8" }}>Streak</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              fontSize: 68,
              fontWeight: 600,
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              color: "#f7f8f8",
              maxWidth: "900px",
            }}
          >
            <span>YouTube keeps you watching. PeakStreak makes you&nbsp;</span>
            <span style={{ color: "#8b95e8" }}>finish.</span>
          </div>
          <div style={{ fontSize: 30, color: "#8a8f98", maxWidth: "820px" }}>
            Paste a YouTube playlist. See exactly how long it takes. Actually finish it.
          </div>
        </div>
      </div>
    ),
    { ...size },
  )
}
