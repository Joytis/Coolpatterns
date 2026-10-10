import { describe, expect, it } from 'vitest'
import { area, bounds, clipBandY, offsetPolygon, v } from '../core/geometry'
import { layoutFabric, splitToFit } from '../core/layout'
import type { Fabric } from '../core/fabrics'
import type { PatternPiece } from '../core/pattern'

const fabric = (width: number, directional = false): Fabric => ({
  id: 'f',
  name: 'Test',
  print: 'solid',
  color: '#fff',
  accent: '#000',
  repeat: 4,
  width,
  pricePerYard: 10,
  directional,
})

const piece = (outline: PatternPiece['outline'], qty = 1, grain: PatternPiece['grain'] = 'vertical'): PatternPiece => ({
  id: 'p',
  name: 'Piece',
  section: 'Test',
  role: 'r',
  qty,
  outline,
  allowance: 0.5,
  grain,
})

describe('geometry', () => {
  it('adds seam allowance around a square', () => {
    const sq = [v(0, 0), v(10, 0), v(10, 10), v(0, 10)]
    const out = offsetPolygon(sq, 0.5)
    const b = bounds(out)
    expect(b.width).toBeCloseTo(11, 2)
    expect(b.height).toBeCloseTo(11, 2)
  })

  it('clips a triangle into a band', () => {
    const tri = [v(-10, 0), v(10, 0), v(0, 10)]
    const band = clipBandY(tri, 0, 5)
    expect(area(band)).toBeCloseTo(75, 5)
  })
})

describe('layout', () => {
  it('fits a 36" square of a 44" bolt in one yard plus waste', () => {
    const sq = [v(0, 0), v(35, 0), v(35, 35), v(0, 35)]
    const lay = layoutFabric(fabric(44), [piece(sq)], 0)
    expect(lay.length).toBeCloseTo(36, 1)
    expect(lay.yards).toBe(1)
  })

  it('nests triangles point-up and point-down', () => {
    const tri = [v(-10, 0), v(10, 0), v(0, 20)]
    const lay = layoutFabric(fabric(60), [piece(tri, 4)], 0)
    // Four 21"-wide triangles nested alternately take ~2.5 widths, not 4.
    const xs = lay.placements.map((p) => bounds(p.poly).maxX)
    expect(Math.max(...xs)).toBeLessThan(58)
    expect(lay.length).toBeLessThan(22)
  })

  it('splits a piece wider than the bolt', () => {
    const big = [v(-61, 0), v(61, 0), v(0, 68)]
    const parts = splitToFit(piece(big), fabric(60))
    expect(parts.length).toBe(2)
    const total = parts.reduce((s, p) => s + area(p.outline), 0)
    expect(total).toBeCloseTo(area(big), 3)
  })

  it('keeps directional fabric unrotated', () => {
    const strip = [v(0, 0), v(100, 0), v(100, 10), v(0, 10)]
    const lay = layoutFabric(fabric(60, true), [piece(strip, 1, 'horizontal')], 0)
    expect(lay.placements.every((p) => p.rotation === 90 || p.rotation === 270)).toBe(true)
  })
})
