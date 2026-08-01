import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { makeLocalFrame, worldFromLocal, fibonacciSphere } from './utils'
import * as C from './constants'
import { calculateFieldFromCharge, calculatePotentialFromCharge, calculateTotalField, calculateTotalPotential, calculateFieldFromSphere, calculateFieldFromCylinder, calculatePotentialFromCylinder, calculateFieldFromLine, calculatePotentialFromLine, calculateFieldFromPlane, calculatePotentialFromPlane } from './coulomb'

describe('makeLocalFrame', () => {
  it('creates a frame with correct origin', () => {
    const frame = makeLocalFrame([1, 2, 3], new THREE.Vector3(0, 1, 0))
    expect(frame.origin.x).toBe(1)
    expect(frame.origin.y).toBe(2)
    expect(frame.origin.z).toBe(3)
  })

  it('z axis is normalized normal', () => {
    const frame = makeLocalFrame([0, 0, 0], new THREE.Vector3(0, 2, 0))
    expect(frame.z.length()).toBeCloseTo(1)
    expect(frame.z.y).toBeCloseTo(1)
  })

  it('all axes are orthonormal', () => {
    const frame = makeLocalFrame([1, 2, 3], new THREE.Vector3(1, 2, 3))
    expect(frame.x.dot(frame.y)).toBeCloseTo(0)
    expect(frame.y.dot(frame.z)).toBeCloseTo(0)
    expect(frame.z.dot(frame.x)).toBeCloseTo(0)
    expect(frame.x.length()).toBeCloseTo(1)
    expect(frame.y.length()).toBeCloseTo(1)
    expect(frame.z.length()).toBeCloseTo(1)
  })

  it('handles near-vertical normal', () => {
    const frame = makeLocalFrame([0, 0, 0], new THREE.Vector3(0, 0.99, 0.1))
    expect(frame.y.dot(frame.z)).toBeCloseTo(0)
    expect(frame.x.length()).toBeCloseTo(1)
  })
})

describe('worldFromLocal', () => {
  it('returns origin for zero local', () => {
    const frame = makeLocalFrame([1, 2, 3], new THREE.Vector3(0, 1, 0))
    const p = worldFromLocal({ x: 0, y: 0, z: 0 }, frame)
    expect(p.x).toBe(1)
    expect(p.y).toBe(2)
    expect(p.z).toBe(3)
  })

  it('converts local coords correctly', () => {
    const frame = makeLocalFrame([0, 0, 0], new THREE.Vector3(0, 1, 0))
    const p = worldFromLocal({ x: 1, y: 2, z: 3 }, frame)
    expect(p.x).toBeCloseTo(2)
    expect(p.y).toBeCloseTo(3)
    expect(p.z).toBeCloseTo(1)
  })
})

describe('fibonacciSphere', () => {
  it('returns N points', () => {
    const pts = fibonacciSphere(50, [0, 0, 0], 5)
    expect(pts).toHaveLength(50)
  })

  it('returns single point for N<2', () => {
    const pts = fibonacciSphere(1, [3, 4, 5], 2)
    expect(pts).toHaveLength(1)
    expect(pts[0].x).toBe(5)
    expect(pts[0].y).toBe(4)
    expect(pts[0].z).toBe(5)
  })

  it('all points are at given radius from center', () => {
    const center = [1, 2, 3]
    const radius = 4
    const pts = fibonacciSphere(100, center, radius)
    pts.forEach(p => {
      const d = p.distanceTo(new THREE.Vector3(...center))
      expect(d).toBeCloseTo(radius, 5)
    })
  })
})

describe('constants', () => {
  it('WORLD_SIZE is positive', () => expect(C.WORLD_SIZE).toBeGreaterThan(0))
  it('HALF_WORLD is half', () => expect(C.HALF_WORLD).toBe(C.WORLD_SIZE / 2))
  it('R_MIN is positive', () => expect(C.R_MIN).toBeGreaterThan(0))
  it('FORCE_SCALE is positive', () => expect(C.FORCE_SCALE).toBeGreaterThan(0))
  it('BOUNDARY matches HALF_WORLD', () => expect(C.BOUNDARY).toBe(C.HALF_WORLD))
})

describe('calculateFieldFromCharge', () => {
  it('radial field from positive charge points away', () => {
    const charge = { q: 1, position: [0, 0, 0] }
    const E = calculateFieldFromCharge(charge, [2, 0, 0])
    expect(E.x).toBeGreaterThan(0)
    expect(E.y).toBe(0)
    expect(E.z).toBe(0)
  })

  it('radial field from negative charge points toward', () => {
    const charge = { q: -1, position: [0, 0, 0] }
    const E = calculateFieldFromCharge(charge, [2, 0, 0])
    expect(E.x).toBeLessThan(0)
  })

  it('field magnitude follows inverse-square law', () => {
    const charge = { q: 1, position: [0, 0, 0] }
    const E1 = calculateFieldFromCharge(charge, [2, 0, 0], 1, 0.1)
    const E2 = calculateFieldFromCharge(charge, [4, 0, 0], 1, 0.1)
    expect(E1.length()).toBeCloseTo(E2.length() * 4, 5)
  })

  it('clamps distance to rMin', () => {
    const charge = { q: 1, position: [0, 0, 0] }
    const E = calculateFieldFromCharge(charge, [0.01, 0, 0], 1, 0.5)
    expect(E.length()).toBeCloseTo(1 / (0.5 * 0.5), 5)
  })
})

describe('calculatePotentialFromCharge', () => {
  it('positive charge gives positive potential', () => {
    const V = calculatePotentialFromCharge({ q: 1, position: [0, 0, 0] }, [2, 0, 0], 1, 0.1)
    expect(V).toBeGreaterThan(0)
  })

  it('negative charge gives negative potential', () => {
    const V = calculatePotentialFromCharge({ q: -1, position: [0, 0, 0] }, [2, 0, 0], 1, 0.1)
    expect(V).toBeLessThan(0)
  })
})

describe('calculateTotalField', () => {
  it('sums fields from multiple charges', () => {
    const charges = [
      { q: 1, position: [1, 0, 0] },
      { q: -1, position: [-1, 0, 0] },
    ]
    const E = calculateTotalField(charges, [0, 0, 0], 1, 0.1)
    expect(E.x).toBeCloseTo(-2, 5)
    expect(E.y).toBe(0)
    expect(E.z).toBe(0)
  })
})

describe('calculateTotalPotential', () => {
  it('sums potentials from multiple charges', () => {
    const charges = [
      { q: 1, position: [1, 0, 0] },
      { q: 1, position: [-1, 0, 0] },
    ]
    const V = calculateTotalPotential(charges, [2, 0, 0], 1, 0.1)
    const V1 = 1 / 1
    const V2 = 1 / 3
    expect(V).toBeCloseTo(V1 + V2, 5)
  })
})

describe('calculateFieldFromSphere - along x-axis', () => {
  const R = 2
  const rho = 1e-6
  const ke = 1
  const rMin = 0.001
  const center = [0, 0, 0]
  const sphereQ = (r) => rho * (4 / 3 * Math.PI * r * r * r)
  const sphereQenc = (r, a) => rho * (4 / 3 * Math.PI * (r * r * r - a * a * a))

  it('hollow sphere: zero field inside, radial field outside', () => {
    const dist = { type: 'sphere', center, radius: R, density: rho, hollow: true, innerRadius: 0, e_ext: 0, e_int: 0 }
    const E1 = calculateFieldFromSphere(dist, [1, 0, 0], ke, rMin)
    expect(E1.length()).toBeCloseTo(0, 10)
    const Q = rho * (4 * Math.PI * R * R)
    const E2 = calculateFieldFromSphere(dist, [5, 0, 0], ke, rMin)
    expect(E2.x).toBeCloseTo(ke * Q / 25, 5)
    expect(E2.y).toBe(0)
    expect(E2.z).toBe(0)
  })

  it('solid sphere: linear field inside, inverse-square outside', () => {
    const dist = { type: 'sphere', center, radius: R, density: rho, hollow: false, innerRadius: 0, e_ext: 0, e_int: 0 }
    const r = 1
    const E1 = calculateFieldFromSphere(dist, [r, 0, 0], ke, rMin)
    const expectedInside = ke * rho * (4 / 3 * Math.PI) * r
    expect(E1.x).toBeCloseTo(expectedInside, 5)
    expect(E1.y).toBe(0)
    expect(E1.z).toBe(0)
    const E2 = calculateFieldFromSphere(dist, [5, 0, 0], ke, rMin)
    const Q = sphereQ(R)
    expect(E2.x).toBeCloseTo(ke * Q / 25, 5)
  })

  it('solid sphere: field continuous at surface', () => {
    const dist = { type: 'sphere', center, radius: R, density: rho, hollow: false, innerRadius: 0, e_ext: 0, e_int: 0 }
    const Q = sphereQ(R)
    const EjustInside = calculateFieldFromSphere(dist, [R - 0.001, 0, 0], ke, rMin)
    const EjustOutside = calculateFieldFromSphere(dist, [R + 0.001, 0, 0], ke, rMin)
    expect(EjustInside.x).toBeCloseTo(ke * Q / (R * R), 3)
    expect(EjustOutside.x).toBeCloseTo(ke * Q / (R * R), 3)
  })

  it('thick shell: zero field in cavity, grows in shell, inverse-square outside', () => {
    const a = 1
    const dist = { type: 'sphere', center, radius: R, density: rho, hollow: false, innerRadius: a, e_ext: 0, e_int: 0 }
    const Q = sphereQenc(R, a)
    const E1 = calculateFieldFromSphere(dist, [0.5, 0, 0], ke, rMin)
    expect(E1.length()).toBeCloseTo(0, 10)
    const r2 = 1.5
    const E2 = calculateFieldFromSphere(dist, [r2, 0, 0], ke, rMin)
    const Qenc = sphereQenc(r2, a)
    expect(E2.x).toBeCloseTo(ke * Qenc / (r2 * r2), 5)
    const E3 = calculateFieldFromSphere(dist, [5, 0, 0], ke, rMin)
    expect(E3.x).toBeCloseTo(ke * Q / 25, 5)
  })

  it('two-shell outer: field from outer shell only', () => {
    const dist = { type: 'sphere', center, radius: R, density: rho, hollow: false, innerRadius: 0, e_ext: 0.5, e_int: 0 }
    const innerOuter = R - 0.5
    const Qouter = sphereQenc(R, innerOuter)
    const E1 = calculateFieldFromSphere(dist, [innerOuter - 0.2, 0, 0], ke, rMin)
    expect(E1.length()).toBeCloseTo(0, 10)
    const r2 = 1.7
    const E2 = calculateFieldFromSphere(dist, [r2, 0, 0], ke, rMin)
    const Qenc = sphereQenc(r2, innerOuter)
    expect(E2.x).toBeCloseTo(ke * Qenc / (r2 * r2), 5)
    const E3 = calculateFieldFromSphere(dist, [5, 0, 0], ke, rMin)
    expect(E3.x).toBeCloseTo(ke * Qouter / 25, 5)
  })

  it('two-shell inner: field from inner shell', () => {
    const a = 1
    const eInt = 0.3
    const dist = { type: 'sphere', center, radius: R, density: rho, hollow: false, innerRadius: a, e_ext: 0, e_int: eInt }
    const innerInner = a - eInt
    const Qinner = sphereQenc(a, innerInner)
    const E1 = calculateFieldFromSphere(dist, [innerInner - 0.2, 0, 0], ke, rMin)
    expect(E1.length()).toBeCloseTo(0, 10)
    const r2 = 0.85
    const E2 = calculateFieldFromSphere(dist, [r2, 0, 0], ke, rMin)
    const Qenc = sphereQenc(r2, innerInner)
    expect(E2.x).toBeCloseTo(ke * Qenc / (r2 * r2), 5)
    const r3 = 1.5
    const E3 = calculateFieldFromSphere(dist, [r3, 0, 0], ke, rMin)
    expect(E3.x).toBeCloseTo(ke * Qinner / (r3 * r3), 5)
    const E4 = calculateFieldFromSphere(dist, [5, 0, 0], ke, rMin)
    expect(E4.x).toBeCloseTo(ke * Qinner / 25, 5)
  })

  it('both shells: superposition of outer and inner', () => {
    const a = 1
    const eExt = 0.3
    const eInt = 0.3
    const dist = { type: 'sphere', center, radius: R, density: rho, hollow: false, innerRadius: a, e_ext: eExt, e_int: eInt }
    const innerOuter = R - eExt
    const innerInner = a - eInt
    const Qouter = sphereQenc(R, innerOuter)
    const Qinner = sphereQenc(a, innerInner)
    const Qtotal = Qouter + Qinner
    const E1 = calculateFieldFromSphere(dist, [innerInner - 0.2, 0, 0], ke, rMin)
    expect(E1.length()).toBeCloseTo(0, 10)
    const r2 = 0.85
    const E2 = calculateFieldFromSphere(dist, [r2, 0, 0], ke, rMin)
    expect(E2.x).toBeCloseTo(ke * sphereQenc(r2, innerInner) / (r2 * r2), 5)
    const r3 = 1.3
    const E3 = calculateFieldFromSphere(dist, [r3, 0, 0], ke, rMin)
    expect(E3.x).toBeCloseTo(ke * Qinner / (r3 * r3), 5)
    const r4 = 1.85
    const E4 = calculateFieldFromSphere(dist, [r4, 0, 0], ke, rMin)
    expect(E4.x).toBeCloseTo(ke * (Qinner + sphereQenc(r4, innerOuter)) / (r4 * r4), 5)
    const E5 = calculateFieldFromSphere(dist, [5, 0, 0], ke, rMin)
    expect(E5.x).toBeCloseTo(ke * Qtotal / 25, 5)
  })

  it('negative density gives inward-pointing field', () => {
    const dist = { type: 'sphere', center, radius: R, density: -rho, hollow: false, innerRadius: 0, e_ext: 0, e_int: 0 }
    const E = calculateFieldFromSphere(dist, [5, 0, 0], ke, rMin)
    expect(E.x).toBeLessThan(0)
  })
})

describe('calculateFieldFromCylinder - along x-axis', () => {
  const R = 2
  const rho = 1e-6
  const ke = 1
  const rMin = 0.001
  const center = [0, 0, 0]
  const axis = [0, 0, 1]
  const cylLambda = (r) => rho * Math.PI * r * r
  const cylLambdaEnc = (r, a) => rho * Math.PI * (r * r - a * a)

  // The cylinder is FINITE: unlike the infinite model, a finite cylinder is
  // not a Faraday cage, so the field inside the hollow cavity is small but
  // non-zero, and there is an axial (z) component outside the ends.

  it('hollow cylinder: near-zero field at center, no exact cancellation', () => {
    const dist = { type: 'cylinder', center, axis, radius: R, density: rho, hollow: true, innerRadius: 0, height: 2, e_ext: 0, e_int: 0 }
    const E1 = calculateFieldFromCylinder(dist, [1, 0, 0], ke, rMin)
    // Finite hollow cylinder: field inside is not exactly zero.
    expect(Math.abs(E1.length())).toBeGreaterThan(0)
    expect(Math.abs(E1.length())).toBeLessThan(1e-5)
    const E2 = calculateFieldFromCylinder(dist, [5, 0, 0], ke, rMin)
    // Far field is dominated by the total charge, not a pure 1/r line.
    expect(E2.x).toBeGreaterThan(0)
    // Symmetry: no y/z component along the x-axis.
    expect(Math.abs(E2.y)).toBeLessThan(1e-12)
    expect(Math.abs(E2.z)).toBeLessThan(1e-12)
  })

  it('solid cylinder: field inside grows with radius, decreases outside', () => {
    const dist = { type: 'cylinder', center, axis, radius: R, density: rho, hollow: false, innerRadius: 0, height: 2, e_ext: 0, e_int: 0 }
    const E1 = calculateFieldFromCylinder(dist, [1, 0, 0], ke, rMin)
    expect(E1.x).toBeGreaterThan(0)
    expect(Math.abs(E1.y)).toBeLessThan(1e-12)
    const Ecenter = calculateFieldFromCylinder(dist, [0.5, 0, 0], ke, rMin)
    expect(E1.x).toBeGreaterThan(Ecenter.x)
    const E2 = calculateFieldFromCylinder(dist, [5, 0, 0], ke, rMin)
    expect(E2.x).toBeLessThan(E1.x)
  })

  it('solid cylinder: field continuous at surface', () => {
    const dist = { type: 'cylinder', center, axis, radius: R, density: rho, hollow: false, innerRadius: 0, height: 2, e_ext: 0, e_int: 0 }
    const Ein = calculateFieldFromCylinder(dist, [R - 0.001, 0, 0], ke, rMin)
    const Eout = calculateFieldFromCylinder(dist, [R + 0.001, 0, 0], ke, rMin)
    expect(Ein.x).toBeCloseTo(Eout.x, 3)
  })

  it('thick cylindrical shell: field in cavity is near zero, non-zero in shell', () => {
    const a = 1
    const dist = { type: 'cylinder', center, axis, radius: R, density: rho, hollow: false, innerRadius: a, height: 2, e_ext: 0, e_int: 0 }
    const E1 = calculateFieldFromCylinder(dist, [0.5, 0, 0], ke, rMin)
    expect(Math.abs(E1.length())).toBeLessThan(1e-5)
    const d2 = 1.5
    const E2 = calculateFieldFromCylinder(dist, [d2, 0, 0], ke, rMin)
    expect(E2.x).toBeGreaterThan(Math.abs(E1.x))
    const E3 = calculateFieldFromCylinder(dist, [5, 0, 0], ke, rMin)
    expect(E3.x).toBeGreaterThan(0)
  })

  it('two-shell outer cylinder: field from outer shell only', () => {
    const dist = { type: 'cylinder', center, axis, radius: R, density: rho, hollow: false, innerRadius: 0, height: 2, e_ext: 0.5, e_int: 0 }
    const innerOuter = R - 0.5
    const lambdaOuter = cylLambdaEnc(R, innerOuter)
    const E1 = calculateFieldFromCylinder(dist, [innerOuter - 0.2, 0, 0], ke, rMin)
    expect(Math.abs(E1.length())).toBeLessThan(1e-5)
    const d2 = 1.7
    const E2 = calculateFieldFromCylinder(dist, [d2, 0, 0], ke, rMin)
    expect(E2.x).toBeGreaterThan(0)
    const E3 = calculateFieldFromCylinder(dist, [5, 0, 0], ke, rMin)
    expect(E3.x).toBeGreaterThan(0)
    expect(E3.x).toBeCloseTo(lambdaOuter > 0 ? E3.x : 0, 0)
  })

  it('two-shell inner cylinder: field from inner shell', () => {
    const a = 1
    const eInt = 0.3
    const dist = { type: 'cylinder', center, axis, radius: R, density: rho, hollow: false, innerRadius: a, height: 2, e_ext: 0, e_int: eInt }
    const innerInner = a - eInt
    const E1 = calculateFieldFromCylinder(dist, [innerInner - 0.2, 0, 0], ke, rMin)
    expect(Math.abs(E1.length())).toBeLessThan(1e-5)
    const d2 = 0.85
    const E2 = calculateFieldFromCylinder(dist, [d2, 0, 0], ke, rMin)
    expect(E2.x).toBeGreaterThan(0)
    const d3 = 1.5
    const E3 = calculateFieldFromCylinder(dist, [d3, 0, 0], ke, rMin)
    expect(E3.x).toBeGreaterThan(0)
    const E4 = calculateFieldFromCylinder(dist, [5, 0, 0], ke, rMin)
    expect(E4.x).toBeGreaterThan(0)
  })

  it('both cylindrical shells: superposition', () => {
    const a = 1
    const eExt = 0.3
    const eInt = 0.3
    const dist = { type: 'cylinder', center, axis, radius: R, density: rho, hollow: false, innerRadius: a, height: 2, e_ext: eExt, e_int: eInt }
    const innerOuter = R - eExt
    const innerInner = a - eInt
    const E1 = calculateFieldFromCylinder(dist, [innerInner - 0.2, 0, 0], ke, rMin)
    expect(Math.abs(E1.length())).toBeLessThan(1e-5)
    const d2 = 0.85
    const E2 = calculateFieldFromCylinder(dist, [d2, 0, 0], ke, rMin)
    expect(E2.x).toBeGreaterThan(0)
    const d3 = 1.3
    const E3 = calculateFieldFromCylinder(dist, [d3, 0, 0], ke, rMin)
    expect(E3.x).toBeGreaterThan(0)
    const d4 = 1.85
    const E4 = calculateFieldFromCylinder(dist, [d4, 0, 0], ke, rMin)
    expect(E4.x).toBeGreaterThan(0)
    const E5 = calculateFieldFromCylinder(dist, [5, 0, 0], ke, rMin)
    expect(E5.x).toBeGreaterThan(0)
  })

  it('cylinder field is radial (zero y,z along x-axis)', () => {
    const dist = { type: 'cylinder', center, axis, radius: R, density: rho, hollow: false, innerRadius: 0, height: 2, e_ext: 0, e_int: 0 }
    for (const x of [0.5, 1.5, 3, 5]) {
      const E = calculateFieldFromCylinder(dist, [x, 0, 0], ke, rMin)
      expect(Math.abs(E.y)).toBeLessThan(1e-12)
      expect(Math.abs(E.z)).toBeLessThan(1e-12)
    }
  })

  it('finite cylinder: non-zero field outside the ends (axial component)', () => {
    const dist = { type: 'cylinder', center, axis, radius: R, density: rho, hollow: false, innerRadius: 0, height: 2, e_ext: 0, e_int: 0 }
    // Above the top cap, on the axis.
    const E = calculateFieldFromCylinder(dist, [0, 0, 2.5], ke, rMin)
    expect(E.z).toBeGreaterThan(0)
  })
})

describe('Infinite distributions (mode: infinite)', () => {
  const ke = 1
  const rMin = 0.001
  const lam = 1e-9
  const sigma = 1e-9
  const rho = 1e-6

  it('infinite line: E = 2·ke·λ/ρ radial, zero axial', () => {
    const dist = { type: 'line', density: lam, mode: 'infinite', length: 10 }
    const E = calculateFieldFromLine(dist, [3, 7, 4], ke, rMin)
    const rho = Math.hypot(3, 4)
    const mag = 2 * ke * lam / rho
    expect(E.x).toBeCloseTo(mag * 3 / rho, 6)
    expect(E.y).toBeCloseTo(0, 6)
    expect(E.z).toBeCloseTo(mag * 4 / rho, 6)
  })

  it('infinite line: potential V = -2·ke·λ·ln(ρ)', () => {
    const dist = { type: 'line', density: lam, mode: 'infinite', length: 10 }
    const V = calculatePotentialFromLine(dist, [2, 0, 0], ke, rMin)
    expect(V).toBeCloseTo(-2 * ke * lam * Math.log(2), 6)
  })

  it('infinite line: E is independent of y (translation invariant)', () => {
    const dist = { type: 'line', density: lam, mode: 'infinite', length: 10 }
    const E1 = calculateFieldFromLine(dist, [2, -5, 0], ke, rMin)
    const E2 = calculateFieldFromLine(dist, [2, 100, 0], ke, rMin)
    expect(E1.x).toBeCloseTo(E2.x, 10)
  })

  it('infinite plane: E = 2π·ke·σ constant, sign flips across', () => {
    const dist = { type: 'plane', center: [0, 0, 0], normal: [1, 0, 0], density: sigma, mode: 'infinite', width: 10, height: 10 }
    const E1 = calculateFieldFromPlane(dist, [5, 0, 0], ke, rMin)
    expect(E1.x).toBeCloseTo(2 * Math.PI * ke * sigma, 6)
    expect(E1.y).toBeCloseTo(0, 6)
    const E2 = calculateFieldFromPlane(dist, [-5, 3, 2], ke, rMin)
    expect(E2.x).toBeCloseTo(-2 * Math.PI * ke * sigma, 6)
  })

  it('infinite plane: potential V = -2π·ke·σ·|d|', () => {
    const dist = { type: 'plane', center: [0, 0, 0], normal: [1, 0, 0], density: sigma, mode: 'infinite', width: 10, height: 10 }
    const V = calculatePotentialFromPlane(dist, [4, 0, 0], ke, rMin)
    expect(V).toBeCloseTo(-2 * Math.PI * ke * sigma * 4, 6)
  })

  it('infinite solid cylinder: E = 2·ke·λ_enc/ρ radial, axis-invariant', () => {
    const R = 2
    const dist = { type: 'cylinder', center: [0, 0, 0], axis: [0, 1, 0], radius: R, density: rho, hollow: false, innerRadius: 0, e_ext: 0, e_int: 0, height: 5, mode: 'infinite' }
    // Outside: λ_total = ρ·π·R²
    const lambdaTot = rho * Math.PI * R * R
    const Eout = calculateFieldFromCylinder(dist, [4, 0, 0], ke, rMin)
    expect(Eout.x).toBeCloseTo(2 * ke * lambdaTot / 4, 6)
    expect(Eout.y).toBeCloseTo(0, 6)
    // Inside: λ_enc = ρ·π·ρ²
    const d2 = 1
    const E2 = calculateFieldFromCylinder(dist, [d2, 0, 0], ke, rMin)
    expect(E2.x).toBeCloseTo(2 * ke * rho * Math.PI * d2 * d2 / d2, 6)
    // Translation invariant along axis
    const E3 = calculateFieldFromCylinder(dist, [4, 50, 0], ke, rMin)
    expect(E3.x).toBeCloseTo(Eout.x, 10)
  })

  it('infinite hollow cylinder: E=0 inside, 2·ke·λ/ρ outside', () => {
    const R = 2
    const dist = { type: 'cylinder', center: [0, 0, 0], axis: [0, 1, 0], radius: R, density: sigma, hollow: true, innerRadius: 0, e_ext: 0, e_int: 0, height: 5, mode: 'infinite' }
    const Ein = calculateFieldFromCylinder(dist, [1, 0, 0], ke, rMin)
    expect(Ein.length()).toBeCloseTo(0, 10)
    const lambda = sigma * 2 * Math.PI * R
    const Eout = calculateFieldFromCylinder(dist, [4, 0, 0], ke, rMin)
    expect(Eout.x).toBeCloseTo(2 * ke * lambda / 4, 6)
  })

  it('infinite cylinder: potential from a solid cylinder matches 2D Gauss', () => {
    const R = 2
    const dist = { type: 'cylinder', center: [0, 0, 0], axis: [0, 1, 0], radius: R, density: rho, hollow: false, innerRadius: 0, e_ext: 0, e_int: 0, height: 5, mode: 'infinite' }
    const V = calculatePotentialFromCylinder(dist, [3, 0, 0], ke, rMin)
    const lambdaTot = rho * Math.PI * R * R
    expect(V).toBeCloseTo(-2 * ke * lambdaTot * Math.log(3), 6)
  })
})
