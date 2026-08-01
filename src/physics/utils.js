import * as THREE from 'three'

export function makeLocalFrame(origin, normal) {
  const n = normal.isVector3 ? normal : new THREE.Vector3(...normal)
  const z = n.clone().normalize()
  const up = Math.abs(z.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0)
  const x = new THREE.Vector3().crossVectors(up, z).normalize()
  const y = new THREE.Vector3().crossVectors(z, x).normalize()
  return { x, y, z, origin: new THREE.Vector3(...origin) }
}

export function worldFromLocal(local, frame) {
  return new THREE.Vector3()
    .addScaledVector(frame.x, local.x)
    .addScaledVector(frame.y, local.y)
    .addScaledVector(frame.z, local.z)
    .add(frame.origin)
}

// World-aligned AABB covering charges and the FULL extent of each distribution
// (width/height/radius/length…), so field grids scale with enlarged objects.
export function computeFieldGridBounds(sources, fallback = 10) {
  const min = new THREE.Vector3(Infinity, Infinity, Infinity)
  const max = new THREE.Vector3(-Infinity, -Infinity, -Infinity)
  const expand = (p) => {
    min.x = Math.min(min.x, p.x); min.y = Math.min(min.y, p.y); min.z = Math.min(min.z, p.z)
    max.x = Math.max(max.x, p.x); max.y = Math.max(max.y, p.y); max.z = Math.max(max.z, p.z)
  }

  for (const c of sources.charges || []) expand(new THREE.Vector3(...c.position))

  for (const d of sources.distributions || []) {
    const center = d.center || [0, 0, 0] // line defaults to origin along +y
    const C = new THREE.Vector3(...center)
    expand(C)
    // half-extents in the local frame (z = normal / axis)
    let rx = 0, ry = 0, rz = 0
    switch (d.type) {
      case 'line': {
        const len = d.mode === 'infinite' ? 6 : (d.length || 0)
        rz = len / 2
        break
      }
      case 'cylinder': {
        const h = d.mode === 'infinite' ? 6 : (d.height || 0)
        rx = ry = d.radius || 0
        rz = h / 2
        break
      }
      case 'plane': {
        const w = d.mode === 'infinite' ? 6 : (d.width || 0)
        const h = d.mode === 'infinite' ? 6 : (d.height || 0)
        rx = w / 2
        ry = h / 2
        break
      }
      case 'disk':
      case 'circle':
        rx = ry = d.radius || 0
        break
      case 'frame':
        rx = (d.width || 0) / 2
        ry = (d.height || 0) / 2
        break
      case 'sphere':
        rx = ry = rz = d.radius || 0
        break
      case 'box': {
        const w = d.mode === 'infinite' ? 6 : (d.width || 0)
        const h = d.mode === 'infinite' ? 6 : (d.height || 0)
        const dep = d.mode === 'infinite' ? 6 : (d.depth || 0)
        rx = w / 2
        ry = h / 2
        rz = dep / 2
        break
      }
      default:
        break
    }

    if (rx === 0 && ry === 0 && rz === 0) continue

    let x, y, z
    if (d.type === 'sphere') {
      x = new THREE.Vector3(1, 0, 0)
      y = new THREE.Vector3(0, 1, 0)
      z = new THREE.Vector3(0, 0, 1)
    } else {
      const n = d.normal ? d.normal : (d.axis || [0, 1, 0])
      const frame = makeLocalFrame(center, n)
      x = frame.x; y = frame.y; z = frame.z
    }
    const hx = rx * Math.abs(x.x) + ry * Math.abs(y.x) + rz * Math.abs(z.x)
    const hy = rx * Math.abs(x.y) + ry * Math.abs(y.y) + rz * Math.abs(z.y)
    const hz = rx * Math.abs(x.z) + ry * Math.abs(y.z) + rz * Math.abs(z.z)
    expand(new THREE.Vector3(C.x - hx, C.y - hy, C.z - hz))
    expand(new THREE.Vector3(C.x + hx, C.y + hy, C.z + hz))
  }

  if (!Number.isFinite(min.x)) {
    return {
      min: new THREE.Vector3(-fallback, -fallback, -fallback),
      max: new THREE.Vector3(fallback, fallback, fallback),
    }
  }
  min.addScalar(-2)
  max.addScalar(2)
  return { min, max }
}

export function fibonacciSphere(N, center, radius) {
  if (N < 2) {
    return [new THREE.Vector3(center[0] + radius, center[1], center[2])]
  }
  const pts = []
  const c = new THREE.Vector3(...center)
  const phi = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2
    const r = Math.sqrt(1 - y * y)
    const theta = phi * i
    pts.push(new THREE.Vector3(c.x + r * Math.cos(theta) * radius, c.y + y * radius, c.z + r * Math.sin(theta) * radius))
  }
  return pts
}
