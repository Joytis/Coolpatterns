import type { Fabric } from './fabrics'

const TILE = 256
const cache = new Map<string, HTMLCanvasElement>()

const key = (f: Fabric) => [f.print, f.color, f.accent, f.photo?.length ?? 0, f.photo?.slice(-32) ?? ''].join('|')

/**
 * Draw one repeat of a fabric's print onto a square canvas. The canvas
 * represents `fabric.repeat` inches of fabric, so callers tile it at that
 * scale to show prints at their true size. Photos load asynchronously;
 * `onReady` fires once the canvas has its final pixels.
 */
export function fabricTile(fabric: Fabric, onReady?: () => void): HTMLCanvasElement {
  const k = key(fabric)
  const hit = cache.get(k)
  if (hit) {
    if (hit.dataset.ready === '1') onReady?.()
    else hit.addEventListener('ready', () => onReady?.(), { once: true })
    return hit
  }
  const canvas = document.createElement('canvas')
  canvas.width = TILE
  canvas.height = TILE
  const ctx = canvas.getContext('2d')!
  cache.set(k, canvas)
  ctx.fillStyle = fabric.color
  ctx.fillRect(0, 0, TILE, TILE)

  const done = () => {
    canvas.dataset.ready = '1'
    canvas.dispatchEvent(new Event('ready'))
    onReady?.()
  }

  if (fabric.print === 'photo' && fabric.photo) {
    const img = new Image()
    img.onload = () => {
      ctx.drawImage(img, 0, 0, TILE, TILE)
      done()
    }
    img.onerror = done
    img.src = fabric.photo
    return canvas
  }
  drawPrint(ctx, fabric)
  done()
  return canvas
}

function drawPrint(ctx: CanvasRenderingContext2D, f: Fabric) {
  const a = f.accent
  switch (f.print) {
    case 'stripes': {
      ctx.fillStyle = a
      ctx.fillRect(TILE / 2, 0, TILE / 2, TILE)
      break
    }
    case 'gingham': {
      ctx.globalAlpha = 0.55
      ctx.fillStyle = a
      ctx.fillRect(0, 0, TILE / 2, TILE)
      ctx.fillRect(0, 0, TILE, TILE / 2)
      ctx.globalAlpha = 1
      ctx.fillRect(0, 0, TILE / 2, TILE / 2)
      break
    }
    case 'dots': {
      ctx.fillStyle = a
      for (const [x, y] of [
        [0.25, 0.25],
        [0.75, 0.75],
      ]) {
        ctx.beginPath()
        ctx.arc(x * TILE, y * TILE, TILE * 0.11, 0, Math.PI * 2)
        ctx.fill()
      }
      break
    }
    case 'floral': {
      const flower = (cx: number, cy: number, r: number, rot: number) => {
        ctx.fillStyle = a
        for (let i = 0; i < 5; i++) {
          const t = rot + (i * Math.PI * 2) / 5
          ctx.beginPath()
          ctx.ellipse(cx + Math.cos(t) * r * 0.55, cy + Math.sin(t) * r * 0.55, r * 0.5, r * 0.3, t, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.fillStyle = '#f4d35e'
        ctx.beginPath()
        ctx.arc(cx, cy, r * 0.22, 0, Math.PI * 2)
        ctx.fill()
      }
      const leaf = (cx: number, cy: number, t: number) => {
        ctx.fillStyle = '#5b8a52'
        ctx.beginPath()
        ctx.ellipse(cx, cy, TILE * 0.07, TILE * 0.025, t, 0, Math.PI * 2)
        ctx.fill()
      }
      leaf(TILE * 0.42, TILE * 0.18, 0.6)
      leaf(TILE * 0.12, TILE * 0.62, -0.8)
      leaf(TILE * 0.82, TILE * 0.5, 2.1)
      flower(TILE * 0.25, TILE * 0.3, TILE * 0.13, 0.2)
      flower(TILE * 0.72, TILE * 0.72, TILE * 0.15, 1.1)
      flower(TILE * 0.8, TILE * 0.18, TILE * 0.08, 0.7)
      flower(TILE * 0.3, TILE * 0.82, TILE * 0.09, 0.4)
      // Wrap the flower that crosses the tile edge so repeats are seamless.
      flower(TILE * 0.8 - TILE, TILE * 0.18, TILE * 0.08, 0.7)
      break
    }
    case 'damask': {
      ctx.strokeStyle = a
      ctx.fillStyle = a
      ctx.lineWidth = TILE * 0.025
      const motif = (cx: number, cy: number, s: number) => {
        ctx.beginPath()
        ctx.moveTo(cx, cy - s)
        ctx.bezierCurveTo(cx + s * 0.9, cy - s * 0.5, cx + s * 0.9, cy + s * 0.5, cx, cy + s)
        ctx.bezierCurveTo(cx - s * 0.9, cy + s * 0.5, cx - s * 0.9, cy - s * 0.5, cx, cy - s)
        ctx.stroke()
        ctx.beginPath()
        ctx.ellipse(cx, cy, s * 0.22, s * 0.45, 0, 0, Math.PI * 2)
        ctx.fill()
        for (const d of [-1, 1]) {
          ctx.beginPath()
          ctx.arc(cx + d * s * 0.45, cy + s * 0.55, s * 0.18, 0, Math.PI * 2)
          ctx.stroke()
        }
      }
      motif(TILE / 2, TILE / 2, TILE * 0.32)
      for (const [x, y] of [
        [0, 0],
        [TILE, 0],
        [0, TILE],
        [TILE, TILE],
      ]) {
        motif(x, y, TILE * 0.18)
      }
      break
    }
    default: {
      // Solid: faint speckle so the 3D preview still reads as cloth.
      let seed = 7
      const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
      for (let i = 0; i < 1400; i++) {
        ctx.globalAlpha = 0.05
        ctx.fillStyle = rand() > 0.5 ? '#000' : '#fff'
        ctx.fillRect(rand() * TILE, rand() * TILE, 2, 2)
      }
      ctx.globalAlpha = 1
    }
  }
}

/** A CSS background for a swatch showing a few repeats of the print. */
export function swatchCss(fabric: Fabric): string {
  const url = fabricTile(fabric).toDataURL()
  return `url(${url}) 0 0 / 40% repeat`
}

/** Downscale an uploaded photo to a small square JPEG data URL for storage. */
export function photoToDataUrl(file: File, size = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = size
      c.height = size
      const s = Math.min(img.width, img.height)
      c.getContext('2d')!.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size)
      URL.revokeObjectURL(url)
      resolve(c.toDataURL('image/jpeg', 0.8))
    }
    img.onerror = reject
    img.src = url
  })
}
