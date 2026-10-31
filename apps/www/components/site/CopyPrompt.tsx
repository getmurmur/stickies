"use client"

import { Check, Copy } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"

/** Copies the prompt a developer gives their coding agent to add Stickies to an app. */
export function CopyPrompt({ prompt, className }: { prompt: string; className?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(prompt)
        setCopied(true)
        setTimeout(() => setCopied(false), 1600)
      }}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-[13px] font-medium text-background transition-opacity hover:opacity-85",
        className,
      )}
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {copied ? "Copied" : "Copy prompt for your agent"}
    </button>
  )
}
