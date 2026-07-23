import { describe, it, expect } from 'vitest'
import { calculateGaussParameters } from './gauss'
import { KE_REAL } from './coulomb'

const EPS0 = 1 / (4 * Math.PI * KE_REAL)
const R = 2
const rho = 1e-6

function makeState(overrides = {}) {
  return {
    distributions: [],
    charges: [],
    gaussSurfaceType: 'sphere',
    gaussSurfaceRadius: 2,
    gaussSurfaceHeight: 4,
    gaussSurfaceWidth: 4,
    gaussSurfaceDepth: 4,
    gaussCenter: [0, 0, 0],
    chargeUnit: 'C',
    ke: KE_REAL,
    rMin: 0.001,
    ...overrides,
  }
}

function QsphereFull(r) { return rho * (4 / 3 * Math.PI * r * r * r) }

function QsphereShell(r, a) { return rho * (4 / 3 * Math.PI * (r * r * r - a * a * a)) }

function QcylFull(r) { return rho * Math.PI * r * r }

function QcylShell(r, a) { return rho * Math.PI * (r * r - a * a) }

// ============================================================
// SPHERE — Solid
// ============================================================
describe('calculateGaussParameters — sphere (solid)', () => {
  const dist = { type: 'sphere', center: [0, 0, 0], radius: R, density: rho, hollow: false, innerRadius: 0, e_ext: 0, e_int: 0 }

  it('r_g < R — qInt is fraction of total', () => {
    const r_g = 1
    const state = makeState({ distributions: [dist], gaussSurfaceType: 'sphere', gaussSurfaceRadius: r_g })
    const result = calculateGaussParameters(state)
    const expectedQ = QsphereFull(r_g)
    expect(result.qInt).toBeCloseTo(expectedQ, 12)
    expect(result.area).toBeCloseTo(4 * Math.PI * r_g * r_g, 10)
    const eExpected = Math.abs(expectedQ) / (EPS0 * result.area)
    expect(result.eField).toBeCloseTo(eExpected, 5)
  })

  it('r_g > R — qInt equals total Q', () => {
    const r_g = 5
    const state = makeState({ distributions: [dist], gaussSurfaceType: 'sphere', gaussSurfaceRadius: r_g })
    const result = calculateGaussParameters(state)
    const totalQ = QsphereFull(R)
    expect(result.qInt).toBeCloseTo(totalQ, 12)
    expect(result.area).toBeCloseTo(4 * Math.PI * r_g * r_g, 10)
    const eExpected = Math.abs(totalQ) / (EPS0 * result.area)
    expect(result.eField).toBeCloseTo(eExpected, 5)
  })

  it('r_g == R — qInt equals total Q', () => {
    const state = makeState({ distributions: [dist], gaussSurfaceType: 'sphere', gaussSurfaceRadius: R })
    const result = calculateGaussParameters(state)
    expect(result.qInt).toBeCloseTo(QsphereFull(R), 12)
  })

  it('r_g = 0 — qInt is 0', () => {
    const state = makeState({ distributions: [dist], gaussSurfaceType: 'sphere', gaussSurfaceRadius: 0 })
    const result = calculateGaussParameters(state)
    expect(result.qInt).toBe(0)
  })

  it('density = 0 — qInt is 0', () => {
    const zeroDist = { ...dist, density: 0 }
    const state = makeState({ distributions: [zeroDist], gaussSurfaceType: 'sphere', gaussSurfaceRadius: 5 })
    const result = calculateGaussParameters(state)
    expect(result.qInt).toBe(0)
    expect(result.eField).toBe(0)
  })

  it('negative density — qInt negative, eField positive', () => {
    const negDist = { ...dist, density: -rho }
    const state = makeState({ distributions: [negDist], gaussSurfaceType: 'sphere', gaussSurfaceRadius: 1 })
    const result = calculateGaussParameters(state)
    expect(result.qInt).toBeLessThan(0)
    expect(result.eField).toBeGreaterThan(0)
  })

  it('configName reflects distribution type', () => {
    const state = makeState({ distributions: [dist], gaussSurfaceType: 'sphere' })
    const result = calculateGaussParameters(state)
    expect(result.configName).toBe('sphere')
  })
})

// ============================================================
// SPHERE — Hollow
// ============================================================
describe('calculateGaussParameters — sphere (hollow)', () => {
  const dist = { type: 'sphere', center: [0, 0, 0], radius: R, density: rho, hollow: true, innerRadius: 0, e_ext: 0, e_int: 0 }

  it('r_g < R — qInt = 0 (no field inside)', () => {
    const state = makeState({ distributions: [dist], gaussSurfaceType: 'sphere', gaussSurfaceRadius: 1 })
    const result = calculateGaussParameters(state)
    expect(result.qInt).toBeCloseTo(0, 15)
    expect(result.eField).toBe(0)
  })

  it('r_g > R — qInt = sigma * 4πR²', () => {
    const r_g = 5
    const state = makeState({ distributions: [dist], gaussSurfaceType: 'sphere', gaussSurfaceRadius: r_g })
    const result = calculateGaussParameters(state)
    const expectedQ = rho * (4 * Math.PI * R * R)
    expect(result.qInt).toBeCloseTo(expectedQ, 10)
  })
})

// ============================================================
// SPHERE — Thick shell (innerRadius > 0)
// ============================================================
describe('calculateGaussParameters — sphere (thick shell)', () => {
  const a = 1
  const dist = { type: 'sphere', center: [0, 0, 0], radius: R, density: rho, hollow: false, innerRadius: a, e_ext: 0, e_int: 0 }

  it('r_g < a — qInt = 0 (cavity)', () => {
    const state = makeState({ distributions: [dist], gaussSurfaceType: 'sphere', gaussSurfaceRadius: 0.5 })
    const result = calculateGaussParameters(state)
    expect(result.qInt).toBeCloseTo(0, 15)
  })

  it('a < r_g < R — qInt in shell', () => {
    const r_g = 1.5
    const state = makeState({ distributions: [dist], gaussSurfaceType: 'sphere', gaussSurfaceRadius: r_g })
    const result = calculateGaussParameters(state)
    expect(result.qInt).toBeCloseTo(QsphereShell(r_g, a), 10)
  })

  it('r_g > R — qInt = total shell Q', () => {
    const r_g = 5
    const state = makeState({ distributions: [dist], gaussSurfaceType: 'sphere', gaussSurfaceRadius: r_g })
    const result = calculateGaussParameters(state)
    expect(result.qInt).toBeCloseTo(QsphereShell(R, a), 10)
  })
})

// ============================================================
// SPHERE — Two-shell (e_ext only)
// ============================================================
describe('calculateGaussParameters — sphere (two-shell outer)', () => {
  const eExt = 0.5
  const dist = { type: 'sphere', center: [0, 0, 0], radius: R, density: rho, hollow: false, innerRadius: 0, e_ext: eExt, e_int: 0 }
  const innerOuter = R - eExt

  it('r_g < innerOuter — qInt = 0', () => {
    const state = makeState({ distributions: [dist], gaussSurfaceType: 'sphere', gaussSurfaceRadius: innerOuter - 0.2 })
    const result = calculateGaussParameters(state)
    expect(result.qInt).toBeCloseTo(0, 15)
  })

  it('innerOuter < r_g < R — qInt in outer shell', () => {
    const r_g = 1.7
    const state = makeState({ distributions: [dist], gaussSurfaceType: 'sphere', gaussSurfaceRadius: r_g })
    const result = calculateGaussParameters(state)
    expect(result.qInt).toBeCloseTo(QsphereShell(r_g, innerOuter), 10)
  })

  it('r_g > R — qInt = total outer Q', () => {
    const r_g = 5
    const state = makeState({ distributions: [dist], gaussSurfaceType: 'sphere', gaussSurfaceRadius: r_g })
    const result = calculateGaussParameters(state)
    expect(result.qInt).toBeCloseTo(QsphereShell(R, innerOuter), 10)
  })
})

// ============================================================
// SPHERE — Two-shell (e_int only)
// ============================================================
describe('calculateGaussParameters — sphere (two-shell inner)', () => {
  const a = 1
  const eInt = 0.3
  const dist = { type: 'sphere', center: [0, 0, 0], radius: R, density: rho, hollow: false, innerRadius: a, e_ext: 0, e_int: eInt }
  const innerInner = a - eInt

  it('r_g < innerInner — qInt = 0', () => {
    const state = makeState({ distributions: [dist], gaussSurfaceType: 'sphere', gaussSurfaceRadius: innerInner - 0.2 })
    const result = calculateGaussParameters(state)
    expect(result.qInt).toBeCloseTo(0, 15)
  })

  it('innerInner < r_g < a — qInt in inner shell', () => {
    const r_g = 0.85
    const state = makeState({ distributions: [dist], gaussSurfaceType: 'sphere', gaussSurfaceRadius: r_g })
    const result = calculateGaussParameters(state)
    expect(result.qInt).toBeCloseTo(QsphereShell(r_g, innerInner), 10)
  })

  it('r_g > a — qInt saturates at inner Q (no outer shell)', () => {
    const r_g = 5
    const state = makeState({ distributions: [dist], gaussSurfaceType: 'sphere', gaussSurfaceRadius: r_g })
    const result = calculateGaussParameters(state)
    const expected = QsphereShell(a, innerInner)
    expect(result.qInt).toBeCloseTo(expected, 10)
  })
})

// ============================================================
// SPHERE — Both shells (e_ext + e_int)
// ============================================================
describe('calculateGaussParameters — sphere (both shells)', () => {
  const a = 1
  const eExt = 0.3
  const eInt = 0.3
  const dist = { type: 'sphere', center: [0, 0, 0], radius: R, density: rho, hollow: false, innerRadius: a, e_ext: eExt, e_int: eInt }
  const innerOuter = R - eExt
  const innerInner = a - eInt
  const Qouter = QsphereShell(R, innerOuter)
  const Qinner = QsphereShell(a, innerInner)
  const Qtotal = Qouter + Qinner

  it('r_g < innerInner — qInt = 0', () => {
    const state = makeState({ distributions: [dist], gaussSurfaceType: 'sphere', gaussSurfaceRadius: innerInner - 0.2 })
    const result = calculateGaussParameters(state)
    expect(result.qInt).toBeCloseTo(0, 15)
  })

  it('innerInner < r_g < a — qInt from inner shell only', () => {
    const r_g = 0.85
    const state = makeState({ distributions: [dist], gaussSurfaceType: 'sphere', gaussSurfaceRadius: r_g })
    const result = calculateGaussParameters(state)
    expect(result.qInt).toBeCloseTo(QsphereShell(r_g, innerInner), 10)
  })

  it('innerOuter < r_g < R — qInt = Qinner + portion of outer shell', () => {
    const r_g = 1.85
    const state = makeState({ distributions: [dist], gaussSurfaceType: 'sphere', gaussSurfaceRadius: r_g })
    const result = calculateGaussParameters(state)
    expect(result.qInt).toBeCloseTo(Qinner + QsphereShell(r_g, innerOuter), 10)
  })

  it('r_g > R — qInt = total (inner + outer)', () => {
    const r_g = 5
    const state = makeState({ distributions: [dist], gaussSurfaceType: 'sphere', gaussSurfaceRadius: r_g })
    const result = calculateGaussParameters(state)
    expect(result.qInt).toBeCloseTo(Qtotal, 10)
  })
})

// ============================================================
// CYLINDER — Solid
// ============================================================
describe('calculateGaussParameters — cylinder (solid)', () => {
  const dist = { type: 'cylinder', center: [0, 0, 0], axis: [0, 1, 0], radius: R, density: rho, hollow: false, innerRadius: 0, height: 2, e_ext: 0, e_int: 0 }
  const h_g = 4

  it('r_g < R — qInt = sigma * π * r_g² * h_g', () => {
    const r_g = 1
    const state = makeState({ distributions: [dist], gaussSurfaceType: 'cylinder', gaussSurfaceRadius: r_g, gaussSurfaceHeight: h_g })
    const result = calculateGaussParameters(state)
    expect(result.qInt).toBeCloseTo(QcylFull(r_g) * h_g, 10)
    expect(result.area).toBeCloseTo(2 * Math.PI * r_g * h_g, 10)
  })

  it('r_g > R — qInt = sigma * π * R² * h_g (total)', () => {
    const r_g = 5
    const state = makeState({ distributions: [dist], gaussSurfaceType: 'cylinder', gaussSurfaceRadius: r_g, gaussSurfaceHeight: h_g })
    const result = calculateGaussParameters(state)
    expect(result.qInt).toBeCloseTo(QcylFull(R) * h_g, 10)
  })
})

// ============================================================
// CYLINDER — Hollow
// ============================================================
describe('calculateGaussParameters — cylinder (hollow)', () => {
  const dist = { type: 'cylinder', center: [0, 0, 0], axis: [0, 1, 0], radius: R, density: rho, hollow: true, innerRadius: 0, height: 2, e_ext: 0, e_int: 0 }
  const h_g = 4

  it('r_g < R — qInt = 0', () => {
    const state = makeState({ distributions: [dist], gaussSurfaceType: 'cylinder', gaussSurfaceRadius: 1, gaussSurfaceHeight: h_g })
    const result = calculateGaussParameters(state)
    expect(result.qInt).toBeCloseTo(0, 15)
  })

  it('r_g > R — qInt = sigma * 2πR * h_g', () => {
    const r_g = 5
    const state = makeState({ distributions: [dist], gaussSurfaceType: 'cylinder', gaussSurfaceRadius: r_g, gaussSurfaceHeight: h_g })
    const result = calculateGaussParameters(state)
    const expectedQ = rho * (2 * Math.PI * R) * h_g
    expect(result.qInt).toBeCloseTo(expectedQ, 10)
  })
})

// ============================================================
// CYLINDER — Thick shell
// ============================================================
describe('calculateGaussParameters — cylinder (thick shell)', () => {
  const a = 1
  const dist = { type: 'cylinder', center: [0, 0, 0], axis: [0, 1, 0], radius: R, density: rho, hollow: false, innerRadius: a, height: 2, e_ext: 0, e_int: 0 }
  const h_g = 4

  it('r_g < a — qInt = 0', () => {
    const state = makeState({ distributions: [dist], gaussSurfaceType: 'cylinder', gaussSurfaceRadius: 0.5, gaussSurfaceHeight: h_g })
    const result = calculateGaussParameters(state)
    expect(result.qInt).toBeCloseTo(0, 15)
  })

  it('a < r_g < R — qInt in shell', () => {
    const r_g = 1.5
    const state = makeState({ distributions: [dist], gaussSurfaceType: 'cylinder', gaussSurfaceRadius: r_g, gaussSurfaceHeight: h_g })
    const result = calculateGaussParameters(state)
    expect(result.qInt).toBeCloseTo(QcylShell(r_g, a) * h_g, 10)
  })

  it('r_g > R — qInt = total shell Q', () => {
    const r_g = 5
    const state = makeState({ distributions: [dist], gaussSurfaceType: 'cylinder', gaussSurfaceRadius: r_g, gaussSurfaceHeight: h_g })
    const result = calculateGaussParameters(state)
    expect(result.qInt).toBeCloseTo(QcylShell(R, a) * h_g, 10)
  })
})

// ============================================================
// CYLINDER — Two-shell outer
// ============================================================
describe('calculateGaussParameters — cylinder (two-shell outer)', () => {
  const eExt = 0.5
  const dist = { type: 'cylinder', center: [0, 0, 0], axis: [0, 1, 0], radius: R, density: rho, hollow: false, innerRadius: 0, height: 2, e_ext: eExt, e_int: 0 }
  const h_g = 4
  const innerOuter = R - eExt

  it('r_g < innerOuter — qInt = 0', () => {
    const state = makeState({ distributions: [dist], gaussSurfaceType: 'cylinder', gaussSurfaceRadius: innerOuter - 0.2, gaussSurfaceHeight: h_g })
    const result = calculateGaussParameters(state)
    expect(result.qInt).toBeCloseTo(0, 15)
  })

  it('innerOuter < r_g < R — qInt in outer shell', () => {
    const r_g = 1.7
    const state = makeState({ distributions: [dist], gaussSurfaceType: 'cylinder', gaussSurfaceRadius: r_g, gaussSurfaceHeight: h_g })
    const result = calculateGaussParameters(state)
    expect(result.qInt).toBeCloseTo(QcylShell(r_g, innerOuter) * h_g, 10)
  })

  it('r_g > R — qInt = total outer Q', () => {
    const r_g = 5
    const state = makeState({ distributions: [dist], gaussSurfaceType: 'cylinder', gaussSurfaceRadius: r_g, gaussSurfaceHeight: h_g })
    const result = calculateGaussParameters(state)
    expect(result.qInt).toBeCloseTo(QcylShell(R, innerOuter) * h_g, 10)
  })
})

// ============================================================
// PLANE
// ============================================================
describe('calculateGaussParameters — plane', () => {
  const dist = { type: 'plane', center: [0, 0, 0], density: rho }

  it('qInt = sigma * S, area = 2 * S', () => {
    const w = 4, d = 4
    const state = makeState({ distributions: [dist], gaussSurfaceType: 'box', gaussSurfaceWidth: w, gaussSurfaceDepth: d })
    const result = calculateGaussParameters(state)
    const S = w * d
    expect(result.qInt).toBeCloseTo(rho * S, 12)
    expect(result.area).toBeCloseTo(2 * S, 10)
  })

  it('eField = |qInt| / (eps0 * area)', () => {
    const w = 4, d = 4
    const S = w * d
    const state = makeState({ distributions: [dist], gaussSurfaceType: 'box', gaussSurfaceWidth: w, gaussSurfaceDepth: d })
    const result = calculateGaussParameters(state)
    const eExpected = Math.abs(rho * S) / (EPS0 * (2 * S))
    expect(result.eField).toBeCloseTo(eExpected, 5)
  })

  it('configName is plane', () => {
    const state = makeState({ distributions: [dist], gaussSurfaceType: 'box' })
    const result = calculateGaussParameters(state)
    expect(result.configName).toBe('plane')
  })
})

// ============================================================
// LINE
// ============================================================
describe('calculateGaussParameters — line', () => {
  const dist = { type: 'line', center: [0, 0, 0], density: rho }
  const h_g = 4

  it('qInt = lambda * h_g, area = 2πr_g * h_g', () => {
    const r_g = 2
    const state = makeState({ distributions: [dist], gaussSurfaceType: 'cylinder', gaussSurfaceRadius: r_g, gaussSurfaceHeight: h_g })
    const result = calculateGaussParameters(state)
    expect(result.qInt).toBeCloseTo(rho * h_g, 12)
    expect(result.area).toBeCloseTo(2 * Math.PI * r_g * h_g, 10)
  })

  it('configName is line', () => {
    const state = makeState({ distributions: [dist], gaussSurfaceType: 'cylinder' })
    const result = calculateGaussParameters(state)
    expect(result.configName).toBe('line')
  })
})

// ============================================================
// POINT CHARGES (no distribution)
// ============================================================
describe('calculateGaussParameters — point charges', () => {
  it('single charge inside — qInt = charge.q', () => {
    const charges = [{ q: 5, position: [0, 0, 0] }]
    const state = makeState({ charges, gaussSurfaceType: 'sphere', gaussSurfaceRadius: 3 })
    const result = calculateGaussParameters(state)
    expect(result.qInt).toBeCloseTo(5, 10)
  })

  it('charge outside — qInt = 0', () => {
    const charges = [{ q: 5, position: [10, 0, 0] }]
    const state = makeState({ charges, gaussSurfaceType: 'sphere', gaussSurfaceRadius: 3 })
    const result = calculateGaussParameters(state)
    expect(result.qInt).toBeCloseTo(0, 10)
  })

  it('multiple charges, some in some out', () => {
    const charges = [
      { q: 2, position: [0, 0, 0] },
      { q: -3, position: [0, 0, 0] },
      { q: 5, position: [10, 0, 0] },
    ]
    const state = makeState({ charges, gaussSurfaceType: 'sphere', gaussSurfaceRadius: 3 })
    const result = calculateGaussParameters(state)
    expect(result.qInt).toBeCloseTo(2 - 3, 10)
  })

  it('charge unit conversion (nC)', () => {
    const charges = [{ q: 1, position: [0, 0, 0] }]
    const state = makeState({ charges, chargeUnit: 'nC', gaussSurfaceType: 'sphere', gaussSurfaceRadius: 3 })
    const result = calculateGaussParameters(state)
    expect(result.qInt).toBeCloseTo(1e-9, 15)
  })
})

// ============================================================
// SURFACE TYPES — Area verification
// ============================================================
describe('calculateGaussParameters — surface area', () => {
  const dist = { type: 'sphere', center: [0, 0, 0], radius: R, density: rho, hollow: false, innerRadius: 0, e_ext: 0, e_int: 0 }

  it('sphere area = 4πr²', () => {
    const r_g = 2.5
    const state = makeState({ distributions: [dist], gaussSurfaceType: 'sphere', gaussSurfaceRadius: r_g })
    const result = calculateGaussParameters(state)
    expect(result.area).toBeCloseTo(4 * Math.PI * r_g * r_g, 10)
  })

  it('cylinder area = 2πr h', () => {
    const r_g = 2, h_g = 3
    const cylDist = { type: 'cylinder', center: [0, 0, 0], axis: [0, 1, 0], radius: R, density: rho, hollow: false, innerRadius: 0, height: 2, e_ext: 0, e_int: 0 }
    const state = makeState({ distributions: [cylDist], gaussSurfaceType: 'cylinder', gaussSurfaceRadius: r_g, gaussSurfaceHeight: h_g })
    const result = calculateGaussParameters(state)
    expect(result.area).toBeCloseTo(2 * Math.PI * r_g * h_g, 10)
  })

  it('box area = 2(wd + wh + hd)', () => {
    const w = 3, h = 4, d = 5
    const planeDist = { type: 'plane', center: [0, 0, 0], density: rho }
    const state = makeState({ distributions: [planeDist], gaussSurfaceType: 'box', gaussSurfaceWidth: w, gaussSurfaceHeight: h, gaussSurfaceDepth: d })
    const result = calculateGaussParameters(state)
    expect(result.area).toBeCloseTo(2 * w * d, 10)
  })
})

// ============================================================
// EDGE CASES
// ============================================================
describe('calculateGaussParameters — edge cases', () => {
  it('no distributions, no charges — qInt = 0, eField = 0', () => {
    const state = makeState({ gaussSurfaceType: 'sphere', gaussSurfaceRadius: 2 })
    const result = calculateGaussParameters(state)
    expect(result.qInt).toBe(0)
    expect(result.eField).toBe(0)
  })

  it('r_g = 0 on cylinder — no crash, qInt = 0', () => {
    const dist = { type: 'cylinder', center: [0, 0, 0], axis: [0, 1, 0], radius: R, density: rho, hollow: false, innerRadius: 0, height: 2, e_ext: 0, e_int: 0 }
    const state = makeState({ distributions: [dist], gaussSurfaceType: 'cylinder', gaussSurfaceRadius: 0, gaussSurfaceHeight: 4 })
    const result = calculateGaussParameters(state)
    expect(result.qInt).toBe(0)
  })

  it('r_g = 0 on box — no crash, area = 0, eField = 0', () => {
    const dist = { type: 'plane', center: [0, 0, 0], density: rho }
    const state = makeState({ distributions: [dist], gaussSurfaceType: 'box', gaussSurfaceWidth: 0, gaussSurfaceHeight: 4, gaussSurfaceDepth: 0 })
    const result = calculateGaussParameters(state)
    expect(result.eField).toBe(0)
  })

  it('charge at center (r=0) — no crash, point charge at gaussCenter', () => {
    const charges = [{ q: 3, position: [0, 0, 0] }]
    const state = makeState({ charges, gaussCenter: [0, 0, 0], gaussSurfaceType: 'sphere', gaussSurfaceRadius: 2 })
    const result = calculateGaussParameters(state)
    expect(result.qInt).toBeCloseTo(3, 10)
  })
})

// ============================================================
// PEDAGOGICAL METADATA
// ============================================================
describe('calculateGaussParameters — pedagogical metadata', () => {
  it('returns symmetryDetails, invariances, surfaceAnalysis', () => {
    const dist = { type: 'sphere', center: [0, 0, 0], radius: R, density: rho, hollow: false, innerRadius: 0, e_ext: 0, e_int: 0 }
    const state = makeState({ distributions: [dist], gaussSurfaceType: 'sphere' })
    const result = calculateGaussParameters(state)
    expect(result.symmetryDetails).toBeDefined()
    expect(result.symmetryDetails.basisType).toBe('spherical')
    expect(result.invariances).toBeDefined()
    expect(result.invariances.list.length).toBeGreaterThan(0)
    expect(result.surfaceAnalysis).toBeDefined()
    expect(result.surfaceAnalysis.fluxDecomposition.length).toBeGreaterThan(0)
  })

  it('returns gaussStep4Detail with vectorResult', () => {
    const dist = { type: 'sphere', center: [0, 0, 0], radius: R, density: rho, hollow: false, innerRadius: 0, e_ext: 0, e_int: 0 }
    const state = makeState({ distributions: [dist], gaussSurfaceType: 'sphere', gaussSurfaceRadius: 3 })
    const result = calculateGaussParameters(state)
    expect(result.gaussStep4Detail).toBeDefined()
    expect(result.gaussStep4Detail.vectorResult).toContain('\\vec{e}_r')
  })

  it('returns gaussStep5Detail for sphere', () => {
    const dist = { type: 'sphere', center: [0, 0, 0], radius: R, density: rho, hollow: false, innerRadius: 0, e_ext: 0, e_int: 0 }
    const state = makeState({ distributions: [dist], gaussSurfaceType: 'sphere', gaussSurfaceRadius: 3 })
    const result = calculateGaussParameters(state)
    expect(result.gaussStep5Detail).toBeDefined()
    expect(result.gaussStep5Detail.finalFormula).toBeTruthy()
  })

  it('pedagogical content varies by configName', () => {
    const sphereDist = { type: 'sphere', center: [0, 0, 0], radius: R, density: rho, hollow: false, innerRadius: 0, e_ext: 0, e_int: 0 }
    const sphereResult = calculateGaussParameters(makeState({ distributions: [sphereDist], gaussSurfaceType: 'sphere' }))
    expect(sphereResult.symmetryDetails.basisType).toBe('spherical')

    const planeDist = { type: 'plane', center: [0, 0, 0], density: rho }
    const planeResult = calculateGaussParameters(makeState({ distributions: [planeDist], gaussSurfaceType: 'box' }))
    expect(planeResult.symmetryDetails.basisType).toBe('cartesian')
  })
})
