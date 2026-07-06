import { useMemo } from 'react'
import { Line } from '@react-three/drei'
import * as THREE from 'three'
import { useStore, UNIT_FACTORS } from '../store/useStore'
import { traceFieldLine, getDistributionSeeds } from '../physics/coulomb'
import { fibonacciSphere } from '../physics/utils'

const LINE_COLOR_CHARGE = '#fbbf24'
const LINE_COLOR_DIST = '#a78bfa'

export function FieldLines() {
  const charges = useStore((state) => state.charges)
  const distributions = useStore((state) => state.distributions)
  const showFieldLines = useStore((state) => state.showFieldLines)
  const chargeUnit = useStore((state) => state.chargeUnit)
  const fieldLinesPerCharge = useStore((state) => state.fieldLinesPerCharge)
  const fieldLineStep = useStore((state) => state.fieldLineStep)

  const allLinePoints = useMemo(() => {
    if (!showFieldLines) return []
    const hasCharges = charges.length > 0
    const hasDists = distributions.length > 0
    if (!hasCharges && !hasDists) return []

    const multiplier = UNIT_FACTORS[chargeUnit] || 1e-6
    // When distributions are active, point charges are hidden and must not contribute
    const physicalCharges = hasDists ? [] : charges.map(c => ({ ...c, q: c.q * multiplier }))

    const { ke, rMin } = useStore.getState()
    const rStop = 0.6
    const maxDist = 25
    const maxSteps = 800
    const epsilon = 1e-25
    const rSeed = 0.7
    const N = fieldLinesPerCharge

    const lines = []

    for (const charge of physicalCharges) {
      if (hasDists) break
      const direction = charge.q >= 0 ? 1 : -1
      const seeds = fibonacciSphere(N, charge.position, rSeed)
      for (const seed of seeds) {
        const pts = traceFieldLine(seed, physicalCharges, {
          ke, rMin, rStop, maxDist, maxSteps,
          stepSize: fieldLineStep, direction, epsilon,
          sourcePos: charge.position,
        })
        if (pts.length > 1) {
          if (direction === -1) pts.reverse()
          lines.push({ points: pts, color: LINE_COLOR_CHARGE })
        }
      }
    }

    for (const dist of distributions) {
      const seeds = getDistributionSeeds(dist, N)
      for (const { point: seed, direction } of seeds) {
        const pts = traceFieldLine(seed, physicalCharges, {
          ke, rMin, rStop, maxDist, maxSteps,
          stepSize: fieldLineStep, direction, epsilon,
          distributions: [dist],
        })
        if (pts.length > 1) {
          if (direction === -1) pts.reverse()
          lines.push({ points: pts, color: LINE_COLOR_DIST })
        }
      }
    }

    return lines
  }, [charges, distributions, showFieldLines, chargeUnit, fieldLinesPerCharge, fieldLineStep])

  if (!showFieldLines) return null

  return (
    <>
      {allLinePoints.map((line, i) => (
        <Line
          key={i}
          points={line.points}
          color={line.color}
          lineWidth={1.2}
          opacity={0.65}
          transparent
        />
      ))}
    </>
  )
}
