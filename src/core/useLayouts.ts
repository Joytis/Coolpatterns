import { useEffect, useRef, useState } from 'react'
import type { Fabric } from './fabrics'
import type { PatternPiece } from './pattern'
import { layoutFabric, type FabricLayout } from './layout'

export interface LayoutJob {
  fabric: Fabric
  pieces: PatternPiece[]
  roles: string[]
}

/**
 * Lay out every fabric in a background worker. Returns the latest finished
 * layouts (which may briefly lag the design) and whether newer ones are coming.
 */
export function useLayouts(jobs: LayoutJob[], waste: number): { layouts: FabricLayout[]; pending: boolean } {
  const worker = useRef<Worker | null>(null)
  const seq = useRef(0)
  const [state, setState] = useState<{ layouts: FabricLayout[]; id: number }>({ layouts: [], id: -1 })
  const [requested, setRequested] = useState(0)

  useEffect(() => {
    try {
      worker.current = new Worker(new URL('./layoutWorker.ts', import.meta.url), { type: 'module' })
      worker.current.onmessage = (e: MessageEvent<{ id: number; layouts: FabricLayout[] }>) => {
        // Ignore answers to requests that have since been superseded.
        if (e.data.id === seq.current) setState({ layouts: e.data.layouts, id: e.data.id })
      }
    } catch {
      worker.current = null
    }
    return () => worker.current?.terminate()
  }, [])

  useEffect(() => {
    const id = ++seq.current
    setRequested(id)
    if (worker.current) {
      worker.current.postMessage({ id, jobs, waste })
    } else {
      setState({ layouts: jobs.map((j) => ({ ...layoutFabric(j.fabric, j.pieces, waste), roles: j.roles })), id })
    }
  }, [jobs, waste])

  return { layouts: state.layouts, pending: state.id !== requested }
}
