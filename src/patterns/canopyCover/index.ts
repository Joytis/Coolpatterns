import type { PatternDefinition } from '../types'
import type { FabricRole } from '../../core/pattern'
import { DEFAULT_CANOPY, normalizeCanopy, type CanopyConfig } from './config'
import { generateCanopy, ROLE } from './generate'
import { CanopyEditor } from './Editor'
import { canopyUnderlay } from './underlay'

export const canopyCover: PatternDefinition<CanopyConfig> = {
  id: 'canopy-cover',
  name: '10×10 canopy cover',
  description: 'A one-piece decorative cover that drapes over a 10×10 pop-up canopy, with patterned roof faces and hanging runners.',
  defaultConfig: () => structuredClone(DEFAULT_CANOPY),
  normalize: normalizeCanopy,
  roles(c) {
    const roles: FabricRole[] = [{ id: ROLE.roofMain, label: 'Roof main', section: 'Roof', defaultFabricId: 'cream-canvas' }]
    const roofTwoTone = c.roof.design !== 'solid' || c.roof.alternate
    if (roofTwoTone) roles.push({ id: ROLE.roofAccent, label: 'Roof accent', section: 'Roof', defaultFabricId: 'burgundy-duck' })
    if (c.roof.motif !== 'none') roles.push({ id: ROLE.motif, label: 'Appliqué', section: 'Roof', defaultFabricId: 'rose-floral' })
    if (c.vent.style === 'cap') roles.push({ id: ROLE.ventCap, label: 'Vent cap', section: 'Vent cap', defaultFabricId: 'burgundy-duck' })
    roles.push({ id: ROLE.runnerMain, label: 'Runner main', section: 'Runners', defaultFabricId: 'burgundy-duck' })
    if (c.runner.trimBand > 0 || c.runner.edge === 'bunting')
      roles.push({ id: ROLE.runnerAccent, label: 'Runner accent', section: 'Runners', defaultFabricId: 'gold-stripe' })
    if (c.runner.lined) roles.push({ id: ROLE.runnerLining, label: 'Runner lining', section: 'Runners', defaultFabricId: 'cream-canvas' })
    return roles
  },
  generate: generateCanopy,
  Editor: CanopyEditor,
  underlay: canopyUnderlay,
}
