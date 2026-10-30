import type { Metadata, Viewport } from "next"
import type { ReactNode } from "react"
import "./globals.css"

export const metadata: Metadata = {
  title: "stickies.live",
  description: "An open format for moving sticky notes between apps.",
  metadataBase: new URL("https://stickies.live"),
}

export const viewport: Viewport = {
  themeColor: "#fcfcfd",
  colorScheme: "light",
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="overscroll-none">
      <body className="overscroll-none">{children}</body>
    </html>
  )
}
