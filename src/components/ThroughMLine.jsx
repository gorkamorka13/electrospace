import { useState, useEffect, useRef } from 'react'
import { Line } from '@react-three/drei'
import { useStore, UNIT_FACTORS } from '../store/useStore'
import { useFieldWorker } from '../hooks/useFieldWorker'

export function ThroughMLine() {
  const charges = useStore((state) => state.charges)
  const distributions = useStore((state) => state.distributions)
  const testPoint = useStore((state) => state.testPoint)
  const showThroughMLine = useStore((state) => state.showThroughMLine)
  const chargeUnit = useStore((state) => state.chargeUnit)
  const theme = useStore((state) => state.theme)
  const { compute } = useFieldWorker()
  const [lineData, setLineData] = useState(null)
  const cancelledRef = useRef(false)

  useEffect(() => {
    cancelledRef.current = true

    if (!showThroughMLine || (charges.length === 0 && distributions.length === 0)) {
      return
    }

    const multiplier = UNIT_FACTORS[chargeUnit] || 1e-6
    const physicalCharges = distributions.length > 0 ? [] : charges.map(c => ({ ...c, q: c.q * multiplier }))
    const { ke, rMin } = useStore.getState()
    const opts = {
      ke, rMin, rStop: 0.6, maxDist: 25, maxSteps: 800, stepSize: 0.15, epsilon: 1e-25,
      distributions,
    }

    cancelledRef.current = false

    Promise.all([
      compute('traceFieldLine', { startPos: testPoint, charges: physicalCharges, opts: { ...opts, direction: 1 } }),
      compute('traceFieldLine', { startPos: testPoint, charges: physicalCharges, opts: { ...opts, direction: -1 } }),
    ])
      .then(([forwardPts, backwardPts]) => {
        if (cancelledRef.current) return
        backwardPts.reverse()
        const allPts = [...backwardPts, ...forwardPts]
        setLineData(allPts.length >= 2 ? allPts : null)
      })
      .catch(() => {
        if (!cancelledRef.current) setLineData(null)
      })

    return () => { cancelledRef.current = true }
  }, [showThroughMLine, charges, distributions, chargeUnit, testPoint, compute])

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
