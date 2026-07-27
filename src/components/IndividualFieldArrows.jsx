import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../store/useStore'
import { calculateFieldFromCharge } from '../physics/coulomb'
import { UNIT_FACTORS } from '../store/useStore'

/**
 * IndividualArrowItem — renders one faded arrow per charge (Ei) at test point M.
 * Only visible when showIndividualFields is true and no distributions are active.
 */
function IndividualArrowItem({ chargeId }) {
  const arrowRef = useRef()

  useFrame(() => {
    const state = useStore.getState()
    const { charges, distributions, chargeUnit, ke, rMin, eMax, vectorScale, theme, testPoint, showIndividualFields } = state

    if (!showIndividualFields || !arrowRef.current) return

    // Hide when distributions are active
    if (distributions.length > 0) {
      arrowRef.current.visible = false
      return
    }

    const multiplier = UNIT_FACTORS[chargeUnit] || 1e-6
    const charge = charges.find(c => c.id === chargeId)
    if (!charge) {
      arrowRef.current.visible = false
      return
    }

    // Calculate this charge's individual field contribution
    const physicalQ = charge.q * multiplier
    const Ei = calculateFieldFromCharge({ ...charge, q: physicalQ }, testPoint, ke, rMin)
    const length = Ei.length()

    // Base scale matching ElectricFieldArrow logic
    let baseScale = 0.0005
    if (chargeUnit === 'nC') baseScale = 0.5
    if (chargeUnit === 'C') baseScale = 5e-10
    if (chargeUnit === 'e') baseScale = 2e9

    if (length < 1e-25) {
      arrowRef.current.visible = false
      return
    }

    const visualLength = length * baseScale * vectorScale
    const renderLength = Math.min(visualLength, eMax)

    if (renderLength < 0.01) {
      arrowRef.current.visible = false
      return
    }

    arrowRef.current.visible = true

    const dir = Ei.clone().normalize()
    arrowRef.current.setDirection(dir)

    const headLength = Math.min(renderLength * 0.25, 0.7)
    const headWidth = Math.min(renderLength * 0.12, 0.25)
    arrowRef.current.setLength(renderLength, headLength, headWidth)
    arrowRef.current.setColor(new THREE.Color(theme === 'dark' ? '#00ff66' : '#059669'))
    arrowRef.current.position.set(testPoint[0], testPoint[1], testPoint[2])

    // Make individual arrows faded (30% opacity) to distinguish from the total E arrow
    const arrowColor = new THREE.Color(theme === 'dark' ? '#00ff66' : '#059669')
    arrowRef.current.setColor(arrowColor)
    if (arrowRef.current.line) {
      arrowRef.current.line.material.transparent = true
      arrowRef.current.line.material.opacity = 0.3
    }
    if (arrowRef.current.cone) {
      arrowRef.current.cone.material.transparent = true
      arrowRef.current.cone.material.opacity = 0.3
    }
  })

  // Initial dummy values — useFrame updates these immediately
  const initialPoint = [0, 0.5, 2]
  const baseColor = '#00ff66'

  return (
    <arrowHelper
      ref={arrowRef}
      args={[new THREE.Vector3(1, 0, 0), new THREE.Vector3(...initialPoint), 0.5, baseColor]}
      visible={false}
    />
  )
}

/**
 * IndividualFieldArrows — renders faded field arrows for each charge,
 * showing the superposition of individual contributions at test point M.
 */
export function IndividualFieldArrows() {
  const showIndividualFields = useStore((state) => state.showIndividualFields)
  const charges = useStore((state) => state.charges)
  const distributions = useStore((state) => state.distributions)

  // Don't render anything if toggled off or distributions are active
  if (!showIndividualFields) return null
  if (distributions.length > 0) return null

  return (
    <group>
      {charges.map((charge) => (
        <IndividualArrowItem
          key={charge.id}
          chargeId={charge.id}
        />
      ))}
    </group>
  )
}
