import { useMemo } from 'react'
import type { EditorProps } from '../types'
import type { CanopyConfig, Motif, RoofDesign, RunnerEdge } from './config'
import { DEFAULT_CANOPY, MOTIF_LABELS, ROOF_DESIGN_LABELS, RUNNER_EDGE_LABELS, VENT_LABELS } from './config'
import { canopyGeometry, generateCanopy } from './generate'
import { edgeProfile, motifShape } from './shapes'
import { ChoiceTiles, LengthField, NumberField, Section, SelectField, Toggle } from '../../ui/fields'
import { bounds, toSvgPath } from '../../core/geometry'
import { fmtLen } from '../../core/units'

export function CanopyEditor({ config: c, units, onChange }: EditorProps<CanopyConfig>) {
  const set = (patch: (d: CanopyConfig) => void) => {
    const d = structuredClone(c)
    patch(d)
    onChange(d)
  }
  const g = canopyGeometry(c)
  const usesCount = c.roof.design === 'bands' || c.roof.design === 'sunburst'

  return (
    <>
      <Section title="Section 1 · Roof faces" hint="the four triangles">
        <ChoiceTiles<RoofDesign>
          value={c.roof.design}
          options={ROOF_DESIGN_LABELS}
          onChange={(design) => set((d) => void (d.roof.design = design))}
          render={(design) => <RoofThumb design={design} alternate={false} />}
        />
        {usesCount && (
          <NumberField
            label={c.roof.design === 'bands' ? 'Number of bands' : 'Number of rays'}
            value={c.roof.count}
            min={2}
            max={16}
            onChange={(n) => set((d) => void (d.roof.count = Math.round(n)))}
          />
        )}
        <Toggle
          label="Alternate colors on neighbouring faces"
          checked={c.roof.alternate}
          onChange={(b) => set((d) => void (d.roof.alternate = b))}
          help="Swaps the main and accent fabrics on every other face, like a harlequin tent."
        />
        <ChoiceTiles<Motif>
          value={c.roof.motif}
          options={MOTIF_LABELS}
          onChange={(m) => set((d) => void (d.roof.motif = m))}
          render={(m) => <MotifThumb motif={m} />}
        />
        {c.roof.motif !== 'none' && (
          <>
            <NumberField label="Appliqué size (% of face height)" suffix="%" value={c.roof.motifSize} min={8} max={60} onChange={(n) => set((d) => void (d.roof.motifSize = n))} />
            <SelectField
              label="Appliqué edge"
              value={c.roof.motifEdge}
              options={{ turned: 'Turned under (adds 1/4")', raw: 'Raw edge, satin stitched' }}
              onChange={(e) => set((d) => void (d.roof.motifEdge = e))}
            />
          </>
        )}
      </Section>

      <Section title="Section 2 · Runners" hint="hanging along each side">
        <ChoiceTiles<RunnerEdge>
          value={c.runner.edge}
          options={RUNNER_EDGE_LABELS}
          onChange={(edge) => set((d) => void (d.runner.edge = edge))}
          render={(edge) => <EdgeThumb edge={edge} />}
        />
        <div className="grid2">
          <LengthField label="Runner drop" units={units} value={c.runner.drop} min={2} max={36} onChange={(n) => set((d) => void (d.runner.drop = n))} />
          {c.runner.edge !== 'straight' && (
            <LengthField
              label={c.runner.edge === 'bunting' ? 'Flag length' : 'Edge depth'}
              units={units}
              value={c.runner.edgeDepth}
              min={1}
              max={24}
              onChange={(n) => set((d) => void (d.runner.edgeDepth = n))}
            />
          )}
          {c.runner.edge !== 'straight' && (
            <LengthField
              label="Repeat width"
              units={units}
              value={c.runner.repeat}
              min={3}
              max={40}
              help={`${g.runnerCount} per side, ${fmtLen(g.W / g.runnerCount, units)} each`}
              onChange={(n) => set((d) => void (d.runner.repeat = n))}
            />
          )}
          <LengthField
            label="Trim band"
            units={units}
            value={c.runner.trimBand}
            min={0}
            max={12}
            help="0 for none"
            onChange={(n) => set((d) => void (d.runner.trimBand = n))}
          />
        </div>
        <Toggle
          label="Line the runners"
          checked={c.runner.lined}
          onChange={(b) => set((d) => void (d.runner.lined = b))}
          help="Lining gives shaped edges a clean finish and hides the back."
        />
      </Section>

      <Section title="Vent at the peak" open={false} hint={VENT_LABELS[c.vent.style].split(' (')[0]}>
        <SelectField label="Vent handling" value={c.vent.style} options={VENT_LABELS} onChange={(s) => set((d) => void (d.vent.style = s))} />
        {c.vent.style === 'cap' && (
          <SelectField
            label="Open sides"
            value={c.vent.openSides}
            options={{ two: 'Two sides, matching the tent', four: 'All four sides' }}
            onChange={(s) => set((d) => void (d.vent.openSides = s))}
          />
        )}
      </Section>

      <Section title="Tent measurements" open={false} hint="measure yours to be sure">
        <p className="muted">
          Defaults are estimates for the Academy 10×10 straight-leg canopy. Measure across the top from eave to eave, and from the eave straight up to the
          hub under the vent hat.
        </p>
        <div className="grid2">
          <LengthField label="Top, eave to eave" units={units} value={c.tent.topWidth} min={60} max={240} onChange={(n) => set((d) => void (d.tent.topWidth = n))} />
          <LengthField label="Eave up to hub" units={units} value={c.tent.roofRise} min={6} max={80} onChange={(n) => set((d) => void (d.tent.roofRise = n))} />
          <LengthField label="Vent hat width" units={units} value={c.tent.hatWidth} min={8} max={60} onChange={(n) => set((d) => void (d.tent.hatWidth = n))} />
          <LengthField label="Hat top above hub" units={units} value={c.tent.hatLift} min={2} max={30} onChange={(n) => set((d) => void (d.tent.hatLift = n))} />
          <LengthField label="Hat skirt depth" units={units} value={c.tent.hatSkirt} min={1} max={20} onChange={(n) => set((d) => void (d.tent.hatSkirt = n))} />
          <LengthField label="Tent valance drop" units={units} value={c.tent.valanceDrop} min={0} max={24} onChange={(n) => set((d) => void (d.tent.valanceDrop = n))} />
          <LengthField label="Leg height to eave" units={units} value={c.tent.eaveHeight} min={48} max={110} onChange={(n) => set((d) => void (d.tent.eaveHeight = n))} />
          <LengthField
            label="Ease per side"
            units={units}
            value={c.ease}
            min={0}
            max={6}
            step={0.25}
            help="Extra room so the cover slips over"
            onChange={(n) => set((d) => void (d.ease = n))}
          />
        </div>
        <button type="button" className="link" onClick={() => set((d) => void (d.tent = structuredClone(DEFAULT_CANOPY.tent)))}>
          Reset measurements
        </button>
      </Section>
    </>
  )
}

const THUMB_COLORS = ['#e9dcc0', '#8e2a44']

function RoofThumb({ design, alternate }: { design: RoofDesign; alternate: boolean }) {
  const parts = useMemo(() => {
    const cfg = structuredClone(DEFAULT_CANOPY)
    cfg.roof = { ...cfg.roof, design, alternate, motif: 'none' }
    const res = generateCanopy(cfg, 0)
    return res.parts.filter((p) => p.section === 'Roof' && p.frame.origin.z > 1)
  }, [design, alternate])
  return (
    <svg viewBox="-64 -72 128 76">
      {parts.map((p, i) => (
        <path key={i} d={toSvgPath(p.outline, true)} fill={THUMB_COLORS[p.role === 'roofAccent' ? 1 : 0]} stroke="#3a2a2a" strokeWidth={0.8} />
      ))}
    </svg>
  )
}

function MotifThumb({ motif }: { motif: Motif }) {
  if (motif === 'none') {
    return (
      <svg viewBox="-12 -12 24 24">
        <circle r={9} fill="none" stroke="#aaa" strokeDasharray="2 2" />
      </svg>
    )
  }
  const shape = motifShape(motif, 0, 0, 20)
  return (
    <svg viewBox="-12 -12 24 24">
      <path d={toSvgPath(shape, true)} fill="#c2486b" />
    </svg>
  )
}

function EdgeThumb({ edge }: { edge: RunnerEdge }) {
  const depth = 8
  const prof = edgeProfile(edge, 60, edge === 'bunting' ? 0 : depth, 3)
  const body = [...prof, { x: 30, y: depth + 10 }, { x: -30, y: depth + 10 }]
  const b = bounds(body)
  return (
    <svg viewBox={`-32 ${-b.maxY - 2} 64 ${b.height + 14}`}>
      <path d={toSvgPath(body, true)} fill="#8e2a44" stroke="#3a2a2a" strokeWidth={0.6} />
      {edge === 'bunting' &&
        [0, 1, 2].map((i) => {
          const cx = -20 + i * 20
          return <path key={i} d={`M${cx - 9} 0 L${cx + 9} 0 L${cx} 10 Z`} fill={THUMB_COLORS[i % 2]} stroke="#3a2a2a" strokeWidth={0.6} />
        })}
    </svg>
  )
}
