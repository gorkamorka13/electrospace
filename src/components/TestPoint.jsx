import { useRef, useMemo, useState } from 'react'
import * as THREE from 'three'
import { Billboard, Text } from '@react-three/drei'
import { useStore, UNIT_FACTORS } from '../store/useStore'
import { calculateTotalPotential } from '../physics/coulomb'

export function TestPoint() {
  const testPoint = useStore((state) => state.testPoint)
  const updateTestPoint = useStore((state) => state.updateTestPoint)
  const setDragging = useStore((state) => state.setDragging)
  const selectedObjectId = useStore((state) => state.selectedObjectId)
  const setSelectedObjectId = useStore((state) => state.setSelectedObjectId)
  const activeView = useStore((state) => state.activeView)
  const snapEnabled = useStore((state) => state.snapEnabled)
  const snapSize = useStore((state) => state.snapSize)
  const theme = useStore((state) => state.theme)
  const charges = useStore((state) => state.charges)
  const distributions = useStore((state) => state.distributions)
  const chargeUnit = useStore((state) => state.chargeUnit)

  const potentialStr = useMemo(() => {
    const { ke, rMin } = useStore.getState()
    const multiplier = UNIT_FACTORS[chargeUnit] || 1e-6
    const physicalCharges = distributions.length > 0 ? [] : charges.map(c => ({ ...c, q: c.q * multiplier }))
    const V = calculateTotalPotential(physicalCharges, testPoint, ke, rMin, distributions)
    if (V === 0) return '0 V'
    const abs = Math.abs(V)
    const sign = V < 0 ? '-' : ''
    if (abs >= 0.001 && abs < 1e6) return `${sign}${abs.toFixed(3)} V`
    return `${sign}${abs.toExponential(3)} V`
  }, [charges, distributions, chargeUnit, testPoint])

  const meshRef = useRef()
  const coordTipTimeout = useRef(null)
  const [showCoordTip, setShowCoordTip] = useState(false)
  const isSelected = selectedObjectId === 'testPoint'

  const handlePointerDown = (e) => {
    e.stopPropagation()
    e.target.setPointerCapture(e.pointerId)
    setDragging(true)
    setSelectedObjectId('testPoint')
    if (coordTipTimeout.current) clearTimeout(coordTipTimeout.current)
    setShowCoordTip(true)
  }

  const handlePointerMove = (e) => {
    if (useStore.getState().selectedObjectId !== 'testPoint' || !useStore.getState().isDragging) return
    e.stopPropagation()

    const currentPos = testPoint
    const ray = e.raycaster ? e.raycaster.ray : e.ray
    if (!ray) return

    const plane = new THREE.Plane()
    if (activeView === 'front') {
      plane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, currentPos[2]))
    } else if (activeView === 'side') {
      plane.setFromNormalAndCoplanarPoint(new THREE.Vector3(1, 0, 0), new THREE.Vector3(currentPos[0], 0, 0))
    } else if (activeView === 'top') {
      plane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, currentPos[1], 0))
    } else {
      const origin = new THREE.Vector3(...currentPos)
      const camDir = new THREE.Vector3()
      e.camera.getWorldDirection(camDir)
      plane.setFromNormalAndCoplanarPoint(camDir, origin)
    }

    const targetPos = new THREE.Vector3()
    if (ray.intersectPlane(plane, targetPos)) {
      const snap = (v) => snapEnabled ? Math.round(v / snapSize) * snapSize : v
      let finalPos
      if (activeView === 'front') {
        finalPos = [snap(targetPos.x), snap(targetPos.y), currentPos[2]]
      } else if (activeView === 'side') {
        finalPos = [currentPos[0], snap(targetPos.y), snap(targetPos.z)]
      } else if (activeView === 'top') {
        finalPos = [snap(targetPos.x), currentPos[1], snap(targetPos.z)]
      } else {
        finalPos = [snap(targetPos.x), snap(targetPos.y), snap(targetPos.z)]
      }
      const locked = useStore.getState().lockedAxes
      if (locked.x) finalPos[0] = currentPos[0]
      if (locked.y) finalPos[1] = currentPos[1]
      if (locked.z) finalPos[2] = currentPos[2]
      updateTestPoint(finalPos)
    }
  }

  const handlePointerUp = (e) => {
    e.stopPropagation()
    try {
      e.target.releasePointerCapture(e.pointerId)
    } catch {
      // ignore if already released
    }
    setDragging(false)
    if (coordTipTimeout.current) clearTimeout(coordTipTimeout.current)
    coordTipTimeout.current = setTimeout(() => setShowCoordTip(false), 1000)
  }

  const labelColor = '#f59e0b'
  const potColor = '#c084fc'

  return (
    <group position={testPoint}>
      <mesh
        ref={meshRef}
        castShadow
        receiveShadow
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <sphereGeometry args={[isSelected ? 0.25 : 0.2, 32, 32]} />
        <meshStandardMaterial
          color={labelColor}
          emissive={labelColor}
          emissiveIntensity={isSelected ? 1.5 : 0.5}
          roughness={0.1}
          metalness={0.2}
          opacity={0.4}
          transparent={true}
        />

        <mesh>
          <sphereGeometry args={[0.05, 16, 16]} />
          <meshBasicMaterial color={labelColor} />
        </mesh>
      </mesh>

      <Billboard position={[0, 0.95, 0]}>
        <Text
          fontSize={0.28}
          color={labelColor}
          anchorX="center"
          anchorY="middle"
          outlineColor={theme === 'dark' ? '#070a13' : '#f8fafc'}
          outlineWidth={0.03}
          fontWeight="bold"
        >
          M
        </Text>
      </Billboard>

      <Billboard position={[0, -0.7, 0]}>
        <Text
          fontSize={0.2}
          color={potColor}
          anchorX="center"
          anchorY="middle"
          outlineColor={theme === 'dark' ? '#070a13' : '#f8fafc'}
          outlineWidth={0.03}
        >
          {potentialStr}
        </Text>
      </Billboard>

      {showCoordTip && (
        <Billboard position={[0, -1.1, 0]}>
          <Text
            fontSize={0.2}
            color="#facc15"
            anchorX="center"
            anchorY="middle"
            outlineColor={theme === 'dark' ? '#070a13' : '#f8fafc'}
            outlineWidth={0.02}
            fontWeight="bold"
          >
            [{Number(testPoint[0]).toFixed(2)}, {Number(testPoint[1]).toFixed(2)}, {Number(testPoint[2]).toFixed(2)}]
          </Text>
        </Billboard>
      )}

      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
          <ringGeometry args={[0.35, 0.42, 32]} />
          <meshBasicMaterial color="#00ff66" side={THREE.DoubleSide} transparent opacity={0.9} />
        </mesh>
      )}
    </group>
  )
}
