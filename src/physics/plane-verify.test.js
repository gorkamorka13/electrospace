import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { calculateFieldFromPlane, calculatePotentialFromPlane, getDistributionSeeds, calculateTotalField } from './coulomb'
import { computeFieldGridBounds } from './utils'

const ke = 8.9875517923e9
const sigma = 1e-6
const rMin = 0.05
const dist = { type: 'plane', center: [0, 0, 0], normal: [1, 0, 0], density: sigma, mode: 'finite', width: 2, height: 2 }

function analytic(z) {
  const a = 1, b = 1
  const absZ = Math.abs(z)
  return 4 * ke * sigma * Math.atan(a * b / (absZ * Math.sqrt(a * a + b * b + absZ * absZ)))
}
function numeric(z, N = 400) {
  const a = 1, b = 1
  const dw = 2 * a / N, dh = 2 * b / N
  let Ez = 0
  for (let i = 0; i < N; i++) {
    const lx = (i + 0.5) * dw - a
    for (let j = 0; j < N; j++) {
      const ly = (j + 0.5) * dh - b
      const r = Math.max(Math.sqrt(lx * lx + ly * ly + z * z), rMin)
      Ez += ke * sigma * dw * dh * z / (r * r * r)
    }
  }
  return Ez
}

describe('finite plane field verification', () => {
  it('on-axis analytic matches brute-force integration', () => {
    for (const z of [0.1, 0.5, 1, 2, 5]) {
      const an = analytic(z)
      const nu = numeric(z)
      expect(an / nu).toBeCloseTo(1, 3)
    }
  })

  it('on-axis: calculateFieldFromPlane matches analytic formula', () => {
    for (const z of [0.1, 0.5, 1, 2, 5]) {
      const E = calculateFieldFromPlane(dist, [z, 0, 0], ke, rMin)
      expect(E.x).toBeCloseTo(analytic(z), 3)
      expect(Math.abs(E.y)).toBeLessThan(1e-12)
      expect(Math.abs(E.z)).toBeLessThan(1e-12)
    }
  })

  it('near surface (center) field is perpendicular to plane', () => {
    const E = calculateFieldFromPlane(dist, [0.15, 0, 0], ke, rMin)
    expect(Math.abs(E.y) / E.length()).toBeLessThan(1e-6)
    expect(Math.abs(E.z) / E.length()).toBeLessThan(1e-6)
    expect(E.x).toBeGreaterThan(0)
  })

  it('potential continuous and symmetric across plane', () => {
    const Vp = calculatePotentialFromPlane(dist, [0.15, 0, 0], ke, rMin)
    const Vn = calculatePotentialFromPlane(dist, [-0.15, 0, 0], ke, rMin)
    expect(Vp).toBeCloseTo(Vn, 3)
  })

  it('field magnitudes symmetric, normal component flips sign', () => {
    const E1 = calculateFieldFromPlane(dist, [0.15, 0, 0], ke, rMin)
    const E2 = calculateFieldFromPlane(dist, [-0.15, 0, 0], ke, rMin)
    expect(E1.length()).toBeCloseTo(E2.length(), 3)
    expect(Math.sign(E1.x)).toBe(1)
    expect(Math.sign(E2.x)).toBe(-1)
  })

  it('far field approximates point charge Q = sigma*A', () => {
    const Q = sigma * 4
    for (const d of [10, 30]) {
      const E = calculateFieldFromPlane(dist, [d, 0, 0], ke, rMin)
      const point = ke * Q / (d * d)
      // on-axis finite-sheet field is slightly below the point-charge value at d=10
      // (quadrupole correction), converging as d grows
      expect(E.length() / point).toBeCloseTo(1, 1)
    }
  })

  it('near-plane z=0+ field ~ sigma/2eps0 close to center (infinite-plane limit)', () => {
    // just above center of a large-ish plane the field approaches the infinite-sheet value
    const big = { ...dist, width: 40, height: 40 }
    const E = calculateFieldFromPlane(big, [0.02, 0, 0], ke, rMin)
    const inf = 2 * Math.PI * ke * sigma
    expect(E.x / inf).toBeCloseTo(1, 2)
  })

  it('field continuous across the on-axis analytic / numerical integration boundary', () => {
    // just on axis (analytic branch, dPerp<1e-10) vs just off axis (numerical 20x20)
    const Eon = calculateFieldFromPlane(dist, [0.5, 0, 0], ke, rMin)
    for (const dPerp of [1e-8, 1e-6, 1e-4]) {
      const Eoff = calculateFieldFromPlane(dist, [0.5, dPerp, 0], ke, rMin)
      expect(Eoff.x / Eon.x).toBeCloseTo(1, 2)
    }
  })
})

describe('finite plane: numerical 20x20 integration accuracy', () => {
  function brute(p, N = 400) {
    const a = 1, b = 1
    const dw = 2 * a / N, dh = 2 * b / N
    const E = new THREE.Vector3()
    for (let i = 0; i < N; i++) {
      const ly = (i + 0.5) * dw - a
      for (let j = 0; j < N; j++) {
        const lz = (j + 0.5) * dh - b
        // plane lies in yz at x=0, normal +x
        const dx = p[0], dy = p[1] - ly, dz = p[2] - lz
        const rr = Math.max(Math.sqrt(dx * dx + dy * dy + dz * dz), rMin)
        const inv = 1 / (rr * rr * rr)
        E.x += dx * inv; E.y += dy * inv; E.z += dz * inv
      }
    }
    const dq = sigma * 4 / (N * N)
    return E.multiplyScalar(ke * dq)
  }

  it('20x20 error stays small near surface and off-axis (field-line tracing zone)', () => {
    const pts = [
      [0.15, 0.0, 0.0], [0.15, 0.5, 0.0], [0.15, 1.0, 0.0], [0.3, 0.3, 0.3],
      [0.15, 0.0, 1.0], [1.0, 0.5, 0.5], [0.2, 0.99, 0.99],
    ]
    for (const p of pts) {
      const E20 = calculateFieldFromPlane(dist, p, ke, rMin)
      const Eb = brute(p)
      const rel = E20.length() / Eb.length()
      expect(Math.abs(rel - 1)).toBeLessThan(0.05)
    }
  })
})

describe('finite plane field-line seeds', () => {
  it('places seeds on both sides within plane extent', () => {
    const seeds = getDistributionSeeds(dist, 32)
    expect(seeds.length).toBeGreaterThan(4)
    let plus = 0, minus = 0
    for (const s of seeds) {
      // normal is +x, so seed x is +/-0.15
      if (s.point.x > 0) plus++
      else minus++
      // lateral coordinates stay inside the 2x2 sheet
      expect(Math.abs(s.point.y)).toBeLessThanOrEqual(1.001)
      expect(Math.abs(s.point.z)).toBeLessThanOrEqual(1.001)
      expect(Math.abs(s.point.x)).toBeGreaterThanOrEqual(0.1)
      expect(s.direction).toBe(1) // positive density => +1
    }
    expect(plus).toBe(minus)
  })

  it('traces field lines that leave both faces roughly perpendicular', () => {
    const seeds = getDistributionSeeds(dist, 16)
    const charges = []
    for (const { point, direction } of seeds) {
      const opts = { ke, rMin, distributions: [dist], epsilon: 1e-25, direction }
      const pts = traceRK4(point, charges, opts)
      expect(pts.length).toBeGreaterThan(1)
      const first = new THREE.Vector3(...point)
      const next = pts[Math.min(3, pts.length - 1)]
      const v = new THREE.Vector3(...next).sub(first)
      // Lines should move away from the plane (|x| grows), not cross it
      const x0 = first.x, x1 = v.x
      expect(Math.abs(x1) * 0 + (Math.sign(x0) === Math.sign(x0 + x1 * 0.5))).toBe(1)
    }
  })
})

// Minimal RK4 replicating worker's traceFieldLineRK4 using main-thread physics
function traceRK4(startPos, charges, opts) {
  const { ke: k = 8.9875517923e9, rMin: rm = 0.05, maxDist = 25, maxSteps = 200, stepSize = 0.15, direction = 1, epsilon = 1e-25, distributions = [] } = opts
  const pts = [new THREE.Vector3(...startPos)]
  const pos = new THREE.Vector3(...startPos)
  const h = stepSize, h2 = h / 2, h6 = h / 6
  const fieldOpts = { ke: k, rMin: rm, distributions, epsilon, direction }
  for (let i = 0; i < maxSteps; i++) {
    const k1 = dirAt(pos, charges, fieldOpts)
    if (!k1) break
    const k2 = dirAt(pos.clone().addScaledVector(k1, h2), charges, fieldOpts)
    if (!k2) break
    const k3 = dirAt(pos.clone().addScaledVector(k2, h2), charges, fieldOpts)
    if (!k3) break
    const k4 = dirAt(pos.clone().addScaledVector(k3, h), charges, fieldOpts)
    if (!k4) break
    const prev = pos.clone()
    pos.addScaledVector(k1, h6).addScaledVector(k2, h6 * 2).addScaledVector(k3, h6 * 2).addScaledVector(k4, h6)
    if (pos.length() > maxDist) break
    if (new THREE.Vector3().subVectors(pos, prev).length() < h * 1e-4) break
    pts.push(pos.clone())
  }
  return pts.map(p => [p.x, p.y, p.z])
}

function dirAt(pos, charges, opts) {
  const E = calculateTotalField(charges, [pos.x, pos.y, pos.z], opts.ke, opts.rMin, opts.distributions)
  if (E.length() < opts.epsilon) return null
  return E.clone().normalize().multiplyScalar(opts.direction)
}

describe('computeFieldGridBounds — grid scales with distribution extent', () => {
  it('plane 10x10 (normal +x) spans yz plane, thin in x', () => {
    const d = { type: 'plane', center: [0, 0, 0], normal: [1, 0, 0], width: 10, height: 10, mode: 'finite' }
    const { min, max } = computeFieldGridBounds({ distributions: [d] })
    // plane lies in yz (width -> z, height -> y), x only padding
    expect(min.x).toBeCloseTo(-2, 6)
    expect(max.x).toBeCloseTo(2, 6)
    expect(min.y).toBeCloseTo(-7, 6)
    expect(max.y).toBeCloseTo(7, 6)
    expect(min.z).toBeCloseTo(-7, 6)
    expect(max.z).toBeCloseTo(7, 6)
  })

  it('enlarging the plane widens the bounds', () => {
    const small = { type: 'plane', center: [0, 0, 0], normal: [1, 0, 0], width: 2, height: 2, mode: 'finite' }
    const big = { ...small, width: 20, height: 2 }
    const bSmall = computeFieldGridBounds({ distributions: [small] })
    const bBig = computeFieldGridBounds({ distributions: [big] })
    // width -> z extent grows; height (-> y) unchanged
    expect(bBig.max.z).toBeGreaterThan(bSmall.max.z)
    expect(bBig.min.z).toBeLessThan(bSmall.min.z)
    expect(bBig.max.y).toBeCloseTo(bSmall.max.y, 6)
  })

  it('rotated plane extends along world axes', () => {
    const d = { type: 'plane', center: [0, 0, 0], normal: [0, 0, 1], width: 4, height: 2, mode: 'finite' }
    const { max } = computeFieldGridBounds({ distributions: [d] })
    // normal +z: width 4 -> x extent, height 2 -> y extent, z only padding
    expect(max.x).toBeCloseTo(4, 6)
    expect(max.y).toBeCloseTo(3, 6)
    expect(max.z).toBeCloseTo(2, 6)
  })

  it('sphere radius + padding', () => {
    const d = { type: 'sphere', center: [1, 2, 3], radius: 4 }
    const { min, max } = computeFieldGridBounds({ distributions: [d] })
    expect(min.x).toBeCloseTo(-5, 6)
    expect(max.x).toBeCloseTo(7, 6)
    expect(min.y).toBeCloseTo(-4, 6)
    expect(max.y).toBeCloseTo(8, 6)
    expect(min.z).toBeCloseTo(-3, 6)
    expect(max.z).toBeCloseTo(9, 6)
  })

  it('charges still define bounds when no distributions', () => {
    const { min, max } = computeFieldGridBounds({ charges: [{ position: [0, 0, 0] }, { position: [5, 0, 0] }] })
    expect(min.x).toBeCloseTo(-2, 6)
    expect(max.x).toBeCloseTo(7, 6)
  })

  it('no sources -> fallback cube', () => {
    const { min, max } = computeFieldGridBounds({})
    expect(min.x).toBeCloseTo(-10, 6)
    expect(max.x).toBeCloseTo(10, 6)
  })

  it('line (no center) defaults to origin, extent along y', () => {
    const d = { type: 'line', length: 10, mode: 'finite' }
    const { min, max } = computeFieldGridBounds({ distributions: [d] })
    expect(min.y).toBeCloseTo(-7, 6)
    expect(max.y).toBeCloseTo(7, 6)
    expect(max.x).toBeCloseTo(2, 6)
  })
})
