import { useRef } from 'react'
import * as THREE from 'three'
import { useStore } from '../store/useStore'

export function GaussianSurfaceVis() {
  const showGaussCompanion = useStore((state) => state.showGaussCompanion)
  const gaussSurfaceType = useStore((state) => state.gaussSurfaceType)
  const gaussSurfaceRadius = useStore((state) => state.gaussSurfaceRadius)
  const gaussSurfaceHeight = useStore((state) => state.gaussSurfaceHeight)
  const gaussSurfaceWidth = useStore((state) => state.gaussSurfaceWidth)
  const gaussSurfaceDepth = useStore((state) => state.gaussSurfaceDepth)
  const gaussCenter = useStore((state) => state.gaussCenter)

  const groupRef = useRef()

  if (!showGaussCompanion) return null

  // Glowing, translucent green-cyan for Gaussian surface
  const surfaceColor = '#10b981' 
  const edgeColor = '#34d399'

  return (
    <group ref={groupRef} position={new THREE.Vector3(...gaussCenter)}>
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
          {/* Wireframe overlay for premium feel */}
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
    </group>
  )
}
