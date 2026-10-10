import type { Fabric } from './fabrics'
import { DEFAULT_FABRICS } from './fabrics'
import type { Units } from './units'

/** A saved design: one configured pattern plus its fabric choices. */
export interface Design {
  id: string
  name: string
  patternId: string
  config: unknown
  seamAllowance: number
  wastePercent: number
  /** Fabric id chosen for each fabric role of the pattern. */
  roleFabrics: Record<string, string>
  updatedAt: number
}

export interface AppState {
  version: 1
  fabrics: Fabric[]
  designs: Design[]
  currentId: string
  units: Units
}

const KEY = 'coolpatterns.v1'

export const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

export function loadState(): AppState | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const s = JSON.parse(raw) as AppState
    if (s.version !== 1 || !Array.isArray(s.designs) || !s.designs.length) return null
    if (!Array.isArray(s.fabrics) || !s.fabrics.length) s.fabrics = DEFAULT_FABRICS
    return s
  } catch {
    return null
  }
}

/** Returns false when the browser refused to save (usually storage full). */
export function saveState(state: AppState): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
    return true
  } catch {
    return false
  }
}

export function downloadFile(name: string, content: string | Blob, type = 'application/json') {
  const blob = content instanceof Blob ? content : new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
