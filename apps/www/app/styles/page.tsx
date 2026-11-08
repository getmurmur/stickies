import type { Metadata } from "next"
import { Caveat } from "next/font/google"
import Link from "next/link"
import type { ReactNode } from "react"
import { GITHUB, Mark } from "@/components/site/Mark"
import { GlassBoard, MinimalBoard, PaperBoard, TerminalBoard } from "@/components/styles/boards"
import "@/components/styles/skins.css"

const hand = Caveat({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-hand" })

export const metadata: Metadata = {
  title: "Styles · stickies.live",
  description: "The same sticky notes drawn four ways: Liquid Glass, paper, minimal and terminal. The Stickies format carries the note; each app draws it its own way.",
}

function Style({ name, about, children }: { name: string; about: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 className="text-[17px] font-semibold">{name}</h2>
        <p className="text-[13px] text-muted">{about}</p>
      </div>
      {children}
    </section>
  )
}

export default function Styles() {
  return (
    <div className={`${hand.variable} mx-auto max-w-6xl px-6 pt-5 pb-24`}>
      <header className="flex items-center justify-between">
        <Mark />
        <nav className="flex items-center gap-1 text-[13px] text-muted">
          <Link href="/docs" className="rounded-md px-2 py-1 transition-colors hover:text-foreground">
            Docs
          </Link>
          <Link href="/spec" className="rounded-md px-2 py-1 transition-colors hover:text-foreground">
            Spec
          </Link>
          <a href={GITHUB} className="rounded-md px-2 py-1 transition-colors hover:text-foreground max-sm:hidden">
            GitHub
          </a>
        </nav>
      </header>

      <div className="mt-14 mb-10 max-w-2xl space-y-3">
        <h1 className="text-[32px] font-semibold tracking-tight">Same notes, any look</h1>
        <p className="text-[15px] leading-7 text-foreground/85">
          Every board here holds the same notes in the <Link href="/spec" className="underline underline-offset-2">Stickies format</Link>:
          words, colour, state and author. Each draws them the way its app would. Select a note, press ⌘C, click another board and press ⌘V.
          The note keeps what it says and takes on the new look.
        </p>
      </div>

      <div className="space-y-14">
        <Style name="Liquid Glass" about="Glass that bends what's behind it. Fully refracted in Chrome; frosted in other browsers.">
          <GlassBoard />
        </Style>
        <Style name="Paper" about="Taped to cork in ballpoint. Done notes are crossed out.">
          <PaperBoard />
        </Style>
        <Style name="Minimal" about="White cards. Colour is a dot.">
          <MinimalBoard />
        </Style>
        <Style name="Terminal" about="Monospace. State is a checkbox; colour is the text.">
          <TerminalBoard />
        </Style>
      </div>
    </div>
  )
}
