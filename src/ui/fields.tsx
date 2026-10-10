import { useEffect, useState, type ReactNode } from 'react'
import type { Units } from '../core/units'
import { fromDisplay, toDisplay } from '../core/units'

export function Section({ title, hint, children, open = true }: { title: string; hint?: string; children: ReactNode; open?: boolean }) {
  return (
    <details className="section" open={open}>
      <summary>
        <span>{title}</span>
        {hint && <small>{hint}</small>}
      </summary>
      <div className="section-body">{children}</div>
    </details>
  )
}

interface NumberProps {
  label: string
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  suffix?: string
  help?: string
}

/** A number input that lets you clear and retype without snapping back mid-edit. */
export function NumberField({ label, value, onChange, min, max, step = 1, suffix, help }: NumberProps) {
  const [text, setText] = useState(String(round(value)))
  useEffect(() => setText(String(round(value))), [value])
  const commit = (t: string) => {
    const n = parseFloat(t)
    if (Number.isFinite(n)) onChange(clamp(n, min, max))
    else setText(String(round(value)))
  }
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <span className="field-input">
        <input
          type="number"
          inputMode="decimal"
          value={text}
          min={min}
          max={max}
          step={step}
          onChange={(e) => {
            setText(e.target.value)
            const n = parseFloat(e.target.value)
            if (Number.isFinite(n) && (min === undefined || n >= min) && (max === undefined || n <= max)) onChange(n)
          }}
          onBlur={(e) => commit(e.target.value)}
        />
        {suffix && <span className="suffix">{suffix}</span>}
      </span>
      {help && <span className="help">{help}</span>}
    </label>
  )
}

/** A length field: stores inches, shows the user's units. */
export function LengthField(props: Omit<NumberProps, 'suffix'> & { units: Units }) {
  const { units, value, onChange, min, max, step } = props
  return (
    <NumberField
      {...props}
      value={toDisplay(value, units)}
      min={min === undefined ? undefined : round(toDisplay(min, units))}
      max={max === undefined ? undefined : round(toDisplay(max, units))}
      step={units === 'cm' ? (step ?? 1) * 2.5 : step}
      suffix={units === 'cm' ? 'cm' : 'in'}
      onChange={(v) => onChange(fromDisplay(v, units))}
    />
  )
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  help,
}: {
  label: string
  value: T
  options: Record<T, string> | [T, string][]
  onChange: (v: T) => void
  help?: string
}) {
  const entries = Array.isArray(options) ? options : (Object.entries(options) as [T, string][])
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value as T)}>
        {entries.map(([k, l]) => (
          <option key={k} value={k}>
            {l}
          </option>
        ))}
      </select>
      {help && <span className="help">{help}</span>}
    </label>
  )
}

export function Toggle({ label, checked, onChange, help }: { label: string; checked: boolean; onChange: (v: boolean) => void; help?: string }) {
  return (
    <label className="field toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="field-label">{label}</span>
      {help && <span className="help">{help}</span>}
    </label>
  )
}

/** Big tappable tiles for picking a design module, with a small drawing each. */
export function ChoiceTiles<T extends string>({
  value,
  options,
  onChange,
  render,
}: {
  value: T
  options: Record<T, string>
  onChange: (v: T) => void
  render: (v: T) => ReactNode
}) {
  return (
    <div className="tiles" role="radiogroup">
      {(Object.entries(options) as [T, string][]).map(([k, label]) => (
        <button key={k} type="button" role="radio" aria-checked={k === value} className={'tile' + (k === value ? ' selected' : '')} onClick={() => onChange(k)}>
          <span className="tile-art">{render(k)}</span>
          <span className="tile-label">{label}</span>
        </button>
      ))}
    </div>
  )
}

const round = (n: number) => Math.round(n * 100) / 100
const clamp = (n: number, min?: number, max?: number) => Math.min(max ?? Infinity, Math.max(min ?? -Infinity, n))
