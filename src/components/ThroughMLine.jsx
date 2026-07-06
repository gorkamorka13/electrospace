import { useMemo } from 'react'
import { Line } from '@react-three/drei'
import * as THREE from 'three'
import { useStore, UNIT_FACTORS } from '../store/useStore'
import { traceFieldLine } from '../physics/coulomb'

export function ThroughMLine() {
  const charges = useStore((state) => state.charges)
  const distributions = useStore((state) => state.distributions)
  const testPoint = useStore((state) => state.testPoint)
  const showThroughMLine = useStore((state) => state.showThroughMLine)
  const chargeUnit = useStore((state) => state.chargeUnit)
  const theme = useStore((state) => state.theme)

  const lineData = useMemo(() => {
    if (!showThroughMLine || (charges.length === 0 && distributions.length === 0)) return null

    const multiplier = UNIT_FACTORS[chargeUnit] || 1e-6
    // When distributions are active, point charges are hidden and must not contribute
    const physicalCharges = distributions.length > 0 ? [] : charges.map(c => ({ ...c, q: c.q * multiplier }))

    const { ke, rMin } = useStore.getState()
    const rStop = 0.6
    const maxDist = 25
    const maxSteps = 800
    const stepSize = 0.15
    const epsilon = 1e-25
    const seed = new THREE.Vector3(...testPoint)

    const forwardPts = traceFieldLine(seed, physicalCharges, {
      ke, rMin, rStop, maxDist, maxSteps, stepSize, direction: 1, epsilon, distributions,
    })

    const backwardPts = traceFieldLine(seed, physicalCharges, {
      ke, rMin, rStop, maxDist, maxSteps, stepSize, direction: -1, epsilon, distributions,
    })

    backwardPts.reverse()
    const allPts = [...backwardPts, ...forwardPts]

    if (allPts.length < 2) return null
    return allPts
  }, [charges, distributions, testPoint, showThroughMLine, chargeUnit])

  if (!showThroughMLine || !lineData) return null

  return (
    <Line
      points={lineData}
      color={theme === 'dark' ? '#22d3ee' : '#0891b2'}
      lineWidth={1.8}
      opacity={0.9}
      transparent
    />
  )
}
