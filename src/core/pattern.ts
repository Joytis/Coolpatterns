import type { Polygon } from './geometry'
import { offsetPolygon } from './geometry'

/**
 * A slot in a pattern that a fabric is assigned to, e.g. "Roof main"
 * or "Runner lining". Pieces reference roles, never fabrics directly,
 * so swapping a fabric re-colors every piece that uses that role.
 */
export interface FabricRole {
  id: string
  label: string
  section: string
  defaultFabricId: string
}

/** One pattern piece, in inches, drawn with +y pointing "up" the piece. */
export interface PatternPiece {
  id: string
  name: string
  section: string
  role: string
  qty: number
  /** Finished outline (the sewing line). */
  outline: Polygon
  /** Allowance added outside the sewing line on every edge. */
  allowance: number
  /** Grainline direction in piece coordinates. */
  grain: 'vertical' | 'horizontal'
  /** Grain direction in degrees (0 = +x, 90 = +y), when it isn't simply vertical or horizontal. */
  grainAngle?: number
  /** Appliqué pieces are cut and stitched onto a base piece. */
  kind?: 'pieced' | 'applique'
  notes?: string[]
}

export const grainAngleOf = (piece: PatternPiece): number => piece.grainAngle ?? (piece.grain === 'vertical' ? 90 : 0)

export const cutOutline = (piece: PatternPiece): Polygon => offsetPolygon(piece.outline, piece.allowance)

export const INCH = 1
export const CM_PER_INCH = 2.54
