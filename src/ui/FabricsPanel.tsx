import { useState } from 'react'
import type { Fabric, PrintKind } from '../core/fabrics'
import { BOLT_WIDTHS, newFabricId, PRINT_LABELS } from '../core/fabrics'
import type { FabricRole } from '../core/pattern'
import { photoToDataUrl } from '../core/textures'
import { NumberField, Section, SelectField, Toggle } from './fields'
import { Swatch } from './Swatch'

interface Props {
  roles: FabricRole[]
  fabrics: Fabric[]
  roleFabrics: Record<string, string>
  fabricForRole: (role: string) => Fabric
  onAssign: (role: string, fabricId: string) => void
  onFabricsChange: (fabrics: Fabric[]) => void
}

export function FabricsPanel({ roles, fabrics, fabricForRole, onAssign, onFabricsChange }: Props) {
  const [editing, setEditing] = useState<string | null>(null)
  const sections = [...new Set(roles.map((r) => r.section))]

  const update = (f: Fabric) => onFabricsChange(fabrics.map((x) => (x.id === f.id ? f : x)))
  const add = () => {
    const f: Fabric = { id: newFabricId(), name: 'New fabric', print: 'solid', color: '#c8a2c8', accent: '#ffffff', repeat: 4, width: 44, pricePerYard: 10, directional: false }
    onFabricsChange([...fabrics, f])
    setEditing(f.id)
  }

  return (
    <>
      <Section title="Fabric for each part">
        {sections.map((s) => (
          <div key={s} className="role-group">
            <h4>{s}</h4>
            {roles
              .filter((r) => r.section === s)
              .map((r) => {
                const f = fabricForRole(r.id)
                return (
                  <label key={r.id} className="role-row">
                    <Swatch fabric={f} />
                    <span className="role-label">{r.label}</span>
                    <select value={f.id} onChange={(e) => onAssign(r.id, e.target.value)}>
                      {fabrics.map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )
              })}
          </div>
        ))}
      </Section>

      <Section title="My fabrics" hint={`${fabrics.length} saved`}>
        <ul className="fabric-list">
          {fabrics.map((f) => (
            <li key={f.id}>
              <button type="button" className="fabric-row" onClick={() => setEditing(editing === f.id ? null : f.id)} aria-expanded={editing === f.id}>
                <Swatch fabric={f} />
                <span>
                  <strong>{f.name}</strong>
                  <small>
                    {PRINT_LABELS[f.print]} · {f.width}" wide · ${f.pricePerYard.toFixed(2)}/yd
                  </small>
                </span>
              </button>
              {editing === f.id && (
                <FabricEditor
                  fabric={f}
                  onChange={update}
                  onDelete={
                    fabrics.length > 1
                      ? () => {
                          onFabricsChange(fabrics.filter((x) => x.id !== f.id))
                          setEditing(null)
                        }
                      : undefined
                  }
                />
              )}
            </li>
          ))}
        </ul>
        <button type="button" className="btn" onClick={add}>
          + Add a fabric
        </button>
      </Section>
    </>
  )
}

function FabricEditor({ fabric: f, onChange, onDelete }: { fabric: Fabric; onChange: (f: Fabric) => void; onDelete?: () => void }) {
  const [error, setError] = useState('')
  const set = (patch: Partial<Fabric>) => onChange({ ...f, ...patch })
  return (
    <div className="fabric-editor">
      <label className="field">
        <span className="field-label">Name</span>
        <input type="text" value={f.name} onChange={(e) => set({ name: e.target.value })} />
      </label>
      <SelectField<PrintKind> label="Print" value={f.print} options={PRINT_LABELS} onChange={(print) => set({ print })} />
      {f.print === 'photo' ? (
        <label className="field">
          <span className="field-label">Photo of the fabric</span>
          <input
            type="file"
            accept="image/*"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              try {
                set({ photo: await photoToDataUrl(file) })
                setError('')
              } catch {
                setError("Couldn't read that image.")
              }
            }}
          />
          <span className="help">Photograph one repeat of the print, flat and square-on.</span>
          {error && <span className="error">{error}</span>}
        </label>
      ) : (
        <div className="grid2">
          <label className="field">
            <span className="field-label">Color</span>
            <input type="color" value={f.color} onChange={(e) => set({ color: e.target.value })} />
          </label>
          {f.print !== 'solid' && (
            <label className="field">
              <span className="field-label">Print color</span>
              <input type="color" value={f.accent} onChange={(e) => set({ accent: e.target.value })} />
            </label>
          )}
        </div>
      )}
      <div className="grid2">
        <NumberField label="Print repeat" suffix="in" value={f.repeat} min={0.25} max={60} step={0.25} onChange={(repeat) => set({ repeat })} />
        <label className="field">
          <span className="field-label">Bolt width</span>
          <span className="field-input">
            <input type="number" inputMode="decimal" list="bolt-widths" value={f.width} min={20} max={120} onChange={(e) => set({ width: Math.max(20, +e.target.value || 44) })} />
            <span className="suffix">in</span>
          </span>
          <datalist id="bolt-widths">
            {BOLT_WIDTHS.map((w) => (
              <option key={w} value={w} />
            ))}
          </datalist>
        </label>
        <NumberField label="Price per yard" suffix="$" value={f.pricePerYard} min={0} step={0.5} onChange={(pricePerYard) => set({ pricePerYard })} />
      </div>
      <Toggle
        label="Keep print running lengthwise"
        checked={f.directional}
        onChange={(directional) => set({ directional })}
        help="For stripes and one-way prints: pieces won't be turned sideways when laying out, which can take more fabric."
      />
      {onDelete && (
        <button type="button" className="link danger" onClick={() => confirm(`Delete ${f.name}?`) && onDelete()}>
          Delete fabric
        </button>
      )}
    </div>
  )
}
