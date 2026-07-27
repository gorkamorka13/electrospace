import { useRef, useState } from 'react'
import * as THREE from 'three'
import { Billboard, Text } from '@react-three/drei'
import { useStore } from '../store/useStore'

function clamp(v) { return Number(v.toFixed(2)) }

export function ChargeSphere({ charge }) {
  const updateChargePosition = useStore((state) => state.updateChargePosition)
  const pushHistory = useStore((state) => state.pushHistory)
  const setDragging = useStore((state) => state.setDragging)
  const selectedObjectId = useStore((state) => state.selectedObjectId)
  const setSelectedObjectId = useStore((state) => state.setSelectedObjectId)
  const openContextMenu = useStore((state) => state.openContextMenu)
  const activeView = useStore((state) => state.activeView)
  const snapEnabled = useStore((state) => state.snapEnabled)
  const snapSize = useStore((state) => state.snapSize)
  const theme = useStore((state) => state.theme)

  const meshRef = useRef()
  const coordTipTimeout = useRef(null)
  const [showCoordTip, setShowCoordTip] = useState(false)
  const isSelected = selectedObjectId === charge.id
  const radius = Math.max(0.15, Math.min(0.8, 0.35 * Math.pow(Math.abs(charge.q), 1 / 3)))

  const handlePointerDown = (e) => {
    e.stopPropagation()
    e.target.setPointerCapture(e.pointerId)
    setDragging(true)
    setSelectedObjectId(charge.id)
    if (coordTipTimeout.current) clearTimeout(coordTipTimeout.current)
    setShowCoordTip(true)
  }

  const handlePointerMove = (e) => {
    if (useStore.getState().selectedObjectId !== charge.id || !useStore.getState().isDragging) return
    e.stopPropagation()

    const currentPos = charge.position
    const ray = e.ray
    if (!ray || !e.camera) return

    const origin = new THREE.Vector3(currentPos[0], currentPos[1], currentPos[2])
    const plane = new THREE.Plane()

    if (activeView && ['front', 'side', 'top'].includes(activeView)) {
      if (activeView === 'front') {
        plane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, currentPos[2]))
      } else if (activeView === 'side') {
        plane.setFromNormalAndCoplanarPoint(new THREE.Vector3(1, 0, 0), new THREE.Vector3(currentPos[0], 0, 0))
      } else {
        plane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, currentPos[1], 0))
      }
    } else {
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
      updateChargePosition(charge.id, finalPos)
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
    pushHistory()
    if (coordTipTimeout.current) clearTimeout(coordTipTimeout.current)
    coordTipTimeout.current = setTimeout(() => setShowCoordTip(false), 1000)
  }

  // Color gradient based on relative charge magnitude
  const allCharges = useStore((state) => state.charges)
  const maxMag = Math.max(...allCharges.map(c => Math.abs(c.q)), 1)
  const intensity = Math.abs(charge.q) / maxMag
  // positive: hue 0° (red), negative: hue 220° (blue)
  const hue = charge.q >= 0 ? 0 : 220
  const sat = 20 + 70 * intensity
  const lig = 70 - 25 * intensity
  const color = `hsl(${hue}, ${sat}%, ${lig}%)`
  const emissive = `hsl(${hue}, ${Math.min(100, sat * 1.2)}%, ${lig - 10}%)`

  return (
    <group position={charge.position}>
      <mesh
        ref={meshRef}
        castShadow
        receiveShadow
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onContextMenu={(e) => {
          e.stopPropagation()
          setSelectedObjectId(charge.id)
          openContextMenu(e.nativeEvent.clientX, e.nativeEvent.clientY, charge.id, 'charge')
        }}
      >
        {/* Large semi-transparent charge sphere */}
        <sphereGeometry args={[isSelected ? radius + 0.05 : radius, 32, 32]} />
        <meshStandardMaterial
          color={color}
          roughness={0.15}
          metalness={0.1}
          emissive={emissive}
          emissiveIntensity={isSelected ? 1.4 : 0.5}
          opacity={0.4}
          transparent={true}
        />

        {/* Small solid central core representing exact position */}
        <mesh>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshBasicMaterial color={color} />
        </mesh>

        {/* 3D Billboard label displaying point name */}
        <Billboard position={[0, radius + 0.35, 0]}>
          <Text
            fontSize={Math.max(0.25, radius * 0.8)}
            color={color}
            anchorX="center"
            anchorY="middle"
            outlineColor={theme === 'dark' ? '#070a13' : '#f8fafc'}
            outlineWidth={0.03}
            fontWeight="bold"
          >
            {charge.name}
          </Text>
        </Billboard>

        {/* Drag coordinate tooltip — shown while dragging + 1s after */}
        {showCoordTip && (
          <Billboard position={[0, -radius - 0.35, 0]}>
            <Text
              fontSize={0.22}
              color="#facc15"
              anchorX="center"
              anchorY="middle"
              outlineColor={theme === 'dark' ? '#070a13' : '#f8fafc'}
              outlineWidth={0.02}
              fontWeight="bold"
            >
              [{clamp(charge.position[0])}, {clamp(charge.position[1])}, {clamp(charge.position[2])}]
            </Text>
          </Billboard>
        )}

        {/* Neon selection ring under the charge */}
        {isSelected && (
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -radius - 0.05, 0]}>
            <ringGeometry args={[radius * 1.35, radius * 1.5, 32]} />
            <meshBasicMaterial color="#00ff66" side={THREE.DoubleSide} transparent opacity={0.9} />
          </mesh>
        )}
      </mesh>
    </group>
  )
}
