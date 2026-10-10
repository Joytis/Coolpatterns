import type { Polygon } from './geometry'
import type { PatternPiece } from './pattern'

export interface Vec3 {
  x: number
  y: number
  z: number
}

/**
 * Where a flat piece sits in the finished object: a point (x, y) of the
 * piece lands at origin + x*u + y*v (inches, y up). Planar frames are
 * enough for draped panels like canopy faces and hanging runners.
 */
export interface Frame {
  origin: Vec3
  u: Vec3
  v: Vec3
}

/** One copy of a pattern piece placed in the 3D model. */
export interface AssemblyPart {
  /** Pieces with the same key are identical and are cut `qty` times. */
  key: string
  name: string
  section: string
  role: string
  outline: Polygon
  allowance: number
  grain: 'vertical' | 'horizontal'
  kind?: 'pieced' | 'applique'
  notes?: string[]
  frame: Frame
  /** Distance to float the part off its frame, so layers don't z-fight. */
  lift: number
}

export interface Notion {
  name: string
  amount: string
}

export interface PatternResult {
  parts: AssemblyPart[]
  notions: Notion[]
  steps: string[]
  warnings: string[]
}

/** Collapse placed parts into a cut list of unique pieces with quantities. */
export function piecesFromParts(parts: AssemblyPart[]): PatternPiece[] {
  const byKey = new Map<string, PatternPiece>()
  for (const p of parts) {
    const hit = byKey.get(p.key)
    if (hit) {
      hit.qty++
      continue
    }
    byKey.set(p.key, {
      id: p.key,
      name: p.name,
      section: p.section,
      role: p.role,
      qty: 1,
      outline: p.outline,
      allowance: p.allowance,
      grain: p.grain,
      kind: p.kind,
      notes: p.notes,
    })
  }
  return [...byKey.values()]
}

export const vec3 = (x: number, y: number, z: number): Vec3 => ({ x, y, z })
export const add3 = (a: Vec3, b: Vec3): Vec3 => vec3(a.x + b.x, a.y + b.y, a.z + b.z)
export const sub3 = (a: Vec3, b: Vec3): Vec3 => vec3(a.x - b.x, a.y - b.y, a.z - b.z)
export const mul3 = (a: Vec3, s: number): Vec3 => vec3(a.x * s, a.y * s, a.z * s)
export const len3 = (a: Vec3): number => Math.hypot(a.x, a.y, a.z)
/** Rotate about the vertical (y) axis. */
export const rotY = (a: Vec3, rad: number): Vec3 =>
  vec3(a.x * Math.cos(rad) + a.z * Math.sin(rad), a.y, -a.x * Math.sin(rad) + a.z * Math.cos(rad))
export const rotFrameY = (f: Frame, rad: number): Frame => ({
  origin: rotY(f.origin, rad),
  u: rotY(f.u, rad),
  v: rotY(f.v, rad),
})
