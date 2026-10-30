"use client"

import { useRef, useState } from "react"

export interface Pan {
  x: number
  y: number
}

/**
 * Dragging a surface to look around it. Spread `handlers` on the surface and move its
 * contents by `pan`. Only presses on the surface itself pan, so what's on it keeps its own
 * dragging; give anything else that should pan, like a background layer, `data-pan-surface`.
 */
export function useCanvasPan({ defaultPan = { x: 0, y: 0 } }: { defaultPan?: Pan } = {}) {
  const [pan, setPan] = useState<Pan>(defaultPan)
  const [panning, setPanning] = useState(false)
  const start = useRef<{ x: number; y: number; id: number; from: Pan } | null>(null)

  function end() {
    start.current = null
    setPanning(false)
  }

  const handlers = {
    onPointerDown(e: React.PointerEvent<HTMLElement>) {
      if (e.button !== 0) return
      const target = e.target as HTMLElement
      if (target !== e.currentTarget && !target.hasAttribute("data-pan-surface")) return
      e.currentTarget.setPointerCapture(e.pointerId)
      start.current = { x: e.clientX, y: e.clientY, id: e.pointerId, from: pan }
      setPanning(true)
    },
    onPointerMove(e: React.PointerEvent<HTMLElement>) {
      const s = start.current
      if (!s || e.pointerId !== s.id) return
      setPan({ x: s.from.x + e.clientX - s.x, y: s.from.y + e.clientY - s.y })
    },
    onPointerUp: end,
    onPointerCancel: end,
  }

  /** A point on screen (as from a pointer event) in the surface's own coordinates. */
  function toCanvas(point: { clientX: number; clientY: number }, surface: HTMLElement | null): Pan {
    const rect = surface?.getBoundingClientRect()
    return { x: point.clientX - (rect?.left ?? 0) - pan.x, y: point.clientY - (rect?.top ?? 0) - pan.y }
  }

  return { pan, setPan, panning, handlers, toCanvas }
}
