import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PATTERNS, patternById } from './patterns'
import type { PatternDefinition } from './patterns/types'
import { piecesFromParts } from './core/assembly'
import { DEFAULT_FABRICS, type Fabric } from './core/fabrics'
import { useLayouts, type LayoutJob } from './core/useLayouts'
import { downloadFile, loadState, newId, saveState, type AppState, type Design } from './core/storage'
import { fmtMoney, fmtYards, type Units } from './core/units'
import { Preview3D } from './ui/Preview3D'
import { FabricsPanel } from './ui/FabricsPanel'
import { CutListPanel } from './ui/CutListPanel'
import { YardagePanel } from './ui/YardagePanel'
import { LengthField, Section, SelectField } from './ui/fields'

type Tab = 'design' | 'fabrics' | 'cut' | 'yardage'
const TABS: [Tab, string][] = [
  ['design', 'Design'],
  ['fabrics', 'Fabrics'],
  ['cut', 'Cut list'],
  ['yardage', 'Yardage'],
]

function newDesign(pattern: PatternDefinition, name: string): Design {
  return {
    id: newId('design'),
    name,
    patternId: pattern.id,
    config: pattern.defaultConfig(),
    seamAllowance: 0.5,
    wastePercent: 10,
    roleFabrics: {},
    updatedAt: Date.now(),
  }
}

function initialState(): AppState {
  const loaded = loadState()
  if (loaded) return loaded
  const d = newDesign(PATTERNS[0], 'My canopy cover')
  return { version: 1, fabrics: DEFAULT_FABRICS, designs: [d], currentId: d.id, units: 'in' }
}

export default function App() {
  const [state, setState] = useState<AppState>(initialState)
  const [tab, setTab] = useState<Tab>('design')
  const [showUnderlay, setShowUnderlay] = useState(true)
  const [saveError, setSaveError] = useState(false)

  const design = state.designs.find((d) => d.id === state.currentId) ?? state.designs[0]
  const pattern = patternById(design.patternId)
  const config = useMemo(() => pattern.normalize(design.config), [pattern, design.config])
  const units = state.units

  // Autosave to this browser.
  const timer = useRef<number>(0)
  useEffect(() => {
    clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setSaveError(!saveState(state)), 300)
  }, [state])

  const updateDesign = useCallback(
    (patch: Partial<Design>) =>
      setState((s) => ({
        ...s,
        designs: s.designs.map((d) => (d.id === s.currentId ? { ...d, ...patch, updatedAt: Date.now() } : d)),
      })),
    [],
  )

  const roles = useMemo(() => pattern.roles(config), [pattern, config])
  const fabricForRole = useCallback(
    (role: string): Fabric => {
      const byId = (id?: string) => state.fabrics.find((f) => f.id === id)
      return byId(design.roleFabrics[role]) ?? byId(roles.find((r) => r.id === role)?.defaultFabricId) ?? state.fabrics[0]
    },
    [state.fabrics, design.roleFabrics, roles],
  )
  const roleLabel = useCallback((role: string) => roles.find((r) => r.id === role)?.label ?? role, [roles])

  const result = useMemo(() => pattern.generate(config, design.seamAllowance), [pattern, config, design.seamAllowance])
  const pieces = useMemo(() => piecesFromParts(result.parts), [result])
  const jobs = useMemo(() => {
    const byFabric = new Map<string, LayoutJob>()
    for (const p of pieces) {
      const f = fabricForRole(p.role)
      const job = byFabric.get(f.id) ?? { fabric: f, pieces: [], roles: [] }
      job.pieces.push(p)
      if (!job.roles.includes(p.role)) job.roles.push(p.role)
      byFabric.set(f.id, job)
    }
    return [...byFabric.values()]
  }, [pieces, fabricForRole])
  const { layouts, pending } = useLayouts(jobs, design.wastePercent)
  const totalYards = layouts.reduce((s, l) => s + l.yards, 0)
  const totalCost = layouts.reduce((s, l) => s + l.cost, 0)

  const underlay = useMemo(() => pattern.underlay?.(config) ?? null, [pattern, config])

  const Editor = pattern.Editor

  // ---- design management ----
  const selectDesign = (id: string) => setState((s) => ({ ...s, currentId: id }))
  const addDesign = () => {
    const name = prompt('Name for the new design', `Design ${state.designs.length + 1}`)
    if (!name) return
    const d = newDesign(pattern, name)
    setState((s) => ({ ...s, designs: [...s.designs, d], currentId: d.id }))
  }
  const duplicateDesign = () => {
    const d = { ...structuredClone(design), id: newId('design'), name: `${design.name} copy`, updatedAt: Date.now() }
    setState((s) => ({ ...s, designs: [...s.designs, d], currentId: d.id }))
  }
  const renameDesign = () => {
    const name = prompt('Rename design', design.name)
    if (name) updateDesign({ name })
  }
  const deleteDesign = () => {
    if (state.designs.length < 2) return
    if (!confirm(`Delete "${design.name}"? This can't be undone.`)) return
    setState((s) => {
      const designs = s.designs.filter((d) => d.id !== s.currentId)
      return { ...s, designs, currentId: designs[0].id }
    })
  }
  const exportAll = () => downloadFile(`coolpatterns-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(state, null, 2))
  const importInput = useRef<HTMLInputElement>(null)
  const importAll = async (file: File) => {
    try {
      const s = JSON.parse(await file.text()) as AppState
      if (s.version !== 1 || !s.designs?.length) throw new Error('bad file')
      if (!confirm(`Replace your designs and fabrics with the ${s.designs.length} design(s) in this backup?`)) return
      setState({ ...s, currentId: s.designs.some((d) => d.id === s.currentId) ? s.currentId : s.designs[0].id })
    } catch {
      alert("That file isn't a Coolpatterns backup.")
    }
  }

  return (
    <div className="app">
      <header className="topbar">
        <h1>
          <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" width={28} height={28} />
          Coolpatterns
        </h1>
        <div className="design-picker">
          <select value={design.id} onChange={(e) => selectDesign(e.target.value)} aria-label="Design">
            {state.designs.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <details className="menu">
            <summary aria-label="Design menu">⋯</summary>
            <div className="menu-items" onClick={(e) => (e.currentTarget.parentElement as HTMLDetailsElement).removeAttribute('open')}>
              <button type="button" onClick={addDesign}>
                New design
              </button>
              <button type="button" onClick={duplicateDesign}>
                Duplicate
              </button>
              <button type="button" onClick={renameDesign}>
                Rename
              </button>
              <button type="button" onClick={deleteDesign} disabled={state.designs.length < 2}>
                Delete
              </button>
              <hr />
              <button type="button" onClick={exportAll}>
                Back up to a file
              </button>
              <button type="button" onClick={() => importInput.current?.click()}>
                Restore from a file
              </button>
            </div>
          </details>
          <input ref={importInput} type="file" accept="application/json,.json" hidden onChange={(e) => e.target.files?.[0] && importAll(e.target.files[0])} />
        </div>
        <button type="button" className={'summary-chip' + (pending ? ' pending' : '')} onClick={() => setTab('yardage')} title="Fabric to buy and estimated cost">
          {fmtYards(totalYards)} · {fmtMoney(totalCost)}
        </button>
      </header>
      {saveError && <p className="error banner">This browser's storage is full, so changes aren't being saved. Try smaller fabric photos, or back up to a file.</p>}

      <main className="workspace">
        <section className="preview-pane">
          <Preview3D parts={result.parts} fabricForRole={fabricForRole} underlay={underlay} showUnderlay={showUnderlay} frameKey={design.id} />
          <label className="preview-toggle">
            <input type="checkbox" checked={showUnderlay} onChange={(e) => setShowUnderlay(e.target.checked)} /> Show tent
          </label>
          <span className="preview-hint">Drag to turn · pinch or scroll to zoom</span>
        </section>

        <section className="panel">
          <nav className="tabs" role="tablist">
            {TABS.map(([id, label]) => (
              <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>
                {label}
              </button>
            ))}
          </nav>
          <div className="panel-body">
            {tab === 'design' && (
              <>
                <Section title="Pattern" open={PATTERNS.length > 1}>
                  {PATTERNS.length > 1 && (
                    <SelectField
                      label="Pattern"
                      value={pattern.id}
                      options={PATTERNS.map((p) => [p.id, p.name] as [string, string])}
                      onChange={(id) => updateDesign({ patternId: id, config: patternById(id).defaultConfig(), roleFabrics: {} })}
                    />
                  )}
                  <p className="muted">{pattern.description}</p>
                  <div className="grid2">
                    <LengthField
                      label="Seam allowance"
                      units={units}
                      value={design.seamAllowance}
                      min={0}
                      max={2}
                      step={0.125}
                      onChange={(seamAllowance) => updateDesign({ seamAllowance })}
                    />
                    <SelectField<Units>
                      label="Units"
                      value={units}
                      options={{ in: 'Inches', cm: 'Centimeters' }}
                      onChange={(u) => setState((s) => ({ ...s, units: u }))}
                    />
                  </div>
                </Section>
                <Editor config={config} units={units} onChange={(c: unknown) => updateDesign({ config: c })} />
              </>
            )}
            {tab === 'fabrics' && (
              <FabricsPanel
                roles={roles}
                fabrics={state.fabrics}
                roleFabrics={design.roleFabrics}
                fabricForRole={fabricForRole}
                onAssign={(role, id) => updateDesign({ roleFabrics: { ...design.roleFabrics, [role]: id } })}
                onFabricsChange={(fabrics) => setState((s) => ({ ...s, fabrics }))}
              />
            )}
            {tab === 'cut' && (
              <CutListPanel
                pieces={pieces}
                notions={result.notions}
                steps={result.steps}
                warnings={result.warnings}
                units={units}
                fabricForRole={fabricForRole}
                roleLabel={roleLabel}
                designName={design.name}
              />
            )}
            {tab === 'yardage' && (
              <YardagePanel layouts={layouts} pending={pending} units={units} wastePercent={design.wastePercent} onWasteChange={(wastePercent) => updateDesign({ wastePercent })} roleLabel={roleLabel} />
            )}
          </div>
        </section>
      </main>
    </div>
  )
}
