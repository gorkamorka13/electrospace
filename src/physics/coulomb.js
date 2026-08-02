import * as THREE from 'three'
import { makeLocalFrame, worldFromLocal, fibonacciSphere } from './utils'

export const KE_REAL = 8.9875517923e9
export const E_CHARGE = 1.602176634e-19

export function calculateFieldFromCharge(charge, targetPos, ke = KE_REAL, rMin = 0.05) {
  const q = charge.q
  const chargePos = new THREE.Vector3(...charge.position)
  const M = new THREE.Vector3(...targetPos)
  const rVec = new THREE.Vector3().subVectors(M, chargePos)
  let r = rVec.length()
  if (r < rMin) r = rMin
  const u = rVec.clone().normalize()
  return u.multiplyScalar((ke * q) / (r * r))
}

export function calculateTotalField(charges, targetPos, ke = KE_REAL, rMin = 0.05, distributions = []) {
  const totalField = new THREE.Vector3(0, 0, 0)
  charges.forEach(c => totalField.add(calculateFieldFromCharge(c, targetPos, ke, rMin)))
  distributions.forEach(d => totalField.add(calculateFieldFromDistribution(d, targetPos, ke, rMin)))
  return totalField
}

export function calculatePotentialFromCharge(charge, targetPos, ke = KE_REAL, rMin = 0.05) {
  const chargePos = new THREE.Vector3(...charge.position)
  const M = new THREE.Vector3(...targetPos)
  const rVec = new THREE.Vector3().subVectors(M, chargePos)
  let r = rVec.length()
  if (r < rMin) r = rMin
  return (ke * charge.q) / r
}

export function calculateTotalPotential(charges, targetPos, ke = KE_REAL, rMin = 0.05, distributions = []) {
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

/* ---------- Analytical finite line segment (along y-axis, centered at origin) ---------- */

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

/* ---------- General finite line segment in 3D (local frame) ---------- */

function segmentFieldLocal(E, start, end, lambda, target, ke, rMin) {
  // start, end, target are THREE.Vector3 in local frame
  // Segment direction and center
  const dir = new THREE.Vector3().subVectors(end, start)
  const len = dir.length()
  if (len < 1e-12) return E
  const half = len / 2
  const center = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5)
  const yAxis = dir.clone().normalize()
  // Build orthonormal basis: yAxis along segment, xAxis and zAxis perpendicular
  const up = Math.abs(yAxis.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0)
  const xAxis = new THREE.Vector3().crossVectors(up, yAxis).normalize()
  const zAxis = new THREE.Vector3().crossVectors(yAxis, xAxis).normalize()
  // Target in segment coordinates
  const rel = new THREE.Vector3().subVectors(target, center)
  const px = rel.dot(xAxis)
  const py = rel.dot(yAxis)
  const pz = rel.dot(zAxis)
  // Analytical field in segment coordinates (segment along y)
  const segE = lineFieldAnalytical(px, py, pz, half, lambda, ke, rMin)
  // Transform back to local frame
  E.addScaledVector(xAxis, segE.x)
  E.addScaledVector(yAxis, segE.y)
  E.addScaledVector(zAxis, segE.z)
  return E
}

function segmentPotentialLocal(start, end, lambda, target, ke, rMin) {
  const dir = new THREE.Vector3().subVectors(end, start)
  const len = dir.length()
  if (len < 1e-12) return 0
  const half = len / 2
  const center = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5)
  const yAxis = dir.clone().normalize()
  const up = Math.abs(yAxis.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0)
  const xAxis = new THREE.Vector3().crossVectors(up, yAxis).normalize()
  const zAxis = new THREE.Vector3().crossVectors(yAxis, xAxis).normalize()
  const rel = new THREE.Vector3().subVectors(target, center)
  const px = rel.dot(xAxis)
  const py = rel.dot(yAxis)
  const pz = rel.dot(zAxis)
  return linePotentialAnalytical(px, py, pz, half, lambda, ke, rMin)
}

export function calculateFieldFromLine(dist, targetPos, ke = KE_REAL, rMin = 0.05) {
  if (dist.mode === 'infinite') {
    // Infinite line along world Y axis: E = 2·ke·λ/ρ radial
    const x = targetPos[0]
    const z = targetPos[2]
    const rho = Math.max(Math.sqrt(x * x + z * z), rMin)
    const E = new THREE.Vector3()
    E.x = (2 * ke * dist.density * x) / (rho * rho)
    E.z = (2 * ke * dist.density * z) / (rho * rho)
    return E
  }
  return lineFieldAnalytical(targetPos[0], targetPos[1], targetPos[2], dist.length / 2, dist.density, ke, rMin)
}

export function calculatePotentialFromLine(dist, targetPos, ke = KE_REAL, rMin = 0.05) {
  if (dist.mode === 'infinite') {
    const x = targetPos[0]
    const z = targetPos[2]
    const rho = Math.max(Math.sqrt(x * x + z * z), rMin)
    return -2 * ke * dist.density * Math.log(rho)
  }
  return linePotentialAnalytical(targetPos[0], targetPos[1], targetPos[2], dist.length / 2, dist.density, ke, rMin)
}

/* ---------- Cylinder (finite) — rings along the axis ---------- */

function cylinderShellRanges(dist) {
  const { radius: b, innerRadius = 0, e_ext = 0, e_int = 0, hollow } = dist
  const a = innerRadius || 0
  if (hollow) return [{ mode: 'surface', r1: b, r2: b }]
  const shells = []
  if (e_ext > 0) shells.push({ mode: 'volume', r1: Math.max(b - e_ext, 1e-9), r2: b })
  if (a > 0 && e_int > 0) shells.push({ mode: 'volume', r1: Math.max(a - e_int, 1e-9), r2: a })
  if (e_ext === 0 && e_int === 0) {
    shells.push({ mode: 'volume', r1: a, r2: b })
  }
  return shells
}

function cylinderRingGrid(dist, rho, ax) {
  const R = dist.radius, H = dist.height
  const dAx = Math.abs(ax) - H / 2
  const dRad = rho - R
  const dOut = Math.sqrt(Math.max(0, dRad) * Math.max(0, dRad) + Math.max(0, dAx) * Math.max(0, dAx))
  let d = dOut
  if (dRad < 0 && dAx < 0) d = Math.min(-dRad, -dAx)
  let nz, nr
  if (d < 0.75) { nz = 16; nr = 8 }
  else if (d < 2.5) { nz = 12; nr = 6 }
  else if (d < 7) { nz = 8; nr = 4 }
  else { nz = 6; nr = 3 }
  if (dist.hollow) nr = 0
  return { nr, nz }
}

export function calculateFieldFromCylinder(dist, targetPos, ke = KE_REAL, rMin = 0.05) {
  const E = new THREE.Vector3()
  const { density, center, axis, height } = dist
  if (height < 1e-10 && dist.mode !== 'infinite') return E
  const H = height, H2 = H / 2
  const frame = makeLocalFrame(center, axis)
  const P = new THREE.Vector3(...targetPos)
  const local = new THREE.Vector3().copy(P).sub(frame.origin)
  const ax = local.dot(frame.z)
  const rho = Math.sqrt(Math.max(0, local.dot(frame.x) * local.dot(frame.x) + local.dot(frame.y) * local.dot(frame.y)))
  if (dist.mode === 'infinite') {
    // Infinite cylinder: Gauss 2D law. Radial field, magnitude from thickCylShell.
    const d = Math.max(rho, rMin)
    let Emag = 0
    const { radius: b, innerRadius = 0, e_ext = 0, e_int = 0, hollow } = dist
    if (hollow) {
      // Surface charge density (C/m²): linear density λ = σ·2πR
      const lambda = density * 2 * Math.PI * b
      if (d >= b) Emag = 2 * ke * lambda / d
    } else if (e_ext === 0 && e_int === 0) {
      Emag = thickCylShell(density, innerRadius || 0, b, d, ke)
    } else {
      if (e_ext > 0) Emag += thickCylShell(density, b - e_ext, b, d, ke)
      if (innerRadius > 0 && e_int > 0) Emag += thickCylShell(density, innerRadius - e_int, innerRadius, d, ke)
    }
    if (rho < 1e-12) return E
    const radial = new THREE.Vector3().addScaledVector(frame.x, local.dot(frame.x)).addScaledVector(frame.y, local.dot(frame.y))
    return radial.multiplyScalar(Emag / rho)
  }
  const { nr, nz } = cylinderRingGrid(dist, rho, ax)
  const dz = H / nz
  const ringNormal = frame.z
  const shells = cylinderShellRanges(dist)
  for (const shell of shells) {
    const nRad = shell.mode === 'surface' ? 1 : Math.max(nr, 1)
    const r1 = shell.r1, r2 = shell.r2
    const dr = shell.mode === 'surface' ? 0 : (r2 - r1) / nRad
    for (let iz = 0; iz < nz; iz++) {
      const z = (iz + 0.5) * dz - H2
      const ringCenter = new THREE.Vector3().copy(frame.origin).addScaledVector(frame.z, z)
      for (let ir = 0; ir < nRad; ir++) {
        const r = shell.mode === 'surface' ? r2 : r1 + (ir + 0.5) * dr
        const lambda = shell.mode === 'surface' ? density * dz : density * dr * dz
        const ring = { density: lambda, center: [ringCenter.x, ringCenter.y, ringCenter.z], normal: [ringNormal.x, ringNormal.y, ringNormal.z], radius: r }
        E.add(calculateFieldFromCircle(ring, targetPos, ke, rMin))
      }
    }
  }
  return E
}

export function calculatePotentialFromCylinder(dist, targetPos, ke = KE_REAL, rMin = 0.05) {
  const { density, center, axis, height } = dist
  if (height < 1e-10 && dist.mode !== 'infinite') return 0
  const H = height, H2 = H / 2
  const frame = makeLocalFrame(center, axis)
  const P = new THREE.Vector3(...targetPos)
  const local = new THREE.Vector3().copy(P).sub(frame.origin)
  const ax = local.dot(frame.z)
  const rho = Math.sqrt(Math.max(0, local.dot(frame.x) * local.dot(frame.x) + local.dot(frame.y) * local.dot(frame.y)))
  if (dist.mode === 'infinite') {
    const d = Math.max(rho, rMin)
    let V = 0
    const { radius: b, innerRadius = 0, e_ext = 0, e_int = 0, hollow } = dist
    if (hollow) {
      const lambda = density * 2 * Math.PI * b
      if (d >= b) V = -2 * ke * lambda * Math.log(d)
      else V = -2 * ke * lambda * Math.log(Math.max(b, rMin))
    } else if (e_ext === 0 && e_int === 0) {
      V = thickCylShellPotential(density, innerRadius || 0, b, d, ke, rMin)
    } else {
      if (e_ext > 0) V += thickCylShellPotential(density, b - e_ext, b, d, ke, rMin)
      if (innerRadius > 0 && e_int > 0) V += thickCylShellPotential(density, innerRadius - e_int, innerRadius, d, ke, rMin)
    }
    return V
  }
  const { nr, nz } = cylinderRingGrid(dist, rho, ax)
  const dz = H / nz
  const ringNormal = frame.z
  const shells = cylinderShellRanges(dist)
  let V = 0
  for (const shell of shells) {
    const nRad = shell.mode === 'surface' ? 1 : Math.max(nr, 1)
    const r1 = shell.r1, r2 = shell.r2
    const dr = shell.mode === 'surface' ? 0 : (r2 - r1) / nRad
    for (let iz = 0; iz < nz; iz++) {
      const z = (iz + 0.5) * dz - H2
      const ringCenter = new THREE.Vector3().copy(frame.origin).addScaledVector(frame.z, z)
      for (let ir = 0; ir < nRad; ir++) {
        const r = shell.mode === 'surface' ? r2 : r1 + (ir + 0.5) * dr
        const lambda = shell.mode === 'surface' ? density * dz : density * dr * dz
        const ring = { density: lambda, center: [ringCenter.x, ringCenter.y, ringCenter.z], normal: [ringNormal.x, ringNormal.y, ringNormal.z], radius: r }
        V += calculatePotentialFromCircle(ring, targetPos, ke, rMin)
      }
    }
  }
  return V
}

/* ---------- Plane (infinite) ---------- */

export function calculateFieldFromPlane(dist, targetPos, ke = KE_REAL, rMin = 0.05) {
  const { density: sigma, center, normal, width, height, mode } = dist
  const C = new THREE.Vector3(...center)
  const P = new THREE.Vector3(...targetPos)
  const n = new THREE.Vector3(...normal).normalize()
  const dz = new THREE.Vector3().subVectors(P, C).dot(n)
  if (mode === 'infinite') {
    // Infinite plane: E = σ/(2ε₀) = 2π·ke·σ constant along normal, sign flips across
    return n.clone().multiplyScalar(dz >= 0 ? 2 * Math.PI * ke * sigma : -2 * Math.PI * ke * sigma)
  }
  const dPerp = Math.sqrt(Math.max(0, new THREE.Vector3().subVectors(P, C).lengthSq() - dz * dz))
  if (dPerp < 1e-10) {
    const halfW = width / 2
    const halfH = height / 2
    const absZ = Math.abs(dz)
    const ez = 4 * ke * sigma * Math.atan(halfW * halfH / (absZ * Math.sqrt(halfW * halfW + halfH * halfH + dz * dz)))
    return n.clone().multiplyScalar(dz >= 0 ? ez : -ez)
  }
  const frame = makeLocalFrame(center, new THREE.Vector3(...normal))
  const E = new THREE.Vector3()
  const NR = 20, NS = 20
  const dw = width / NR, dh = height / NS
  for (let ir = 0; ir < NR; ir++) {
    const lx = (ir + 0.5) * dw - width / 2
    for (let is = 0; is < NS; is++) {
      const ly = (is + 0.5) * dh - height / 2
      const dq = sigma * dw * dh
      elE(E, dq, worldFromLocal(new THREE.Vector3(lx, ly, 0), frame), targetPos, ke, rMin)
    }
  }
  return E
}

export function calculatePotentialFromPlane(dist, targetPos, ke = KE_REAL, rMin = 0.05) {
  const { density: sigma, center, normal, width, height, mode } = dist
  if (mode === 'infinite') {
    const C = new THREE.Vector3(...center)
    const P = new THREE.Vector3(...targetPos)
    const n = new THREE.Vector3(...normal).normalize()
    const dz = new THREE.Vector3().subVectors(P, C).dot(n)
    return -2 * Math.PI * ke * sigma * Math.abs(dz)
  }
  const frame = makeLocalFrame(center, normal)
  let V = 0
  const NR = 20, NS = 20
  const dw = width / NR, dh = height / NS
  for (let ir = 0; ir < NR; ir++) {
    const lx = (ir + 0.5) * dw - width / 2
    for (let is = 0; is < NS; is++) {
      const ly = (is + 0.5) * dh - height / 2
      const dq = sigma * dw * dh
      V = elV(V, dq, worldFromLocal(new THREE.Vector3(lx, ly, 0), frame), targetPos, ke, rMin)
    }
  }
  return V
}

/* ---------- Disk ---------- */

export function calculateFieldFromDisk(dist, targetPos, ke = KE_REAL, rMin = 0.05) {
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

export function calculatePotentialFromDisk(dist, targetPos, ke = KE_REAL, rMin = 0.05) {
  const { density: sigma, center, normal, radius } = dist
  const C = new THREE.Vector3(...center)
  const P = new THREE.Vector3(...targetPos)
  const n = new THREE.Vector3(...normal).normalize()
  const z = new THREE.Vector3().subVectors(P, C).dot(n)
  const dPerp = Math.sqrt(Math.max(0, new THREE.Vector3().subVectors(P, C).lengthSq() - z * z))
  if (dPerp < 1e-10) {
    return 2 * Math.PI * ke * sigma * (Math.sqrt(z * z + radius * radius) - Math.abs(z))
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

/* ---------- Complete elliptic integrals (K(k), E(k)) using AGM ---------- */

function ellipticK(k) {
  // Complete elliptic integral of the first kind K(k) via AGM
  // Valid for 0 <= k < 1
  if (k < 1e-15) return Math.PI / 2
  if (k > 0.999999) return 8  // near-singular clamp
  let a = 1.0, b = Math.sqrt(1 - k * k), c = k
  while (c > 1e-15) {
    const an = (a + b) / 2
    const bn = Math.sqrt(a * b)
    const cn = (a - b) / 2
    a = an; b = bn; c = cn
  }
  return Math.PI / (2 * a)
}

function ellipticE(k) {
  // Complete elliptic integral of the second kind E(k) via AGM + series
  // Valid for 0 <= k < 1
  if (k < 1e-15) return Math.PI / 2
  if (k > 0.999999) return 1.0  // near-singular limit
  let a = 1.0, b = Math.sqrt(1 - k * k), c = k
  let s = 0.0
  let pow2 = 0.5
  while (c > 1e-15) {
    const an = (a + b) / 2
    const bn = Math.sqrt(a * b)
    const cn = (a - b) / 2
    s += pow2 * c * c
    pow2 *= 2
    a = an; b = bn; c = cn
  }
  return (Math.PI / 2) * (1 - s) / a
}

/* ---------- Circle (ring / circular line charge) — exact via elliptic integrals ---------- */

export function calculateFieldFromCircle(dist, targetPos, ke = KE_REAL, rMin = 0.05) {
  const { density: lambda, center, normal, radius } = dist
  const R = radius
  const Q = lambda * 2 * Math.PI * R // total charge

  // Build frame: z = normal (symmetry axis), xy plane = ring plane
  const frame = makeLocalFrame(center, new THREE.Vector3(...normal))

  // Express target position in local coordinates
  const P = new THREE.Vector3(...targetPos)
  const local = new THREE.Vector3().copy(P).sub(frame.origin)
  const z = local.dot(frame.z)          // axial distance (along symmetry axis)
  const rho = Math.sqrt(Math.max(0, local.dot(frame.x) * local.dot(frame.x) + local.dot(frame.y) * local.dot(frame.y)))  // radial distance from axis

  const E = new THREE.Vector3()

  // On-axis: analytical formula (rho ≈ 0)
  if (rho < 1e-12) {
    const denom = Math.sqrt(z * z + R * R)
    const Ex = ke * Q * z / (denom * denom * denom)
    return new THREE.Vector3(Ex * frame.z.x, Ex * frame.z.y, Ex * frame.z.z)
  }

  // Off-axis: exact formulas using elliptic integrals
  const sumR = R + rho
  const diffR = R - rho
  const A = sumR * sumR + z * z
  const B = diffR * diffR + z * z
  const k2 = 4 * R * rho / A
  if (k2 >= 1 - 1e-8 || k2 <= 0) {
    // Fallback: numerical integration for extreme cases / near the ring singularity
    const NC = 144
    const da = (2 * Math.PI) / NC
    for (let i = 0; i < NC; i++) {
      const a = (i + 0.5) * da
      const loc = new THREE.Vector3(R * Math.cos(a), R * Math.sin(a), 0)
      elE(E, lambda * R * da, worldFromLocal(loc, frame), targetPos, ke, rMin)
    }
    return E
  }

  const k = Math.sqrt(k2)
  const Kk = ellipticK(k)
  const Ek = ellipticE(k)
  const km2 = 1 - k2
  const Kp = (Ek - km2 * Kk) / (k * km2) // dK/dk
  const dkdRho = 2 * R * (R * R + z * z - rho * rho) / (k * A * A) // dk/dρ
  const sqrtA = Math.sqrt(A)

  // E_rho radial component (in the local ring plane)
  const Erho = -4 * ke * lambda * R * (Kp * dkdRho / sqrtA - Kk * sumR / (A * sqrtA))

  // E_z axial component (along the symmetry axis)
  const Ez = 4 * ke * lambda * R * z * Ek / (B * sqrtA)

  // Transform back to world coordinates
  const rhoSafe = rho > 1e-12 ? rho : 1
  E.addScaledVector(frame.x, Erho * (local.dot(frame.x) / rhoSafe))
  E.addScaledVector(frame.y, Erho * (local.dot(frame.y) / rhoSafe))
  E.addScaledVector(frame.z, Ez)

  return E
}

export function calculatePotentialFromCircle(dist, targetPos, ke = KE_REAL, rMin = 0.05) {
  const { density: lambda, center, normal, radius } = dist
  const R = radius
  const Q = lambda * 2 * Math.PI * R // total charge

  const frame = makeLocalFrame(center, new THREE.Vector3(...normal))
  const P = new THREE.Vector3(...targetPos)
  const local = new THREE.Vector3().copy(P).sub(frame.origin)
  const z = local.dot(frame.z)
  const rho = Math.sqrt(Math.max(0, local.dot(frame.x) * local.dot(frame.x) + local.dot(frame.y) * local.dot(frame.y)))

  // On-axis: analytical formula
  if (rho < 1e-12) {
    return ke * Q / Math.sqrt(z * z + R * R)
  }

  // Off-axis: exact formula using elliptic integral K(k)
  const sumR = R + rho
  const A = sumR * sumR + z * z
  const k2 = 4 * R * rho / A
  if (k2 >= 1 - 1e-8 || k2 <= 0) {
    // Fallback: numerical integration for extreme cases / near the ring singularity
    let V = 0
    const NC = 144
    const da = (2 * Math.PI) / NC
    for (let i = 0; i < NC; i++) {
      const a = (i + 0.5) * da
      const loc = new THREE.Vector3(R * Math.cos(a), R * Math.sin(a), 0)
      V = elV(V, lambda * R * da, worldFromLocal(loc, frame), targetPos, ke, rMin)
    }
    return V
  }

  const k = Math.sqrt(k2)
  const Kk = ellipticK(k)
  return ke * 4 * lambda * R / Math.sqrt(A) * Kk
}

/* ---------- Frame (rectangular wire loop) — exact analytical ---------- */

export function calculateFieldFromFrame(dist, targetPos, ke = KE_REAL, rMin = 0.05) {
  const { density: lambda, center, normal, width, height } = dist
  const E = new THREE.Vector3()
  const frame = makeLocalFrame(center, new THREE.Vector3(...normal))
  const P = new THREE.Vector3(...targetPos)
  const local = new THREE.Vector3().copy(P).sub(frame.origin)
  const localTarget = new THREE.Vector3(local.dot(frame.x), local.dot(frame.y), local.dot(frame.z))
  const hw = width / 2, hh = height / 2
  const corners = [
    new THREE.Vector3(-hw, -hh, 0),
    new THREE.Vector3( hw, -hh, 0),
    new THREE.Vector3( hw,  hh, 0),
    new THREE.Vector3(-hw,  hh, 0),
  ]
  // 4 sides as exact analytical segments
  for (let i = 0; i < 4; i++) {
    segmentFieldLocal(E, corners[i], corners[(i + 1) % 4], lambda, localTarget, ke, rMin)
  }
  // Transform from local frame to world
  return new THREE.Vector3(
    E.x * frame.x.x + E.y * frame.y.x + E.z * frame.z.x,
    E.x * frame.x.y + E.y * frame.y.y + E.z * frame.z.y,
    E.x * frame.x.z + E.y * frame.y.z + E.z * frame.z.z
  )
}

export function calculatePotentialFromFrame(dist, targetPos, ke = KE_REAL, rMin = 0.05) {
  const { density: lambda, center, normal, width, height } = dist
  const frame = makeLocalFrame(center, new THREE.Vector3(...normal))
  const P = new THREE.Vector3(...targetPos)
  const local = new THREE.Vector3().copy(P).sub(frame.origin)
  const localTarget = new THREE.Vector3(local.dot(frame.x), local.dot(frame.y), local.dot(frame.z))
  const hw = width / 2, hh = height / 2
  const corners = [
    new THREE.Vector3(-hw, -hh, 0),
    new THREE.Vector3( hw, -hh, 0),
    new THREE.Vector3( hw,  hh, 0),
    new THREE.Vector3(-hw,  hh, 0),
  ]
  let V = 0
  for (let i = 0; i < 4; i++) {
    V += segmentPotentialLocal(corners[i], corners[(i + 1) % 4], lambda, localTarget, ke, rMin)
  }
  return V
}

/* ---------- Box (parallelepiped, hollow / solid) ---------- */

export function calculateFieldFromBox(dist, targetPos, ke = KE_REAL, rMin = 0.05) {
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

export function calculatePotentialFromBox(dist, targetPos, ke = KE_REAL, rMin = 0.05) {
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
    + ke * Math.PI * rho * (outer * outer - d * d)
    - 2 * ke * Math.PI * rho * inner * inner * Math.log(Math.max(outer / Math.max(d, 1e-14), 1))
}

/* ---------- Sphere (hollow / solid / two-shell) ---------- */

export function calculateFieldFromSphere(dist, targetPos, ke = KE_REAL, rMin = 0.05) {
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

export function calculatePotentialFromSphere(dist, targetPos, ke = KE_REAL, rMin = 0.05) {
  const { density, center, radius, innerRadius = 0, hollow, e_ext = 0, e_int = 0 } = dist
  const C = new THREE.Vector3(...center)
  const P = new THREE.Vector3(...targetPos)
  const r = new THREE.Vector3().subVectors(P, C).length()
  if (hollow) {
    const Q = density * (4 * Math.PI * radius * radius)
    if (r < radius) return ke * Q / radius
    return ke * Q / Math.max(r, rMin)
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

export function calculateFieldFromDistribution(dist, targetPos, ke = KE_REAL, rMin = 0.05) {
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

export function calculatePotentialFromDistribution(dist, targetPos, ke = KE_REAL, rMin = 0.05) {
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
      const len = dist.mode === 'infinite' ? 6 : dist.length
      const half = len / 2
      const s = new THREE.Vector3(0, -half, 0)
      const dir = new THREE.Vector3(0, 1, 0)
      if (len < 1e-10) return seeds
      const segments = Math.max(Math.floor(N / 4), 2)
      const perRing = Math.max(Math.floor(N / segments), 4)
      const rSeed = 0.3
      for (let i = 0; i < segments; i++) {
        const t = (i + 0.5) / segments
        const base = new THREE.Vector3().copy(s).addScaledVector(dir, t * len)
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
      const height = dist.mode === 'infinite' ? 6 : dist.height
      const NA = Math.max(Math.floor(Math.sqrt(N * 2)), 6)
      const NH = Math.max(Math.floor(N / NA), 4)
      for (let ia = 0; ia < NA; ia++) {
        const a = (ia / NA) * Math.PI * 2
        for (let ih = 0; ih < NH; ih++) {
          const hloc = (ih / (NH - 1)) * height - height / 2
          const local = new THREE.Vector3(dist.radius * Math.cos(a), dist.radius * Math.sin(a), hloc)
          seeds.push({ point: worldFromLocal(local, frame), direction: sign })
        }
      }
      break
    }
    case 'plane': {
      const frame = makeLocalFrame(dist.center, new THREE.Vector3(...dist.normal))
      const infinite = dist.mode === 'infinite'
      const w = infinite ? 6 : dist.width
      const h = infinite ? 6 : dist.height
      // Halve seeds per side so total stays ~N
      const halfN = Math.max(Math.floor(N / 2), 4)
      const nx = Math.max(Math.floor(Math.sqrt(halfN * w / h)), 2)
      const nz = Math.max(Math.floor(halfN / nx), 2)
      const offset = 0.15 // small offset from surface
      for (let ix = 0; ix < nx; ix++) {
        const lx = (ix / (nx - 1)) * w - w / 2
        for (let iz = 0; iz < nz; iz++) {
          const lz = (iz / (nz - 1)) * h - h / 2
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
      // Halve seeds per side so total stays ~N
      const nSeeds = Math.max(Math.floor(N / 2), 6)
      for (let i = 0; i < nSeeds; i++) {
        const a = (i / nSeeds) * Math.PI * 2
        for (const sgn of [1, -1]) {
          const local = new THREE.Vector3(
            dist.radius * Math.cos(a),
            dist.radius * Math.sin(a),
            sgn * offset
          )
          seeds.push({ point: worldFromLocal(local, frame), direction: sign })
        }
      }
      // Lignes radiales dans le plan de l'anneau (de l'intérieur du fil vers le centre)
      const nInPlane = Math.max(Math.floor(nSeeds / 2), 3)
      const rIn = Math.max(dist.radius - offset, offset)
      for (let i = 0; i < nInPlane; i++) {
        const a = (i / nInPlane) * Math.PI * 2
        const local = new THREE.Vector3(rIn * Math.cos(a), rIn * Math.sin(a), 0)
        seeds.push({ point: worldFromLocal(local, frame), direction: sign })
      }
      // Lignes le long de l'axe de symétrie (±normal, à travers le centre)
      for (const d of [0.35, 0.9]) {
        seeds.push({ point: worldFromLocal(new THREE.Vector3(0, 0, d), frame), direction: sign })
        seeds.push({ point: worldFromLocal(new THREE.Vector3(0, 0, -d), frame), direction: sign })
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
      const perRing = 4
      for (let s = 0; s < 4; s++) {
        const c0 = corners[s], c1 = corners[(s + 1) % 4]
        const edge = new THREE.Vector3().subVectors(c1, c0)
        const dir = edge.clone().normalize()
        const up = Math.abs(dir.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0)
        const u = new THREE.Vector3().crossVectors(dir, up).normalize()
        const v = new THREE.Vector3().crossVectors(dir, u).normalize()
        for (let i = 0; i < nPerSide; i++) {
          const t = (i + 0.5) / nPerSide
          const base = new THREE.Vector3().lerpVectors(c0, c1, t)
          for (let j = 0; j < perRing; j++) {
            const a = (j / perRing) * Math.PI * 2
            const local = new THREE.Vector3().copy(base).addScaledVector(u, Math.cos(a) * offset).addScaledVector(v, Math.sin(a) * offset)
            seeds.push({ point: worldFromLocal(local, frame), direction: sign })
          }
        }
      }
      // Axe de symétrie (±normal) : lignes émergeant du centre le long de l'axe
      for (const d of [0.35, 0.9]) {
        seeds.push({ point: worldFromLocal(new THREE.Vector3(0, 0, d), frame), direction: sign })
        seeds.push({ point: worldFromLocal(new THREE.Vector3(0, 0, -d), frame), direction: sign })
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

export function calculateCoulombForce(chargeA, chargeB, ke = KE_REAL, rMin = 0.05) {
  const posA = new THREE.Vector3(...chargeA.position)
  const posB = new THREE.Vector3(...chargeB.position)
  const rVec = new THREE.Vector3().subVectors(posB, posA)
  let r = rVec.length()
  if (r < rMin) r = rMin
  return rVec.clone().normalize().multiplyScalar((ke * chargeA.q * chargeB.q) / (r * r))
}

export function calculateTotalForceOnCharge(targetCharge, allCharges, ke = KE_REAL, rMin = 0.05) {
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
