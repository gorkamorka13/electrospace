import { useRef } from 'react'
import * as THREE from 'three'
import { Billboard, Text } from '@react-three/drei'
import { useStore } from '../store/useStore'

export function GaussianSurfaceVis() {
  const showGaussCompanion = useStore((state) => state.showGaussCompanion)
  const gaussStep = useStore((state) => state.gaussStep)
  const gaussSurfaceType = useStore((state) => state.gaussSurfaceType)
  const gaussSurfaceRadius = useStore((state) => state.gaussSurfaceRadius)
  const gaussSurfaceHeight = useStore((state) => state.gaussSurfaceHeight)
  const gaussSurfaceWidth = useStore((state) => state.gaussSurfaceWidth)
  const gaussSurfaceDepth = useStore((state) => state.gaussSurfaceDepth)
  const gaussCenter = useStore((state) => state.gaussCenter)
  const testPoint = useStore((state) => state.testPoint)
  const distributions = useStore((state) => state.distributions)

  const groupRef = useRef()

  if (!showGaussCompanion) return null

  const activeDist = distributions[0] || null
  const configType = activeDist ? activeDist.type : 'charges'

  // Glowing, translucent green-cyan for Gaussian surface
  const surfaceColor = '#10b981' 
  const edgeColor = '#34d399'

  // Position of evaluation Point M from store
  const mWorld = new THREE.Vector3(...testPoint)
  const centerVec = new THREE.Vector3(...gaussCenter)
  const relM = mWorld.clone().sub(centerVec)

  // Local Basis Vectors calculation at point M
  let e_rad = new THREE.Vector3(1, 0, 0)
  let e_tan = new THREE.Vector3(0, 1, 0)
  let e_third = new THREE.Vector3(0, 0, 1)

  let label1 = 'e_r'
  let label2 = 'e_θ'
  let label3 = 'e_φ'

  if (gaussSurfaceType === 'sphere' || configType === 'sphere') {
    e_rad = relM.lengthSq() > 1e-6 ? relM.clone().normalize() : new THREE.Vector3(1, 0, 0)
    // tangent e_θ in xz plane
    e_tan = new THREE.Vector3(-e_rad.z, 0, e_rad.x).normalize()
    if (e_tan.lengthSq() < 1e-4) e_tan = new THREE.Vector3(0, 1, 0)
    e_third = new THREE.Vector3().crossVectors(e_rad, e_tan).normalize()
    label1 = 'e_r'
    label2 = 'e_θ'
    label3 = 'e_φ'
  } else if (gaussSurfaceType === 'cylinder' || configType === 'cylinder' || configType === 'line') {
    e_rad = new THREE.Vector3(relM.x, 0, relM.z).normalize()
    if (e_rad.lengthSq() < 1e-4) e_rad = new THREE.Vector3(1, 0, 0)
    e_tan = new THREE.Vector3(-e_rad.z, 0, e_rad.x).normalize()
    e_third = new THREE.Vector3(0, 1, 0)
    label1 = 'e_r'
    label2 = 'e_θ'
    label3 = 'e_z'
  } else if (gaussSurfaceType === 'box' || configType === 'plane') {
    e_rad = relM.y >= 0 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, -1, 0)
    e_tan = new THREE.Vector3(1, 0, 0)
    e_third = new THREE.Vector3(0, 0, 1)
    label1 = 'e_z (e_n)'
    label2 = 'e_x'
    label3 = 'e_y'
  }

  const arrowLen = 1.2

  return (
    <group ref={groupRef} position={centerVec}>
      {/* 3D Gaussian Surface Mesh - Only drawn from Phase 3 onwards */}
      {gaussStep >= 3 && (
        <>
          {gaussSurfaceType === 'sphere' && (
            <mesh>
              <sphereGeometry args={[gaussSurfaceRadius, 32, 32]} />
              <meshBasicMaterial 
                color={surfaceColor} 
                transparent 
                opacity={0.15} 
                side={THREE.DoubleSide} 
                depthWrite={false}
              />
              <lineSegments>
                <edgesGeometry args={[new THREE.SphereGeometry(gaussSurfaceRadius, 16, 16)]} />
                <lineBasicMaterial color={edgeColor} transparent opacity={0.4} />
              </lineSegments>
            </mesh>
          )}

          {gaussSurfaceType === 'cylinder' && (
            <mesh>
              <cylinderGeometry args={[gaussSurfaceRadius, gaussSurfaceRadius, gaussSurfaceHeight, 32]} />
              <meshBasicMaterial 
                color={surfaceColor} 
                transparent 
                opacity={0.15} 
                side={THREE.DoubleSide} 
                depthWrite={false}
              />
              <lineSegments>
                <edgesGeometry args={[new THREE.CylinderGeometry(gaussSurfaceRadius, gaussSurfaceRadius, gaussSurfaceHeight, 16)]} />
                <lineBasicMaterial color={edgeColor} transparent opacity={0.4} />
              </lineSegments>
            </mesh>
          )}

          {gaussSurfaceType === 'box' && (
            <mesh>
              <boxGeometry args={[gaussSurfaceWidth, gaussSurfaceHeight, gaussSurfaceDepth]} />
              <meshBasicMaterial 
                color={surfaceColor} 
                transparent 
                opacity={0.15} 
                side={THREE.DoubleSide} 
                depthWrite={false}
              />
              <lineSegments>
                <edgesGeometry args={[new THREE.BoxGeometry(gaussSurfaceWidth, gaussSurfaceHeight, gaussSurfaceDepth)]} />
                <lineBasicMaterial color={edgeColor} transparent opacity={0.4} />
              </lineSegments>
            </mesh>
          )}
        </>
      )}

      {/* STEP 1: Symmetry Planes Visualizer */}
      {gaussStep === 1 && (
        <group>
          {/* Plan 1 (xz / vertical) */}
          <mesh rotation={[0, 0, 0]}>
            <planeGeometry args={[gaussSurfaceRadius * 3 || 6, gaussSurfaceRadius * 3 || 6]} />
            <meshBasicMaterial color="#3b82f6" transparent opacity={0.12} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
          {/* Plan 2 (yz / vertical orthogonal) */}
          <mesh rotation={[0, Math.PI / 2, 0]}>
            <planeGeometry args={[gaussSurfaceRadius * 3 || 6, gaussSurfaceRadius * 3 || 6]} />
            <meshBasicMaterial color="#ec4899" transparent opacity={0.12} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
        </group>
      )}

      {/* Local Basis Vector Triad (er, eteta, ephi/ez) ATTACHED DIRECTLY TO POINT M */}
      <group position={relM}>
        {/* Vector 1 (Radial / Normal e_r or e_z) - RED / GOLD */}
        <primitive 
          object={new THREE.ArrowHelper(e_rad, new THREE.Vector3(0, 0, 0), arrowLen, '#ef4444', 0.25, 0.15)} 
        />
        <Billboard position={e_rad.clone().multiplyScalar(arrowLen + 0.2)}>
          <Text fontSize={0.35} color="#ef4444" anchorX="center" anchorY="middle" outlineColor="#000" outlineWidth={0.04}>
            {label1}
          </Text>
        </Billboard>

        {/* Vector 2 (Tangent e_θ or e_x) - GREEN */}
        <primitive 
          object={new THREE.ArrowHelper(e_tan, new THREE.Vector3(0, 0, 0), arrowLen * 0.8, '#10b981', 0.2, 0.12)} 
        />
        <Billboard position={e_tan.clone().multiplyScalar(arrowLen * 0.8 + 0.2)}>
          <Text fontSize={0.32} color="#10b981" anchorX="center" anchorY="middle" outlineColor="#000" outlineWidth={0.04}>
            {label2}
          </Text>
        </Billboard>

        {/* Vector 3 (Azimuthal / Axial e_φ or e_z) - BLUE */}
        <primitive 
          object={new THREE.ArrowHelper(e_third, new THREE.Vector3(0, 0, 0), arrowLen * 0.8, '#3b82f6', 0.2, 0.12)} 
        />
        <Billboard position={e_third.clone().multiplyScalar(arrowLen * 0.8 + 0.2)}>
          <Text fontSize={0.32} color="#3b82f6" anchorX="center" anchorY="middle" outlineColor="#000" outlineWidth={0.04}>
            {label3}
          </Text>
        </Billboard>
      </group>
    </group>
  )
}


