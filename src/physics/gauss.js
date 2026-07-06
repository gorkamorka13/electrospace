import * as THREE from 'three'
import { KE_REAL } from './coulomb'

export function calculateGaussParameters(state) {
  const { distributions, charges, gaussSurfaceType, gaussSurfaceRadius, gaussSurfaceHeight, gaussSurfaceWidth, gaussSurfaceDepth, gaussCenter, chargeUnit, ke, rMin } = state

  const activeDist = distributions[0] || null
  const configName = activeDist ? activeDist.type : 'charges'
  const R = activeDist?.radius || 1
  const hollow = activeDist?.hollow || false
  const sigma = activeDist?.density || 0
  const lambda = activeDist?.density || 0
  const volumeCharge = activeDist?.density || 0

  const r_g = gaussSurfaceRadius
  const h_g = gaussSurfaceHeight
  const w_g = gaussSurfaceWidth

  let qInt = 0
  let area = 0
  let Q = 0

  if (configName === 'sphere' && activeDist) {
    const { hollow, innerRadius = 0, e_ext = 0, e_int = 0 } = activeDist
    const a = innerRadius || 0
    const b = R
    if (hollow) {
      Q = sigma * (4 * Math.PI * b * b)
      qInt = r_g < b ? 0 : Q
    } else if (e_ext > 0 || (a > 0 && e_int > 0)) {
      const innerOuter = b - e_ext
      const innerInner = a - e_int
      let volUpToRg = 0
      if (e_ext > 0 && r_g > innerOuter) {
        const top = Math.min(r_g, b)
        if (top > innerOuter) volUpToRg += 4 / 3 * Math.PI * (top * top * top - Math.max(innerOuter, 0) * Math.max(innerOuter, 0) * Math.max(innerOuter, 0))
      }
      if (a > 0 && e_int > 0 && r_g > innerInner) {
        const top = Math.min(r_g, a)
        if (top > innerInner) volUpToRg += 4 / 3 * Math.PI * (top * top * top - Math.max(innerInner, 0) * Math.max(innerInner, 0) * Math.max(innerInner, 0))
      }
      const Vouter = e_ext > 0 ? 4 / 3 * Math.PI * (b * b * b - Math.max(innerOuter, 0) * Math.max(innerOuter, 0) * Math.max(innerOuter, 0)) : 0
      const Vinner = (a > 0 && e_int > 0) ? 4 / 3 * Math.PI * (a * a * a - Math.max(innerInner, 0) * Math.max(innerInner, 0) * Math.max(innerInner, 0)) : 0
      Q = sigma * (Vouter + Vinner)
      qInt = sigma * volUpToRg
    } else {
      const Vshell = 4 / 3 * Math.PI * (b * b * b - a * a * a)
      Q = sigma * Vshell
      if (r_g <= a) {
        qInt = 0
      } else if (r_g >= b) {
        qInt = Q
      } else {
        qInt = sigma * 4 / 3 * Math.PI * (r_g * r_g * r_g - a * a * a)
      }
    }
    area = 4 * Math.PI * r_g * r_g
  } else if (configName === 'cylinder' && activeDist) {
    const { axis, radius, innerRadius = 0, e_ext = 0, e_int = 0 } = activeDist
    const a = innerRadius || 0
    const b = radius
    if (hollow) {
      const lambdaTotal = sigma * (2 * Math.PI * b)
      Q = lambdaTotal * h_g
      qInt = r_g < b ? 0 : lambdaTotal * h_g
    } else if (e_ext > 0 || (a > 0 && e_int > 0)) {
      const innerOuter = b - e_ext
      const innerInner = a - e_int
      let areaUpToRg = 0
      if (e_ext > 0 && r_g > innerOuter) {
        const top = Math.min(r_g, b)
        if (top > innerOuter) areaUpToRg += Math.PI * (top * top - Math.max(innerOuter, 0) * Math.max(innerOuter, 0))
      }
      if (a > 0 && e_int > 0 && r_g > innerInner) {
        const top = Math.min(r_g, a)
        if (top > innerInner) areaUpToRg += Math.PI * (top * top - Math.max(innerInner, 0) * Math.max(innerInner, 0))
      }
      const Aouter = e_ext > 0 ? Math.PI * (b * b - Math.max(innerOuter, 0) * Math.max(innerOuter, 0)) : 0
      const Ainner = (a > 0 && e_int > 0) ? Math.PI * (a * a - Math.max(innerInner, 0) * Math.max(innerInner, 0)) : 0
      Q = sigma * (Aouter + Ainner) * h_g
      qInt = sigma * areaUpToRg * h_g
    } else if (a > 0) {
      const lambdaTotal = sigma * Math.PI * (b * b - a * a)
      Q = lambdaTotal * h_g
      if (r_g <= a) {
        qInt = 0
      } else if (r_g >= b) {
        qInt = Q
      } else {
        qInt = sigma * Math.PI * (r_g * r_g - a * a) * h_g
      }
    } else {
      const lambdaTotal = sigma * Math.PI * b * b
      Q = lambdaTotal * h_g
      qInt = r_g < b ? sigma * Math.PI * r_g * r_g * h_g : lambdaTotal * h_g
    }
    area = 2 * Math.PI * r_g * h_g
  } else if (configName === 'plane' && activeDist) {
    const S = gaussSurfaceWidth * gaussSurfaceDepth
    Q = sigma * S
    qInt = sigma * S
    area = 2 * S
  } else if (configName === 'line' && activeDist) {
    const lambdaLine = sigma
    Q = lambdaLine * h_g
    area = 2 * Math.PI * r_g * h_g
    qInt = lambdaLine * h_g
  } else if (configName === 'charges') {
    const multiplier = chargeUnit === 'uC' ? 1e-6 : chargeUnit === 'nC' ? 1e-9 : chargeUnit === 'C' ? 1 : 1.602176634e-19
    const gaussPos = new THREE.Vector3(...gaussCenter)
    for (const c of charges) {
      const d = new THREE.Vector3(...c.position).distanceTo(gaussPos)
      if (d < r_g) qInt += c.q * multiplier
    }
    Q = charges.reduce((s, c) => s + c.q, 0)
    area = gaussSurfaceType === 'sphere' ? 4 * Math.PI * r_g * r_g
      : gaussSurfaceType === 'cylinder' ? 2 * Math.PI * r_g * h_g
      : 2 * (gaussSurfaceWidth * gaussSurfaceDepth + gaussSurfaceWidth * gaussSurfaceHeight + gaussSurfaceHeight * gaussSurfaceDepth)
  }

  const flux = qInt > 0 ? qInt / (1 / (4 * Math.PI * KE_REAL)) : 0
  const eps0 = 1 / (4 * Math.PI * KE_REAL)
  const eField = area > 1e-30 ? Math.abs(qInt) / (eps0 * area) : 0

  return { qInt, flux, area, eField, configName, R, hollow, r_g, h_g, w_g, sigma, lambda, Q }
}
