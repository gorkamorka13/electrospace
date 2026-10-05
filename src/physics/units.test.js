import { describe, it, expect } from 'vitest'
import { LENGTH_UNITS, lengthFactor, densityDimension, scaleForLength, fieldArrowFactor } from './units'
import { KE_REAL, E_CHARGE, calculateTotalField, calculateTotalPotential } from './coulomb'
import { calculateGaussParameters } from './gauss'
import { useStore } from '../store/useStore'

const EPS0 = 1 / (4 * Math.PI * KE_REAL)
const R_MIN = 0.001

// Longueurs à convertir quand on réexprime une distribution dans une autre unité
const LENGTH_KEYS = ['length', 'radius', 'innerRadius', 'e_ext', 'e_int', 'width', 'height', 'depth']

/** Même objet physique, mais décrit dans une scène en mètres */
function toMetres(dist, L) {
  const out = { ...dist }
  for (const key of LENGTH_KEYS) if (key in out) out[key] *= L
  if (out.center) out.center = out.center.map((v) => v * L)
  return out
}

const DISTRIBUTIONS = [
  { type: 'line', length: 10, density: 1e-9, mode: 'finite' },
  { type: 'circle', center: [0, 0, 0], normal: [1, 0, 0], radius: 2, density: 1e-9 },
  { type: 'frame', center: [0, 0, 0], normal: [1, 0, 0], width: 4, height: 4, density: 1e-9 },
  { type: 'disk', center: [0, 0, 0], normal: [1, 0, 0], radius: 2, density: 1e-9 },
  { type: 'plane', center: [0, 0, 0], normal: [1, 0, 0], width: 10, height: 10, density: 1e-9, mode: 'finite' },
  { type: 'sphere', center: [0, 0, 0], radius: 2, density: 1e-6, innerRadius: 0, hollow: false, e_ext: 0, e_int: 0 },
  { type: 'sphere', center: [0, 0, 0], radius: 2, density: 1e-6, innerRadius: 0, hollow: true, e_ext: 0, e_int: 0 },
  { type: 'cylinder', center: [0, 0, 0], axis: [0, 0, 1], radius: 2, height: 5, density: 1e-6, hollow: false, innerRadius: 0, e_ext: 0, e_int: 0, mode: 'finite' },
  { type: 'cylinder', center: [0, 0, 0], axis: [0, 0, 1], radius: 2, height: 5, density: 1e-6, hollow: true, innerRadius: 0, e_ext: 0, e_int: 0, mode: 'finite' },
  { type: 'box', center: [0, 0, 0], normal: [1, 0, 0], width: 4, height: 4, depth: 2, density: 1e-6, hollow: false },
  { type: 'box', center: [0, 0, 0], normal: [1, 0, 0], width: 4, height: 4, depth: 2, density: 1e-6, hollow: true },
]

const POINT = [5, 3, 4]

describe('lengthFactor', () => {
  it('returns metres per scene unit', () => {
    expect(lengthFactor('m')).toBe(1)
    expect(lengthFactor('cm')).toBe(1e-2)
    expect(lengthFactor('mm')).toBe(1e-3)
  })

  it('falls back to metres for an unknown unit', () => {
    expect(lengthFactor(undefined)).toBe(1)
    expect(lengthFactor('km')).toBe(1)
  })
})

describe('densityDimension', () => {
  it('is 1 for linear, 2 for surface, 3 for volume densities', () => {
    expect(densityDimension({ type: 'line' })).toBe(1)
    expect(densityDimension({ type: 'circle' })).toBe(1)
    expect(densityDimension({ type: 'frame' })).toBe(1)
    expect(densityDimension({ type: 'plane' })).toBe(2)
    expect(densityDimension({ type: 'disk' })).toBe(2)
    expect(densityDimension({ type: 'sphere', hollow: false })).toBe(3)
    expect(densityDimension({ type: 'cylinder', hollow: false })).toBe(3)
    expect(densityDimension({ type: 'box', hollow: false })).toBe(3)
  })

  it('is 2 for hollow volumes (surface charge)', () => {
    expect(densityDimension({ type: 'sphere', hollow: true })).toBe(2)
    expect(densityDimension({ type: 'cylinder', hollow: true })).toBe(2)
    expect(densityDimension({ type: 'box', hollow: true })).toBe(2)
  })
})

describe('scaleForLength', () => {
  it('is the identity in metres', () => {
    const dists = [DISTRIBUTIONS[0]]
    const scaled = scaleForLength(dists, KE_REAL, 'm')
    expect(scaled.distributions).toBe(dists)
    expect(scaled.keField).toBe(KE_REAL)
    expect(scaled.kePotential).toBe(KE_REAL)
  })

  it('does not mutate the input distributions', () => {
    const dist = { ...DISTRIBUTIONS[5] }
    scaleForLength([dist], KE_REAL, 'cm')
    expect(dist.density).toBe(1e-6)
  })

  for (const unit of ['cm', 'mm']) {
    const L = LENGTH_UNITS[unit]

    it(`point charge in ${unit} matches the same scene in metres`, () => {
      const charge = { q: 1e-9, position: [1, 2, 0] }
      const { keField, kePotential } = scaleForLength([], KE_REAL, unit)
      const E = calculateTotalField([charge], POINT, keField, R_MIN, [])
      const V = calculateTotalPotential([charge], POINT, kePotential, R_MIN, [])

      const chargeM = { q: 1e-9, position: charge.position.map((v) => v * L) }
      const pointM = POINT.map((v) => v * L)
      const Eref = calculateTotalField([chargeM], pointM, KE_REAL, R_MIN * L, [])
      const Vref = calculateTotalPotential([chargeM], pointM, KE_REAL, R_MIN * L, [])

      expect(E.length() / Eref.length()).toBeCloseTo(1, 9)
      expect(V / Vref).toBeCloseTo(1, 9)
    })

    for (const dist of DISTRIBUTIONS) {
      // The finite cylinder picks its ring grid from the distance to the target in scene units:
      // stay close to it so that both scenes are integrated on the same (finest) grid.
      const point = dist.type === 'cylinder' ? [2.3, 0.4, 0.5] : POINT

      it(`${dist.type}${dist.hollow ? ' (hollow)' : ''} in ${unit} matches the same scene in metres`, () => {
        const scaled = scaleForLength([dist], KE_REAL, unit)
        const E = calculateTotalField([], point, scaled.keField, R_MIN, scaled.distributions)
        const V = calculateTotalPotential([], point, scaled.kePotential, R_MIN, scaled.distributions)

        const distM = [toMetres(dist, L)]
        const pointM = point.map((v) => v * L)
        const Eref = calculateTotalField([], pointM, KE_REAL, R_MIN * L, distM)
        const Vref = calculateTotalPotential([], pointM, KE_REAL, R_MIN * L, distM)

        expect(Eref.length()).toBeGreaterThan(0)
        expect(E.x / Eref.length()).toBeCloseTo(Eref.x / Eref.length(), 6)
        expect(E.y / Eref.length()).toBeCloseTo(Eref.y / Eref.length(), 6)
        expect(E.z / Eref.length()).toBeCloseTo(Eref.z / Eref.length(), 6)
        expect(V / Vref).toBeCloseTo(1, 6)
      })
    }
  }
})

describe('fieldArrowFactor', () => {
  it('is 1 in metres', () => {
    expect(fieldArrowFactor([], 'm')).toBe(1)
    expect(fieldArrowFactor([DISTRIBUTIONS[5]], 'm')).toBe(1)
  })

  it('cancels the 1/r² gain of point charges', () => {
    expect(fieldArrowFactor([], 'cm')).toBeCloseTo(1e-4, 12)
  })

  it('uses the lowest density dimension present', () => {
    expect(fieldArrowFactor([DISTRIBUTIONS[5]], 'cm')).toBeCloseTo(1e2, 9) // ρ : L^-1
    expect(fieldArrowFactor([DISTRIBUTIONS[3]], 'cm')).toBeCloseTo(1, 12) // σ : L^0
    expect(fieldArrowFactor([DISTRIBUTIONS[5], DISTRIBUTIONS[0]], 'cm')).toBeCloseTo(1e-2, 12) // λ : L^1
  })
})

describe('calculateGaussParameters — distance scale', () => {
  const base = {
    charges: [],
    gaussSurfaceType: 'sphere',
    gaussSurfaceRadius: 1,
    gaussSurfaceHeight: 4,
    gaussSurfaceWidth: 4,
    gaussSurfaceDepth: 4,
    gaussCenter: [3, 0, 0],
    chargeUnit: 'C',
  }
  const L = 1e-2

  it('solid sphere in cm: E = ρ r / (3 ε0) with r in metres', () => {
    const rho = 1e-6
    const dist = { type: 'sphere', center: [0, 0, 0], radius: 2, density: rho, hollow: false, innerRadius: 0, e_ext: 0, e_int: 0 }
    const res = calculateGaussParameters({ ...base, distributions: [dist], lengthUnit: 'cm' })
    expect(res.area).toBeCloseTo(4 * Math.PI * L * L, 12)
    expect(res.qInt / (rho * (4 / 3) * Math.PI * L ** 3)).toBeCloseTo(1, 9)
    expect(res.eField / (rho * L / (3 * EPS0))).toBeCloseTo(1, 9)
  })

  it('infinite plane in cm: E = σ / (2 ε0) regardless of scale', () => {
    const sigma = 1e-9
    const dist = { type: 'plane', center: [0, 0, 0], normal: [1, 0, 0], width: 10, height: 10, density: sigma, mode: 'infinite' }
    const res = calculateGaussParameters({ ...base, gaussSurfaceType: 'box', distributions: [dist], lengthUnit: 'cm' })
    expect(res.eField / (sigma / (2 * EPS0))).toBeCloseTo(1, 9)
  })

  it('line in mm: E = λ / (2π ε0 r) with r in metres', () => {
    const lambda = 1e-9
    const dist = { type: 'line', length: 10, density: lambda, mode: 'infinite' }
    const res = calculateGaussParameters({ ...base, gaussSurfaceType: 'cylinder', distributions: [dist], lengthUnit: 'mm' })
    expect(res.eField / (lambda / (2 * Math.PI * EPS0 * 1e-3))).toBeCloseTo(1, 9)
  })

  it('point charges in cm: enclosed charge is unchanged, area is in m²', () => {
    const charges = [{ q: 2, position: [3, 0, 0] }]
    const res = calculateGaussParameters({ ...base, charges, distributions: [], lengthUnit: 'cm' })
    expect(res.qInt).toBe(2)
    expect(res.area).toBeCloseTo(4 * Math.PI * L * L, 12)
  })

  it('defaults to metres when lengthUnit is absent', () => {
    const dist = { type: 'sphere', center: [0, 0, 0], radius: 2, density: 1e-6, hollow: false, innerRadius: 0, e_ext: 0, e_int: 0 }
    const res = calculateGaussParameters({ ...base, distributions: [dist] })
    expect(res.area).toBeCloseTo(4 * Math.PI, 9)
  })
})

describe('store — four equal charges on a 2 cm square, M on the axis at z = 4 cm', () => {
  // Coins du carré à (±1, ±1, 0) cm, M à (0, 0, 4) cm : r = √18 cm pour chaque charge
  const charges = [[1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0]].map((position, i) => (
    { id: String(i + 1), q: 1, position, name: 'ABCD'[i] }
  ))
  const M = [0, 0, 4]
  const r = Math.sqrt(18) * 1e-2
  const z = 4e-2

  for (const [chargeUnit, q] of [['nC', 1e-9], ['uC', 1e-6], ['e', E_CHARGE]]) {
    it(`matches E = 4 k q z / r³ and V = 4 k q / r for q = 1 ${chargeUnit}`, () => {
      useStore.setState({ charges, distributions: [], chargeUnit, lengthUnit: 'cm' })
      const E = useStore.getState().getElectricField(M)
      const V = useStore.getState().getPotential(M)

      // Par symétrie, les composantes transverses s'annulent
      expect(Math.abs(E.x) / E.z).toBeLessThan(1e-12)
      expect(Math.abs(E.y) / E.z).toBeLessThan(1e-12)
      expect(E.z / (4 * KE_REAL * q * z / r ** 3)).toBeCloseTo(1, 12)
      expect(V / (4 * KE_REAL * q / r)).toBeCloseTo(1, 12)
    })
  }

  it('in metres the same numbers describe a 2 m square: E is 10⁴ times weaker, V 10² times', () => {
    useStore.setState({ charges, distributions: [], chargeUnit: 'nC', lengthUnit: 'cm' })
    const Ecm = useStore.getState().getElectricField(M).z
    const Vcm = useStore.getState().getPotential(M)
    useStore.setState({ lengthUnit: 'm' })
    expect(Ecm / useStore.getState().getElectricField(M).z).toBeCloseTo(1e4, 6)
    expect(Vcm / useStore.getState().getPotential(M)).toBeCloseTo(1e2, 8)
  })
})
