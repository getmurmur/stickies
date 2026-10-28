"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  changeNote,
  createNote,
  notesOf,
  parseDocument,
  type StickyNoteData,
  toDocument,
} from "@/registry/stickies/lib/stickies-format"

export interface UseStickyNotesOptions {
  /** The notes to start with, and to go back to on `reset()`. */
  defaultNotes?: StickyNoteData[]
  /** Controlled notes. Pair with `onNotesChange`; nothing is saved to the browser. */
  notes?: StickyNoteData[]
  onNotesChange?: (notes: StickyNoteData[]) => void
  /** Keep the board in `localStorage`, as a Stickies document. On by default when uncontrolled. */
  persist?: boolean
  /** Where in `localStorage`. Give each board on a site its own. */
  storageKey?: string
}

/**
 * A board of notes: adding, changing, removing, stacking and selecting them, saved to the
 * browser unless told not to. The array's order is the stack: the last note is on top.
 */
export function useStickyNotes({
  defaultNotes = [],
  notes: controlled,
  onNotesChange,
  persist = true,
  storageKey = "stickies:board",
}: UseStickyNotesOptions = {}) {
  const isControlled = controlled !== undefined
  const saving = persist && !isControlled
  const [own, setOwn] = useState<StickyNoteData[]>(defaultNotes)
  const notes = isControlled ? controlled : own
  /** The latest notes, so several changes in one event build on each other. */
  const latest = useRef(notes)
  latest.current = notes
  /** False until the saved board, if any, has been read: render nothing before then. */
  const [ready, setReady] = useState(!saving)
  /** Whether the board differs from `defaultNotes`, as far as anyone has changed it. */
  const [edited, setEdited] = useState(false)
  const [selected, setSelected] = useState<string[]>([])

  const defaults = useRef(defaultNotes)
  defaults.current = defaultNotes

  useEffect(() => {
    if (!saving) return
    try {
      const raw = localStorage.getItem(storageKey)
      const doc = raw ? parseDocument(raw) : null
      if (doc) {
        setOwn(notesOf(doc))
        setEdited(true)
      }
    } catch {
      // Storage blocked: start from the defaults.
    }
    setReady(true)
  }, [saving, storageKey])

  useEffect(() => {
    if (!saving || !ready || !edited) return
    try {
      localStorage.setItem(storageKey, JSON.stringify(toDocument(notes)))
    } catch {
      // Private mode or full storage: the board just isn't kept.
    }
  }, [notes, saving, ready, edited, storageKey])

  const commit = useCallback(
    (change: (notes: StickyNoteData[]) => StickyNoteData[]) => {
      const next = change(latest.current)
      if (next === latest.current) return
      latest.current = next
      if (!isControlled) setOwn(next)
      setEdited(true)
      onNotesChange?.(next)
    },
    [isControlled, onNotesChange],
  )

  const add = useCallback(
    (fields: Partial<StickyNoteData> = {}) => {
      const note = createNote(fields)
      commit((all) => [...all, note])
      return note
    },
    [commit],
  )

  /** Adds notes made elsewhere (pasted, say) on top, and selects them. */
  const insert = useCallback(
    (added: StickyNoteData[]) => {
      if (added.length === 0) return
      commit((all) => [...all, ...added])
      setSelected(added.map((n) => n.id))
    },
    [commit],
  )

  /** Changes a note. Geometry alone (`touch: false`) leaves `updatedAt` as it was. */
  const update = useCallback(
    (id: string, fields: Partial<StickyNoteData>, { touch = true }: { touch?: boolean } = {}) =>
      commit((all) => all.map((n) => (n.id === id ? (touch ? changeNote(n, fields) : { ...n, ...fields }) : n))),
    [commit],
  )

  const remove = useCallback(
    (ids: string | string[]) => {
      const gone = new Set(Array.isArray(ids) ? ids : [ids])
      commit((all) => (all.some((n) => gone.has(n.id)) ? all.filter((n) => !gone.has(n.id)) : all))
      setSelected((s) => s.filter((id) => !gone.has(id)))
    },
    [commit],
  )

  /** Brings a note to the top of the stack. */
  const raise = useCallback(
    (id: string) =>
      commit((all) => {
        const at = all.findIndex((n) => n.id === id)
        if (at < 0 || at === all.length - 1) return all
        return [...all.slice(0, at), ...all.slice(at + 1), all[at]]
      }),
    [commit],
  )

  /** Selects a note; with `additive`, adds it to the selection or takes it out. */
  const select = useCallback((id: string, { additive = false }: { additive?: boolean } = {}) => {
    setSelected((s) => (additive ? (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]) : s.length === 1 && s[0] === id ? s : [id]))
  }, [])

  const clearSelection = useCallback(() => setSelected((s) => (s.length ? [] : s)), [])

  /** Back to `defaultNotes`, forgetting the saved board. */
  const reset = useCallback(() => {
    if (saving) {
      try {
        localStorage.removeItem(storageKey)
      } catch {
        // Nothing to forget.
      }
    }
    latest.current = defaults.current
    if (!isControlled) setOwn(defaults.current)
    onNotesChange?.(defaults.current)
    setEdited(false)
    setSelected([])
  }, [saving, storageKey, isControlled, onNotesChange])

  const selectedNotes = useMemo(() => notes.filter((n) => selected.includes(n.id)), [notes, selected])

  return {
    notes,
    ready,
    edited,
    add,
    insert,
    update,
    remove,
    raise,
    selected,
    selectedNotes,
    select,
    clearSelection,
    setSelected,
    reset,
  }
}

export type StickyNotesApi = ReturnType<typeof useStickyNotes>
