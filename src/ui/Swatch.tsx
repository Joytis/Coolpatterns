import { useEffect, useState } from 'react'
import type { Fabric } from '../core/fabrics'
import { fabricTile } from '../core/textures'

export function Swatch({ fabric, size = 36 }: { fabric: Fabric; size?: number }) {
  const [bg, setBg] = useState('')
  useEffect(() => {
    const canvas = fabricTile(fabric)
    const paint = () => setBg(`url(${canvas.toDataURL()}) 0 0 / ${size / 2}px repeat`)
    if (canvas.dataset.ready === '1') paint()
    else canvas.addEventListener('ready', paint, { once: true })
  }, [fabric, size])
  return <span className="swatch" style={{ width: size, height: size, background: bg || fabric.color }} title={fabric.name} />
}
