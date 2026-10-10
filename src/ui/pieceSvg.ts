import type { PatternPiece } from '../core/pattern'
import { cutOutline, grainAngleOf } from '../core/pattern'
import { bounds, toSvgPath } from '../core/geometry'
import { fmtLen, type Units } from '../core/units'

/**
 * A standalone SVG of a piece at true size (1 user unit = 1 inch), for
 * printing at 100% or projecting onto fabric.
 */
export function pieceSvgFullSize(piece: PatternPiece, units: Units, fabricName: string): string {
  const cut = cutOutline(piece)
  const b = bounds(cut)
  const m = 1
  const w = b.width + 2 * m
  const h = b.height + 2 * m
  const vb = `${b.minX - m} ${-b.maxY - m} ${w} ${h}`
  const cx = (b.minX + b.maxX) / 2
  const cy = -(b.minY + b.maxY) / 2
  const g = grainline(piece, b)
  const label = [piece.name, `Cut ${piece.qty} · ${fabricName}`, `${fmtLen(b.width, units)} × ${fmtLen(b.height, units)} with ${fmtLen(piece.allowance, units)} seam allowance`]
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}in" height="${h}in" viewBox="${vb}">
  <path d="${toSvgPath(cut, true)}" fill="none" stroke="#000" stroke-width="0.03"/>
  <path d="${toSvgPath(piece.outline, true)}" fill="none" stroke="#666" stroke-width="0.02" stroke-dasharray="0.25 0.15"/>
  <path d="${g}" fill="none" stroke="#000" stroke-width="0.03"/>
  ${label.map((t, i) => `<text x="${cx}" y="${cy + 1.5 + i * 0.6}" font-size="${i ? 0.4 : 0.55}" text-anchor="middle" font-family="sans-serif">${escapeXml(t)}</text>`).join('\n  ')}
</svg>`
}

/** Path data for a grainline arrow through the middle of the piece (y flipped for SVG). */
export function grainline(piece: PatternPiece, b = bounds(cutOutline(piece))): string {
  const cx = (b.minX + b.maxX) / 2
  const cy = -(b.minY + b.maxY) / 2
  const t = (grainAngleOf(piece) * Math.PI) / 180
  // SVG y points down, so flip the direction's y.
  const dx = Math.cos(t)
  const dy = -Math.sin(t)
  const len = Math.min(b.width, b.height, Math.max(b.width, b.height) * 0.6) * 0.4
  const a = Math.min(len * 0.2, 1.5)
  const end = (s: number) => {
    const ex = cx + dx * len * s
    const ey = cy + dy * len * s
    // Two barbs angled back from the tip.
    const bx = -dx * s
    const by = -dy * s
    return `M${ex + (bx * a - by * a * 0.5)} ${ey + (by * a + bx * a * 0.5)} L${ex} ${ey} L${ex + (bx * a + by * a * 0.5)} ${ey + (by * a - bx * a * 0.5)}`
  }
  return `M${cx - dx * len} ${cy - dy * len} L${cx + dx * len} ${cy + dy * len} ${end(1)} ${end(-1)}`
}

const escapeXml = (s: string) => s.replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[c]!)
