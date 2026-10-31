import { ImageResponse } from "next/og"

export const size = { width: 180, height: 180 }
export const contentType = "image/png"

/** The sticky mark for home screens and bookmarks: the header's mark, on white, at 180px. */
export default function AppleIcon() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#ffffff" }}>
      <div style={{ width: 124, height: 124, borderRadius: 31, border: "7px solid #e8d995", background: "#fdf6c8", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ height: "32%", background: "#f6e9a6" }} />
      </div>
    </div>,
    size,
  )
}
