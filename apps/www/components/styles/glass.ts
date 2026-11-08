/**
 * Liquid Glass maps for a rounded rectangle, drawn on a canvas.
 *
 * The glass is a slab whose edge curves down like a squircle. Light coming straight through
 * bends where the surface slopes (Snell's law), so near the rim the background is seen from
 * further in. The displacement map stores that offset per pixel (red for x, green for y,
 * 128 for none) for an SVG `feDisplacementMap`. The specular map is the rim catching light
 * from the top left, with a softer reflection on the opposite edge.
 */

export interface GlassOptions {
  /** Corner radius, in CSS pixels. */
  radius: number
  /** How far in from the edge the surface curves. */
  bezel: number
  /** The largest offset, in CSS pixels. */
  depth: number
}

export interface GlassMaps {
  displacement: string
  specular: string
  /** `feDisplacementMap`'s scale for these maps: twice the depth. */
  scale: number
}

const IOR = 1.5
const SAMPLES = 256

/** The surface's height across the bezel, 0 at the edge and 1 where it's flat. */
const squircle = (x: number) => Math.pow(1 - Math.pow(1 - x, 4), 1 / 4)

/** How far light moves sideways at each point across the bezel, largest = 1. */
const PROFILE = (() => {
  const out = new Float32Array(SAMPLES)
  const h = 1 / SAMPLES
  let max = 0
  for (let i = 0; i < SAMPLES; i++) {
    const x = Math.max(i / (SAMPLES - 1), 1e-4)
    const slope = (squircle(Math.min(1, x + h)) - squircle(Math.max(0, x - h))) / (Math.min(1, x + h) - Math.max(0, x - h))
    const incident = Math.atan(slope)
    const refracted = Math.asin(Math.sin(incident) / IOR)
    out[i] = squircle(x) * Math.tan(incident - refracted)
    max = Math.max(max, out[i])
  }
  for (let i = 0; i < SAMPLES; i++) out[i] /= max
  return out
})()

interface Edge {
  /** Distance in from the edge; negative outside the shape. */
  d: number
  /** The outward normal. */
  nx: number
  ny: number
}

/** Distance to a rounded rectangle's edge, and which way is out, at a point. */
function edge(px: number, py: number, w: number, h: number, r: number): Edge {
  const x = px - w / 2
  const y = py - h / 2
  const qx = Math.abs(x) - (w / 2 - r)
  const qy = Math.abs(y) - (h / 2 - r)
  const sx = Math.sign(x) || 1
  const sy = Math.sign(y) || 1
  if (qx > 0 && qy > 0) {
    const len = Math.hypot(qx, qy)
    return { d: r - len, nx: (qx / len) * sx, ny: (qy / len) * sy }
  }
  return qx > qy ? { d: r - qx, nx: sx, ny: 0 } : { d: r - qy, nx: 0, ny: sy }
}

function canvas(w: number, h: number) {
  const el = document.createElement("canvas")
  el.width = w
  el.height = h
  const ctx = el.getContext("2d")
  if (!ctx) throw new Error("No 2D canvas")
  return { el, ctx, image: ctx.createImageData(w, h) }
}

function displacementMap(w: number, h: number, { radius, bezel }: GlassOptions) {
  const { el, ctx, image } = canvas(w, h)
  const px = image.data
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const o = (j * w + i) * 4
      const { d, nx, ny } = edge(i + 0.5, j + 0.5, w, h, radius)
      let dx = 0
      let dy = 0
      if (d >= 0 && d < bezel) {
        const m = PROFILE[Math.round((d / bezel) * (SAMPLES - 1))]
        // Look inward: the rim shows what's further inside, squeezed.
        dx = -nx * m
        dy = -ny * m
      }
      px[o] = Math.round(128 + 127 * dx)
      px[o + 1] = Math.round(128 + 127 * dy)
      px[o + 2] = 128
      px[o + 3] = 255
    }
  }
  ctx.putImageData(image, 0, 0)
  return el.toDataURL()
}

function specularMap(w: number, h: number, { radius, bezel }: GlassOptions, dpr: number) {
  const W = Math.round(w * dpr)
  const H = Math.round(h * dpr)
  const { el, ctx, image } = canvas(W, H)
  const px = image.data
  // Light from the top left.
  const lx = -Math.SQRT1_2
  const ly = -Math.SQRT1_2
  const rim = 1.6
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      const { d, nx, ny } = edge((i + 0.5) / dpr, (j + 0.5) / dpr, w, h, radius)
      if (d < 0 || d > bezel) continue
      const facing = nx * lx + ny * ly
      const lit = Math.max(facing, 0) + Math.max(-facing, 0) * 0.45
      // A thin bright line on the rim, and a faint sheen across the curve.
      const line = Math.max(0, 1 - d / rim) * (0.35 + 0.65 * lit)
      const sheen = Math.pow(1 - d / bezel, 3) * 0.22 * lit
      const a = Math.min(1, line + sheen)
      if (a <= 0) continue
      const o = (j * W + i) * 4
      px[o] = 255
      px[o + 1] = 255
      px[o + 2] = 255
      px[o + 3] = Math.round(a * 255)
    }
  }
  ctx.putImageData(image, 0, 0)
  return el.toDataURL()
}

const cache = new Map<string, GlassMaps>()

/** The maps for a shape this size, kept for the sizes used most recently. */
export function glassMaps(width: number, height: number, options: GlassOptions): GlassMaps {
  const w = Math.max(1, Math.round(width))
  const h = Math.max(1, Math.round(height))
  const dpr = Math.min(3, Math.max(1, Math.round(window.devicePixelRatio || 1)))
  const key = `${w}x${h}:${options.radius}:${options.bezel}:${options.depth}:${dpr}`
  const hit = cache.get(key)
  if (hit) return hit
  const maps = { displacement: displacementMap(w, h, options), specular: specularMap(w, h, options, dpr), scale: options.depth * 2 }
  cache.set(key, maps)
  if (cache.size > 48) cache.delete(cache.keys().next().value ?? key)
  return maps
}

/**
 * Whether SVG filters work in `backdrop-filter`. Only Chromium draws them; Safari and
 * Firefox accept the CSS and show nothing, so they get a frosted fallback instead.
 */
export function refracts(): boolean {
  if (typeof navigator === "undefined") return false
  const nav: Navigator & { userAgentData?: { brands: { brand: string }[] } } = navigator
  return nav.userAgentData?.brands.some((b) => b.brand === "Chromium") ?? false
}
