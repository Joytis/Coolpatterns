import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { AssemblyPart } from '../core/assembly'
import type { Fabric } from '../core/fabrics'
import { fabricTile } from '../core/textures'

interface Props {
  parts: AssemblyPart[]
  fabricForRole: (role: string) => Fabric
  underlay?: THREE.Object3D | null
  showUnderlay: boolean
  /** Changes when the camera should re-frame (e.g. a new design). */
  frameKey: string
}

interface Ctx {
  renderer: THREE.WebGLRenderer
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  controls: OrbitControls
  cover: THREE.Group
  under: THREE.Group
  render: () => void
}

/** Live 3D model of the finished piece, built from the same geometry as the pattern. */
export function Preview3D({ parts, fabricForRole, underlay, showUnderlay, frameKey }: Props) {
  const host = useRef<HTMLDivElement>(null)
  const ctx = useRef<Ctx | null>(null)
  const framed = useRef<string>('')

  useEffect(() => {
    const el = host.current!
    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    } catch {
      el.textContent = 'This browser cannot show the 3D preview.'
      return
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.shadowMap.enabled = true
    el.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xdfe9ef)
    scene.fog = new THREE.Fog(0xdfe9ef, 900, 2200)
    const camera = new THREE.PerspectiveCamera(40, 1, 1, 5000)
    camera.position.set(220, 160, 260)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.maxPolarAngle = Math.PI * 0.495
    controls.minDistance = 40
    controls.maxDistance = 1200
    controls.target.set(0, 70, 0)

    scene.add(new THREE.HemisphereLight(0xffffff, 0x8a9a6a, 1.6))
    const sun = new THREE.DirectionalLight(0xffffff, 1.6)
    sun.position.set(200, 400, 260)
    sun.castShadow = true
    sun.shadow.mapSize.set(2048, 2048)
    sun.shadow.bias = -0.0005
    sun.shadow.normalBias = 0.6
    Object.assign(sun.shadow.camera, { left: -200, right: 200, top: 200, bottom: -200, far: 1200 })
    scene.add(sun)

    const ground = new THREE.Mesh(new THREE.CircleGeometry(1500, 64), new THREE.MeshStandardMaterial({ color: 0x9fb37c, roughness: 1 }))
    ground.rotation.x = -Math.PI / 2
    ground.receiveShadow = true
    scene.add(ground)

    const cover = new THREE.Group()
    const under = new THREE.Group()
    scene.add(cover, under)

    let raf = 0
    let dirty = true
    const render = () => {
      dirty = true
    }
    const loop = () => {
      raf = requestAnimationFrame(loop)
      if (controls.update() || dirty) {
        renderer.render(scene, camera)
        dirty = false
      }
    }
    controls.addEventListener('change', render)
    loop()

    const resize = () => {
      const w = el.clientWidth
      const h = el.clientHeight
      if (!w || !h) return
      renderer.setSize(w, h)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      render()
    }
    const ro = new ResizeObserver(resize)
    ro.observe(el)
    resize()

    ctx.current = { renderer, scene, camera, controls, cover, under, render }
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      controls.dispose()
      disposeTree(scene)
      renderer.dispose()
      renderer.domElement.remove()
      ctx.current = null
    }
  }, [])

  // Rebuild the cover whenever the design changes.
  useEffect(() => {
    const c = ctx.current
    if (!c) return
    disposeTree(c.cover)
    c.cover.clear()
    const materials = new Map<string, THREE.Material>()
    const materialFor = (fabric: Fabric) => {
      const key = JSON.stringify([fabric.id, fabric.print, fabric.color, fabric.accent, fabric.repeat, fabric.photo?.length])
      let m = materials.get(key)
      if (!m) {
        const canvas = fabricTile(fabric)
        const tex = new THREE.CanvasTexture(canvas)
        if (canvas.dataset.ready !== '1') {
          canvas.addEventListener('ready', () => ((tex.needsUpdate = true), c.render()), { once: true })
        }
        tex.colorSpace = THREE.SRGBColorSpace
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping
        tex.repeat.set(1 / fabric.repeat, 1 / fabric.repeat)
        tex.anisotropy = 4
        m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92, side: THREE.DoubleSide })
        materials.set(key, m)
      }
      return m
    }
    for (const part of parts) {
      const mesh = partMesh(part, materialFor(fabricForRole(part.role)))
      if (mesh) c.cover.add(mesh)
    }
    c.render()
  }, [parts, fabricForRole])

  useEffect(() => {
    const c = ctx.current
    if (!c) return
    disposeTree(c.under)
    c.under.clear()
    if (underlay) {
      underlay.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) o.castShadow = true
      })
      c.under.add(underlay)
    }
    c.under.visible = showUnderlay
    c.render()
  }, [underlay, showUnderlay])

  // Frame the camera on the model when a different design is opened.
  useEffect(() => {
    const c = ctx.current
    if (!c || framed.current === frameKey || !parts.length) return
    framed.current = frameKey
    const box = new THREE.Box3().setFromObject(c.cover)
    const sphere = box.getBoundingSphere(new THREE.Sphere())
    const center = sphere.center.clone()
    center.y = Math.max(center.y, box.max.y * 0.45)
    // Fit the model in whichever of the vertical or horizontal view is narrower.
    const vfov = (c.camera.fov * Math.PI) / 180
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * c.camera.aspect)
    const dist = (sphere.radius / Math.sin(Math.min(vfov, hfov) / 2)) * 0.95
    const dir = new THREE.Vector3(0.62, 0.38, 0.75).normalize()
    c.controls.target.copy(center)
    c.camera.position.copy(center).addScaledVector(dir, dist)
    c.controls.update()
    c.render()
  }, [frameKey, parts])

  return <div className="preview3d" ref={host} aria-label="3D preview of the finished piece" />
}

function partMesh(part: AssemblyPart, material: THREE.Material): THREE.Mesh | null {
  if (part.outline.length < 3) return null
  const shape = new THREE.Shape(part.outline.map((p) => new THREE.Vector2(p.x, p.y)))
  const geo = new THREE.ShapeGeometry(shape, 12)
  const { origin, u, v } = part.frame
  const U = new THREE.Vector3(u.x, u.y, u.z)
  const V = new THREE.Vector3(v.x, v.y, v.z)
  const n = new THREE.Vector3().crossVectors(U, V).normalize().multiplyScalar(part.lift)
  const O = new THREE.Vector3(origin.x, origin.y, origin.z).add(n)
  const pos = geo.getAttribute('position') as THREE.BufferAttribute
  const p = new THREE.Vector3()
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    p.copy(O).addScaledVector(U, x).addScaledVector(V, y)
    pos.setXYZ(i, p.x, p.y, p.z)
  }
  geo.computeVertexNormals()
  const mesh = new THREE.Mesh(geo, material)
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

function disposeTree(root: THREE.Object3D) {
  root.traverse((o) => {
    const m = o as THREE.Mesh
    if (m.isMesh) {
      m.geometry.dispose()
      const mats = Array.isArray(m.material) ? m.material : [m.material]
      for (const mat of mats) {
        ;(mat as THREE.MeshStandardMaterial).map?.dispose()
        mat.dispose()
      }
    }
  })
}
