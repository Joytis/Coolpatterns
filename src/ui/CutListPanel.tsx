import type { PatternPiece } from '../core/pattern'
import { cutOutline } from '../core/pattern'
import type { Notion } from '../core/assembly'
import type { Fabric } from '../core/fabrics'
import { bounds, toSvgPath } from '../core/geometry'
import { downloadFile } from '../core/storage'
import { fmtLen, type Units } from '../core/units'
import { Section } from './fields'
import { grainline, pieceSvgFullSize } from './pieceSvg'

interface Props {
  pieces: PatternPiece[]
  notions: Notion[]
  steps: string[]
  warnings: string[]
  units: Units
  fabricForRole: (role: string) => Fabric
  roleLabel: (role: string) => string
  designName: string
}

export function CutListPanel({ pieces, notions, steps, warnings, units, fabricForRole, roleLabel, designName }: Props) {
  const sections = [...new Set(pieces.map((p) => p.section))]
  const total = pieces.reduce((s, p) => s + p.qty, 0)
  return (
    <>
      {warnings.map((w) => (
        <p key={w} className="warning">
          {w}
        </p>
      ))}
      <div className="row-actions no-print">
        <span className="muted">
          {total} pieces to cut. Seam allowances are included; dashed lines are the sewing lines.
        </span>
        <button type="button" className="btn" onClick={() => window.print()}>
          Print cutting sheet
        </button>
      </div>
      {sections.map((s) => (
        <Section key={s} title={s}>
          <div className="piece-grid">
            {pieces
              .filter((p) => p.section === s)
              .map((p) => {
                const fabric = fabricForRole(p.role)
                const cut = cutOutline(p)
                const b = bounds(cut)
                const pad = Math.max(b.width, b.height) * 0.04
                return (
                  <figure key={p.id} className="piece-card">
                    <svg viewBox={`${b.minX - pad} ${-b.maxY - pad} ${b.width + 2 * pad} ${b.height + 2 * pad}`} preserveAspectRatio="xMidYMid meet">
                      <path d={toSvgPath(cut, true)} fill={fabric.color} fillOpacity={0.35} stroke="currentColor" strokeWidth={Math.max(b.width, b.height) / 250} vectorEffect="non-scaling-stroke" />
                      <path d={toSvgPath(p.outline, true)} fill="none" stroke="currentColor" strokeDasharray="4 3" strokeWidth={1} vectorEffect="non-scaling-stroke" opacity={0.6} />
                      <path d={grainline(p, b)} fill="none" stroke="currentColor" strokeWidth={1.2} vectorEffect="non-scaling-stroke" />
                    </svg>
                    <figcaption>
                      <strong>{p.name}</strong>
                      <span>
                        Cut {p.qty} from {fabric.name} <em>({roleLabel(p.role)})</em>
                      </span>
                      <span>
                        {fmtLen(b.width, units)} × {fmtLen(b.height, units)} cut size
                        {p.allowance > 0 ? `, ${fmtLen(p.allowance, units)} allowance` : ', no allowance'}
                      </span>
                      {p.notes?.map((n) => (
                        <span key={n} className="muted">
                          {n}
                        </span>
                      ))}
                      <button
                        type="button"
                        className="link no-print"
                        onClick={() =>
                          downloadFile(`${slug(designName)}-${slug(p.name)}.svg`, pieceSvgFullSize(p, units, fabric.name), 'image/svg+xml')
                        }
                      >
                        Download full-size SVG
                      </button>
                    </figcaption>
                  </figure>
                )
              })}
          </div>
        </Section>
      ))}
      <Section title="Notions">
        <ul className="plain">
          {notions.map((n) => (
            <li key={n.name}>
              {n.name}: <strong>{n.amount}</strong>
            </li>
          ))}
        </ul>
      </Section>
      <Section title="Sewing order">
        <ol className="steps">
          {steps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      </Section>
    </>
  )
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
