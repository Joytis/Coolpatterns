import type { PatternDefinition } from './types'
import { canopyCover } from './canopyCover'

/** Every pattern the app offers. Add new patterns here. */
export const PATTERNS: PatternDefinition<any>[] = [canopyCover]

export const patternById = (id: string): PatternDefinition<any> => PATTERNS.find((p) => p.id === id) ?? PATTERNS[0]
