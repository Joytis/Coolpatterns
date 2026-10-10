import ClipperLib from 'clipper-lib'

/** A 2D point. All pattern geometry is in inches. */
export interface Vec2 {
  x: number
  y: number
}

/** A closed polygon; the last point connects back to the first. */
export type Polygon = Vec2[]

export interface Bounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
  width: number
  height: number
}

export const v = (x: number, y: number): Vec2 => ({ x, y })

export function signedArea(poly: Polygon): number {
  let a = 0
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i]
    const q = poly[(i + 1) % poly.length]
    a += p.x * q.y - q.x * p.y
  }
  return a / 2
}

export const area = (poly: Polygon): number => Math.abs(signedArea(poly))

export function bounds(poly: Polygon): Bounds {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const p of poly) {
    minX = Math.min(minX, p.x)
    minY = Math.min(minY, p.y)
    maxX = Math.max(maxX, p.x)
    maxY = Math.max(maxY, p.y)
  }
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY }
}

export function translate(poly: Polygon, dx: number, dy: number): Polygon {
  return poly.map((p) => v(p.x + dx, p.y + dy))
}

export function scale(poly: Polygon, s: number, cx = 0, cy = 0): Polygon {
  return poly.map((p) => v(cx + (p.x - cx) * s, cy + (p.y - cy) * s))
}

export function rotate(poly: Polygon, radians: number): Polygon {
  const c = Math.cos(radians)
  const s = Math.sin(radians)
  return poly.map((p) => v(p.x * c - p.y * s, p.x * s + p.y * c))
}

export function centroid(poly: Polygon): Vec2 {
  const a = signedArea(poly)
  if (Math.abs(a) < 1e-9) {
    const b = bounds(poly)
    return v((b.minX + b.maxX) / 2, (b.minY + b.maxY) / 2)
  }
  let cx = 0
  let cy = 0
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i]
    const q = poly[(i + 1) % poly.length]
    const f = p.x * q.y - q.x * p.y
    cx += (p.x + q.x) * f
    cy += (p.y + q.y) * f
  }
  return v(cx / (6 * a), cy / (6 * a))
}

/** Counter-clockwise copy of a polygon. */
export function ccw(poly: Polygon): Polygon {
  return signedArea(poly) < 0 ? [...poly].reverse() : poly
}

/**
 * Keep the part of a polygon on the side of the line where
 * `a*x + b*y <= c`. Exact for convex polygons (all our pieced shapes).
 */
export function clipHalfPlane(poly: Polygon, a: number, b: number, c: number): Polygon {
  const out: Polygon = []
  const inside = (p: Vec2) => a * p.x + b * p.y <= c + 1e-9
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i]
    const q = poly[(i + 1) % poly.length]
    const pin = inside(p)
    const qin = inside(q)
    if (pin) out.push(p)
    if (pin !== qin) {
      const dp = a * p.x + b * p.y - c
      const dq = a * q.x + b * q.y - c
      const t = dp / (dp - dq)
      out.push(v(p.x + (q.x - p.x) * t, p.y + (q.y - p.y) * t))
    }
  }
  return dedupe(out)
}

/** Clip a polygon to the horizontal band lo <= y <= hi. */
export function clipBandY(poly: Polygon, lo: number, hi: number): Polygon {
  return clipHalfPlane(clipHalfPlane(poly, 0, 1, hi), 0, -1, -lo)
}

/** Clip a polygon to the vertical band lo <= x <= hi. */
export function clipBandX(poly: Polygon, lo: number, hi: number): Polygon {
  return clipHalfPlane(clipHalfPlane(poly, 1, 0, hi), -1, 0, -lo)
}

function dedupe(poly: Polygon): Polygon {
  const out: Polygon = []
  for (const p of poly) {
    const last = out[out.length - 1]
    if (!last || Math.hypot(last.x - p.x, last.y - p.y) > 1e-6) out.push(p)
  }
  if (out.length > 1) {
    const f = out[0]
    const l = out[out.length - 1]
    if (Math.hypot(f.x - l.x, f.y - l.y) < 1e-6) out.pop()
  }
  return out
}

const CLIPPER_SCALE = 1000

/**
 * Grow a polygon outward by `distance` inches (a seam allowance).
 * Corners are mitred, the way a sewist squares off allowance corners,
 * with very sharp points trimmed so they don't run off the fabric.
 */
export function offsetPolygon(poly: Polygon, distance: number): Polygon {
  if (distance <= 0 || poly.length < 3) return poly
  const path = ccw(poly).map((p) => ({
    X: Math.round(p.x * CLIPPER_SCALE),
    Y: Math.round(p.y * CLIPPER_SCALE),
  }))
  const co = new ClipperLib.ClipperOffset(2, 0.05 * CLIPPER_SCALE)
  co.AddPath(path, ClipperLib.JoinType.jtMiter, ClipperLib.EndType.etClosedPolygon)
  const solution: { X: number; Y: number }[][] = []
  co.Execute(solution, distance * CLIPPER_SCALE)
  if (!solution.length) return poly
  // The largest result is the outer outline.
  const best = solution
    .map((s) => s.map((p) => v(p.X / CLIPPER_SCALE, p.Y / CLIPPER_SCALE)))
    .sort((a, b) => area(b) - area(a))[0]
  return ccw(best)
}

/** Sample a circular arc from angle a0 to a1 (radians), inclusive. */
export function arc(cx: number, cy: number, r: number, a0: number, a1: number, steps: number): Vec2[] {
  const pts: Vec2[] = []
  for (let i = 0; i <= steps; i++) {
    const t = a0 + ((a1 - a0) * i) / steps
    pts.push(v(cx + r * Math.cos(t), cy + r * Math.sin(t)))
  }
  return pts
}

export function polygonPerimeter(poly: Polygon): number {
  let len = 0
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i]
    const q = poly[(i + 1) % poly.length]
    len += Math.hypot(q.x - p.x, q.y - p.y)
  }
  return len
}

/** SVG path data for a polygon. */
export function toSvgPath(poly: Polygon, flipY = false): string {
  return (
    poly
      .map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(3)} ${(flipY ? -p.y : p.y).toFixed(3)}`)
      .join(' ') + ' Z'
  )
}
