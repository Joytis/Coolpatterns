import { useState } from 'react'
import type { FabricLayout } from '../core/layout'
import { toSvgPath } from '../core/geometry'
import { fmtLen, fmtMoney, fmtYards, type Units } from '../core/units'
import { NumberField } from './fields'
import { Swatch } from './Swatch'

interface Props {
  layouts: FabricLayout[]
  pending: boolean
  units: Units
  wastePercent: number
  onWasteChange: (n: number) => void
  roleLabel: (role: string) => string
}

export function YardagePanel({ layouts, pending, units, wastePercent, onWasteChange, roleLabel }: Props) {
  const totalCost = layouts.reduce((s, l) => s + l.cost, 0)
  const totalYards = layouts.reduce((s, l) => s + l.yards, 0)
  return (
    <>
      <div className={'totals' + (pending ? ' pending' : '')}>
        <div>
          <span className="big">{fmtYards(totalYards)}</span>
          <span className="muted">fabric in total</span>
        </div>
        <div>
          <span className="big">{fmtMoney(totalCost)}</span>
          <span className="muted">estimated cost</span>
        </div>
      </div>
      <NumberField
        label="Extra for shrinkage and squaring up"
        suffix="%"
        value={wastePercent}
        min={0}
        max={50}
        onChange={onWasteChange}
        help="Added to every fabric before rounding up to the next 1/8 yard."
      />
      <p className="muted">
        Layouts are nested automatically to estimate yardage. Cutting by hand you may save a little, so treat these as a safe amount to buy.
      </p>
      <table className="buy-list">
        <thead>
          <tr>
            <th>Fabric</th>
            <th>Buy</th>
            <th>Cost</th>
          </tr>
        </thead>
        <tbody>
          {layouts.map((l) => (
            <tr key={l.fabric.id}>
              <td>
                <span className="buy-fabric">
                  <Swatch fabric={l.fabric} size={28} />
                  <span>
                    <strong>{l.fabric.name}</strong>
                    <small>
                      {l.fabric.width}" wide · {l.roles.map(roleLabel).join(', ')}
                    </small>
                  </span>
                </span>
              </td>
              <td>
                <strong>{fmtYards(l.yards)}</strong>
              </td>
              <td>{fmtMoney(l.cost)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {layouts.map((l) => (
        <LayoutView key={l.fabric.id} layout={l} units={units} />
      ))}
    </>
  )
}

function LayoutView({ layout: l, units }: { layout: FabricLayout; units: Units }) {
  const [hover, setHover] = useState<number | null>(null)
  // Drawn with the bolt running left to right: fabric y becomes screen x.
  const W = l.fabric.width
  const L = Math.max(l.length, 1)
  const sel = 0.5
  return (
    <figure className="layout">
      <figcaption>
        <strong>{l.fabric.name}</strong> cutting layout: {fmtLen(l.length, units)} of {l.fabric.width}" fabric.
        {l.splitPieces.length > 0 && <span className="muted"> Some pieces are wider than this fabric and are cut in parts: {[...new Set(l.splitPieces)].join(', ')}.</span>}
        {l.unplaceable.length > 0 && <span className="error"> Too large to cut from this fabric: {[...new Set(l.unplaceable)].join(', ')}.</span>}
      </figcaption>
      <svg viewBox={`-2 -2 ${L + 4} ${W + 4}`} className="layout-svg">
        <rect x={0} y={0} width={L} height={W} fill={l.fabric.color} fillOpacity={0.18} stroke="currentColor" strokeWidth={0.3} />
        <line x1={0} x2={L} y1={sel} y2={sel} stroke="currentColor" strokeWidth={0.15} strokeDasharray="1 1" opacity={0.5} />
        <line x1={0} x2={L} y1={W - sel} y2={W - sel} stroke="currentColor" strokeWidth={0.15} strokeDasharray="1 1" opacity={0.5} />
        {Array.from({ length: Math.floor(L / 36) }, (_, i) => (
          <g key={i}>
            <line x1={(i + 1) * 36} x2={(i + 1) * 36} y1={0} y2={W} stroke="currentColor" strokeWidth={0.2} opacity={0.35} />
            <text x={(i + 1) * 36 - 1} y={W - 1.5} fontSize={2.6} textAnchor="end" opacity={0.6}>
              {i + 1} yd
            </text>
          </g>
        ))}
        {l.placements.map((p, i) => {
          const swapped = p.poly.map((q) => ({ x: q.y, y: q.x + sel }))
          return (
            <path
              key={i}
              d={toSvgPath(swapped)}
              fill={l.fabric.color}
              fillOpacity={hover === i ? 0.9 : 0.6}
              stroke="currentColor"
              strokeWidth={0.25}
              onPointerEnter={() => setHover(i)}
              onPointerLeave={() => setHover(null)}
            >
              <title>
                {p.item.piece.name} ({p.item.copy} of {p.item.piece.qty})
              </title>
            </path>
          )
        })}
      </svg>
      {hover !== null && <p className="muted">{l.placements[hover]?.item.piece.name}</p>}
    </figure>
  )
}
