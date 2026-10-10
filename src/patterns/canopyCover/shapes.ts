import type { Polygon, Vec2 } from '../../core/geometry'
import { arc, v } from '../../core/geometry'
import type { Motif, RunnerEdge } from './config'

/** An appliqué motif of the given height, centered on (cx, cy). */
export function motifShape(motif: Motif, cx: number, cy: number, size: number): Polygon {
  const r = size / 2
  const pts: Vec2[] = []
  switch (motif) {
    case 'heart': {
      for (let i = 0; i < 64; i++) {
        const t = (i / 64) * Math.PI * 2
        const x = 16 * Math.sin(t) ** 3
        const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)
        pts.push(v(cx + (x / 17) * r, cy + ((y + 2.5) / 15.5) * r))
      }
      return pts
    }
    case 'star':
      return starPoints(cx, cy, r, r * 0.42, 5)
    case 'sun':
      return starPoints(cx, cy, r, r * 0.72, 12)
    case 'flower': {
      for (let i = 0; i < 90; i++) {
        const t = (i / 90) * Math.PI * 2
        const rr = r * (0.62 + 0.38 * Math.abs(Math.cos((5 * t) / 2)))
        pts.push(v(cx + rr * Math.cos(t + Math.PI / 2), cy + rr * Math.sin(t + Math.PI / 2)))
      }
      return pts
    }
    case 'moon': {
      // Outer arc of one circle, then back along the edge of an offset circle.
      const off = r * 0.45
      const ri = r * 0.82
      const a = Math.acos((r * r + off * off - ri * ri) / (2 * r * off))
      const outer = arc(cx, cy, r, a, Math.PI * 2 - a, 40)
      const ox = cx + off
      const end = outer[outer.length - 1]
      const start = outer[0]
      const b0 = Math.atan2(end.y - cy, end.x - ox)
      let b1 = Math.atan2(start.y - cy, start.x - ox)
      if (b1 > b0) b1 -= Math.PI * 2
      return [...outer, ...arc(ox, cy, ri, b0, b1, 30).slice(1, -1)]
    }
    case 'diamond':
      return [v(cx, cy - r), v(cx + r * 0.62, cy), v(cx, cy + r), v(cx - r * 0.62, cy)]
    default:
      return []
  }
}

function starPoints(cx: number, cy: number, outer: number, inner: number, n: number): Polygon {
  const pts: Vec2[] = []
  for (let i = 0; i < n * 2; i++) {
    const rr = i % 2 ? inner : outer
    const t = Math.PI / 2 + (i * Math.PI) / n
    pts.push(v(cx + rr * Math.cos(t), cy + rr * Math.sin(t)))
  }
  return pts
}

/**
 * The shaped bottom edge of a runner, from x = -length/2 to +length/2,
 * with y between 0 (lowest point) and `depth` (where the shaping starts).
 * `count` repeats fill the side exactly.
 */
export function edgeProfile(edge: RunnerEdge, length: number, depth: number, count: number): Vec2[] {
  const p = length / count
  const x0 = -length / 2
  const pts: Vec2[] = []
  const push = (x: number, y: number) => pts.push(v(x, y))
  if (edge === 'straight' || edge === 'bunting' || depth <= 0) {
    return [v(x0, depth), v(-x0, depth)]
  }
  for (let i = 0; i < count; i++) {
    const a = x0 + i * p
    const m = a + p / 2
    switch (edge) {
      case 'scallops':
        for (const q of arc(m, depth, p / 2, Math.PI, Math.PI * 2, 24)) push(q.x, depth - ((depth - q.y) / (p / 2)) * depth)
        break
      case 'points':
        push(a, depth)
        push(m, 0)
        break
      case 'waves':
        for (let k = 0; k < 24; k++) {
          const t = k / 24
          push(a + t * p, (depth / 2) * (1 + Math.cos(t * Math.PI * 2)))
        }
        break
      case 'tabs':
        push(a, depth)
        push(a + p * 0.18, depth)
        push(a + p * 0.18, 0)
        push(a + p * 0.82, 0)
        push(a + p * 0.82, depth)
        break
      case 'dagged': {
        // A leaf: pinched neck, round belly, soft point.
        const keys: [number, number][] = [
          [0, 0.5],
          [0.2, 0.26],
          [0.55, 0.42],
          [0.85, 0.22],
          [1, 0],
        ]
        const half = (t: number) => {
          for (let k = 1; k < keys.length; k++) {
            if (t <= keys[k][0]) {
              const [t0, w0] = keys[k - 1]
              const [t1, w1] = keys[k]
              const s = (t - t0) / (t1 - t0)
              return w0 + (w1 - w0) * (0.5 - 0.5 * Math.cos(Math.PI * s))
            }
          }
          return 0
        }
        const steps = 20
        for (let k = 0; k <= steps; k++) {
          const t = k / steps
          push(m - half(t) * p, depth * (1 - t))
        }
        for (let k = steps - 1; k >= 1; k--) {
          const t = k / steps
          push(m + half(t) * p, depth * (1 - t))
        }
        break
      }
    }
  }
  push(-x0, depth)
  // Drop consecutive duplicates (where repeats meet).
  return pts.filter((q, i) => i === 0 || Math.hypot(q.x - pts[i - 1].x, q.y - pts[i - 1].y) > 1e-6)
}
