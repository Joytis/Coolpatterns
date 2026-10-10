export type PrintKind = 'solid' | 'stripes' | 'gingham' | 'dots' | 'floral' | 'damask' | 'photo'

export interface Fabric {
  id: string
  name: string
  print: PrintKind
  /** Base color. */
  color: string
  /** Accent color for prints. */
  accent: string
  /** Size of one print repeat, in inches. */
  repeat: number
  /** Bolt width in inches (common: 44, 54, 60, 108). */
  width: number
  pricePerYard: number
  /** One-way prints can't be rotated sideways when cutting. */
  directional: boolean
  /** Downscaled photo of the fabric, as a data URL, for print 'photo'. */
  photo?: string
}

export const PRINT_LABELS: Record<PrintKind, string> = {
  solid: 'Solid',
  stripes: 'Stripes',
  gingham: 'Gingham',
  dots: 'Polka dots',
  floral: 'Floral',
  damask: 'Damask',
  photo: 'Photo of my fabric',
}

export const BOLT_WIDTHS = [44, 54, 60, 108]

export const DEFAULT_FABRICS: Fabric[] = [
  { id: 'cream-canvas', name: 'Cream canvas', print: 'solid', color: '#efe4cc', accent: '#d9c9a5', repeat: 4, width: 60, pricePerYard: 12, directional: false },
  { id: 'burgundy-duck', name: 'Burgundy duck', print: 'solid', color: '#7a1f35', accent: '#5c1426', repeat: 4, width: 60, pricePerYard: 14, directional: false },
  { id: 'forest-twill', name: 'Forest twill', print: 'solid', color: '#2f5a3a', accent: '#234530', repeat: 4, width: 60, pricePerYard: 13, directional: false },
  { id: 'gold-stripe', name: 'Gold awning stripe', print: 'stripes', color: '#e7b53c', accent: '#f6ecd2', repeat: 6, width: 54, pricePerYard: 16, directional: true },
  { id: 'rose-floral', name: 'Rose floral', print: 'floral', color: '#f3d3d8', accent: '#c2486b', repeat: 5, width: 44, pricePerYard: 11, directional: false },
  { id: 'navy-damask', name: 'Navy damask', print: 'damask', color: '#1f2d55', accent: '#c9a94f', repeat: 8, width: 54, pricePerYard: 18, directional: true },
  { id: 'blue-gingham', name: 'Blue gingham', print: 'gingham', color: '#ffffff', accent: '#4a78b8', repeat: 1, width: 44, pricePerYard: 9, directional: false },
  { id: 'cream-dots', name: 'Berry dots', print: 'dots', color: '#a3284e', accent: '#f7e8d0', repeat: 2, width: 44, pricePerYard: 10, directional: false },
]

export function newFabricId(): string {
  return 'fab-' + Math.random().toString(36).slice(2, 9)
}
