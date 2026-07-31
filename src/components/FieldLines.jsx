import { useState, useEffect, useRef } from 'react'
import { Line } from '@react-three/drei'
import { useStore, UNIT_FACTORS } from '../store/useStore'
import { getDistributionSeeds } from '../physics/coulomb'
import { fibonacciSphere } from '../physics/utils'
import { useFieldWorker } from '../hooks/useFieldWorker'

const LINE_COLOR_CHARGE = '#fbbf24'
const LINE_COLOR_DIST = '#f97316'

export function FieldLines() {
  const charges = useStore((state) => state.charges)
  const distributions = useStore((state) => state.distributions)
  const showFieldLines = useStore((state) => state.showFieldLines)
  const chargeUnit = useStore((state) => state.chargeUnit)
  const fieldLinesPerCharge = useStore((state) => state.fieldLinesPerCharge)
  const fieldLineStep = useStore((state) => state.fieldLineStep)
  const integrationMethod = useStore((state) => state.integrationMethod)
  const { traceFieldLines } = useFieldWorker()
  const [allLinePoints, setAllLinePoints] = useState([])
  const cancelledRef = useRef(false)
  const key = `${showFieldLines}|${charges.length}|${distributions.length}|${chargeUnit}|${fieldLinesPerCharge}|${fieldLineStep}|${integrationMethod}`

  useEffect(() => {
    cancelledRef.current = false
    if (!showFieldLines || (charges.length === 0 && distributions.length === 0)) {
      setAllLinePoints([])
      return
    }

    const hasDists = distributions.length > 0
    const multiplier = UNIT_FACTORS[chargeUnit] || 1e-6
    const physicalCharges = hasDists ? [] : charges.map(c => ({ ...c, q: c.q * multiplier }))
    const { ke, rMin } = useStore.getState()
    const N = fieldLinesPerCharge
    const seeds = []

    for (const charge of physicalCharges) {
      if (hasDists) break
      const direction = charge.q >= 0 ? 1 : -1
      const sphereSeeds = fibonacciSphere(N, charge.position, 0.7)
      for (const seed of sphereSeeds) {
        seeds.push({ point: [seed.x, seed.y, seed.z], direction, sourcePos: charge.position, color: LINE_COLOR_CHARGE })
      }
    }

    for (const dist of distributions) {
      const distSeeds = getDistributionSeeds(dist, N)
      for (const { point: seed, direction } of distSeeds) {
        seeds.push({ point: [seed.x, seed.y, seed.z], direction, color: LINE_COLOR_DIST })
      }
    }

    if (seeds.length === 0) {
      setAllLinePoints([])
      return
    }

    const opts = {
      ke, rMin,
      stepSize: fieldLineStep,
      maxSteps: 800,
      rStop: 0.6,
      maxDist: 25,
      epsilon: 1e-25,
      distributions,
      method: integrationMethod,
    }

    traceFieldLines(seeds, physicalCharges, opts)
      .then((lines) => {
        if (cancelledRef.current) return
        const result = []
        for (let i = 0; i < lines.length; i++) {
          const pts = lines[i]
          if (pts.length > 1) {
            if (seeds[i].direction === -1) pts.reverse()
            result.push({ points: pts, color: seeds[i].color })
          }
        }
        setAllLinePoints(result)
      })
      .catch(() => {
        if (!cancelledRef.current) setAllLinePoints([])
      })

    return () => { cancelledRef.current = true }
  }, [key, showFieldLines, charges, distributions, chargeUnit, fieldLinesPerCharge, fieldLineStep, integrationMethod, traceFieldLines])

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
