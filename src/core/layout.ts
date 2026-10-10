import type { Fabric } from './fabrics'
import type { PatternPiece } from './pattern'
import { cutOutline, grainAngleOf } from './pattern'
import type { Polygon } from './geometry'
import { area, bounds, clipBandX, clipBandY, rotate, translate } from './geometry'

/** Inches lost at each selvedge; the rest of the bolt width is usable. */
export const SELVEDGE = 0.5
const CELL = 0.5 // column width for packing, inches
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
  // Turn the piece so its grainline runs along the bolt (+y).
  const base = 90 - grainAngleOf(piece)
  const withGrain = [base, base + 180]
  const crossGrain = [base + 90, base + 270]
  return (fabric.directional ? withGrain : [...withGrain, ...crossGrain]).map((r) => ((r % 360) + 360) % 360)
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
  const fits = rots.some((r) => bounds(rotate(piece.outline, (r * Math.PI) / 180)).width + 2 * a <= usable)
  if (fits || piece.kind === 'applique') return [piece]
  const acrossOptions = rots.map((r) => (Math.round(r / 90) % 2 === 0 ? 'x' : 'y'))

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
  /** Per column (CELL wide): lowest and highest y of the piece, or NaN if empty. */
  bottom: number[]
  top: number[]
  rotation: number
}

function orient(cut: Polygon, rotation: number): Oriented {
  const r = rotate(cut, (rotation * Math.PI) / 180)
  const b = bounds(r)
  const poly = translate(r, -b.minX, -b.minY)
  const cols = Math.max(1, Math.ceil(b.width / CELL - 1e-9))
  const bottom: number[] = []
  const top: number[] = []
  for (let c = 0; c < cols; c++) {
    const band = clipBandX(poly, c * CELL, (c + 1) * CELL)
    if (band.length < 2) {
      bottom.push(NaN)
      top.push(NaN)
    } else {
      const bb = bounds(band)
      bottom.push(bb.minY)
      top.push(bb.maxY)
    }
  }
  return { poly, width: b.width, height: b.height, bottom, top, rotation }
}

/**
 * Lay a fabric's pieces onto its bolt and work out how much to buy.
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
  // Try a few piece orders and keep whichever uses the least fabric.
  const orders: ((p: CutItem, q: CutItem) => number)[] = [
    (p, q) => maxDim(q.cut) - maxDim(p.cut) || area(q.cut) - area(p.cut),
    (p, q) => area(q.cut) - area(p.cut),
  ]
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
  let best: Packed | null = null
  for (const order of orders) {
    const packed = pack([...items].sort(order), orientations, usable)
    if (!best || packed.length < best.length - 1e-6) best = packed
  }
  const { placements, unplaceable, length } = best!

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

interface Packed {
  placements: Placement[]
  unplaceable: string[]
  length: number
}

const maxDim = (p: Polygon) => {
  const b = bounds(p)
  return Math.max(b.width, b.height)
}

/**
 * Gravity packing: the bolt is divided into narrow columns, and each piece
 * drops down the bolt until it rests on pieces already placed, following
 * their real outlines, so it can tuck into gaps and under overhangs, the
 * way triangles alternate point-up and point-down when cut by hand. Each
 * piece goes wherever its top ends up lowest, keeping the layout short.
 */
function pack(items: CutItem[], orientations: (item: CutItem) => Oriented[], usable: number): Packed {
  const cols = Math.floor(usable / CELL + 1e-9)
  // Occupied y-intervals in each column, as flat [lo, hi, lo, hi, ...].
  const occ: number[][] = Array.from({ length: cols }, () => [])
  const placements: Placement[] = []
  const unplaceable: string[] = []

  for (const item of items) {
    let best: { o: Oriented; col: number; y: number; top: number } | null = null
    for (const o of orientations(item)) {
      const w = o.bottom.length
      for (let col = 0; col + w <= cols; col++) {
        // Raise y until the piece clears every column it covers.
        let y = 0
        let moved = true
        while (moved) {
          moved = false
          if (best && y + o.height >= best.top - 1e-6) break
          for (let c = 0; c < w && !moved; c++) {
            const lo = o.bottom[c]
            if (Number.isNaN(lo)) continue
            const a = y + lo
            const b = y + o.top[c]
            const iv = occ[col + c]
            for (let k = 0; k < iv.length; k += 2) {
              if (iv[k] < b + GAP - 1e-6 && iv[k + 1] + GAP > a + 1e-6) {
                y = iv[k + 1] + GAP - lo
                moved = true
                break
              }
            }
          }
        }
        const top = y + o.height
        if (!best || top < best.top - 1e-6) best = { o, col, y, top }
      }
    }
    if (!best) {
      unplaceable.push(item.piece.name)
      continue
    }
    const { o, col, y } = best
    for (let c = 0; c < o.top.length; c++) {
      if (!Number.isNaN(o.bottom[c])) occ[col + c].push(y + o.bottom[c], y + o.top[c])
    }
    placements.push({ item, poly: translate(o.poly, col * CELL, y), rotation: o.rotation })
  }
  const length = placements.reduce((m, p) => Math.max(m, bounds(p.poly).maxY), 0)
  return { placements, unplaceable, length }
}
