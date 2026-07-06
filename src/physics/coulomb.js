import * as THREE from 'three'
import { makeLocalFrame, worldFromLocal, fibonacciSphere } from './utils'

export const KE_REAL = 8.9875517923e9
export const E_CHARGE = 1.602176634e-19

export function calculateFieldFromCharge(charge, targetPos, ke = KE_REAL, rMin = 0.5) {
  const q = charge.q
  const chargePos = new THREE.Vector3(...charge.position)
  const M = new THREE.Vector3(...targetPos)
  const rVec = new THREE.Vector3().subVectors(M, chargePos)
  let r = rVec.length()
  if (r < rMin) r = rMin
  const u = rVec.clone().normalize()
  return u.multiplyScalar((ke * q) / (r * r))
}

export function calculateTotalField(charges, targetPos, ke = KE_REAL, rMin = 0.5, distributions = []) {
  const totalField = new THREE.Vector3(0, 0, 0)
  charges.forEach(c => totalField.add(calculateFieldFromCharge(c, targetPos, ke, rMin)))
  distributions.forEach(d => totalField.add(calculateFieldFromDistribution(d, targetPos, ke, rMin)))
  return totalField
}

export function calculatePotentialFromCharge(charge, targetPos, ke = KE_REAL, rMin = 0.5) {
  const chargePos = new THREE.Vector3(...charge.position)
  const M = new THREE.Vector3(...targetPos)
  const rVec = new THREE.Vector3().subVectors(M, chargePos)
  let r = rVec.length()
  if (r < rMin) r = rMin
  return (ke * charge.q) / r
}

export function calculateTotalPotential(charges, targetPos, ke = KE_REAL, rMin = 0.5, distributions = []) {
  let V = 0
  charges.forEach(c => V += calculatePotentialFromCharge(c, targetPos, ke, rMin))
  distributions.forEach(d => V += calculatePotentialFromDistribution(d, targetPos, ke, rMin))
  return V
}

function elE(E, dq, pos, targetPos, ke, rMin) {
  const rVec = new THREE.Vector3(...targetPos).sub(pos)
  let r = rVec.length()
  if (r < rMin) r = rMin
  E.add(rVec.clone().normalize().multiplyScalar((ke * dq) / (r * r)))
}

function elV(Vsum, dq, pos, targetPos, ke, rMin) {
  const rVec = new THREE.Vector3(...targetPos).sub(pos)
  let r = rVec.length()
  if (r < rMin) r = rMin
  return Vsum + (ke * dq) / r
}/* ---------- Line ---------- */

function lineFieldAnalytical(px, py, pz, half, lambda, ke, rMin) {
  const E = new THREE.Vector3()
  const R2 = Math.max(px * px + pz * pz, 1e-20)
  const y1 = -half, y2 = half
  const u1 = py - y1, u2 = py - y2
  const clamp = (v) => Math.max(Math.abs(v), rMin) * (v >= 0 ? 1 : -1)
  const u1c = clamp(u1)
  const u2c = clamp(u2)
  const s1 = Math.sqrt(R2 + u1c * u1c)
  const s2 = Math.sqrt(R2 + u2c * u2c)

  const coeff = ke * lambda
  E.x = coeff * px * (u1c / (R2 * s1) - u2c / (R2 * s2))
  E.y = coeff * (1 / s2 - 1 / s1)
  E.z = coeff * pz * (u1c / (R2 * s1) - u2c / (R2 * s2))
  return E
}

export function calculateFieldFromLine(dist, targetPos, ke = KE_REAL, rMin = 0.5) {
  return lineFieldAnalytical(targetPos[0], targetPos[1], targetPos[2], dist.length / 2, dist.density, ke, rMin)
}

function linePotentialAnalytical(px, py, pz, half, lambda, ke, rMin) {
  const R2 = Math.max(px * px + pz * pz, 1e-20)
  const y1 = -half, y2 = half
  const u1 = py - y1, u2 = py - y2
  const clamp = (v) => Math.max(Math.abs(v), rMin) * (v >= 0 ? 1 : -1)
  const u1c = clamp(u1)
  const u2c = clamp(u2)
  const s1 = Math.sqrt(R2 + u1c * u1c)
  const s2 = Math.sqrt(R2 + u2c * u2c)
  return ke * lambda * Math.log((u1c + s1) / (u2c + s2))
}

export function calculatePotentialFromLine(dist, targetPos, ke = KE_REAL, rMin = 0.5) {
  return linePotentialAnalytical(targetPos[0], targetPos[1], targetPos[2], dist.length / 2, dist.density, ke, rMin)
}

/* ---------- Cylinder (infinite) ---------- */

export function calculateFieldFromCylinder(dist, targetPos, ke = KE_REAL, rMin = 0.5) {
  const E = new THREE.Vector3()
  const { density, center, axis, radius, hollow, innerRadius = 0, e_ext = 0, e_int = 0 } = dist
  const P = new THREE.Vector3(...targetPos)
  const frame = makeLocalFrame(center, axis)
  const local = new THREE.Vector3().copy(P).sub(frame.origin)
  const px = local.dot(frame.x)
  const py = local.dot(frame.y)
  const d = Math.sqrt(px * px + py * py)
  if (d < 1e-14) return E
  if (hollow) {
    const lambda = density * (2 * Math.PI * radius)
    if (d < radius) return E
    const dClamped = Math.max(d, rMin)
    const factor = 2 * ke * lambda / (dClamped * dClamped)
    return E.addScaledVector(frame.x, factor * px).addScaledVector(frame.y, factor * py)
  }
  const a = innerRadius || 0
  const b = radius
  if (e_ext === 0 && e_int === 0) {
    if (a > 0) {
      const lambdaTotal = density * Math.PI * (b * b - a * a)
      if (d >= b) {
        const dClamped = Math.max(d, rMin)
        const factor = 2 * ke * lambdaTotal / (dClamped * dClamped)
        return E.addScaledVector(frame.x, factor * px).addScaledVector(frame.y, factor * py)
      }
      if (d <= a) return E
      const factor = 2 * ke * Math.PI * density * (1 - a * a / (d * d))
      return E.addScaledVector(frame.x, factor * px).addScaledVector(frame.y, factor * py)
    }
    const lambda = density * Math.PI * b * b
    if (d < b) {
      const factor = 2 * ke * Math.PI * density
      return E.addScaledVector(frame.x, factor * px).addScaledVector(frame.y, factor * py)
    }
    const dClamped = Math.max(d, rMin)
    const factor = 2 * ke * lambda / (dClamped * dClamped)
    return E.addScaledVector(frame.x, factor * px).addScaledVector(frame.y, factor * py)
  }
  let Emag = 0
  if (e_ext > 0) Emag += thickCylShell(density, radius - e_ext, radius, d, ke)
  if (innerRadius > 0 && e_int > 0) Emag += thickCylShell(density, innerRadius - e_int, innerRadius, d, ke)
  if (Emag === 0) return E
  const dClamped = Math.max(d, rMin)
  const factor = Emag / dClamped
  return E.addScaledVector(frame.x, factor * px).addScaledVector(frame.y, factor * py)
}

export function calculatePotentialFromCylinder(dist, targetPos, ke = KE_REAL, rMin = 0.5) {
  const { density, center, axis, radius, hollow, innerRadius = 0, e_ext = 0, e_int = 0 } = dist
  const P = new THREE.Vector3(...targetPos)
  const frame = makeLocalFrame(center, axis)
  const local = new THREE.Vector3().copy(P).sub(frame.origin)
  const px = local.dot(frame.x)
  const py = local.dot(frame.y)
  const d = Math.sqrt(px * px + py * py)
  const dClamped = Math.max(d, rMin)
  if (hollow) {
    const lambda = density * (2 * Math.PI * radius)
    if (d < radius) return -2 * ke * lambda * Math.log(Math.max(radius, rMin))
    return -2 * ke * lambda * Math.log(dClamped)
  }
  const a = innerRadius || 0
  const b = radius
  if (e_ext === 0 && e_int === 0) {
    if (a > 0) {
      const lambdaTotal = density * Math.PI * (b * b - a * a)
      if (d >= b) return -2 * ke * lambdaTotal * Math.log(dClamped)
      if (d <= a) {
        return -2 * ke * lambdaTotal * Math.log(Math.max(b, rMin))
          + ke * Math.PI * density * (b * b - a * a)
          - 2 * ke * Math.PI * density * a * a * Math.log(Math.max(b / Math.max(a, 1e-14), 1))
      }
      return -2 * ke * lambdaTotal * Math.log(Math.max(b, rMin))
        + ke * Math.PI * density * (b * b - dClamped * dClamped)
        - 2 * ke * Math.PI * density * a * a * Math.log(Math.max(b / Math.max(d, 1e-14), 1))
    }
    const lambda = density * Math.PI * b * b
    if (d < b) {
      return ke * Math.PI * density * (b * b - dClamped * dClamped) - 2 * ke * lambda * Math.log(Math.max(b, rMin))
    }
    return -2 * ke * lambda * Math.log(dClamped)
  }
  let V = 0
  if (e_ext > 0) V += thickCylShellPotential(density, radius - e_ext, radius, d, ke, rMin)
  if (innerRadius > 0 && e_int > 0) V += thickCylShellPotential(density, innerRadius - e_int, innerRadius, d, ke, rMin)
  return V
}

/* ---------- Plane (infinite) ---------- */

export function calculateFieldFromPlane(dist, targetPos, ke = KE_REAL, rMin = 0.5) {
  const { density: sigma, center, normal } = dist
  const n = new THREE.Vector3(...normal).normalize()
  const P = new THREE.Vector3(...targetPos)
  const C = new THREE.Vector3(...center)
  const d = new THREE.Vector3().subVectors(P, C).dot(n)
  const dClamped = Math.max(Math.abs(d), rMin) * (d >= 0 ? 1 : -1)
  const E = n.clone().multiplyScalar(2 * Math.PI * ke * sigma * (dClamped >= 0 ? 1 : -1))
  return E
}

export function calculatePotentialFromPlane(dist, targetPos, ke = KE_REAL, rMin = 0.5) {
  const { density: sigma, center, normal } = dist
  const n = new THREE.Vector3(...normal).normalize()
  const P = new THREE.Vector3(...targetPos)
  const C = new THREE.Vector3(...center)
  const d = Math.abs(new THREE.Vector3().subVectors(P, C).dot(n))
  return -2 * Math.PI * ke * sigma * Math.max(d, rMin)
}

/* ---------- Disk ---------- */

export function calculateFieldFromDisk(dist, targetPos, ke = KE_REAL, rMin = 0.5) {
  const { density: sigma, center, normal, radius } = dist
  const C = new THREE.Vector3(...center)
  const P = new THREE.Vector3(...targetPos)
  const n = new THREE.Vector3(...normal).normalize()
  const z = new THREE.Vector3().subVectors(P, C).dot(n)
  const dPerp = Math.sqrt(Math.max(0, new THREE.Vector3().subVectors(P, C).lengthSq() - z * z))
  if (dPerp < 1e-10) {
    const signZ = z >= 0 ? 1 : -1
    const ez = 2 * Math.PI * ke * sigma * (signZ - z / Math.sqrt(z * z + radius * radius))
    return n.clone().multiplyScalar(ez)
  }
  const E = new THREE.Vector3()
  const frame = makeLocalFrame(center, new THREE.Vector3(...normal))
  const NR = 20, NA = 36
  const dr = radius / NR, da = (2 * Math.PI) / NA
  for (let ir = 0; ir < NR; ir++) {
    const r = (ir + 0.5) * dr
    for (let ia = 0; ia < NA; ia++) {
      const a = (ia + 0.5) * da
      const local = new THREE.Vector3(r * Math.cos(a), r * Math.sin(a), 0)
      elE(E, sigma * r * dr * da, worldFromLocal(local, frame), targetPos, ke, rMin)
    }
  }
  return E
}

export function calculatePotentialFromDisk(dist, targetPos, ke = KE_REAL, rMin = 0.5) {
  const { density: sigma, center, normal, radius } = dist
  const C = new THREE.Vector3(...center)
  const P = new THREE.Vector3(...targetPos)
  const n = new THREE.Vector3(...normal).normalize()
  const z = new THREE.Vector3().subVectors(P, C).dot(n)
  const dPerp = Math.sqrt(Math.max(0, new THREE.Vector3().subVectors(P, C).lengthSq() - z * z))
  if (dPerp < 1e-10) {
    return 2 * Math.PI * ke * sigma * (Math.sqrt(z * z + radius * radius) - Math.max(Math.abs(z), rMin))
  }
  let V = 0
  const frame = makeLocalFrame(center, new THREE.Vector3(...normal))
  const NR = 20, NA = 36
  const dr = radius / NR, da = (2 * Math.PI) / NA
  for (let ir = 0; ir < NR; ir++) {
    const r = (ir + 0.5) * dr
    for (let ia = 0; ia < NA; ia++) {
      const a = (ia + 0.5) * da
      const local = new THREE.Vector3(r * Math.cos(a), r * Math.sin(a), 0)
      V = elV(V, sigma * r * dr * da, worldFromLocal(local, frame), targetPos, ke, rMin)
    }
  }
  return V
}

/* ---------- Circle (ring / circular line charge) ---------- */

export function calculateFieldFromCircle(dist, targetPos, ke = KE_REAL, rMin = 0.5) {
  const { density: lambda, center, normal, radius } = dist
  const E = new THREE.Vector3()
  const frame = makeLocalFrame(center, new THREE.Vector3(...normal))
  const NC = 36
  const da = (2 * Math.PI) / NC
  for (let i = 0; i < NC; i++) {
    const a = (i + 0.5) * da
    const local = new THREE.Vector3(radius * Math.cos(a), radius * Math.sin(a), 0)
    elE(E, lambda * radius * da, worldFromLocal(local, frame), targetPos, ke, rMin)
  }
  return E
}

export function calculatePotentialFromCircle(dist, targetPos, ke = KE_REAL, rMin = 0.5) {
  const { density: lambda, center, normal, radius } = dist
  let V = 0
  const frame = makeLocalFrame(center, new THREE.Vector3(...normal))
  const NC = 36
  const da = (2 * Math.PI) / NC
  for (let i = 0; i < NC; i++) {
    const a = (i + 0.5) * da
    const local = new THREE.Vector3(radius * Math.cos(a), radius * Math.sin(a), 0)
    V = elV(V, lambda * radius * da, worldFromLocal(local, frame), targetPos, ke, rMin)
  }
  return V
}

/* ---------- Frame (rectangular wire loop) ---------- */

function addLineSegmentE(E, start, end, lambda, nSeg, frame, targetPos, ke, rMin) {
  for (let i = 0; i < nSeg; i++) {
    const t = (i + 0.5) / nSeg
    const local = new THREE.Vector3().lerpVectors(start, end, t)
    const dq = lambda * start.distanceTo(end) / nSeg
    elE(E, dq, worldFromLocal(local, frame), targetPos, ke, rMin)
  }
}

function addLineSegmentV(V, start, end, lambda, nSeg, frame, targetPos, ke, rMin) {
  for (let i = 0; i < nSeg; i++) {
    const t = (i + 0.5) / nSeg
    const local = new THREE.Vector3().lerpVectors(start, end, t)
    const dq = lambda * start.distanceTo(end) / nSeg
    V = elV(V, dq, worldFromLocal(local, frame), targetPos, ke, rMin)
  }
  return V
}

export function calculateFieldFromFrame(dist, targetPos, ke = KE_REAL, rMin = 0.5) {
  const { density: lambda, center, normal, width, height } = dist
  const E = new THREE.Vector3()
  const frame = makeLocalFrame(center, new THREE.Vector3(...normal))
  const hw = width / 2, hh = height / 2
  const corners = [
    new THREE.Vector3(-hw, -hh, 0),
    new THREE.Vector3( hw, -hh, 0),
    new THREE.Vector3( hw,  hh, 0),
    new THREE.Vector3(-hw,  hh, 0),
  ]
  const nPerSide = Math.max(Math.ceil(Math.max(width, height) / 0.5), 4)
  for (let i = 0; i < 4; i++) {
    addLineSegmentE(E, corners[i], corners[(i + 1) % 4], lambda, nPerSide, frame, targetPos, ke, rMin)
  }
  return E
}

export function calculatePotentialFromFrame(dist, targetPos, ke = KE_REAL, rMin = 0.5) {
  const { density: lambda, center, normal, width, height } = dist
  let V = 0
  const frame = makeLocalFrame(center, new THREE.Vector3(...normal))
  const hw = width / 2, hh = height / 2
  const corners = [
    new THREE.Vector3(-hw, -hh, 0),
    new THREE.Vector3( hw, -hh, 0),
    new THREE.Vector3( hw,  hh, 0),
    new THREE.Vector3(-hw,  hh, 0),
  ]
  const nPerSide = Math.max(Math.ceil(Math.max(width, height) / 0.5), 4)
  for (let i = 0; i < 4; i++) {
    V = addLineSegmentV(V, corners[i], corners[(i + 1) % 4], lambda, nPerSide, frame, targetPos, ke, rMin)
  }
  return V
}

/* ---------- Box (parallelepiped, hollow / solid) ---------- */

export function calculateFieldFromBox(dist, targetPos, ke = KE_REAL, rMin = 0.5) {
  const E = new THREE.Vector3()
  const { density, center, normal, width, height: h, depth, hollow } = dist
  const frame = makeLocalFrame(center, new THREE.Vector3(...normal))
  const w2 = width / 2, h2 = h / 2, d2 = depth / 2

  const P = new THREE.Vector3(...targetPos)
  const local = new THREE.Vector3().copy(P).sub(frame.origin)
  const px = local.dot(frame.x)
  const py = local.dot(frame.y)
  const pz = local.dot(frame.z)

  const rx = Math.abs(px) / w2
  const ry = Math.abs(py) / h2
  const rz = Math.abs(pz) / d2
  const alpha = Math.max(rx, ry, rz)
  const isInside = alpha < 0.999

  if (isInside) {
    if (hollow) {
      return E; // E = 0 inside a hollow conductor box (Faraday cage)
    } else {
      if (alpha < 1e-6) return E; // E = 0 at the exact center
      // Project the inside point to the boundary along the ray from the center
      const P_bound = new THREE.Vector3(px / alpha, py / alpha, pz / alpha)
      const P_bound_world = worldFromLocal(P_bound, frame)
      const E_bound = calculateFieldFromBox(dist, [P_bound_world.x, P_bound_world.y, P_bound_world.z], ke, rMin)
      // Inside a solid box, field is approximately linear with the fractional distance from center
      return E_bound.multiplyScalar(alpha)
    }
  }

  const N = 24
  if (hollow) {
    const sigma = density
    const faceDefs = [
      { u: width, v: h, dA: 1, local: (pu, pv) => new THREE.Vector3(pu, pv, -d2) },
      { u: width, v: h, dA: 1, local: (pu, pv) => new THREE.Vector3(pu, pv, d2) },
      { u: depth, v: h, dA: 1, local: (pu, pv) => new THREE.Vector3(-w2, pv, pu) },
      { u: depth, v: h, dA: 1, local: (pu, pv) => new THREE.Vector3(w2, pv, pu) },
      { u: width, v: depth, dA: 1, local: (pu, pv) => new THREE.Vector3(pu, -h2, pv) },
      { u: width, v: depth, dA: 1, local: (pu, pv) => new THREE.Vector3(pu, h2, pv) },
    ]
    for (const face of faceDefs) {
      const nu = Math.max(Math.floor(N * face.u / Math.max(width, h, depth)), 2)
      const nv = Math.max(Math.floor(N * face.v / Math.max(width, h, depth)), 2)
      const du = face.u / nu, dv = face.v / nv
      for (let iu = 0; iu < nu; iu++) {
        const pu = (iu + 0.5) * du - face.u / 2
        for (let iv = 0; iv < nv; iv++) {
          const pv = (iv + 0.5) * dv - face.v / 2
          elE(E, sigma * du * dv, worldFromLocal(face.local(pu, pv), frame), targetPos, ke, rMin)
        }
      }
    }
  } else {
    const rho = density
    const nx = N, ny = N, nz = N
    const dx = width / nx, dy = h / ny, dz = depth / nz
    for (let ix = 0; ix < nx; ix++) {
      const lx = (ix + 0.5) * dx - w2
      for (let iy = 0; iy < ny; iy++) {
        const ly = (iy + 0.5) * dy - h2
        for (let iz = 0; iz < nz; iz++) {
          const lz = (iz + 0.5) * dz - d2
          elE(E, rho * dx * dy * dz, worldFromLocal(new THREE.Vector3(lx, ly, lz), frame), targetPos, ke, rMin)
        }
      }
    }
  }
  return E
}

export function calculatePotentialFromBox(dist, targetPos, ke = KE_REAL, rMin = 0.5) {
  const { density, center, normal, width, height: h, depth, hollow } = dist
  const frame = makeLocalFrame(center, new THREE.Vector3(...normal))
  const w2 = width / 2, h2 = h / 2, d2 = depth / 2

  const P = new THREE.Vector3(...targetPos)
  const local = new THREE.Vector3().copy(P).sub(frame.origin)
  const px = local.dot(frame.x)
  const py = local.dot(frame.y)
  const pz = local.dot(frame.z)

  const rx = Math.abs(px) / w2
  const ry = Math.abs(py) / h2
  const rz = Math.abs(pz) / d2
  const alpha = Math.max(rx, ry, rz)
  const isInside = alpha < 0.999
  const isCenter = alpha < 1e-5

  if (isInside && !isCenter) {
    const V_center = calculatePotentialFromBox(dist, center, ke, rMin)
    if (hollow) {
      return V_center // Constant potential inside a hollow conductor box
    } else {
      // Project the inside point to the boundary along the ray from the center
      const P_bound = new THREE.Vector3(px / alpha, py / alpha, pz / alpha)
      const P_bound_world = worldFromLocal(P_bound, frame)
      const V_bound = calculatePotentialFromBox(dist, [P_bound_world.x, P_bound_world.y, P_bound_world.z], ke, rMin)
      // Inside a solid box, potential varies quadratically from the center value to the boundary value
      return V_center + (V_bound - V_center) * alpha * alpha
    }
  }

  let V = 0
  const N = 8
  if (hollow) {
    const sigma = density
    const faceDefs = [
      { u: width, v: h, local: (pu, pv) => new THREE.Vector3(pu, pv, -d2) },
      { u: width, v: h, local: (pu, pv) => new THREE.Vector3(pu, pv, d2) },
      { u: depth, v: h, local: (pu, pv) => new THREE.Vector3(-w2, pv, pu) },
      { u: depth, v: h, local: (pu, pv) => new THREE.Vector3(w2, pv, pu) },
      { u: width, v: depth, local: (pu, pv) => new THREE.Vector3(pu, -h2, pv) },
      { u: width, v: depth, local: (pu, pv) => new THREE.Vector3(pu, h2, pv) },
    ]
    for (const face of faceDefs) {
      const nu = Math.max(Math.floor(N * face.u / Math.max(width, h, depth)), 2)
      const nv = Math.max(Math.floor(N * face.v / Math.max(width, h, depth)), 2)
      const du = face.u / nu, dv = face.v / nv
      for (let iu = 0; iu < nu; iu++) {
        const pu = (iu + 0.5) * du - face.u / 2
        for (let iv = 0; iv < nv; iv++) {
          const pv = (iv + 0.5) * dv - face.v / 2
          V = elV(V, sigma * du * dv, worldFromLocal(face.local(pu, pv), frame), targetPos, ke, rMin)
        }
      }
    }
  } else {
    const rho = density
    const nx = N, ny = N, nz = N
    const dx = width / nx, dy = h / ny, dz = depth / nz
    for (let ix = 0; ix < nx; ix++) {
      const lx = (ix + 0.5) * dx - w2
      for (let iy = 0; iy < ny; iy++) {
        const ly = (iy + 0.5) * dy - h2
        for (let iz = 0; iz < nz; iz++) {
          const lz = (iz + 0.5) * dz - d2
          V = elV(V, rho * dx * dy * dz, worldFromLocal(new THREE.Vector3(lx, ly, lz), frame), targetPos, ke, rMin)
        }
      }
    }
  }
  return V
}

/* ---------- Two-shell helper functions ---------- */

function thickSphereShell(rho, inner, outer, r, ke) {
  if (outer <= inner || rho === 0) return 0
  if (r >= outer) {
    const Q = rho * (4 / 3 * Math.PI * (outer * outer * outer - inner * inner * inner))
    return ke * Q / (r * r)
  }
  if (r <= inner) return 0
  const Qenc = rho * (4 / 3 * Math.PI * (r * r * r - inner * inner * inner))
  return ke * Qenc / (r * r)
}

function thickSphereShellPotential(rho, inner, outer, r, ke) {
  if (outer <= inner || rho === 0) return 0
  const Vshell = 4 / 3 * Math.PI * (outer * outer * outer - inner * inner * inner)
  if (Vshell < 1e-30) return 0
  const Q = rho * Vshell
  if (r >= outer) return ke * Q / r
  if (r <= inner) return ke * Q * 3 * (outer * outer - inner * inner) / (2 * (outer * outer * outer - inner * inner * inner))
  return ke * Q * (3 * outer * outer - r * r - 2 * inner * inner * inner / r) / (2 * (outer * outer * outer - inner * inner * inner))
}

function thickCylShell(rho, inner, outer, d, ke) {
  if (outer <= inner || rho === 0) return 0
  const lambdaTotal = rho * Math.PI * (outer * outer - inner * inner)
  if (d >= outer) return 2 * ke * lambdaTotal / d
  if (d <= inner) return 0
  const lambdaEnc = rho * Math.PI * (d * d - inner * inner)
  return 2 * ke * lambdaEnc / d
}

function thickCylShellPotential(rho, inner, outer, d, ke, rMin) {
  if (outer <= inner || rho === 0) return 0
  const lambdaTotal = rho * Math.PI * (outer * outer - inner * inner)
  const dClamped = Math.max(d, rMin)
  if (d >= outer) return -2 * ke * lambdaTotal * Math.log(dClamped)
  if (d <= inner) {
    return -2 * ke * lambdaTotal * Math.log(Math.max(outer, rMin))
      + ke * Math.PI * rho * (outer * outer - inner * inner)
      - 2 * ke * Math.PI * rho * inner * inner * Math.log(Math.max(outer / Math.max(inner, 1e-14), 1))
  }
  return -2 * ke * lambdaTotal * Math.log(Math.max(outer, rMin))
    + ke * Math.PI * rho * (outer * outer - dClamped * dClamped)
    - 2 * ke * Math.PI * rho * inner * inner * Math.log(Math.max(outer / Math.max(d, 1e-14), 1))
}

/* ---------- Sphere (hollow / solid / two-shell) ---------- */

export function calculateFieldFromSphere(dist, targetPos, ke = KE_REAL, rMin = 0.5) {
  const { density, center, radius, innerRadius = 0, hollow, e_ext = 0, e_int = 0 } = dist
  const C = new THREE.Vector3(...center)
  const P = new THREE.Vector3(...targetPos)
  const rVec = new THREE.Vector3().subVectors(P, C)
  const r = Math.max(rVec.length(), rMin)
  const E = new THREE.Vector3()
  if (hollow) {
    const Q = density * (4 * Math.PI * radius * radius)
    if (r < radius) return E
    return E.copy(rVec).multiplyScalar(ke * Q / (r * r * r))
  }
  const a = innerRadius
  const b = radius
  if (e_ext === 0 && e_int === 0) {
    if (r >= b) {
      const Q = density * (4 / 3 * Math.PI * (b * b * b - a * a * a))
      return E.copy(rVec).multiplyScalar(ke * Q / (r * r * r))
    }
    if (r <= a) return E
    const Qenc = density * (4 / 3 * Math.PI * (r * r * r - a * a * a))
    return E.copy(rVec).multiplyScalar(ke * Qenc / (r * r * r))
  }
  let Emag = 0
  if (e_ext > 0) Emag += thickSphereShell(density, radius - e_ext, radius, r, ke)
  if (innerRadius > 0 && e_int > 0) Emag += thickSphereShell(density, innerRadius - e_int, innerRadius, r, ke)
  return E.copy(rVec).multiplyScalar(Emag / Math.max(r, 1e-14))
}

export function calculatePotentialFromSphere(dist, targetPos, ke = KE_REAL, rMin = 0.5) {
  const { density, center, radius, innerRadius = 0, hollow, e_ext = 0, e_int = 0 } = dist
  const C = new THREE.Vector3(...center)
  const P = new THREE.Vector3(...targetPos)
  const r = Math.max(new THREE.Vector3().subVectors(P, C).length(), rMin)
  if (hollow) {
    const Q = density * (4 * Math.PI * radius * radius)
    if (r < radius) return ke * Q / Math.max(radius, rMin)
    return ke * Q / r
  }
  const a = innerRadius
  const b = radius
  if (e_ext === 0 && e_int === 0) {
    const Vshell = 4 / 3 * Math.PI * (b * b * b - a * a * a)
    if (Vshell < 1e-30) return 0
    const Q = density * Vshell
    if (r >= b) return ke * Q / r
    if (r <= a) return ke * Q * 3 * (b * b - a * a) / (2 * (b * b * b - a * a * a))
    return ke * Q * (3 * b * b - r * r - 2 * a * a * a / r) / (2 * (b * b * b - a * a * a))
  }
  let V = 0
  if (e_ext > 0) V += thickSphereShellPotential(density, radius - e_ext, radius, r, ke)
  if (innerRadius > 0 && e_int > 0) V += thickSphereShellPotential(density, innerRadius - e_int, innerRadius, r, ke)
  return V
}

/* ---------- Dispatchers ---------- */

export function calculateFieldFromDistribution(dist, targetPos, ke = KE_REAL, rMin = 0.5) {
  switch (dist.type) {
    case 'line': return calculateFieldFromLine(dist, targetPos, ke, rMin)
    case 'cylinder': return calculateFieldFromCylinder(dist, targetPos, ke, rMin)
    case 'plane': return calculateFieldFromPlane(dist, targetPos, ke, rMin)
    case 'disk': return calculateFieldFromDisk(dist, targetPos, ke, rMin)
    case 'circle': return calculateFieldFromCircle(dist, targetPos, ke, rMin)
    case 'frame': return calculateFieldFromFrame(dist, targetPos, ke, rMin)
    case 'sphere': return calculateFieldFromSphere(dist, targetPos, ke, rMin)
    case 'box': return calculateFieldFromBox(dist, targetPos, ke, rMin)
    default: return new THREE.Vector3()
  }
}

export function calculatePotentialFromDistribution(dist, targetPos, ke = KE_REAL, rMin = 0.5) {
  switch (dist.type) {
    case 'line': return calculatePotentialFromLine(dist, targetPos, ke, rMin)
    case 'cylinder': return calculatePotentialFromCylinder(dist, targetPos, ke, rMin)
    case 'plane': return calculatePotentialFromPlane(dist, targetPos, ke, rMin)
    case 'disk': return calculatePotentialFromDisk(dist, targetPos, ke, rMin)
    case 'circle': return calculatePotentialFromCircle(dist, targetPos, ke, rMin)
    case 'frame': return calculatePotentialFromFrame(dist, targetPos, ke, rMin)
    case 'sphere': return calculatePotentialFromSphere(dist, targetPos, ke, rMin)
    case 'box': return calculatePotentialFromBox(dist, targetPos, ke, rMin)
    default: return 0
  }
}

/* ---------- Distribution seed generation for field lines ---------- */

export function getDistributionSeeds(dist, numSeeds) {
  const sign = dist.density >= 0 ? 1 : -1
  const seeds = []
  const N = Math.max(numSeeds, 4)

  switch (dist.type) {
    case 'line': {
      const half = dist.length / 2
      const s = new THREE.Vector3(0, -half, 0)
      const dir = new THREE.Vector3(0, 1, 0)
      if (dist.length < 1e-10) return seeds
      const segments = Math.max(Math.floor(N / 4), 2)
      const perRing = Math.max(Math.floor(N / segments), 4)
      const rSeed = 0.3
      for (let i = 0; i < segments; i++) {
        const t = (i + 0.5) / segments
        const base = new THREE.Vector3().copy(s).addScaledVector(dir, t * dist.length)
        const up = Math.abs(dir.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0)
        const u = new THREE.Vector3().crossVectors(dir, up).normalize()
        const v = new THREE.Vector3().crossVectors(dir, u).normalize()
        for (let j = 0; j < perRing; j++) {
          const a = (j / perRing) * Math.PI * 2
          const pt = new THREE.Vector3().copy(base).addScaledVector(u, Math.cos(a) * rSeed).addScaledVector(v, Math.sin(a) * rSeed)
          seeds.push({ point: pt, direction: sign })
        }
      }
      break
    }
    case 'cylinder': {
      const frame = makeLocalFrame(dist.center, new THREE.Vector3(...dist.axis))
      const NA = Math.max(Math.floor(Math.sqrt(N * 2)), 6)
      const NH = Math.max(Math.floor(N / NA), 4)
      for (let ia = 0; ia < NA; ia++) {
        const a = (ia / NA) * Math.PI * 2
        for (let ih = 0; ih < NH; ih++) {
          const hloc = (ih / (NH - 1)) * dist.height - dist.height / 2
          const local = new THREE.Vector3(dist.radius * Math.cos(a), dist.radius * Math.sin(a), hloc)
          seeds.push({ point: worldFromLocal(local, frame), direction: sign })
        }
      }
      break
    }
    case 'plane': {
      const frame = makeLocalFrame(dist.center, new THREE.Vector3(...dist.normal))
      // Halve seeds per side so total stays ~N
      const halfN = Math.max(Math.floor(N / 2), 4)
      const nx = Math.max(Math.floor(Math.sqrt(halfN * dist.width / dist.height)), 2)
      const nz = Math.max(Math.floor(halfN / nx), 2)
      const offset = 0.15 // small offset from surface
      for (let ix = 0; ix < nx; ix++) {
        const lx = (ix / (nx - 1)) * dist.width - dist.width / 2
        for (let iz = 0; iz < nz; iz++) {
          const lz = (iz / (nz - 1)) * dist.height - dist.height / 2
          // Seed on +normal side: direction is sign since E is already along +n
          seeds.push({ point: worldFromLocal(new THREE.Vector3(lx, lz, offset), frame), direction: sign })
          // Seed on -normal side: direction is sign since E is already along -n
          seeds.push({ point: worldFromLocal(new THREE.Vector3(lx, lz, -offset), frame), direction: sign })
        }
      }
      break
    }
    case 'disk': {
      const frame = makeLocalFrame(dist.center, new THREE.Vector3(...dist.normal))
      // Halve seeds per side so total stays ~N
      const halfN = Math.max(Math.floor(N / 2), 4)
      const NR2 = Math.max(Math.floor(Math.sqrt(halfN)), 2)
      const NA2 = Math.max(Math.floor(halfN / NR2), 4)
      const offset = 0.15 // small offset from surface
      for (let ir = 0; ir < NR2; ir++) {
        const r = ((ir + 0.5) / NR2) * dist.radius
        for (let ia = 0; ia < NA2; ia++) {
          const a = (ia / NA2) * Math.PI * 2
          // Seed on +normal side
          seeds.push({ point: worldFromLocal(new THREE.Vector3(r * Math.cos(a), r * Math.sin(a), offset), frame), direction: sign })
          // Seed on -normal side
          seeds.push({ point: worldFromLocal(new THREE.Vector3(r * Math.cos(a), r * Math.sin(a), -offset), frame), direction: sign })
        }
      }
      break
    }
    case 'circle': {
      const frame = makeLocalFrame(dist.center, new THREE.Vector3(...dist.normal))
      const offset = 0.15
      const nSeeds = Math.max(N, 8)
      for (let i = 0; i < nSeeds; i++) {
        const a = (i / nSeeds) * Math.PI * 2
        const local = new THREE.Vector3(
          (dist.radius + offset) * Math.cos(a),
          (dist.radius + offset) * Math.sin(a),
          0
        )
        seeds.push({ point: worldFromLocal(local, frame), direction: sign })
      }
      break
    }
    case 'frame': {
      const frame = makeLocalFrame(dist.center, new THREE.Vector3(...dist.normal))
      const hw = dist.width / 2, hh = dist.height / 2
      const offset = 0.15
      const corners = [
        new THREE.Vector3(-hw, -hh, 0),
        new THREE.Vector3( hw, -hh, 0),
        new THREE.Vector3( hw,  hh, 0),
        new THREE.Vector3(-hw,  hh, 0),
      ]
      const nPerSide = Math.max(Math.ceil(Math.max(dist.width, dist.height) / 1.5), 4)
      for (let s = 0; s < 4; s++) {
        const c0 = corners[s], c1 = corners[(s + 1) % 4]
        const edge = new THREE.Vector3().subVectors(c1, c0)
        const len = edge.length()
        const dir = edge.clone().normalize()
        const perp = new THREE.Vector3(dir.y, -dir.x, 0)
        for (let i = 0; i < nPerSide; i++) {
          const t = (i + 0.5) / nPerSide
          const local = new THREE.Vector3().lerpVectors(c0, c1, t).addScaledVector(perp, offset)
          seeds.push({ point: worldFromLocal(local, frame), direction: sign })
        }
      }
      break
    }
    case 'sphere': {
      const pts = fibonacciSphere(N, dist.center, dist.radius + 0.1)
      for (const pt of pts) seeds.push({ point: pt, direction: sign })
      break
    }
    case 'box': {
      const frame = makeLocalFrame(dist.center, new THREE.Vector3(...dist.normal))
      const w2 = dist.width / 2, h2 = dist.height / 2, d2 = dist.depth / 2
      const perFace = Math.max(Math.floor(N / 6), 2)
      const side = Math.max(Math.floor(Math.sqrt(perFace)), 2)
      const faceDefs = [
        { fn: (pu, pv) => new THREE.Vector3(pu, pv, -d2), u: dist.width, v: dist.height },
        { fn: (pu, pv) => new THREE.Vector3(pu, pv, d2), u: dist.width, v: dist.height },
        { fn: (pu, pv) => new THREE.Vector3(-w2, pv, pu), u: dist.depth, v: dist.height },
        { fn: (pu, pv) => new THREE.Vector3(w2, pv, pu), u: dist.depth, v: dist.height },
        { fn: (pu, pv) => new THREE.Vector3(pu, -h2, pv), u: dist.width, v: dist.depth },
        { fn: (pu, pv) => new THREE.Vector3(pu, h2, pv), u: dist.width, v: dist.depth },
      ]
      for (const face of faceDefs) {
        for (let i = 0; i < side; i++) {
          const pu = (i + 0.5) / side * face.u - face.u / 2
          for (let j = 0; j < side; j++) {
            const pv = (j + 0.5) / side * face.v - face.v / 2
            seeds.push({ point: worldFromLocal(face.fn(pu, pv), frame), direction: sign })
          }
        }
      }
      break
    }
  }
  return seeds
}

/* ---------- Force ---------- */

export function calculateCoulombForce(chargeA, chargeB, ke = KE_REAL, rMin = 0.5) {
  const posA = new THREE.Vector3(...chargeA.position)
  const posB = new THREE.Vector3(...chargeB.position)
  const rVec = new THREE.Vector3().subVectors(posB, posA)
  let r = rVec.length()
  if (r < rMin) r = rMin
  return rVec.clone().normalize().multiplyScalar((ke * chargeA.q * chargeB.q) / (r * r))
}

export function calculateTotalForceOnCharge(targetCharge, allCharges, ke = KE_REAL, rMin = 0.5) {
  const resultant = new THREE.Vector3()
  const contributions = []
  allCharges.forEach(s => {
    if (s.id === targetCharge.id) return
    const force = calculateCoulombForce(s, targetCharge, ke, rMin)
    resultant.add(force)
    contributions.push({ fromId: s.id, force: force.clone() })
  })
  return { resultant, contributions }
}

/* ---------- Formatting ---------- */

export function formatPotential(val) {
  const a = Math.abs(val)
  if (a === 0) return '0 V'
  if (a < 1e-9) return val.toExponential(2).replace('e-', ' x 10^-') + ' V'
  if (a < 1e-6) return (val * 1e9).toFixed(2) + ' nV'
  if (a < 1e-3) return (val * 1e6).toFixed(2) + ' uV'
  if (a < 1) return (val * 1e3).toFixed(2) + ' mV'
  if (a < 1e3) return val.toFixed(2) + ' V'
  if (a < 1e6) return (val / 1e3).toFixed(2) + ' kV'
  if (a < 1e9) return (val / 1e6).toFixed(2) + ' MV'
  return val.toExponential(2).replace('e+', ' x 10^') + ' V'
}

export function formatElectricField(val) {
  const a = Math.abs(val)
  if (a === 0) return '0 V/m'
  if (a < 1e-9) return val.toExponential(2).replace('e-', ' x 10^-') + ' V/m'
  if (a < 1e-6) return (val * 1e9).toFixed(2) + ' nV/m'
  if (a < 1e-3) return (val * 1e6).toFixed(2) + ' uV/m'
  if (a < 1) return (val * 1e3).toFixed(2) + ' mV/m'
  if (a < 1e3) return val.toFixed(2) + ' V/m'
  if (a < 1e6) return (val / 1e3).toFixed(2) + ' kV/m'
  if (a < 1e9) return (val / 1e6).toFixed(2) + ' MV/m'
  return val.toExponential(2).replace('e+', ' x 10^') + ' V/m'
}

export function formatForce(val) {
  const a = Math.abs(val)
  if (a === 0) return '0 N'
  if (a < 1e-15) return val.toExponential(2) + ' N'
  if (a < 1e-12) return (val * 1e15).toFixed(2) + ' fN'
  if (a < 1e-9) return (val * 1e12).toFixed(2) + ' pN'
  if (a < 1e-6) return (val * 1e9).toFixed(2) + ' nN'
  if (a < 1e-3) return (val * 1e6).toFixed(2) + ' uN'
  if (a < 1) return (val * 1e3).toFixed(2) + ' mN'
  if (a < 1e3) return val.toFixed(2) + ' N'
  if (a < 1e6) return (val / 1e3).toFixed(2) + ' kN'
  return val.toExponential(2) + ' N'
}
/* ---------- Field Line Tracing ---------- */

export function traceFieldLine(seed, charges, options = {}) {
  const {
    ke = KE_REAL,
    rMin = 0.5,
    rStop = 0.6,
    maxDist = 25,
    maxSteps = 800,
    stepSize = 0.15,
    direction = 1,
    epsilon = 1e-25,
    sourcePos = null,
    distributions = [],
  } = options

  const pts = []
  const pos = seed.clone()
  pts.push(pos.clone())
  const tmpVec = new THREE.Vector3()

  for (let i = 0; i < maxSteps; i++) {
    const E = calculateTotalField(charges, [pos.x, pos.y, pos.z], ke, rMin, distributions)
    const eMag = E.length()
    if (eMag < epsilon) break

    const step = tmpVec.copy(E).normalize().multiplyScalar(stepSize * direction)
    pos.add(step)
    pts.push(pos.clone())

    if (sourcePos) {
      const d = new THREE.Vector3(...sourcePos).distanceTo(pos)
      if (d < rStop) break
    }

    if (pos.length() > maxDist) break

    let nearCharge = false
    for (const c of charges) {
      const d = new THREE.Vector3(...c.position).distanceTo(pos)
      if (d < rStop) { nearCharge = true; break }
    }
    if (nearCharge) break
  }

  return pts
}
