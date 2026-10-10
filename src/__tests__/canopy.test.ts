import { describe, expect, it } from 'vitest'
import { area } from '../core/geometry'
import { piecesFromParts } from '../core/assembly'
import { DEFAULT_CANOPY, type CanopyConfig, type RoofDesign, type RunnerEdge } from '../patterns/canopyCover/config'
import { canopyGeometry, generateCanopy } from '../patterns/canopyCover/generate'

const cfg = (patch: (c: CanopyConfig) => void) => {
  const c = structuredClone(DEFAULT_CANOPY)
  patch(c)
  return c
}

describe('canopy cover', () => {
  it('roof pieces exactly tile the four roof faces for every design', () => {
    for (const design of ['solid', 'split', 'bands', 'sunburst', 'triangles'] as RoofDesign[]) {
      const c = cfg((c) => {
        c.roof.design = design
        c.roof.motif = 'none'
      })
      const g = canopyGeometry(c)
      const res = generateCanopy(c, 0.5)
      const roof = res.parts.filter((p) => p.section === 'Roof')
      const total = roof.reduce((s, p) => s + area(p.outline), 0)
      const faceArea = ((g.W + g.hole) / 2) * g.topY
      expect(total, design).toBeCloseTo(4 * faceArea, 1)
    }
  })

  it('makes four runners and groups them as one piece cut four times', () => {
    const pieces = piecesFromParts(generateCanopy(DEFAULT_CANOPY, 0.5).parts)
    const runner = pieces.find((p) => p.id === 'runner')!
    expect(runner.qty).toBe(4)
  })

  it('generates valid outlines for every runner edge', () => {
    for (const edge of ['straight', 'scallops', 'points', 'dagged', 'waves', 'tabs', 'bunting'] as RunnerEdge[]) {
      const res = generateCanopy(cfg((c) => (c.runner.edge = edge)), 0.5)
      for (const p of res.parts) expect(area(p.outline), `${edge} ${p.name}`).toBeGreaterThan(1)
    }
  })

  it('closed peak is taller than the vented one', () => {
    const open = canopyGeometry(DEFAULT_CANOPY)
    const closed = canopyGeometry(cfg((c) => (c.vent.style = 'closed')))
    expect(closed.rise).toBeGreaterThan(open.rise)
    expect(closed.hole).toBe(0)
  })
})
