"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

const SWAP = "transition-[opacity,scale,filter] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-opacity"

/** Two overlapping sheets: the copy icon. */
function CopyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      <rect x="5.25" y="5.25" width="8" height="8" rx="1.75" />
      <path d="M10.75 5.25V4a1.75 1.75 0 0 0-1.75-1.75H4A1.75 1.75 0 0 0 2.25 4v5c0 .97.78 1.75 1.75 1.75h1.25" />
    </svg>
  )
}

/** A tick that draws itself in when shown. */
function CheckIcon({ drawn, className }: { drawn: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      <path
        d="M3.5 8.5 6.5 11.5 12.5 4.75"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={drawn ? 0 : 1}
        className="transition-[stroke-dashoffset] duration-300 ease-out motion-reduce:transition-none"
        style={{ transitionDelay: drawn ? "60ms" : "0ms" }}
      />
    </svg>
  )
}

/**
 * Copies the prompt a developer gives their coding agent to add Stickies to an app. The icon
 * turns into a tick and the label into "Copied", in place: both labels share one cell, so the
 * button never changes width.
 */
export function CopyPrompt({ prompt, className }: { prompt: string; className?: string }) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
  }, [])

  async function copy() {
    try {
      await navigator.clipboard.writeText(prompt)
    } catch {
      return
    }
    setCopied(true)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(false), 1800)
  }

  const shown = "opacity-100 scale-100 blur-0"
  const hidden = "opacity-0 scale-[0.6] blur-[3px] motion-reduce:scale-100 motion-reduce:blur-0"

  return (
    <button
      type="button"
      onClick={copy}
      className={cn(
        "group inline-flex h-8 items-center gap-1.5 rounded-lg border border-black/[0.11] bg-gradient-to-b from-white to-[#f6f6f7] px-3 text-[13px] font-medium text-foreground",
        "shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_1px_2px_rgba(16,24,40,0.06),0_1px_1px_rgba(16,24,40,0.04)]",
        "transition-[translate,box-shadow,border-color,background-color] duration-150 ease-out",
        "hover:border-black/[0.16] hover:to-[#f2f2f4]",
        "active:translate-y-px active:from-[#f7f7f8] active:to-[#f4f4f5] active:shadow-[0_1px_1px_rgba(16,24,40,0.05)_inset]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1 focus-visible:ring-offset-background",
        className,
      )}
    >
      <span className="relative grid size-3.5 place-items-center text-foreground/75">
        <CopyIcon className={cn("col-start-1 row-start-1 size-3.5", SWAP, copied ? hidden : shown)} />
        <CheckIcon drawn={copied} className={cn("col-start-1 row-start-1 size-3.5", SWAP, copied ? shown : hidden)} />
      </span>
      <span className="grid justify-items-start">
        <span aria-hidden={copied} className={cn("col-start-1 row-start-1", SWAP, copied ? "opacity-0 blur-[2px] motion-reduce:blur-0" : "opacity-100 blur-0")}>
          Copy prompt
        </span>
        <span aria-hidden={!copied} className={cn("col-start-1 row-start-1", SWAP, copied ? "opacity-100 blur-0" : "opacity-0 blur-[2px] motion-reduce:blur-0")}>
          Copied
        </span>
      </span>
      <span role="status" className="sr-only">
        {copied ? "Prompt copied" : ""}
      </span>
    </button>
  )
}
