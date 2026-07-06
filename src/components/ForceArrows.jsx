import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Billboard, Text } from '@react-three/drei'
import { useStore } from '../store/useStore'
import { formatForce } from '../physics/coulomb'

// Scales chosen so that two |q|=1.0 charges 4m apart produce ~3 visual units
const BASE_SCALE_BY_UNIT = {
  uC: 5e3,
  nC: 5e9,
  C:  5e-9,
  e:  2e29,
}

const MAX_CHARGES = 26

function SingleChargeArrow({ slotIndex }) {
  const arrowRef = useRef()
  const billRef = useRef()
  const textRef = useRef()
  const theme = useStore((state) => state.theme)

  useFrame(() => {
    const state = useStore.getState()
    if (!state.showForces) return
    const charge = state.charges[slotIndex]
    if (!charge) return

    const arrow = arrowRef.current
    const bill = billRef.current
    const text = textRef.current
    if (!arrow || !bill || !text) {
      return
    }

    const result = state.getCoulombForces(charge.id)
    if (!result) {
      arrow.visible = false
      bill.visible = false
      return
    }

    const { resultant, contributions } = result
    const magnitude = resultant.length()
    if (magnitude < 1e-30) {
      arrow.visible = false
      bill.visible = false
      return
    }

    let hasRepulsive = false, hasAttractive = false
    const rDir = resultant.clone().normalize()
    for (const c of contributions) {
      if (c.force.dot(rDir) > 0) hasRepulsive = true
      else hasAttractive = true
    }
    const color = hasRepulsive && hasAttractive ? '#facc15'
      : hasRepulsive ? '#f97316' : '#a855f7'

    const baseScale = BASE_SCALE_BY_UNIT[state.chargeUnit] ?? BASE_SCALE_BY_UNIT.uC
    const visualLength = magnitude * baseScale * state.vectorScale
    const renderLength = Math.min(visualLength, state.eMax)
    if (renderLength < 0.01) {
      arrow.visible = false
      bill.visible = false
      return
    }

    const dir = resultant.clone().normalize()
    arrow.setDirection(dir)
    const headLength = Math.min(renderLength * 0.25, 0.7)
    const headWidth = Math.min(renderLength * 0.12, 0.25)
    arrow.setLength(renderLength, headLength, headWidth)
    arrow.setColor(new THREE.Color(color))
    arrow.position.set(...charge.position)
    arrow.visible = true

    const textPos = new THREE.Vector3(...charge.position)
      .add(dir.clone().multiplyScalar(renderLength * 0.5))
      .add(new THREE.Vector3(0, 0.55, 0))
    bill.position.copy(textPos)
    text.text = `F⃗${charge.name ?? charge.id} = ${formatForce(magnitude)}`
    text.color = color
    bill.visible = true
  })

  const textColor = theme === 'dark' ? '#facc15' : '#92400e'
  const outlineColor = theme === 'dark' ? '#070a13' : '#f8fafc'

  return (
    <group>
      <arrowHelper
        ref={arrowRef}
        args={[new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), 1, '#f97316']}
        visible={false}
      />
      <Billboard ref={billRef} visible={false}>
        <Text
          ref={textRef}
          fontSize={0.28}
          color={textColor}
          anchorX="center"
          anchorY="middle"
          outlineColor={outlineColor}
          outlineWidth={0.03}
        >
          {''}
        </Text>
      </Billboard>
    </group>
  )
}

export function ForceArrows() {
  const showForces = useStore((state) => state.showForces)
  const charges = useStore((state) => state.charges)
  const selectedObjectId = useStore((state) => state.selectedObjectId)

  const selectedCharge = useMemo(() => {
    if (!selectedObjectId || selectedObjectId === 'testPoint') return null
    return charges.find((c) => c.id === selectedObjectId) || null
  }, [charges, selectedObjectId])

  if (!showForces || !selectedCharge) return null

  const slotIndex = charges.indexOf(selectedCharge)
  if (slotIndex < 0 || slotIndex >= MAX_CHARGES) return null

  return <SingleChargeArrow key={selectedCharge.id} slotIndex={slotIndex} />
}
