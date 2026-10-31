import type { ReactNode } from "react"
import "tldraw/tldraw.css"

export const metadata = { title: "Stickies in tldraw" }

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  )
}
