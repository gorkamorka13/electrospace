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
