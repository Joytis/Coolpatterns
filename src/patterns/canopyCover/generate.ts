import type { Polygon } from '../../core/geometry'
import { clipBandX, clipBandY, v } from '../../core/geometry'
import type { AssemblyPart, Frame, Notion, PatternResult } from '../../core/assembly'
import { len3, mul3, rotFrameY, sub3, vec3 } from '../../core/assembly'
import type { CanopyConfig } from './config'
import { MOTIF_LABELS, ROOF_DESIGN_LABELS, RUNNER_EDGE_LABELS } from './config'
import { edgeProfile, motifShape } from './shapes'

export const ROLE = {
  roofMain: 'roofMain',
  roofAccent: 'roofAccent',
  motif: 'motif',
  ventCap: 'ventCap',
  runnerMain: 'runnerMain',
  runnerAccent: 'runnerAccent',
  runnerLining: 'runnerLining',
} as const

const FACES = ['Front', 'Right', 'Back', 'Left']

/** Derived sizes shared by the pattern pieces and the 3D preview. */
export function canopyGeometry(c: CanopyConfig) {
  const t = c.tent
  const W = t.topWidth + 2 * c.ease
  // Hole the cover leaves under the vent hat: 2" under each side of the hat.
  const hole = c.vent.style === 'closed' ? 0 : Math.max(4, t.hatWidth - 4)
  // A closed cover has to clear the hat, so its peak is taller.
  const rise =
    c.vent.style === 'closed'
      ? (t.roofRise + t.hatLift) / Math.max(0.2, 1 - (t.hatWidth + 2 * c.ease) / W)
      : t.roofRise
  const slant = Math.hypot(rise, W / 2)
  const topY = hole ? slant * (1 - hole / W) : slant
  const capWidth = t.hatWidth + 2 * c.ease
  const runnerCount = Math.max(1, Math.round(W / Math.max(2, c.runner.repeat)))
  return { W, hole, rise, slant, topY, capWidth, runnerCount }
}

export function generateCanopy(c: CanopyConfig, seamAllowance: number): PatternResult {
  const g = canopyGeometry(c)
  const { W, slant, topY } = g
  const H = c.tent.eaveHeight
  const sa = seamAllowance
  const parts: AssemblyPart[] = []
  const notions: Notion[] = []
  const warnings: string[] = []

  // ---- Section 1: roof faces --------------------------------------------
  const face: Polygon = topY < slant ? [v(-W / 2, 0), v(W / 2, 0), v(g.hole / 2, topY), v(-g.hole / 2, topY)] : [v(-W / 2, 0), v(W / 2, 0), v(0, slant)]
  const halfAt = (y: number) => (W / 2) * (1 - y / slant)
  const roofFrame = (k: number): Frame => {
    const base = vec3(0, H, W / 2)
    const apex = vec3(0, H + g.rise, 0)
    return rotFrameY({ origin: base, u: vec3(1, 0, 0), v: mul3(sub3(apex, base), 1 / slant) }, (k * Math.PI) / 2)
  }
  const swap = (k: number) => c.roof.alternate && k % 2 === 1
  const roleFor = (accent: boolean, k: number) => ((accent !== swap(k)) ? ROLE.roofAccent : ROLE.roofMain)

  const n = Math.max(2, Math.round(c.roof.count))
  const roofPieces: { key: string; name: string; outline: Polygon; accent: boolean }[] = []
  switch (c.roof.design) {
    case 'solid':
      roofPieces.push({ key: 'roof', name: 'Roof face', outline: face, accent: false })
      break
    case 'split':
      roofPieces.push({ key: 'roof-l', name: 'Roof face, left half', outline: clipBandX(face, -W, 0), accent: false })
      roofPieces.push({ key: 'roof-r', name: 'Roof face, right half', outline: clipBandX(face, 0, W), accent: true })
      break
    case 'bands':
      for (let i = 0; i < n; i++) {
        const lo = (topY * i) / n
        const hi = (topY * (i + 1)) / n
        roofPieces.push({ key: `roof-b${i + 1}`, name: `Roof band ${i + 1} (from the eave)`, outline: clipBandY(face, lo, hi), accent: i % 2 === 1 })
      }
      break
    case 'sunburst':
      for (let i = 0; i < n; i++) {
        const x0 = -W / 2 + (W * i) / n
        const x1 = -W / 2 + (W * (i + 1)) / n
        const ray = clipBandY([v(x0, 0), v(x1, 0), v(0, slant)], 0, topY)
        // Rays mirror around the centre, so the outer ones are the same piece.
        const m = Math.min(i, n - 1 - i)
        roofPieces.push({ key: `roof-ray${m + 1}${i > n - 1 - i ? 'm' : ''}`, name: `Roof ray ${m + 1}${i > n - 1 - i ? ' (mirrored)' : ''}`, outline: ray, accent: i % 2 === 1 })
      }
      break
    case 'triangles': {
      // The face split at its edge midpoints: two corner triangles, a top
      // triangle, and an upside-down one in the middle.
      const mid = slant / 2
      const tris: [string, string, Polygon, boolean][] = [
        ['roof-tc', 'Roof corner triangle', [v(-W / 2, 0), v(0, 0), v(-W / 4, mid)], false],
        ['roof-tc', 'Roof corner triangle', [v(0, 0), v(W / 2, 0), v(W / 4, mid)], false],
        ['roof-tm', 'Roof centre triangle', [v(0, 0), v(W / 4, mid), v(-W / 4, mid)], true],
        ['roof-tt', 'Roof top triangle', [v(-W / 4, mid), v(W / 4, mid), v(0, slant)], false],
      ]
      for (const [key, name, poly, accent] of tris) {
        const clipped = clipBandY(poly, 0, topY)
        if (clipped.length >= 3) roofPieces.push({ key, name, outline: clipped, accent })
      }
      break
    }
  }

  for (let k = 0; k < 4; k++) {
    const frame = roofFrame(k)
    for (const p of roofPieces) {
      const role = roleFor(p.accent, k)
      parts.push({
        key: `${p.key}-${role}`,
        name: p.name,
        section: 'Roof',
        role,
        outline: p.outline,
        allowance: sa,
        grain: 'vertical',
        notes: [`Roof faces: ${ROOF_DESIGN_LABELS[c.roof.design]}.`],
        frame,
        lift: 0.4,
      })
    }
    if (c.roof.motif !== 'none') {
      const size = (slant * c.roof.motifSize) / 100
      const cy = Math.min(topY * 0.42, topY - size / 2 - 2)
      const maxSize = Math.min(size, halfAt(cy + size / 2) * 2 - 4)
      if (maxSize > 2) {
        parts.push({
          key: `motif-${c.roof.motif}-${Math.round(maxSize * 8)}`,
          name: `${MOTIF_LABELS[c.roof.motif]} appliqué`,
          section: 'Roof',
          role: ROLE.motif,
          outline: motifShape(c.roof.motif, 0, cy, maxSize),
          allowance: c.roof.motifEdge === 'turned' ? 0.25 : 0,
          grain: 'vertical',
          kind: 'applique',
          notes: [
            `Centre it ${fmt(cy)}" up from the eave seam line on each roof face.`,
            c.roof.motifEdge === 'turned' ? 'Turn the 1/4" edge under and topstitch.' : 'Back with fusible web and satin-stitch the raw edge.',
          ],
          frame,
          lift: 0.6,
        })
      }
    }
  }
  if (c.roof.motif !== 'none') {
    notions.push({
      name: c.roof.motifEdge === 'raw' ? 'Fusible web for appliqués' : 'Thread to match appliqués',
      amount: c.roof.motifEdge === 'raw' ? '4 motifs' : '1 spool',
    })
  }

  // ---- Vent ---------------------------------------------------------------
  const ventTop = H + c.tent.roofRise + c.tent.hatLift
  if (c.vent.style === 'cap') {
    const cw = g.capWidth
    const skirt = c.tent.hatSkirt
    parts.push({
      key: 'cap-top',
      name: 'Vent cap top',
      section: 'Vent cap',
      role: ROLE.ventCap,
      outline: [v(-cw / 2, -cw / 2), v(cw / 2, -cw / 2), v(cw / 2, cw / 2), v(-cw / 2, cw / 2)],
      allowance: sa,
      grain: 'vertical',
      frame: { origin: vec3(0, ventTop + 0.3, 0), u: vec3(1, 0, 0), v: vec3(0, 0, -1) },
      lift: 0,
    })
    // Connectors join the cap to the roof opening on the closed sides.
    const roofEdgeY = H + g.rise * (1 - g.hole / W)
    const skirtBottom = ventTop - skirt
    const inset = (cw - g.hole) / 2
    const connH = Math.hypot(Math.max(0.5, skirtBottom - roofEdgeY), inset)
    for (let k = 0; k < 4; k++) {
      parts.push({
        key: 'cap-skirt',
        name: 'Vent cap skirt',
        section: 'Vent cap',
        role: ROLE.ventCap,
        outline: [v(-cw / 2, 0), v(cw / 2, 0), v(cw / 2, skirt), v(-cw / 2, skirt)],
        allowance: sa,
        grain: 'vertical',
        frame: rotFrameY({ origin: vec3(0, skirtBottom, cw / 2 + 0.3), u: vec3(1, 0, 0), v: vec3(0, 1, 0) }, (k * Math.PI) / 2),
        lift: 0,
      })
      const open = c.vent.openSides === 'four' || k % 2 === 0
      if (!open) {
        const from = vec3(0, roofEdgeY, g.hole / 2)
        const to = vec3(0, skirtBottom, cw / 2)
        const up = sub3(to, from)
        parts.push({
          key: 'cap-connector',
          name: 'Vent connector (closed sides)',
          section: 'Vent cap',
          role: ROLE.ventCap,
          outline: [v(-g.hole / 2, 0), v(g.hole / 2, 0), v(cw / 2, connH), v(-cw / 2, connH)],
          allowance: sa,
          grain: 'vertical',
          notes: ['Sew the short edge to the roof opening and the long edge to the cap skirt.'],
          frame: rotFrameY({ origin: vec3(0, roofEdgeY + 0.4, g.hole / 2 + 0.2), u: vec3(1, 0, 0), v: mul3(up, 1 / len3(up)) }, (k * Math.PI) / 2),
          lift: 0,
        })
      }
    }
    const binding = (c.vent.openSides === 'four' ? 4 : 2) * (g.hole + cw) + 8
    notions.push({ name: 'Double-fold bias tape for the vent edges', amount: `${yd(binding)} yd` })
    if (c.vent.openSides === 'four') {
      notions.push({ name: 'Twill tape to strap the cap at its corners', amount: `${yd(4 * (connH + 4))} yd` })
    }
  } else if (c.vent.style === 'opening') {
    notions.push({ name: 'Double-fold bias tape to bind the vent opening', amount: `${yd(4 * g.hole + 6)} yd` })
  } else {
    warnings.push('A closed peak covers the tent vents; the canopy will hold more heat and catch more wind.')
  }

  // ---- Section 2: runners ----------------------------------------------
  const r = c.runner
  const edgeDepth = r.edge === 'straight' ? 0 : r.edgeDepth
  const bodyDepth = r.edge === 'bunting' ? r.drop : r.drop + edgeDepth
  const profile = edgeProfile(r.edge, W, r.edge === 'bunting' ? 0 : edgeDepth, g.runnerCount)
  const trim = Math.min(r.trimBand, r.drop - 1)
  const mainTop = trim > 0 ? bodyDepth - trim : bodyDepth
  const runnerBody: Polygon = [...[...profile].reverse(), v(-W / 2, mainTop), v(W / 2, mainTop)].reverse()
  const runnerFrame = (k: number): Frame =>
    rotFrameY({ origin: vec3(0, H - bodyDepth, W / 2 + 0.5), u: vec3(1, 0, 0), v: vec3(0, 1, 0) }, (k * Math.PI) / 2)
  const edgeName = RUNNER_EDGE_LABELS[r.edge]
  const shaped = r.edge !== 'straight' && r.edge !== 'bunting'
  for (let k = 0; k < 4; k++) {
    const frame = runnerFrame(k)
    parts.push({
      key: 'runner',
      name: `Runner (${edgeName.toLowerCase()})`,
      section: 'Runners',
      role: ROLE.runnerMain,
      outline: runnerBody,
      allowance: sa,
      grain: 'horizontal',
      notes: shaped ? [`${g.runnerCount} repeats of ${fmt(W / g.runnerCount)}" each per side.`] : undefined,
      frame,
      lift: 0,
    })
    if (r.lined) {
      parts.push({
        key: 'runner-lining',
        name: 'Runner lining',
        section: 'Runners',
        role: ROLE.runnerLining,
        outline: runnerBody,
        allowance: sa,
        grain: 'horizontal',
        frame,
        lift: -0.2,
      })
    }
    if (trim > 0) {
      parts.push({
        key: 'runner-trim',
        name: 'Runner trim band',
        section: 'Runners',
        role: ROLE.runnerAccent,
        outline: [v(-W / 2, mainTop), v(W / 2, mainTop), v(W / 2, bodyDepth), v(-W / 2, bodyDepth)],
        allowance: sa,
        grain: 'horizontal',
        frame,
        lift: 0.05,
      })
    }
    if (r.edge === 'bunting') {
      const p = W / g.runnerCount
      for (let i = 0; i < g.runnerCount; i++) {
        const x0 = -W / 2 + i * p + p * 0.04
        const x1 = x0 + p * 0.92
        const cx = (x0 + x1) / 2
        const half = (x1 - x0) / 2
        // Flags tuck 1" up behind the runner's bottom edge.
        const flag: AssemblyPart = {
          key: `flag-${i % 2 ? ROLE.runnerAccent : ROLE.runnerMain}`,
          name: 'Bunting flag',
          section: 'Runners',
          role: i % 2 ? ROLE.runnerAccent : ROLE.runnerMain,
          outline: [v(cx, -r.edgeDepth), v(cx + half, 1), v(cx - half, 1)],
          allowance: sa,
          grain: 'vertical',
          notes: ['Cut in pairs: sew right sides together, turn and press, then tuck 1" behind the runner hem.'],
          frame,
          lift: -0.1,
        }
        parts.push(flag, { ...flag, lift: -0.15 })
      }
    }
  }
  if (!r.lined) {
    if (shaped) {
      let edgeLen = 0
      for (let i = 1; i < profile.length; i++) edgeLen += Math.hypot(profile[i].x - profile[i - 1].x, profile[i].y - profile[i - 1].y)
      notions.push({ name: 'Bias tape to bind the shaped runner edges', amount: `${yd(4 * Math.max(edgeLen, W) + 12)} yd` })
    } else {
      notes(parts, 'runner', `Includes ${fmt(sa)}" on the bottom edge; turn a narrow double hem.`)
    }
  }
  notions.push({ name: 'Twill tape ties at each corner leg', amount: `${yd(4 * 2 * 18)} yd (eight 18" ties)` })
  notions.push({ name: 'All-purpose polyester thread', amount: '2 large spools' })

  if (c.runner.drop < c.tent.valanceDrop) {
    warnings.push(`The runner drop (${fmt(c.runner.drop)}") is shorter than the tent's own valance (${fmt(c.tent.valanceDrop)}"), so the tent valance will peek out below it.`)
  }

  const steps = [
    'Prewash and press every fabric before cutting.',
    'Cut all pieces with the grainline arrow along the selvedge.',
    ...(roofPieces.length > 1 ? ['Piece each roof face in order, pressing seams toward the darker fabric.'] : []),
    ...(c.roof.motif !== 'none' ? ['Appliqué a motif to the centre of each roof face before joining faces.'] : []),
    'Join the four roof faces along their slanted edges to make the pyramid.',
    ...(c.vent.style === 'cap'
      ? [
          'Sew the cap skirts to the cap top, then join the connectors to the cap skirts on the closed sides.',
          'Sew the connectors to the roof opening; bind the open vent edges with bias tape.',
        ]
      : c.vent.style === 'opening'
        ? ['Bind the vent opening at the top with bias tape.']
        : []),
    ...(trim > 0 ? ['Sew the trim band to the top of each runner.'] : []),
    ...(r.lined ? ['Sew each runner to its lining along the shaped edge, clip curves, turn and press.'] : []),
    ...(r.edge === 'bunting' ? ['Sew flag pairs, turn, and baste them behind the bottom edge of each runner.'] : []),
    'Sew one runner to the eave edge of each roof face; hem the runner ends at the corners.',
    'Add a pair of ties at each corner to hold the cover to the canopy legs.',
  ]

  return { parts, notions, steps, warnings }
}

function notes(parts: AssemblyPart[], key: string, note: string) {
  for (const p of parts) if (p.key === key) p.notes = [...(p.notes ?? []), note]
}

const fmt = (n: number) => (Math.round(n * 8) / 8).toString()
const yd = (inches: number) => (Math.ceil((inches / 36) * 4) / 4).toString()

export const FACE_NAMES = FACES
