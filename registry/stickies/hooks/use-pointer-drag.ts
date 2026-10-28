"use client"

import { useRef, useState } from "react"

export interface PointerDragDelta {
  /** How far the pointer has moved since the drag began, divided by `scale`. */
  dx: number
  dy: number
}

export interface UsePointerDragOptions {
  /** Called as the pointer moves, with the distance from where the drag began. */
  onDrag: (delta: PointerDragDelta, event: React.PointerEvent) => void
  onDragStart?: (event: React.PointerEvent) => void
  onDragEnd?: (delta: PointerDragDelta) => void
  /** The zoom of whatever is being dragged, so it moves as far as the pointer did on screen. */
  scale?: number
  disabled?: boolean
}

/**
 * Dragging with the pointer, for moving or resizing anything. Spread `handlers` on the
 * element to hold; the pointer is captured, so the drag carries on outside it.
 */
export function usePointerDrag({ onDrag, onDragStart, onDragEnd, scale = 1, disabled = false }: UsePointerDragOptions) {
  const start = useRef<{ x: number; y: number; id: number } | null>(null)
  const last = useRef<PointerDragDelta>({ dx: 0, dy: 0 })
  const [dragging, setDragging] = useState(false)

  function end() {
    if (!start.current) return
    start.current = null
    setDragging(false)
    onDragEnd?.(last.current)
  }

  const handlers = {
    onPointerDown(e: React.PointerEvent) {
      if (disabled || e.button !== 0) return
      e.currentTarget.setPointerCapture(e.pointerId)
      start.current = { x: e.clientX, y: e.clientY, id: e.pointerId }
      last.current = { dx: 0, dy: 0 }
      setDragging(true)
      onDragStart?.(e)
    },
    onPointerMove(e: React.PointerEvent) {
      const s = start.current
      if (!s || e.pointerId !== s.id) return
      last.current = { dx: (e.clientX - s.x) / scale, dy: (e.clientY - s.y) / scale }
      onDrag(last.current, e)
    },
    onPointerUp: end,
    onPointerCancel: end,
    onLostPointerCapture: end,
  }

  return { handlers, dragging }
}
