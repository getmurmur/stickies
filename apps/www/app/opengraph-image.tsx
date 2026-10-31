import { ImageResponse } from "next/og"

export const alt = "stickies.live: an open format for moving sticky notes between apps"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

const NOTES = [
  { text: "Sticky notes as an open standard", paper: "#fdf6c8", header: "#f6e9a6", edge: "#e8d995", ink: "#3b3214", x: 600, y: 70, r: -3 },
  { text: "State is data, colour is display", paper: "#fbe1ed", header: "#f5c9dd", edge: "#e7abc6", ink: "#4a1f31", x: 880, y: 150, r: 4 },
  { text: "Copy here, paste anywhere", paper: "#ddedfb", header: "#c7dff6", edge: "#abc9ea", ink: "#1d3049", x: 640, y: 330, r: 2 },
  { text: "Bought stickies.live", paper: "#def3d7", header: "#c8e9bd", edge: "#a9d69c", ink: "#22391c", x: 910, y: 400, r: -4 },
]

/** The link preview: the name and line on the left, a few notes on the right. */
export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", background: "#fcfcfd", position: "relative", fontFamily: "sans-serif" }}>
      <div style={{ position: "absolute", left: 80, top: 0, bottom: 0, width: 500, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ width: 48, height: 48, borderRadius: 11, border: "2px solid #e0cf82", background: "#fdf6c8", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ height: 15, background: "#f2e08f" }} />
          </div>
          <div style={{ fontSize: 44, fontWeight: 600, color: "#1c2024" }}>stickies.live</div>
        </div>
        <div style={{ marginTop: 34, fontSize: 52, lineHeight: 1.15, fontWeight: 600, color: "#1c2024" }}>An open format for moving sticky notes between apps</div>
        <div style={{ marginTop: 26, fontSize: 26, color: "#80838d" }}>Spec · React components · Agent skill</div>
      </div>
      {NOTES.map((n) => (
        <div
          key={n.text}
          style={{
            position: "absolute",
            left: n.x,
            top: n.y,
            width: 260,
            height: 180,
            display: "flex",
            flexDirection: "column",
            borderRadius: 16,
            border: `2px solid ${n.edge}`,
            background: n.paper,
            transform: `rotate(${n.r}deg)`,
            boxShadow: "0 18px 40px -16px rgba(40,30,10,0.28)",
            overflow: "hidden",
          }}
        >
          <div style={{ height: 32, background: n.header }} />
          <div style={{ padding: "18px 22px", fontSize: 26, lineHeight: 1.3, color: n.ink }}>{n.text}</div>
        </div>
      ))}
    </div>,
    size,
  )
}
