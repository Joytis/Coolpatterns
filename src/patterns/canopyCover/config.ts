export type VentStyle = 'cap' | 'opening' | 'closed'
export type RoofDesign = 'solid' | 'split' | 'bands' | 'sunburst' | 'triangles'
export type Motif = 'none' | 'heart' | 'star' | 'sun' | 'flower' | 'moon' | 'diamond'
export type RunnerEdge = 'straight' | 'scallops' | 'points' | 'dagged' | 'waves' | 'tabs' | 'bunting'

export interface CanopyConfig {
  tent: {
    /** Length of one side of the canopy top, eave to eave (in). */
    topWidth: number
    /** Height from the eave up to the center hub (in). */
    roofRise: number
    /** Leg height to the eave, for the preview only (in). */
    eaveHeight: number
    /** The canopy's own valance drop, for the preview (in). */
    valanceDrop: number
    /** Side of the raised vent hat at the top (in). */
    hatWidth: number
    /** How far the hat top sits above where the roof would peak (in). */
    hatLift: number
    /** Depth of the hat's own skirt (in). */
    hatSkirt: number
  }
  /** Extra room so the cover slides over the canopy fabric (in, per side). */
  ease: number
  vent: {
    style: VentStyle
    /** Which sides of the cap stay open for airflow. */
    openSides: 'two' | 'four'
  }
  roof: {
    design: RoofDesign
    /** Number of bands or rays, for designs that use it. */
    count: number
    /** Swap main/accent fabrics on every other roof face. */
    alternate: boolean
    motif: Motif
    /** Motif size as a percent of the roof face height. */
    motifSize: number
    /** Turned-under edge (adds 1/4") or raw edge (no allowance). */
    motifEdge: 'turned' | 'raw'
  }
  runner: {
    edge: RunnerEdge
    /** Plain depth of the runner below the eave, before the edge shape (in). */
    drop: number
    /** Extra depth of the shaped edge (scallops, points, flags) (in). */
    edgeDepth: number
    /** Target width of one scallop/point/flag; snapped to divide each side evenly (in). */
    repeat: number
    lined: boolean
    /** Contrasting band along the top of the runner; 0 for none (in). */
    trimBand: number
  }
}

export const DEFAULT_CANOPY: CanopyConfig = {
  tent: {
    topWidth: 120,
    roofRise: 30,
    eaveHeight: 80,
    valanceDrop: 8,
    hatWidth: 30,
    hatLift: 10,
    hatSkirt: 6,
  },
  ease: 1,
  vent: { style: 'cap', openSides: 'two' },
  roof: { design: 'sunburst', count: 6, alternate: true, motif: 'heart', motifSize: 28, motifEdge: 'turned' },
  runner: { edge: 'scallops', drop: 10, edgeDepth: 4, repeat: 10, lined: true, trimBand: 2 },
}

export const ROOF_DESIGN_LABELS: Record<RoofDesign, string> = {
  solid: 'Solid',
  split: 'Split down the middle',
  bands: 'Horizontal bands',
  sunburst: 'Sunburst rays',
  triangles: 'Nested triangles',
}

export const MOTIF_LABELS: Record<Motif, string> = {
  none: 'No appliqué',
  heart: 'Heart',
  star: 'Star',
  sun: 'Sun',
  flower: 'Flower',
  moon: 'Crescent moon',
  diamond: 'Diamond',
}

export const RUNNER_EDGE_LABELS: Record<RunnerEdge, string> = {
  straight: 'Straight hem',
  scallops: 'Scallops',
  points: 'Points',
  dagged: 'Dagged leaves',
  waves: 'Waves',
  tabs: 'Castle tabs',
  bunting: 'Bunting flags',
}

export const VENT_LABELS: Record<VentStyle, string> = {
  cap: 'Matching vent cap (vents stay open)',
  opening: 'Bound opening (tent vent pokes through)',
  closed: 'Closed peak (covers the vent)',
}

/** Merge a possibly old or partial saved config over the defaults. */
export function normalizeCanopy(raw: unknown): CanopyConfig {
  const r = (raw ?? {}) as Partial<CanopyConfig>
  return {
    tent: { ...DEFAULT_CANOPY.tent, ...r.tent },
    ease: r.ease ?? DEFAULT_CANOPY.ease,
    vent: { ...DEFAULT_CANOPY.vent, ...r.vent },
    roof: { ...DEFAULT_CANOPY.roof, ...r.roof },
    runner: { ...DEFAULT_CANOPY.runner, ...r.runner },
  }
}
