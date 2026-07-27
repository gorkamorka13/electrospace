import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Billboard, Text } from '@react-three/drei'
import { useStore } from '../store/useStore'
import { formatElectricField } from '../physics/coulomb'

export function ElectricFieldArrow() {
  const theme = useStore((state) => state.theme)
  const arrowRef = useRef()
  const textRef = useRef()
  const billboardRef = useRef()

  useFrame(() => {
    if (!arrowRef.current || !billboardRef.current || !textRef.current) return

    // Fetch the absolute latest store values at 60 FPS bypassing React rendering delay
    const state = useStore.getState()
    const currentTestPoint = state.testPoint
    const currentEMax = state.eMax
    const currentChargeUnit = state.chargeUnit
    const currentVectorScale = state.vectorScale

    // 1. Calculate field using the store getter (returns real physical vector E in V/m)
    const E = state.getElectricField(currentTestPoint)
    const length = E.length()

    if (length < 1e-25) {
      arrowRef.current.visible = false
      billboardRef.current.visible = true
      textRef.current.text = 'E = 0 V/m'
      const zeroPos = new THREE.Vector3(...currentTestPoint).add(new THREE.Vector3(0, 0.45, 0))
      billboardRef.current.position.copy(zeroPos)
      return
    }

    arrowRef.current.visible = true
    billboardRef.current.visible = true

    // 2. Apply base scaling depending on active unit, then user vector scale, then clamp
    let baseScale = 0.0005 // Default for uC (e.g. 1uC at 1m -> 8990 V/m -> ~4.5 units length)
    if (currentChargeUnit === 'nC') baseScale = 0.5 // (1nC at 1m -> 8.99 V/m -> ~4.5 units length)
    if (currentChargeUnit === 'C') baseScale = 5e-10 // (1C at 1m -> 8.99e9 V/m -> ~4.5 units length)
    if (currentChargeUnit === 'e') baseScale = 2e9 // (1e at 1m -> 1.44e-9 V/m -> ~2.88 units length)

    const visualLength = length * baseScale * currentVectorScale
    const renderLength = Math.min(visualLength, currentEMax)

    // Check if visual scaling resulted in an extremely small arrow
    if (renderLength < 0.01) {
      arrowRef.current.visible = false
      billboardRef.current.visible = false
      return
    }

    // 3. Update arrow orientation, length and color
    const dir = E.clone().normalize()
    arrowRef.current.setDirection(dir)

    // Smooth head length and width proportional to the rendering length
    const headLength = Math.min(renderLength * 0.25, 0.7)
    const headWidth = Math.min(renderLength * 0.12, 0.25)
    arrowRef.current.setLength(renderLength, headLength, headWidth)
    arrowRef.current.setColor(new THREE.Color(theme === 'dark' ? '#00ff66' : '#059669'))

    // Place the origin of the arrow helper exactly at the test point M
    arrowRef.current.position.set(currentTestPoint[0], currentTestPoint[1], currentTestPoint[2])

    // 4. Position the text billboard at arrow midpoint + world-up offset
    const textPos = new THREE.Vector3(...currentTestPoint)
      .add(dir.clone().multiplyScalar(renderLength * 0.5))
      .add(new THREE.Vector3(0, 0.45, 0))

    billboardRef.current.position.copy(textPos)

    // Set vector text label (e.g. E = 8.99 kV/m)
    textRef.current.text = `E = ${formatElectricField(length)}`
  })

  // Initialize with dummy values, useFrame updates these immediately
  const initialPoint = [0, 0.5, 2]

  return (
    <>
      <arrowHelper
        ref={arrowRef}
        args={[new THREE.Vector3(1, 0, 0), new THREE.Vector3(...initialPoint), 1, theme === 'dark' ? '#00ff66' : '#059669']}
      />
      <Billboard ref={billboardRef} visible={false}>
        <Text
          ref={textRef}
          fontSize={0.3}
          color={theme === 'dark' ? '#00ff66' : '#059669'}
          anchorX="center"
          anchorY="middle"
          outlineColor={theme === 'dark' ? '#070a13' : '#f8fafc'}
          outlineWidth={0.03}
        >
          E = 0.00 V/m
        </Text>
      </Billboard>
    </>
  )
}
