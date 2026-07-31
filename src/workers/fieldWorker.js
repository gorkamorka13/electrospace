// Minimal THREE.js polyfill for Web Worker (no DOM dependencies)
const THREE = {}
THREE.Vector3 = class Vector3 {
  constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z }
  set(x, y, z) { this.x = x; this.y = y; this.z = z; return this }
  clone() { return new Vector3(this.x, this.y, this.z) }
  copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this }
  add(v) { this.x += v.x; this.y += v.y; this.z += v.z; return this }
  sub(v) { this.x -= v.x; this.y -= v.y; this.z -= v.z; return this }
  addVectors(a, b) { this.x = a.x + b.x; this.y = a.y + b.y; this.z = a.z + b.z; return this }
  subVectors(a, b) { this.x = a.x - b.x; this.y = a.y - b.y; this.z = a.z - b.z; return this }
  multiplyScalar(s) { this.x *= s; this.y *= s; this.z *= s; return this }
  divideScalar(s) { const i = 1 / s; this.x *= i; this.y *= i; this.z *= i; return this }
  addScaledVector(v, s) { this.x += v.x * s; this.y += v.y * s; this.z += v.z * s; return this }
  dot(v) { return this.x * v.x + this.y * v.y + this.z * v.z }
  length() { return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z) }
  lengthSq() { return this.x * this.x + this.y * this.y + this.z * this.z }
  normalize() { const l = this.length(); if (l > 0) this.multiplyScalar(1 / l); return this }
  crossVectors(a, b) {
    this.x = a.y * b.z - a.z * b.y
    this.y = a.z * b.x - a.x * b.z
    this.z = a.x * b.y - a.y * b.x
    return this
  }
  lerpVectors(a, b, t) {
    this.x = a.x + (b.x - a.x) * t
    this.y = a.y + (b.y - a.y) * t
    this.z = a.z + (b.z - a.z) * t
    return this
  }
}
const Vector3 = THREE.Vector3
// Make Vector3 iterable so spread new Vector3(...v3) works like THREE.Vector3
if (typeof Symbol !== 'undefined' && Vector3) {
  Vector3.prototype[Symbol.iterator] = function* () { yield this.x; yield this.y; yield this.z }
}

THREE.Quaternion = class Quaternion {
  constructor(x = 0, y = 0, z = 0, w = 1) { this.x = x; this.y = y; this.z = z; this.w = w }
  setFromUnitVectors(a, b) {
    const r = a.dot(b) + 1
    if (r < 1e-12) {
      if (Math.abs(a.x) > Math.abs(a.z)) {
        this.set(-a.y, a.x, 0, 0)
      } else {
        this.set(0, -a.z, a.y, 0)
      }
    } else {
      this.set(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x, r)
    }
    return this.normalize()
  }
  normalize() {
    const l = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w)
    if (l > 0) { this.x /= l; this.y /= l; this.z /= l; this.w /= l }
    return this
  }
}

// ---- Utilities (from utils.js, vector3-free) ----

function makeLocalFrame(origin, normal) {
  const n = new Vector3(...normal).normalize()
  const up = Math.abs(n.y) > 0.9 ? new Vector3(1, 0, 0) : new Vector3(0, 1, 0)
  const x = new Vector3().crossVectors(up, n).normalize()
  const y = new Vector3().crossVectors(n, x).normalize()
  return { x, y, z: n, origin: new Vector3(...origin) }
}

function worldFromLocal(local, frame) {
  return new Vector3()
    .addScaledVector(frame.x, local.x)
    .addScaledVector(frame.y, local.y)
    .addScaledVector(frame.z, local.z)
    .add(frame.origin)
}

function fibonacciSphere(N, center, radius) {
  if (N < 2) return [new Vector3(center[0] + radius, center[1], center[2])]
  const pts = []
  const c = new Vector3(...center)
  const phi = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2
    const r = Math.sqrt(1 - y * y)
    const theta = phi * i
    pts.push(new Vector3(c.x + r * Math.cos(theta) * radius, c.y + y * radius, c.z + r * Math.sin(theta) * radius))
  }
  return pts
}

// ---- Constants ----
const KE_REAL = 8.9875517923e9
const E_CHARGE = 1.602176634e-19

// ---- Helper functions ----

function elE(E, dq, pos, targetPos, ke, rMin) {
  const rVec = new Vector3(...targetPos).sub(pos)
  let r = rVec.length()
  if (r < rMin) r = rMin
  E.add(rVec.clone().normalize().multiplyScalar((ke * dq) / (r * r)))
}

function elV(Vsum, dq, pos, targetPos, ke, rMin) {
  const rVec = new Vector3(...targetPos).sub(pos)
  let r = rVec.length()
  if (r < rMin) r = rMin
  return Vsum + (ke * dq) / r
}

// ---- Line analytical ----

function lineFieldAnalytical(px, py, pz, half, lambda, ke, rMin) {
  const E = new Vector3()
  const R2 = Math.max(px * px + pz * pz, 1e-20)
  const y1 = -half, y2 = half
  const u1 = py - y1, u2 = py - y2
  const clamp = (v) => Math.max(Math.abs(v), rMin) * (v >= 0 ? 1 : -1)
  const u1c = clamp(u1), u2c = clamp(u2)
  const s1 = Math.sqrt(R2 + u1c * u1c), s2 = Math.sqrt(R2 + u2c * u2c)
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
  const u1c = clamp(u1), u2c = clamp(u2)
  const s1 = Math.sqrt(R2 + u1c * u1c), s2 = Math.sqrt(R2 + u2c * u2c)
  return ke * lambda * Math.log((u1c + s1) / (u2c + s2))
}

// ---- Segment in local frame ----

function segmentFieldLocal(E, start, end, lambda, target, ke, rMin) {
  const dir = new Vector3().subVectors(end, start)
  const len = dir.length()
  if (len < 1e-12) return E
  const half = len / 2
  const center = new Vector3().addVectors(start, end).multiplyScalar(0.5)
  const yAxis = dir.clone().normalize()
  const up = Math.abs(yAxis.y) > 0.9 ? new Vector3(1, 0, 0) : new Vector3(0, 1, 0)
  const xAxis = new Vector3().crossVectors(up, yAxis).normalize()
  const zAxis = new Vector3().crossVectors(yAxis, xAxis).normalize()
  const rel = new Vector3().subVectors(target, center)
  const px = rel.dot(xAxis), py = rel.dot(yAxis), pz = rel.dot(zAxis)
  const segE = lineFieldAnalytical(px, py, pz, half, lambda, ke, rMin)
  E.addScaledVector(xAxis, segE.x)
  E.addScaledVector(yAxis, segE.y)
  E.addScaledVector(zAxis, segE.z)
  return E
}

function segmentPotentialLocal(start, end, lambda, target, ke, rMin) {
  const dir = new Vector3().subVectors(end, start)
  const len = dir.length()
  if (len < 1e-12) return 0
  const half = len / 2
  const center = new Vector3().addVectors(start, end).multiplyScalar(0.5)
  const yAxis = dir.clone().normalize()
  const up = Math.abs(yAxis.y) > 0.9 ? new Vector3(1, 0, 0) : new Vector3(0, 1, 0)
  const xAxis = new Vector3().crossVectors(up, yAxis).normalize()
  const zAxis = new Vector3().crossVectors(yAxis, xAxis).normalize()
  const rel = new Vector3().subVectors(target, center)
  const px = rel.dot(xAxis), py = rel.dot(yAxis), pz = rel.dot(zAxis)
  return linePotentialAnalytical(px, py, pz, half, lambda, ke, rMin)
}

// ---- Distribution types ----

function calculateFieldFromLine(dist, targetPos, ke, rMin) {
  return lineFieldAnalytical(targetPos[0], targetPos[1], targetPos[2], dist.length / 2, dist.density, ke, rMin)
}

function calculatePotentialFromLine(dist, targetPos, ke, rMin) {
  return linePotentialAnalytical(targetPos[0], targetPos[1], targetPos[2], dist.length / 2, dist.density, ke, rMin)
}

function calculateFieldFromCylinder(dist, targetPos, ke, rMin) {
  const E = new Vector3()
  const { density, center, axis, radius, hollow, innerRadius = 0, e_ext = 0, e_int = 0 } = dist
  const P = new Vector3(...targetPos)
  const frame = makeLocalFrame(center, axis)
  const local = new Vector3().copy(P).sub(frame.origin)
  const px = local.dot(frame.x), py = local.dot(frame.y)
  const d = Math.sqrt(px * px + py * py)
  if (d < 1e-14) return E
  if (hollow) {
    const lambda = density * (2 * Math.PI * radius)
    if (d < radius) return E
    const dClamped = Math.max(d, rMin)
    const factor = 2 * ke * lambda / (dClamped * dClamped)
    return E.addScaledVector(frame.x, factor * px).addScaledVector(frame.y, factor * py)
  }
  const a = innerRadius || 0, b = radius
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

function calculatePotentialFromCylinder(dist, targetPos, ke, rMin) {
  const { density, center, axis, radius, hollow, innerRadius = 0, e_ext = 0, e_int = 0 } = dist
  const P = new Vector3(...targetPos)
  const frame = makeLocalFrame(center, axis)
  const local = new Vector3().copy(P).sub(frame.origin)
  const px = local.dot(frame.x), py = local.dot(frame.y)
  const d = Math.sqrt(px * px + py * py)
  const dClamped = Math.max(d, rMin)
  if (hollow) {
    const lambda = density * (2 * Math.PI * radius)
    if (d < radius) return -2 * ke * lambda * Math.log(Math.max(radius, rMin))
    return -2 * ke * lambda * Math.log(dClamped)
  }
  const a = innerRadius || 0, b = radius
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
        + ke * Math.PI * density * (b * b - d * d)
        - 2 * ke * Math.PI * density * a * a * Math.log(Math.max(b / Math.max(d, 1e-14), 1))
    }
    const lambda = density * Math.PI * b * b
    if (d < b) return ke * Math.PI * density * (b * b - d * d) - 2 * ke * lambda * Math.log(Math.max(b, rMin))
    return -2 * ke * lambda * Math.log(dClamped)
  }
  let V = 0
  if (e_ext > 0) V += thickCylShellPotential(density, radius - e_ext, radius, d, ke, rMin)
  if (innerRadius > 0 && e_int > 0) V += thickCylShellPotential(density, innerRadius - e_int, innerRadius, d, ke, rMin)
  return V
}

function calculateFieldFromPlane(dist, targetPos, ke, rMin) {
  const { density: sigma, center, normal, width, height } = dist
  const C = new Vector3(...center)
  const P = new Vector3(...targetPos)
  const n = new Vector3(...normal).normalize()
  const dz = new Vector3().subVectors(P, C).dot(n)
  const dPerp = Math.sqrt(Math.max(0, new Vector3().subVectors(P, C).lengthSq() - dz * dz))
  if (dPerp < 1e-10) {
    const halfW = width / 2, halfH = height / 2
    const absZ = Math.abs(dz)
    const ez = 4 * ke * sigma * Math.atan(halfW * halfH / (absZ * Math.sqrt(halfW * halfW + halfH * halfH + dz * dz)))
    return n.clone().multiplyScalar(dz >= 0 ? ez : -ez)
  }
  const frame = makeLocalFrame(center, new Vector3(...normal))
  const E = new Vector3()
  const NR = 20, NS = 20
  const dw = width / NR, dh = height / NS
  for (let ir = 0; ir < NR; ir++) {
    const lx = (ir + 0.5) * dw - width / 2
    for (let is = 0; is < NS; is++) {
      const ly = (is + 0.5) * dh - height / 2
      elE(E, sigma * dw * dh, worldFromLocal(new Vector3(lx, ly, 0), frame), targetPos, ke, rMin)
    }
  }
  return E
}

function calculatePotentialFromPlane(dist, targetPos, ke, rMin) {
  const { density: sigma, center, normal, width, height } = dist
  const frame = makeLocalFrame(center, normal)
  let V = 0
  const NR = 20, NS = 20
  const dw = width / NR, dh = height / NS
  for (let ir = 0; ir < NR; ir++) {
    const lx = (ir + 0.5) * dw - width / 2
    for (let is = 0; is < NS; is++) {
      const ly = (is + 0.5) * dh - height / 2
      V = elV(V, sigma * dw * dh, worldFromLocal(new Vector3(lx, ly, 0), frame), targetPos, ke, rMin)
    }
  }
  return V
}

function calculateFieldFromDisk(dist, targetPos, ke, rMin) {
  const { density: sigma, center, normal, radius } = dist
  const C = new Vector3(...center)
  const P = new Vector3(...targetPos)
  const n = new Vector3(...normal).normalize()
  const z = new Vector3().subVectors(P, C).dot(n)
  const dPerp = Math.sqrt(Math.max(0, new Vector3().subVectors(P, C).lengthSq() - z * z))
  if (dPerp < 1e-10) {
    const signZ = z >= 0 ? 1 : -1
    const ez = 2 * Math.PI * ke * sigma * (signZ - z / Math.sqrt(z * z + radius * radius))
    return n.clone().multiplyScalar(ez)
  }
  const E = new Vector3()
  const frame = makeLocalFrame(center, new Vector3(...normal))
  const NR = 20, NA = 36
  const dr = radius / NR, da = (2 * Math.PI) / NA
  for (let ir = 0; ir < NR; ir++) {
    const r = (ir + 0.5) * dr
    for (let ia = 0; ia < NA; ia++) {
      const a = (ia + 0.5) * da
      elE(E, sigma * r * dr * da, worldFromLocal(new Vector3(r * Math.cos(a), r * Math.sin(a), 0), frame), targetPos, ke, rMin)
    }
  }
  return E
}

function calculatePotentialFromDisk(dist, targetPos, ke, rMin) {
  const { density: sigma, center, normal, radius } = dist
  const C = new Vector3(...center)
  const P = new Vector3(...targetPos)
  const n = new Vector3(...normal).normalize()
  const z = new Vector3().subVectors(P, C).dot(n)
  const dPerp = Math.sqrt(Math.max(0, new Vector3().subVectors(P, C).lengthSq() - z * z))
  if (dPerp < 1e-10) {
    return 2 * Math.PI * ke * sigma * (Math.sqrt(z * z + radius * radius) - Math.abs(z))
  }
  let V = 0
  const frame = makeLocalFrame(center, new Vector3(...normal))
  const NR = 20, NA = 36
  const dr = radius / NR, da = (2 * Math.PI) / NA
  for (let ir = 0; ir < NR; ir++) {
    const r = (ir + 0.5) * dr
    for (let ia = 0; ia < NA; ia++) {
      const a = (ia + 0.5) * da
      V = elV(V, sigma * r * dr * da, worldFromLocal(new Vector3(r * Math.cos(a), r * Math.sin(a), 0), frame), targetPos, ke, rMin)
    }
  }
  return V
}

// ---- Elliptic integrals ----

function ellipticK(k) {
  if (k < 1e-15) return Math.PI / 2
  if (k > 0.999999) return 8
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
  if (k < 1e-15) return Math.PI / 2
  if (k > 0.999999) return 1.0
  let a = 1.0, b = Math.sqrt(1 - k * k), c = k
  let s = 0.0, pow2 = 0.5
  while (c > 1e-15) {
    const an = (a + b) / 2, bn = Math.sqrt(a * b), cn = (a - b) / 2
    s += pow2 * c * c
    pow2 *= 2
    a = an; b = bn; c = cn
  }
  return (Math.PI / 2) * (1 - s) / a
}

// ---- Circle / Ring ----

function calculateFieldFromCircle(dist, targetPos, ke, rMin) {
  const { density: lambda, center, normal, radius: R } = dist
  const Q = lambda * 2 * Math.PI * R
  const frame = makeLocalFrame(center, new Vector3(...normal))
  const P = new Vector3(...targetPos)
  const local = new Vector3().copy(P).sub(frame.origin)
  const z = local.dot(frame.z)
  const rho = Math.sqrt(Math.max(0, local.dot(frame.x) * local.dot(frame.x) + local.dot(frame.y) * local.dot(frame.y)))
  const E = new Vector3()
  if (rho < 1e-12) {
    const denom = Math.sqrt(z * z + R * R)
    const Ex = ke * Q * z / (denom * denom * denom)
    return new Vector3(Ex * frame.z.x, Ex * frame.z.y, Ex * frame.z.z)
  }
  const sumR = R + rho, diffR = R - rho
  const A = sumR * sumR + z * z
  const B = diffR * diffR + z * z
  const k2 = 4 * R * rho / A
  if (k2 >= 1 - 1e-8 || k2 <= 0) {
    const NC = 144
    const da = (2 * Math.PI) / NC
    for (let i = 0; i < NC; i++) {
      const a = (i + 0.5) * da
      elE(E, lambda * R * da, worldFromLocal(new Vector3(R * Math.cos(a), R * Math.sin(a), 0), frame), targetPos, ke, rMin)
    }
    return E
  }
  const k = Math.sqrt(k2)
  const Kk = ellipticK(k), Ek = ellipticE(k)
  const km2 = 1 - k2
  const Kp = (Ek - km2 * Kk) / (k * km2)
  const dkdRho = 2 * R * (R * R + z * z - rho * rho) / (k * A * A)
  const sqrtA = Math.sqrt(A)
  const Erho = -4 * ke * lambda * R * (Kp * dkdRho / sqrtA - Kk * sumR / (A * sqrtA))
  const Ez = 4 * ke * lambda * R * z * Ek / (B * sqrtA)
  const rhoSafe = rho > 1e-12 ? rho : 1
  E.addScaledVector(frame.x, Erho * (local.dot(frame.x) / rhoSafe))
  E.addScaledVector(frame.y, Erho * (local.dot(frame.y) / rhoSafe))
  E.addScaledVector(frame.z, Ez)
  return E
}

function calculatePotentialFromCircle(dist, targetPos, ke, rMin) {
  const { density: lambda, center, normal, radius: R } = dist
  const Q = lambda * 2 * Math.PI * R
  const frame = makeLocalFrame(center, new Vector3(...normal))
  const P = new Vector3(...targetPos)
  const local = new Vector3().copy(P).sub(frame.origin)
  const z = local.dot(frame.z)
  const rho = Math.sqrt(Math.max(0, local.dot(frame.x) * local.dot(frame.x) + local.dot(frame.y) * local.dot(frame.y)))
  if (rho < 1e-12) return ke * Q / Math.sqrt(z * z + R * R)
  const sumR = R + rho
  const A = sumR * sumR + z * z
  const k2 = 4 * R * rho / A
  if (k2 >= 1 - 1e-8 || k2 <= 0) {
    let V = 0
    const NC = 144
    const da = (2 * Math.PI) / NC
    for (let i = 0; i < NC; i++) {
      const a = (i + 0.5) * da
      V = elV(V, lambda * R * da, worldFromLocal(new Vector3(R * Math.cos(a), R * Math.sin(a), 0), frame), targetPos, ke, rMin)
    }
    return V
  }
  const k = Math.sqrt(k2)
  const Kk = ellipticK(k)
  return ke * 4 * lambda / Math.sqrt(A) * Kk
}

// ---- Frame ----

function calculateFieldFromFrame(dist, targetPos, ke, rMin) {
  const { density: lambda, center, normal, width, height } = dist
  const E = new Vector3()
  const frame = makeLocalFrame(center, new Vector3(...normal))
  const P = new Vector3(...targetPos)
  const local = new Vector3().copy(P).sub(frame.origin)
  const localTarget = new Vector3(local.dot(frame.x), local.dot(frame.y), local.dot(frame.z))
  const hw = width / 2, hh = height / 2
  const corners = [
    new Vector3(-hw, -hh, 0), new Vector3(hw, -hh, 0),
    new Vector3(hw, hh, 0), new Vector3(-hw, hh, 0),
  ]
  for (let i = 0; i < 4; i++) segmentFieldLocal(E, corners[i], corners[(i + 1) % 4], lambda, localTarget, ke, rMin)
  return new Vector3(
    E.x * frame.x.x + E.y * frame.y.x + E.z * frame.z.x,
    E.x * frame.x.y + E.y * frame.y.y + E.z * frame.z.y,
    E.x * frame.x.z + E.y * frame.y.z + E.z * frame.z.z,
  )
}

function calculatePotentialFromFrame(dist, targetPos, ke, rMin) {
  const { density: lambda, center, normal, width, height } = dist
  const frame = makeLocalFrame(center, new Vector3(...normal))
  const P = new Vector3(...targetPos)
  const local = new Vector3().copy(P).sub(frame.origin)
  const localTarget = new Vector3(local.dot(frame.x), local.dot(frame.y), local.dot(frame.z))
  const hw = width / 2, hh = height / 2
  const corners = [
    new Vector3(-hw, -hh, 0), new Vector3(hw, -hh, 0),
    new Vector3(hw, hh, 0), new Vector3(-hw, hh, 0),
  ]
  let V = 0
  for (let i = 0; i < 4; i++) V += segmentPotentialLocal(corners[i], corners[(i + 1) % 4], lambda, localTarget, ke, rMin)
  return V
}

// ---- Box ----

function calculateFieldFromBox(dist, targetPos, ke, rMin) {
  const E = new Vector3()
  const { density, center, normal, width, height: h, depth, hollow } = dist
  const frame = makeLocalFrame(center, new Vector3(...normal))
  const w2 = width / 2, h2 = h / 2, d2 = depth / 2
  const P = new Vector3(...targetPos)
  const local = new Vector3().copy(P).sub(frame.origin)
  const px = local.dot(frame.x), py = local.dot(frame.y), pz = local.dot(frame.z)
  const rx = Math.abs(px) / w2, ry = Math.abs(py) / h2, rz = Math.abs(pz) / d2
  const alpha = Math.max(rx, ry, rz)
  const isInside = alpha < 0.999
  if (isInside) {
    if (hollow) return E
    if (alpha < 1e-6) return E
    const P_bound = new Vector3(px / alpha, py / alpha, pz / alpha)
    const P_bound_world = worldFromLocal(P_bound, frame)
    const E_bound = calculateFieldFromBox(dist, [P_bound_world.x, P_bound_world.y, P_bound_world.z], ke, rMin)
    return E_bound.multiplyScalar(alpha)
  }
  const N = 24
  if (hollow) {
    const sigma = density
    const faceDefs = [
      { u: width, v: h, local: (pu, pv) => new Vector3(pu, pv, -d2) },
      { u: width, v: h, local: (pu, pv) => new Vector3(pu, pv, d2) },
      { u: depth, v: h, local: (pu, pv) => new Vector3(-w2, pv, pu) },
      { u: depth, v: h, local: (pu, pv) => new Vector3(w2, pv, pu) },
      { u: width, v: depth, local: (pu, pv) => new Vector3(pu, -h2, pv) },
      { u: width, v: depth, local: (pu, pv) => new Vector3(pu, h2, pv) },
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
          elE(E, rho * dx * dy * dz, worldFromLocal(new Vector3(lx, ly, lz), frame), targetPos, ke, rMin)
        }
      }
    }
  }
  return E
}

function calculatePotentialFromBox(dist, targetPos, ke, rMin) {
  const { density, center, normal, width, height: h, depth, hollow } = dist
  const frame = makeLocalFrame(center, new Vector3(...normal))
  const w2 = width / 2, h2 = h / 2, d2 = depth / 2
  const P = new Vector3(...targetPos)
  const local = new Vector3().copy(P).sub(frame.origin)
  const px = local.dot(frame.x), py = local.dot(frame.y), pz = local.dot(frame.z)
  const rx = Math.abs(px) / w2, ry = Math.abs(py) / h2, rz = Math.abs(pz) / d2
  const alpha = Math.max(rx, ry, rz)
  const isInside = alpha < 0.999
  const isCenter = alpha < 1e-5
  if (isInside && !isCenter) {
    const V_center = calculatePotentialFromBox(dist, center, ke, rMin)
    if (hollow) return V_center
    const P_bound = new Vector3(px / alpha, py / alpha, pz / alpha)
    const P_bound_world = worldFromLocal(P_bound, frame)
    const V_bound = calculatePotentialFromBox(dist, [P_bound_world.x, P_bound_world.y, P_bound_world.z], ke, rMin)
    return V_center + (V_bound - V_center) * alpha * alpha
  }
  let V = 0
  const N = 8
  if (hollow) {
    const sigma = density
    const faceDefs = [
      { u: width, v: h, local: (pu, pv) => new Vector3(pu, pv, -d2) },
      { u: width, v: h, local: (pu, pv) => new Vector3(pu, pv, d2) },
      { u: depth, v: h, local: (pu, pv) => new Vector3(-w2, pv, pu) },
      { u: depth, v: h, local: (pu, pv) => new Vector3(w2, pv, pu) },
      { u: width, v: depth, local: (pu, pv) => new Vector3(pu, -h2, pv) },
      { u: width, v: depth, local: (pu, pv) => new Vector3(pu, h2, pv) },
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
          V = elV(V, rho * dx * dy * dz, worldFromLocal(new Vector3(lx, ly, lz), frame), targetPos, ke, rMin)
        }
      }
    }
  }
  return V
}

// ---- Shell helpers ----

function thickSphereShell(rho, inner, outer, r, ke) {
  if (outer <= inner || rho === 0) return 0
  if (r >= outer) { const Q = rho * (4 / 3 * Math.PI * (outer * outer * outer - inner * inner * inner)); return ke * Q / (r * r) }
  if (r <= inner) return 0
  const Qenc = rho * (4 / 3 * Math.PI * (r * r * r - inner * inner * inner)); return ke * Qenc / (r * r)
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
  const lambdaEnc = rho * Math.PI * (d * d - inner * inner); return 2 * ke * lambdaEnc / d
}

function thickCylShellPotential(rho, inner, outer, d, ke, rMin) {
  if (outer <= inner || rho === 0) return 0
  const lambdaTotal = rho * Math.PI * (outer * outer - inner * inner)
  const dClamped = Math.max(d, rMin)
  if (d >= outer) return -2 * ke * lambdaTotal * Math.log(dClamped)
  if (d <= inner) return -2 * ke * lambdaTotal * Math.log(Math.max(outer, rMin)) + ke * Math.PI * rho * (outer * outer - inner * inner) - 2 * ke * Math.PI * rho * inner * inner * Math.log(Math.max(outer / Math.max(inner, 1e-14), 1))
  return -2 * ke * lambdaTotal * Math.log(Math.max(outer, rMin)) + ke * Math.PI * rho * (outer * outer - d * d) - 2 * ke * Math.PI * rho * inner * inner * Math.log(Math.max(outer / Math.max(d, 1e-14), 1))
}

// ---- Sphere ----

function calculateFieldFromSphere(dist, targetPos, ke, rMin) {
  const { density, center, radius, innerRadius = 0, hollow, e_ext = 0, e_int = 0 } = dist
  const C = new Vector3(...center)
  const P = new Vector3(...targetPos)
  const rVec = new Vector3().subVectors(P, C)
  const r = Math.max(rVec.length(), rMin)
  const E = new Vector3()
  if (hollow) {
    const Q = density * (4 * Math.PI * radius * radius)
    if (r < radius) return E
    return E.copy(rVec).multiplyScalar(ke * Q / (r * r * r))
  }
  const a = innerRadius, b = radius
  if (e_ext === 0 && e_int === 0) {
    if (r >= b) { const Q = density * (4 / 3 * Math.PI * (b * b * b - a * a * a)); return E.copy(rVec).multiplyScalar(ke * Q / (r * r * r)) }
    if (r <= a) return E
    const Qenc = density * (4 / 3 * Math.PI * (r * r * r - a * a * a)); return E.copy(rVec).multiplyScalar(ke * Qenc / (r * r * r))
  }
  let Emag = 0
  if (e_ext > 0) Emag += thickSphereShell(density, radius - e_ext, radius, r, ke)
  if (innerRadius > 0 && e_int > 0) Emag += thickSphereShell(density, innerRadius - e_int, innerRadius, r, ke)
  return E.copy(rVec).multiplyScalar(Emag / Math.max(r, 1e-14))
}

function calculatePotentialFromSphere(dist, targetPos, ke, rMin) {
  const { density, center, radius, innerRadius = 0, hollow, e_ext = 0, e_int = 0 } = dist
  const C = new Vector3(...center)
  const P = new Vector3(...targetPos)
  const r = new Vector3().subVectors(P, C).length()
  if (hollow) {
    const Q = density * (4 * Math.PI * radius * radius)
    if (r < radius) return ke * Q / radius
    return ke * Q / Math.max(r, rMin)
  }
  const a = innerRadius, b = radius
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

// ---- Dispatchers ----

function calculateFieldFromDistribution(dist, targetPos, ke, rMin) {
  switch (dist.type) {
    case 'line': return calculateFieldFromLine(dist, targetPos, ke, rMin)
    case 'cylinder': return calculateFieldFromCylinder(dist, targetPos, ke, rMin)
    case 'plane': return calculateFieldFromPlane(dist, targetPos, ke, rMin)
    case 'disk': return calculateFieldFromDisk(dist, targetPos, ke, rMin)
    case 'circle': return calculateFieldFromCircle(dist, targetPos, ke, rMin)
    case 'frame': return calculateFieldFromFrame(dist, targetPos, ke, rMin)
    case 'sphere': return calculateFieldFromSphere(dist, targetPos, ke, rMin)
    case 'box': return calculateFieldFromBox(dist, targetPos, ke, rMin)
    default: return new Vector3()
  }
}

function calculatePotentialFromDistribution(dist, targetPos, ke, rMin) {
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

function calculateFieldFromCharge(charge, targetPos, ke, rMin) {
  const chargePos = new Vector3(...charge.position)
  const M = new Vector3(...targetPos)
  const rVec = new Vector3().subVectors(M, chargePos)
  let r = rVec.length()
  if (r < rMin) r = rMin
  return rVec.clone().normalize().multiplyScalar((ke * charge.q) / (r * r))
}

function calculatePotentialFromCharge(charge, targetPos, ke, rMin) {
  const chargePos = new Vector3(...charge.position)
  const M = new Vector3(...targetPos)
  const rVec = new Vector3().subVectors(M, chargePos)
  let r = rVec.length()
  if (r < rMin) r = rMin
  return (ke * charge.q) / r
}

function calculateTotalField(charges, targetPos, ke, rMin, distributions) {
  const totalField = new Vector3(0, 0, 0)
  charges.forEach(c => totalField.add(calculateFieldFromCharge(c, targetPos, ke, rMin)))
  distributions.forEach(d => totalField.add(calculateFieldFromDistribution(d, targetPos, ke, rMin)))
  return totalField
}

function calculateTotalPotential(charges, targetPos, ke, rMin, distributions) {
  let V = 0
  charges.forEach(c => V += calculatePotentialFromCharge(c, targetPos, ke, rMin))
  distributions.forEach(d => V += calculatePotentialFromDistribution(d, targetPos, ke, rMin))
  return V
}

function calculateCoulombForce(chargeA, chargeB, ke, rMin) {
  const posA = new Vector3(...chargeA.position)
  const posB = new Vector3(...chargeB.position)
  const rVec = new Vector3().subVectors(posB, posA)
  let r = rVec.length()
  if (r < rMin) r = rMin
  return rVec.clone().normalize().multiplyScalar((ke * chargeA.q * chargeB.q) / (r * r))
}

function calculateTotalForceOnCharge(targetCharge, allCharges, ke, rMin) {
  const resultant = new Vector3()
  const contributions = []
  allCharges.forEach(s => {
    if (s.id === targetCharge.id) return
    const force = calculateCoulombForce(s, targetCharge, ke, rMin)
    resultant.add(force)
    contributions.push({ fromId: s.id, force: [force.x, force.y, force.z] })
  })
  return { resultant: [resultant.x, resultant.y, resultant.z], contributions }
}

// ---- Field line tracing ----

/**
 * Évalue le champ électrique normalisé en un point, dans la direction de tracé.
 * Retourne null si le champ est trop faible (|E| < epsilon).
 * @param {Vector3} pos - Position d'évaluation
 * @param {Array} charges - Charges ponctuelles
 * @param {Object} opts - Options { ke, rMin, distributions, epsilon, direction }
 * @returns {Vector3|null} Vecteur unitaire directionnel, ou null si champ nul
 */
function fieldDirectionAt(pos, charges, opts) {
  const { ke, rMin, distributions, epsilon, direction } = opts
  const E = calculateTotalField(charges, [pos.x, pos.y, pos.z], ke, rMin, distributions)
  if (E.length() < epsilon) return null
  return E.clone().normalize().multiplyScalar(direction)
}

/**
 * Trace une ligne de champ avec la méthode d'Euler explicite (ordre 1).
 *
 * Principe : x_{n+1} = x_n + h · Ê(x_n)
 * où Ê est le champ électrique normalisé.
 * Simple mais peut diverger dans les zones de fort gradient.
 *
 * @param {number[]} startPos - Position de départ [x, y, z]
 * @param {Array} charges - Liste des charges ponctuelles
 * @param {Object} opts - Options de tracé
 * @param {number} opts.ke - Constante de Coulomb
 * @param {number} opts.rMin - Rayon minimum pour éviter les singularités
 * @param {number} opts.rStop - Rayon d'arrêt autour de la source
 * @param {number} opts.maxDist - Distance maximale depuis l'origine
 * @param {number} opts.maxSteps - Nombre maximum de pas
 * @param {number} opts.stepSize - Taille du pas
 * @param {number} opts.direction - Sens de tracé (1 ou -1)
 * @param {number} opts.epsilon - Seuil de champ minimum
 * @param {number[]} [opts.sourcePos] - Position de la charge source pour arrêt
 * @param {Array} opts.distributions - Distributions continues
 * @returns {number[][]} Tableau de points [x, y, z] formant la ligne
 */
function traceFieldLineEuler(startPos, charges, opts) {
  const { ke = KE_REAL, rMin = 0.05, rStop = 0.6, maxDist = 25, maxSteps = 1500, stepSize = 0.08, direction = 1, epsilon = 1e-25, sourcePos, distributions = [] } = opts
  const pts = [new Vector3(...startPos)]
  const pos = new Vector3(...startPos)
  const fieldOpts = { ke, rMin, distributions, epsilon, direction }
  for (let i = 0; i < maxSteps; i++) {
    const dir = fieldDirectionAt(pos, charges, fieldOpts)
    if (!dir) break
    const prev = pos.clone()
    pos.addScaledVector(dir, stepSize)
    if (pos.length() > maxDist) break
    // Stop if too close to a source charge
    if (sourcePos && new Vector3().subVectors(pos, new Vector3(...sourcePos)).length() < rStop) break
    // Détection de stagnation (point nul E=0)
    if (new Vector3().subVectors(pos, prev).length() < stepSize * 1e-4) break
    pts.push(pos.clone())
  }
  return pts.map(p => [p.x, p.y, p.z])
}

/**
 * Trace une ligne de champ avec la méthode de Runge-Kutta 4 (RK4, ordre 4).
 *
 * Principe : pour chaque pas, on évalue le champ normalisé en 4 points :
 *   k1 = Ê(x_n)
 *   k2 = Ê(x_n + h/2·k1)
 *   k3 = Ê(x_n + h/2·k2)
 *   k4 = Ê(x_n + h·k3)
 *   x_{n+1} = x_n + h/6·(k1 + 2·k2 + 2·k3 + k4)
 *
 * RK4 est nettement plus précis qu'Euler à pas égal, permettant
 * des lignes plus lisses avec moins d'erreur de dérive.
 *
 * @param {number[]} startPos - Position de départ [x, y, z]
 * @param {Array} charges - Liste des charges ponctuelles
 * @param {Object} opts - Options (voir traceFieldLineEuler)
 * @returns {number[][]} Tableau de points [x, y, z] formant la ligne
 */
function traceFieldLineRK4(startPos, charges, opts) {
  const { ke = KE_REAL, rMin = 0.05, rStop = 0.6, maxDist = 25, maxSteps = 800, stepSize = 0.15, direction = 1, epsilon = 1e-25, sourcePos, distributions = [] } = opts
  const pts = [new Vector3(...startPos)]
  const pos = new Vector3(...startPos)
  const fieldOpts = { ke, rMin, distributions, epsilon, direction }
  const h = stepSize
  const h2 = h / 2
  const h6 = h / 6

  for (let i = 0; i < maxSteps; i++) {
    // k1 = Ê(x_n)
    const k1 = fieldDirectionAt(pos, charges, fieldOpts)
    if (!k1) break

    // k2 = Ê(x_n + h/2·k1)
    const p2 = pos.clone().addScaledVector(k1, h2)
    const k2 = fieldDirectionAt(p2, charges, fieldOpts)
    if (!k2) break

    // k3 = Ê(x_n + h/2·k2)
    const p3 = pos.clone().addScaledVector(k2, h2)
    const k3 = fieldDirectionAt(p3, charges, fieldOpts)
    if (!k3) break

    // k4 = Ê(x_n + h·k3)
    const p4 = pos.clone().addScaledVector(k3, h)
    const k4 = fieldDirectionAt(p4, charges, fieldOpts)
    if (!k4) break

    // Combinaison pondérée : x_{n+1} = x_n + h/6·(k1 + 2·k2 + 2·k3 + k4)
    const prev = pos.clone()
    pos.addScaledVector(k1, h6)
       .addScaledVector(k2, h6 * 2)
       .addScaledVector(k3, h6 * 2)
       .addScaledVector(k4, h6)

    if (pos.length() > maxDist) break
    if (sourcePos && new Vector3().subVectors(pos, new Vector3(...sourcePos)).length() < rStop) break
    // Détection de stagnation : si le pas net est négligeable devant h,
    // la ligne atteint un point nul (E=0) et ne peut plus avancer.
    if (new Vector3().subVectors(pos, prev).length() < h * 1e-4) break
    pts.push(pos.clone())
  }
  return pts.map(p => [p.x, p.y, p.z])
}

/**
 * Trace une ligne de champ avec la méthode choisie.
 * Dispatche vers Euler ou RK4 selon opts.method.
 *
 * @param {number[]} startPos - Position de départ [x, y, z]
 * @param {Array} charges - Liste des charges ponctuelles
 * @param {Object} opts - Options (voir traceFieldLineEuler)
 * @param {'euler'|'rk4'} [opts.method='euler'] - Méthode d'intégration
 * @returns {number[][]} Tableau de points [x, y, z] formant la ligne
 */
function traceFieldLine(startPos, charges, opts) {
  const method = opts.method || 'euler'
  // Euler (ordre 1) : pas plus petit + plus de pas pour compenser la moins bonne précision
  const eulerOpts = method === 'euler' ? { ...opts, maxSteps: opts.maxSteps || 1500, stepSize: opts.stepSize || 0.08 } : opts
  if (method === 'euler') {
    return traceFieldLineEuler(startPos, charges, eulerOpts)
  }
  return traceFieldLineRK4(startPos, charges, opts)
}

function getDistributionSeeds(dist, numSeeds) {
  const sign = dist.density >= 0 ? 1 : -1
  const seeds = []
  const N = Math.max(numSeeds, 4)
  switch (dist.type) {
    case 'line': {
      const half = dist.length / 2
      const s = new Vector3(0, -half, 0)
      const dir = new Vector3(0, 1, 0)
      if (dist.length < 1e-10) return seeds
      const segments = Math.max(Math.floor(N / 4), 2)
      const perRing = Math.max(Math.floor(N / segments), 4)
      const rSeed = 0.3
      for (let i = 0; i < segments; i++) {
        const t = (i + 0.5) / segments
        const base = new Vector3().copy(s).addScaledVector(dir, t * dist.length)
        const up = Math.abs(dir.y) > 0.9 ? new Vector3(1, 0, 0) : new Vector3(0, 1, 0)
        const u = new Vector3().crossVectors(dir, up).normalize()
        const v = new Vector3().crossVectors(dir, u).normalize()
        for (let j = 0; j < perRing; j++) {
          const a = (j / perRing) * Math.PI * 2
          const pt = new Vector3().copy(base).addScaledVector(u, Math.cos(a) * rSeed).addScaledVector(v, Math.sin(a) * rSeed)
          seeds.push({ point: [pt.x, pt.y, pt.z], direction: sign })
        }
      }
      break
    }
    case 'cylinder': {
      const frame = makeLocalFrame(dist.center, new Vector3(...dist.axis))
      const NA = Math.max(Math.floor(Math.sqrt(N * 2)), 6)
      const NH = Math.max(Math.floor(N / NA), 4)
      for (let ia = 0; ia < NA; ia++) {
        const a = (ia / NA) * Math.PI * 2
        for (let ih = 0; ih < NH; ih++) {
          const hloc = (ih / (NH - 1)) * dist.height - dist.height / 2
          const local = new Vector3(dist.radius * Math.cos(a), dist.radius * Math.sin(a), hloc)
          const w = worldFromLocal(local, frame)
          seeds.push({ point: [w.x, w.y, w.z], direction: sign })
        }
      }
      break
    }
    case 'plane': {
      const frame = makeLocalFrame(dist.center, new Vector3(...dist.normal))
      const halfN = Math.max(Math.floor(N / 2), 4)
      const nx = Math.max(Math.floor(Math.sqrt(halfN * dist.width / dist.height)), 2)
      const nz = Math.max(Math.floor(halfN / nx), 2)
      const offset = 0.15
      for (let ix = 0; ix < nx; ix++) {
        const lx = (ix / (nx - 1)) * dist.width - dist.width / 2
        for (let iz = 0; iz < nz; iz++) {
          const lz = (iz / (nz - 1)) * dist.height - dist.height / 2
          for (const sgn of [1, -1]) {
            const w = worldFromLocal(new Vector3(lx, lz, sgn * offset), frame)
            seeds.push({ point: [w.x, w.y, w.z], direction: sign })
          }
        }
      }
      break
    }
    case 'frame': {
      const frame = makeLocalFrame(dist.center, new Vector3(...dist.normal))
      const hw = dist.width / 2, hh = dist.height / 2
      const offset = 0.15
      const corners = [
        new Vector3(-hw, -hh, 0),
        new Vector3(hw, -hh, 0),
        new Vector3(hw, hh, 0),
        new Vector3(-hw, hh, 0),
      ]
      const nPerSide = Math.max(Math.ceil(Math.max(dist.width, dist.height) / 1.5), 4)
      const perRing = 4
      for (let s = 0; s < 4; s++) {
        const c0 = corners[s], c1 = corners[(s + 1) % 4]
        const edge = new Vector3().subVectors(c1, c0)
        const dir = edge.normalize()
        const up = Math.abs(dir.y) > 0.9 ? new Vector3(1, 0, 0) : new Vector3(0, 1, 0)
        const u = new Vector3().crossVectors(dir, up).normalize()
        const v = new Vector3().crossVectors(dir, u).normalize()
        for (let i = 0; i < nPerSide; i++) {
          const t = (i + 0.5) / nPerSide
          const base = new Vector3().lerpVectors(c0, c1, t)
          for (let j = 0; j < perRing; j++) {
            const a = (j / perRing) * Math.PI * 2
            const local = new Vector3().copy(base).addScaledVector(u, Math.cos(a) * offset).addScaledVector(v, Math.sin(a) * offset)
            const w = worldFromLocal(local, frame)
            seeds.push({ point: [w.x, w.y, w.z], direction: sign })
          }
        }
      }
      break
    }
    case 'circle': {
      const { radius: R, center, normal } = dist
      if (R < 1e-10) break
      const frame = makeLocalFrame(center, new Vector3(...normal))
      const NC = Math.max(N, 12)
      const da = (2 * Math.PI) / NC
      const offset = 0.15
      for (let i = 0; i < NC; i++) {
        const a = i * da
        for (const sgn of [1, -1]) {
          const local = new Vector3(R * Math.cos(a), R * Math.sin(a), sgn * offset)
          const w = worldFromLocal(local, frame)
          seeds.push({ point: [w.x, w.y, w.z], direction: sign })
        }
      }
      break
    }
    default: {
      // Simplified fallback: fibonacci sphere around center
      const pts = fibonacciSphere(N, dist.center || [0, 0, 0], 0.3)
      for (const pt of pts) seeds.push({ point: [pt.x, pt.y, pt.z], direction: sign })
    }
  }
  return seeds
}

// ---- Worker message handler ----

self.onmessage = function (e) {
  const { type, id, payload } = e.data
  try {
    let result
    switch (type) {
      case 'totalField': {
        const { charges, targetPos, ke, rMin, distributions } = payload
        const E = calculateTotalField(charges || [], targetPos, ke || KE_REAL, rMin || 0.5, distributions || [])
        result = { x: E.x, y: E.y, z: E.z }
        break
      }
      case 'totalPotential': {
        const { charges, targetPos, ke, rMin, distributions } = payload
        result = calculateTotalPotential(charges || [], targetPos, ke || KE_REAL, rMin || 0.5, distributions || [])
        break
      }
      case 'fieldGrid': {
        const { charges, positions, ke, rMin, distributions } = payload
        result = positions.map(pos => {
          const E = calculateTotalField(charges || [], pos, ke || KE_REAL, rMin || 0.5, distributions || [])
          return { x: E.x, y: E.y, z: E.z }
        })
        break
      }
      case 'potentialGrid': {
        const { charges, positions, ke, rMin, distributions } = payload
        result = positions.map(pos => calculateTotalPotential(charges || [], pos, ke || KE_REAL, rMin || 0.5, distributions || []))
        break
      }
      case 'traceFieldLines': {
        const { seeds, charges, ke, rMin, stepSize, maxSteps, distributions, rStop, maxDist, epsilon, method } = payload
        result = seeds.map(seed => traceFieldLine(seed.point, charges || [], {
          ke: ke || KE_REAL,
          rMin: rMin || 0.5,
          stepSize: stepSize || 0.15,
          maxSteps: maxSteps || 800,
          direction: seed.direction,
          sourcePos: seed.sourcePos,
          distributions: distributions || [],
          rStop: rStop || 0.6,
          maxDist: maxDist || 25,
          epsilon: epsilon || 1e-25,
          method: method || 'euler',
        }))
        break
      }
      case 'traceFieldLine': {
        const { startPos, charges, opts } = payload
        result = traceFieldLine(startPos, charges || [], opts || {})
        break
      }
      case 'distributionSeeds': {
        const { dist, numSeeds } = payload
        result = getDistributionSeeds(dist, numSeeds || 12)
        break
      }
      case 'sample3DGrid': {
        const { bounds, res, charges, ke, rMin, distributions } = payload
        const { min: bmin, max: bmax } = bounds
        const nx = res, ny = res, nz = res
        const total = nx * ny * nz
        const grid = new Float32Array(total)
        const pos = [0, 0, 0]
        let minV = Infinity, maxV = -Infinity
        for (let iz = 0; iz < nz; iz++) {
          pos[2] = bmin[2] + (iz / (nz - 1)) * (bmax[2] - bmin[2])
          for (let iy = 0; iy < ny; iy++) {
            pos[1] = bmin[1] + (iy / (ny - 1)) * (bmax[1] - bmin[1])
            for (let ix = 0; ix < nx; ix++) {
              pos[0] = bmin[0] + (ix / (nx - 1)) * (bmax[0] - bmin[0])
              const V = calculateTotalPotential(charges || [], pos, ke || KE_REAL, rMin || 0.5, distributions || [])
              const idx = iz * nx * ny + iy * nx + ix
              grid[idx] = V
              if (V < minV) minV = V
              if (V > maxV) maxV = V
            }
          }
        }
        // Transfer grid buffer back to main thread (zero-copy)
        self.postMessage({ id, result: { grid, nx, ny, nz, minV, maxV } }, [grid.buffer])
        return // Already posted with transferable
      }
      case 'totalForceOnCharge': {
        const { targetCharge, allCharges, ke, rMin } = payload
        result = calculateTotalForceOnCharge(targetCharge, allCharges, ke || KE_REAL, rMin || 0.5)
        break
      }
      case 'ping':
        result = 'pong'
        break
      default:
        throw new Error(`Unknown message type: ${type}`)
    }
    self.postMessage({ id, result })
  } catch (error) {
    self.postMessage({ id, error: error.message })
  }
}
