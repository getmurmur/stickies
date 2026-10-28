"use client"

import { useLayoutEffect, useRef } from "react"

// Lists in a plain textarea, as in Apple's Notes: "- " or "* " at the start of a line becomes
// a bullet, Return carries the list on, and Return on an empty item ends it. Numbered lists
// ("1. ") keep counting. The bullet is a character, so the text stays plain.

export const BULLET = "• "

export interface TextEdit {
  text: string
  caret: number
}

const lineStart = (text: string, at: number) => text.lastIndexOf("\n", at - 1) + 1

/** After a keystroke: "- " or "* " just typed at the start of a line becomes a bullet. */
export function autoBullet(text: string, caret: number): TextEdit | null {
  const start = lineStart(text, caret)
  const typed = text.slice(start, caret)
  if (typed !== "- " && typed !== "* ") return null
  return { text: text.slice(0, start) + BULLET + text.slice(caret), caret: start + BULLET.length }
}

/** Return on a list's line: the next item, or on an empty one, the end of the list. Null when not in a list. */
export function continueList(text: string, from: number, to: number): TextEdit | null {
  const start = lineStart(text, from)
  const line = text.slice(start, from)
  const numbered = /^(\d+)\. /.exec(line)
  const marker = line.startsWith(BULLET) ? BULLET : numbered ? numbered[0] : null
  if (!marker) return null
  if (line === marker && text.slice(to).split("\n")[0] === "") {
    return { text: text.slice(0, start) + text.slice(to), caret: start }
  }
  const next = numbered ? `${Number(numbered[1]) + 1}. ` : BULLET
  const inserted = `\n${next}`
  return { text: text.slice(0, from) + inserted + text.slice(to), caret: from + inserted.length }
}

/**
 * Bullets and numbered lists for a controlled textarea. Spread the returned props on it;
 * `onTextChange` gets the new text, formatted when a list was started or carried on.
 */
export function useListFormatting(value: string, onTextChange: (text: string) => void) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const caretAfter = useRef<number | null>(null)

  // Puts the caret after a bullet or a new item once the change is on screen.
  useLayoutEffect(() => {
    const el = ref.current
    const at = caretAfter.current
    if (!el || at === null) return
    caretAfter.current = null
    el.setSelectionRange(at, at)
  }, [value])

  return {
    ref,
    value,
    onChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
      const native = e.nativeEvent as InputEvent
      const bulleted = native.inputType === "insertText" && native.data === " " ? autoBullet(e.target.value, e.target.selectionStart) : null
      if (bulleted) caretAfter.current = bulleted.caret
      onTextChange(bulleted?.text ?? e.target.value)
    },
    onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
      if (e.key !== "Enter" || e.shiftKey || e.altKey || e.metaKey || e.ctrlKey || e.nativeEvent.isComposing) return
      const el = e.currentTarget
      const next = continueList(el.value, el.selectionStart, el.selectionEnd)
      if (!next) return
      e.preventDefault()
      caretAfter.current = next.caret
      onTextChange(next.text)
    },
  }
}
