import { STICKY_DEFAULT_SIZE } from "../../../apps/www/registry/stickies/lib/stickies-format.ts"

type Box = { x: number; y: number; width: number; height: number }

const GAP = 40
const COLUMNS = 4

/**
 * Where to put new notes that came without a position: in rows of four, starting a little
 * below everything already on the board, lined up with its left edge.
 */
export function nextSpots(existing: Box[], count: number): { x: number; y: number }[] {
  const left = existing.length ? Math.min(...existing.map((b) => b.x)) : 0
  const top = existing.length ? Math.max(...existing.map((b) => b.y + b.height)) + GAP * 2 : 0
  const { width, height } = STICKY_DEFAULT_SIZE
  return Array.from({ length: count }, (_, i) => ({
    x: left + (i % COLUMNS) * (width + GAP),
    y: top + Math.floor(i / COLUMNS) * (height + GAP),
  }))
}
