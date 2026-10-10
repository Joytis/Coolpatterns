import * as THREE from 'three'
import type { CanopyConfig } from './config'

/** A plain grey model of the canopy itself, for the cover to sit on. */
export function canopyUnderlay(c: CanopyConfig): THREE.Object3D {
  const t = c.tent
  const g = new THREE.Group()
  const W = t.topWidth
  const H = t.eaveHeight
  const fabric = new THREE.MeshStandardMaterial({ color: 0x6b6f62, roughness: 1, side: THREE.DoubleSide })
  const steel = new THREE.MeshStandardMaterial({ color: 0x3b3d40, metalness: 0.5, roughness: 0.5 })

  // Roof: four faces up to the hub.
  const hub = new THREE.Vector3(0, H + t.roofRise, 0)
  const corners = [
    new THREE.Vector3(-W / 2, H, W / 2),
    new THREE.Vector3(W / 2, H, W / 2),
    new THREE.Vector3(W / 2, H, -W / 2),
    new THREE.Vector3(-W / 2, H, -W / 2),
  ]
  const pos: number[] = []
  for (let i = 0; i < 4; i++) {
    const a = corners[i]
    const b = corners[(i + 1) % 4]
    pos.push(a.x, a.y, a.z, b.x, b.y, b.z, hub.x, hub.y, hub.z)
  }
  const roof = new THREE.BufferGeometry()
  roof.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  roof.computeVertexNormals()
  g.add(new THREE.Mesh(roof, fabric))

  // Vent hat on a short post.
  const hatTop = H + t.roofRise + t.hatLift
  const hat = new THREE.Mesh(new THREE.BoxGeometry(t.hatWidth, t.hatSkirt, t.hatWidth), fabric)
  hat.position.set(0, hatTop - t.hatSkirt / 2, 0)
  g.add(hat)
  const post = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, t.hatLift + 2, 8), steel)
  post.position.set(0, H + t.roofRise + t.hatLift / 2 - 1, 0)
  g.add(post)

  // Valance and legs.
  for (let k = 0; k < 4; k++) {
    const val = new THREE.Mesh(new THREE.PlaneGeometry(W, t.valanceDrop), fabric)
    val.position.set(0, H - t.valanceDrop / 2, W / 2 + 0.2)
    const holder = new THREE.Group()
    holder.rotation.y = (k * Math.PI) / 2
    holder.add(val)
    g.add(holder)
    const leg = new THREE.Mesh(new THREE.BoxGeometry(1.5, H, 1.5), steel)
    const c0 = corners[k]
    leg.position.set(c0.x * 0.985, H / 2, c0.z * 0.985)
    g.add(leg)
  }
  return g
}
