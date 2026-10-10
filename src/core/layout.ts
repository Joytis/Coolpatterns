import type { Fabric } from './fabrics'
import type { PatternPiece } from './pattern'
import { cutOutline } from './pattern'
import type { Polygon } from './geometry'
import { area, bounds, clipBandX, clipBandY, rotate, translate } from './geometry'

/** Inches lost at each selvedge; the rest of the bolt width is usable. */
export const SELVEDGE = 0.5
const ROW = 0.5 // profile resolution, inches
const GAP = 0.125 // space between neighbouring cut lines

/** A single piece of fabric to cut (one copy of a pattern piece, or part of one). */
export interface CutItem {
  piece: PatternPiece
  copy: number
  cut: Polygon
}

export interface Placement {
  item: CutItem
  /** Cut outline in fabric coordinates: x across the bolt, y along it. */
  poly: Polygon
  rotation: number
}

export interface FabricLayout {
  fabric: Fabric
  roles: string[]
  usableWidth: number
  /** Length of fabric the layout uses, in inches. */
  length: number
  /** Yards to buy, including the waste allowance, rounded up to 1/8 yd. */
  yards: number
  /** Theoretical minimum if pieces nested perfectly. */
  minYards: number
  cost: number
  placements: Placement[]
  splitPieces: string[]
  unplaceable: string[]
}

const roundUpEighth = (yd: number) => Math.ceil(yd * 8 - 1e-9) / 8

/** Rotations (degrees) a piece may be cut at on this fabric. */
export function allowedRotations(piece: PatternPiece, fabric: Fabric): number[] {
  // Grain 'vertical' means the piece's y axis should run along the bolt.
  const withGrain = piece.grain === 'vertical' ? [0, 180] : [90, 270]
  const crossGrain = piece.grain === 'vertical' ? [90, 270] : [0, 180]
  return fabric.directional ? withGrain : [...withGrain, ...crossGrain]
}

/**
 * Split a piece that is too wide for the bolt into strips, each of which
 * gets its own seam allowance on the new joining edges. Cuts run across
 * the piece's short side when the fabric can be turned, otherwise across
 * whichever side has to lie across the bolt.
 */
export function splitToFit(piece: PatternPiece, fabric: Fabric): PatternPiece[] {
  const usable = fabric.width - 2 * SELVEDGE
  const b = bounds(piece.outline)
  const a = piece.allowance
  const rots = allowedRotations(piece, fabric)
  const acrossOptions = rots.map((r) => (r % 180 === 0 ? 'x' : 'y'))
  const fits = acrossOptions.some((axis) => (axis === 'x' ? b.width : b.height) + 2 * a <= usable)
  if (fits || piece.kind === 'applique') return [piece]

  // Choose which axis we slice along: the one that will lie across the bolt.
  let axis: 'x' | 'y'
  if (acrossOptions.includes('x') && acrossOptions.includes('y')) axis = b.width <= b.height ? 'x' : 'y'
  else axis = acrossOptions[0] as 'x' | 'y'
  const span = axis === 'x' ? b.width : b.height
  const start = axis === 'x' ? b.minX : b.minY
  const maxStrip = usable - 2 * a - GAP
  if (maxStrip <= 1) return [piece]
  const n = Math.ceil(span / maxStrip)
  const parts: PatternPiece[] = []
  for (let i = 0; i < n; i++) {
    const lo = start + (span * i) / n
    const hi = start + (span * (i + 1)) / n
    const outline = axis === 'x' ? clipBandX(piece.outline, lo, hi) : clipBandY(piece.outline, lo, hi)
    if (outline.length < 3 || area(outline) < 0.5) continue
    parts.push({
      ...piece,
      id: `${piece.id}~${i + 1}`,
      name: `${piece.name} (part ${i + 1} of ${n})`,
      outline,
      notes: [
        ...(piece.notes ?? []),
        `Too wide for ${fabric.width}" fabric, so it's cut in ${n} parts and joined with a seam.`,
      ],
    })
  }
  return parts
}

interface Oriented {
  poly: Polygon
  width: number
  height: number
  left: number[]
  right: number[]
  rotation: number
}

function orient(cut: Polygon, rotation: number): Oriented {
  const r = rotate(cut, (rotation * Math.PI) / 180)
  const b = bounds(r)
  const poly = translate(r, -b.minX, -b.minY)
  const rows = Math.ceil(b.height / ROW)
  const left: number[] = []
  const right: number[] = []
  for (let j = 0; j < rows; j++) {
    const band = clipBandY(poly, j * ROW, (j + 1) * ROW)
    if (band.length < 2) {
      left.push(Infinity)
      right.push(-Infinity)
    } else {
      const bb = bounds(band)
      left.push(bb.minX)
      right.push(bb.maxX)
    }
  }
  return { poly, width: b.width, height: b.height, left, right, rotation }
}

interface Shelf {
  y: number
  height: number
  right: number[]
}

/**
 * Lay pieces onto a bolt with a shelf packer that slides each piece left
 * until its outline (not just its bounding box) meets its neighbour, so
 * triangles alternate point-up and point-down the way they'd be cut by hand.
 */
export function layoutFabric(fabric: Fabric, pieces: PatternPiece[], wastePercent: number): FabricLayout {
  const usable = fabric.width - 2 * SELVEDGE
  const items: CutItem[] = []
  const splitPieces: string[] = []
  for (const piece of pieces) {
    const parts = splitToFit(piece, fabric)
    if (parts.length > 1) splitPieces.push(piece.name)
    for (const part of parts) {
      const cut = cutOutline(part)
      for (let c = 0; c < part.qty; c++) items.push({ piece: part, copy: c + 1, cut })
    }
  }
  items.sort((p, q) => {
    const bp = bounds(p.cut)
    const bq = bounds(q.cut)
    return Math.max(bq.width, bq.height) - Math.max(bp.width, bp.height) || area(q.cut) - area(p.cut)
  })

  const orientCache = new Map<string, Oriented[]>()
  const orientations = (item: CutItem) => {
    const k = item.piece.id
    let o = orientCache.get(k)
    if (!o) {
      o = allowedRotations(item.piece, fabric).map((r) => orient(item.cut, r))
      orientCache.set(k, o)
    }
    return o
  }

  const shelves: Shelf[] = []
  const placements: Placement[] = []
  const unplaceable: string[] = []

  for (const item of items) {
    const opts = orientations(item).filter((o) => o.width <= usable + 1e-6)
    if (!opts.length) {
      unplaceable.push(item.piece.name)
      continue
    }
    let best: { shelf: Shelf; o: Oriented; x: number } | null = null
    for (const shelf of shelves) {
      for (const o of opts) {
        if (o.height > shelf.height + 1e-6) continue
        let x = 0
        for (let j = 0; j < o.left.length; j++) {
          if (o.left[j] === Infinity) continue
          x = Math.max(x, shelf.right[j] - o.left[j] + GAP)
        }
        if (x + o.width > usable + 1e-6) continue
        if (!best || (best.shelf === shelf && x + o.width < best.x + best.o.width)) best = { shelf, o, x }
      }
      if (best) break
    }
    if (!best) {
      // New shelf: use the orientation that is shortest along the bolt.
      const o = [...opts].sort((p, q) => p.height - q.height)[0]
      const y = shelves.reduce((s, sh) => s + sh.height + GAP, 0)
      const rows = Math.ceil(o.height / ROW) + 1
      const shelf: Shelf = { y, height: o.height, right: new Array(rows).fill(0) }
      shelves.push(shelf)
      best = { shelf, o, x: 0 }
    }
    const { shelf, o, x } = best
    for (let j = 0; j < o.right.length; j++) {
      if (o.right[j] !== -Infinity) shelf.right[j] = Math.max(shelf.right[j], x + o.right[j])
    }
    placements.push({ item, poly: translate(o.poly, x, shelf.y), rotation: o.rotation })
  }

  const length = shelves.length ? shelves[shelves.length - 1].y + shelves[shelves.length - 1].height : 0
  const yards = length ? roundUpEighth((length * (1 + wastePercent / 100)) / 36) : 0
  const cutArea = items.reduce((s, i) => s + area(i.cut), 0)
  return {
    fabric,
    roles: [],
    usableWidth: usable,
    length,
    yards,
    minYards: cutArea / usable / 36,
    cost: yards * fabric.pricePerYard,
    placements,
    splitPieces,
    unplaceable,
  }
}
