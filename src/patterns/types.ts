import type { ComponentType } from 'react'
import type * as THREE from 'three'
import type { FabricRole } from '../core/pattern'
import type { PatternResult } from '../core/assembly'
import type { Units } from '../core/units'

export interface EditorProps<C> {
  config: C
  units: Units
  onChange: (config: C) => void
}

/**
 * A pattern the app can design. Each pattern owns its configuration
 * (modules like roof designs or runner edges), the fabric roles it needs,
 * and how to turn a configuration into placed pattern pieces.
 */
export interface PatternDefinition<C = unknown> {
  id: string
  name: string
  description: string
  defaultConfig: () => C
  /** Upgrade a saved (possibly older) config. */
  normalize: (raw: unknown) => C
  roles: (config: C) => FabricRole[]
  generate: (config: C, seamAllowance: number) => PatternResult
  Editor: ComponentType<EditorProps<C>>
  /** The object the piece is built on, shown under the preview (e.g. the tent). */
  underlay?: (config: C) => THREE.Object3D
}
