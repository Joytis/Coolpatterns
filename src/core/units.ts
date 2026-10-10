export type Units = 'in' | 'cm'

/** Format a length given in inches, e.g. 12 3/8" or 31.4 cm. */
export function fmtLen(inches: number, units: Units): string {
  if (units === 'cm') return `${(inches * 2.54).toFixed(1)} cm`
  const sign = inches < 0 ? '-' : ''
  const eighths = Math.round(Math.abs(inches) * 8)
  const whole = Math.floor(eighths / 8)
  let num = eighths % 8
  let den = 8
  while (num && num % 2 === 0) {
    num /= 2
    den /= 2
  }
  const frac = num ? `${whole ? ' ' : ''}${num}/${den}` : ''
  return `${sign}${whole || !frac ? whole : ''}${frac}"`
}

export const toDisplay = (inches: number, units: Units) => (units === 'cm' ? inches * 2.54 : inches)
export const fromDisplay = (value: number, units: Units) => (units === 'cm' ? value / 2.54 : value)

export function fmtYards(yd: number): string {
  const eighths = Math.round(yd * 8)
  const whole = Math.floor(eighths / 8)
  let num = eighths % 8
  let den = 8
  while (num && num % 2 === 0) {
    num /= 2
    den /= 2
  }
  if (!num) return `${whole} yd`
  return `${whole ? whole + ' ' : ''}${num}/${den} yd`
}

export const fmtMoney = (n: number) => `$${n.toFixed(2)}`
