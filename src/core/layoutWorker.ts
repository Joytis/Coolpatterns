/// <reference lib="webworker" />
import { layoutFabric, type FabricLayout } from './layout'
import type { LayoutJob } from './useLayouts'

// Fabric layout is the slowest calculation in the app, so it runs here,
// off the main thread, to keep sliders and the 3D view smooth.
self.onmessage = (e: MessageEvent<{ id: number; jobs: LayoutJob[]; waste: number }>) => {
  const { id, jobs, waste } = e.data
  const layouts: FabricLayout[] = jobs.map((j) => ({ ...layoutFabric(j.fabric, j.pieces, waste), roles: j.roles }))
  ;(self as unknown as Worker).postMessage({ id, layouts })
}
