"use client"

import { type RefObject, useCallback, useEffect, useRef } from "react"
import {
  fromHtml,
  fromText,
  notesOf,
  parseDocument,
  STICKIES_MIME,
  type StickiesDocument,
  type StickiesSource,
  type StickyNoteData,
  toDocument,
  toHtml,
  toText,
} from "@/registry/stickies/lib/stickies-format"

export interface StickiesClipboardPaste {
  notes: StickyNoteData[]
  /** The full document, when the clipboard carried one; null for plain text. */
  document: StickiesDocument | null
}

/**
 * The richest Stickies content in a clipboard or drop: the Stickies JSON, then the document
 * in the HTML's `data-stickies`, then plain text as one note per paragraph.
 */
export function readStickies(data: DataTransfer, { allowText = true }: { allowText?: boolean } = {}): StickiesClipboardPaste | null {
  const doc = parseDocument(data.getData(STICKIES_MIME)) ?? fromHtml(data.getData("text/html"))
  if (doc) return { notes: notesOf(doc), document: doc }
  if (!allowText) return null
  const notes = fromText(data.getData("text/plain"))
  return notes.length ? { notes, document: null } : null
}

/** Writes notes as Stickies JSON, HTML and plain text, inside a copy, cut or drag event. */
export function writeStickies(data: DataTransfer, notes: StickyNoteData[], source?: StickiesSource) {
  const doc = toDocument(notes, { source })
  data.setData("text/plain", toText(notes))
  data.setData("text/html", toHtml(doc))
  data.setData(STICKIES_MIME, JSON.stringify(doc))
}

/** True while someone is typing, when copy and paste belong to the text. */
function editing() {
  const el = document.activeElement
  if (!(el instanceof HTMLElement)) return false
  return el.isContentEditable || el instanceof HTMLTextAreaElement || (el instanceof HTMLInputElement && !["button", "checkbox", "radio"].includes(el.type))
}

export interface UseStickiesClipboardOptions {
  /** The notes ⌘C and ⌘X take: usually the selection. */
  getNotes: () => StickyNoteData[]
  /** Pasted notes, with their original positions and IDs. Use `placeNotes` to put them on the board. */
  onPaste: (paste: StickiesClipboardPaste) => void
  /** After ⌘X has copied the notes: remove them. */
  onCut?: (notes: StickyNoteData[]) => void
  /** Recorded in what's copied, so other apps know where the notes came from. */
  source?: StickiesSource
  /** Make notes from pasted plain text, one per paragraph. On by default. */
  pasteText?: boolean
  /** Only while focus is in this element, or on nothing in particular. */
  scope?: RefObject<HTMLElement | null>
  enabled?: boolean
}

/**
 * ⌘C, ⌘X and ⌘V for notes, in the Stickies format. Copying writes all three versions the
 * spec lists, so notes paste into any app; pasting takes the richest one there. Typing in
 * a note or a field is left alone.
 */
export function useStickiesClipboard(options: UseStickiesClipboardOptions) {
  const latest = useRef(options)
  latest.current = options
  const enabled = options.enabled ?? true

  useEffect(() => {
    if (!enabled) return
    const active = () => {
      if (editing()) return false
      const scope = latest.current.scope?.current
      const el = document.activeElement
      return !scope || !el || el === document.body || scope.contains(el)
    }
    // An event another board (or anything else) has taken is left alone.
    const copy = (cut: boolean) => (e: ClipboardEvent) => {
      if (e.defaultPrevented || !e.clipboardData || !active()) return
      const notes = latest.current.getNotes()
      if (notes.length === 0) return
      e.preventDefault()
      writeStickies(e.clipboardData, notes, latest.current.source)
      if (cut) latest.current.onCut?.(notes)
    }
    const onCopy = copy(false)
    const onCut = copy(true)
    const onPaste = (e: ClipboardEvent) => {
      if (e.defaultPrevented || !e.clipboardData || !active()) return
      const paste = readStickies(e.clipboardData, { allowText: latest.current.pasteText ?? true })
      if (!paste || paste.notes.length === 0) return
      e.preventDefault()
      latest.current.onPaste(paste)
    }
    document.addEventListener("copy", onCopy)
    document.addEventListener("cut", onCut)
    document.addEventListener("paste", onPaste)
    return () => {
      document.removeEventListener("copy", onCopy)
      document.removeEventListener("cut", onCut)
      document.removeEventListener("paste", onPaste)
    }
  }, [enabled])

  /**
   * Copies notes from a button or menu, outside a copy event. Browsers only allow HTML and
   * plain text there, so other apps read the notes from the HTML's `data-stickies`.
   */
  const copy = useCallback(async (notes: StickyNoteData[]) => {
    const doc = toDocument(notes, { source: latest.current.source })
    const text = toText(notes)
    if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([toHtml(doc)], { type: "text/html" }),
          "text/plain": new Blob([text], { type: "text/plain" }),
        }),
      ])
    } else {
      await navigator.clipboard.writeText(text)
    }
  }, [])

  return { copy }
}
