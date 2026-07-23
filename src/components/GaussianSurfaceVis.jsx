import { useRef, useMemo } from 'react'
import * as THREE from 'three'
import { Billboard, Text, Html } from '@react-three/drei'
import { useStore, UNIT_FACTORS } from '../store/useStore'
import { calculateTotalField } from '../physics/coulomb'

function getVertexNormal(px, py, pz, surfaceType, radius, height, width, depth) {
  switch (surfaceType) {
    case 'sphere': {
      const r = Math.sqrt(px * px + py * py + pz * pz)
      return r > 1e-8 ? new THREE.Vector3(px / r, py / r, pz / r) : new THREE.Vector3(1, 0, 0)
    }
    case 'cylinder': {
      const r = Math.sqrt(px * px + pz * pz)
      const hh = height / 2
      if (r < 1e-6 || Math.abs(Math.abs(py) - hh) < 0.001) {
        return new THREE.Vector3(0, py >= 0 ? 1 : -1, 0)
      }
      return new THREE.Vector3(px / r, 0, pz / r).normalize()
    }
    case 'box': {
      const hw = width / 2, hh = height / 2, hd = depth / 2
      const dx = Math.abs(px), dy = Math.abs(py), dz = Math.abs(pz)
      const dists = [
        { d: Math.abs(dx - hw), n: new THREE.Vector3(Math.sign(px), 0, 0) },
        { d: Math.abs(dy - hh), n: new THREE.Vector3(0, Math.sign(py), 0) },
        { d: Math.abs(dz - hd), n: new THREE.Vector3(0, 0, Math.sign(pz)) },
      ]
      return dists.sort((a, b) => a.d - b.d)[0].n
    }
    default:
      return new THREE.Vector3(px, py, pz).normalize()
  }
}

function addFluxColors(geometry, surfaceType, params, center, charges, distributions, chargeUnit, ke, rMin) {
  const pos = geometry.attributes.position
  const n = pos.count
  const colors = new Float32Array(n * 3)
  const { radius, height, width, depth } = params

  const multiplier = UNIT_FACTORS[chargeUnit] || 1e-6
  const physicalCharges = distributions.length > 0 ? [] : charges.map(c => ({ ...c, q: c.q * multiplier }))

  const fluxes = new Float32Array(n)
  let maxAbs = 0

  for (let i = 0; i < n; i++) {
    const px = pos.getX(i), py = pos.getY(i), pz = pos.getZ(i)
    const normal = getVertexNormal(px, py, pz, surfaceType, radius, height, width, depth)
    const worldPos = [px + center[0], py + center[1], pz + center[2]]
    const E = calculateTotalField(physicalCharges, worldPos, ke, rMin, distributions)
    const flux = E.x * normal.x + E.y * normal.y + E.z * normal.z
    fluxes[i] = flux
    maxAbs = Math.max(maxAbs, Math.abs(flux))
  }

  const invMax = maxAbs > 1e-30 ? 1 / maxAbs : 1
  for (let i = 0; i < n; i++) {
    const t = Math.tanh(fluxes[i] * invMax * 3)
    if (t > 0) {
      colors[i * 3] = 0.25 + 0.75 * t
      colors[i * 3 + 1] = 0.25 * (1 - t)
      colors[i * 3 + 2] = 0.25 * (1 - t)
    } else {
      colors[i * 3] = 0.25 * (1 + t)
      colors[i * 3 + 1] = 0.25 * (1 + t)
      colors[i * 3 + 2] = 0.25 - 0.75 * t
    }
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
}

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
  const charges = useStore((state) => state.charges)
  const ke = useStore((state) => state.ke)
  const rMin = useStore((state) => state.rMin)
  const chargeUnit = useStore((state) => state.chargeUnit)

  const groupRef = useRef()

  if (!showGaussCompanion) return null

  // ⚠️ Warn only when point charges exist WITHOUT a distribution
  if (charges.length > 0 && distributions.length === 0) {
    return (
      <Html center>
        <div style={{
          background: 'rgba(245,158,11,0.9)', color: '#000',
          padding: '12px 20px', borderRadius: 8, fontSize: 14,
          maxWidth: 320, textAlign: 'center', fontWeight: 600,
          border: '2px solid #f59e0b'
        }}>
          ⚡ Le Compagnon de Gauss nécessite une distribution continue.<br/>
          <span style={{fontSize: 12, opacity: 0.8}}>Ajoutez une sphère, un cylindre ou un plan chargé.</span>
        </div>
      </Html>
    )
  }

  const activeDist = distributions[0] || null
  const configType = activeDist ? activeDist.type : null

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
  const innerRadius = activeDist?.radius || 1.5
  const innerVolRadius = Math.min(gaussSurfaceRadius, innerRadius)

  // Memoized geometries for edge wireframes (avoid recreation on every render)
  const sphereEdgesGeo = useMemo(() => new THREE.SphereGeometry(gaussSurfaceRadius, 16, 16), [gaussSurfaceRadius])
  const cylinderEdgesGeo = useMemo(() => new THREE.CylinderGeometry(gaussSurfaceRadius, gaussSurfaceRadius, gaussSurfaceHeight, 16), [gaussSurfaceRadius, gaussSurfaceHeight])
  const boxEdgesGeo = useMemo(() => new THREE.BoxGeometry(gaussSurfaceWidth, gaussSurfaceHeight, gaussSurfaceDepth), [gaussSurfaceWidth, gaussSurfaceHeight, gaussSurfaceDepth])
  const innerSphereEdgesGeo = useMemo(() => new THREE.SphereGeometry(innerVolRadius, 16, 16), [innerVolRadius])
  const innerCylinderEdgesGeo = useMemo(() => new THREE.CylinderGeometry(innerVolRadius, innerVolRadius, gaussSurfaceHeight, 16), [innerVolRadius, gaussSurfaceHeight])
  const innerBoxEdgesGeo = useMemo(() => new THREE.BoxGeometry(gaussSurfaceWidth, 0.1, gaussSurfaceDepth), [gaussSurfaceWidth, gaussSurfaceDepth])

  // Calculate plane orientations for Step 1 so that BOTH planes are centered DIRECTLY AT Point M
  const planeSize = Math.max(6, gaussSurfaceRadius * 3 || 6)
  const planeEdgesGeo = useMemo(() => new THREE.PlaneGeometry(planeSize, planeSize), [planeSize])
  
  // Both planes are centered at Point M (relM) so that their intersection passes right through M
  let plane1Pos = [relM.x, relM.y, relM.z]
  let plane1Rot = [0, 0, 0]
  let plane2Pos = [relM.x, relM.y, relM.z]
  let plane2Rot = [0, Math.PI / 2, 0]
  
  if (configType === 'cylinder' || configType === 'line' || gaussSurfaceType === 'cylinder') {
    const thetaM = Math.atan2(relM.z, relM.x)
    // Plan 1 (Bleu): Plan méridien (M, e_r, e_z) contenant l'axe z (O) et le point M
    plane1Pos = [0, relM.y, 0]
    plane1Rot = [0, -thetaM, 0]
    
    // Plan 2 (Rose): Plan transversal (M, e_r, e_θ) perpendiculaire à l'axe z à la hauteur yM de M
    plane2Pos = [0, relM.y, 0]
    plane2Rot = [Math.PI / 2, 0, 0]
  } else if (configType === 'sphere' || gaussSurfaceType === 'sphere') {
    const omDir = relM.lengthSq() > 1e-4 ? relM.clone().normalize() : new THREE.Vector3(1, 0, 0)
    // Quaternion q1 aligne l'axe local Y (0, 1, 0) du plan sur la direction OM
    const q1 = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), omDir)
    const euler1 = new THREE.Euler().setFromQuaternion(q1)
    
    // Plan 1 (Bleu): Contient l'origine O et le point M
    plane1Pos = [0, 0, 0]
    plane1Rot = [euler1.x, euler1.y, euler1.z]
    
    // Plan 2 (Rose): Orthogonal au plan 1, tourné de 90° autour de l'axe OM (contient aussi O et M)
    const q90 = new THREE.Quaternion().setFromAxisAngle(omDir, Math.PI / 2)
    const q2 = q90.clone().multiply(q1)
    const euler2 = new THREE.Euler().setFromQuaternion(q2)
    
    plane2Pos = [0, 0, 0]
    plane2Rot = [euler2.x, euler2.y, euler2.z]
  } else if (configType === 'plane' || gaussSurfaceType === 'box') {
    // Pour un plan infini chargé horizontal (y=0 dans Three.js), la normale est e_y
    // Plan 1 (Bleu) : Π_S1 = (M, e_x, e_y) → plan XY de Three.js, vertical selon xz
    // PlaneGeometry par défaut est dans le plan XY (face vers Z) → rotation [0, 0, 0], centré sur M
    plane1Pos = [relM.x, relM.y, relM.z]
    plane1Rot = [0, 0, 0]
    
    // Plan 2 (Rose) : Π_S2 = (M, e_y, e_z) → plan YZ de Three.js
    // Pour le plan YZ : rotation autour de Y de 90° → [0, Math.PI/2, 0], centré sur M
    plane2Pos = [relM.x, relM.y, relM.z]
    plane2Rot = [0, Math.PI / 2, 0]
  }

  // Flux-colored surface geometries
  const fluxSurfaceParams = useMemo(() => ({
    radius: gaussSurfaceRadius,
    height: gaussSurfaceHeight,
    width: gaussSurfaceWidth,
    depth: gaussSurfaceDepth,
  }), [gaussSurfaceRadius, gaussSurfaceHeight, gaussSurfaceWidth, gaussSurfaceDepth])

  const hasChargesOnly = charges.length > 0 && distributions.length === 0

  const fluxSphereGeo = useMemo(() => {
    if (gaussSurfaceType !== 'sphere' || gaussStep < 3 || hasChargesOnly) return null
    const geo = new THREE.SphereGeometry(gaussSurfaceRadius, 32, 32)
    addFluxColors(geo, 'sphere', fluxSurfaceParams, gaussCenter, charges, distributions, chargeUnit, ke, rMin)
    return geo
  }, [gaussSurfaceType, gaussStep, gaussSurfaceRadius, gaussCenter, hasChargesOnly, charges, distributions, chargeUnit, ke, rMin])

  const fluxCylinderGeo = useMemo(() => {
    if (gaussSurfaceType !== 'cylinder' || gaussStep < 3 || hasChargesOnly) return null
    const geo = new THREE.CylinderGeometry(gaussSurfaceRadius, gaussSurfaceRadius, gaussSurfaceHeight, 32)
    addFluxColors(geo, 'cylinder', fluxSurfaceParams, gaussCenter, charges, distributions, chargeUnit, ke, rMin)
    return geo
  }, [gaussSurfaceType, gaussStep, gaussSurfaceRadius, gaussSurfaceHeight, gaussCenter, hasChargesOnly, charges, distributions, chargeUnit, ke, rMin])

  const fluxBoxGeo = useMemo(() => {
    if (gaussSurfaceType !== 'box' || gaussStep < 3 || hasChargesOnly) return null
    const geo = new THREE.BoxGeometry(gaussSurfaceWidth, gaussSurfaceHeight, gaussSurfaceDepth)
    addFluxColors(geo, 'box', fluxSurfaceParams, gaussCenter, charges, distributions, chargeUnit, ke, rMin)
    return geo
  }, [gaussSurfaceType, gaussStep, gaussSurfaceWidth, gaussSurfaceHeight, gaussSurfaceDepth, gaussCenter, hasChargesOnly, charges, distributions, chargeUnit, ke, rMin])

  return (
    <group ref={groupRef} position={centerVec}>
      {/* 3D Gaussian Surface Mesh with flux visualization - Only drawn from Phase 3 onwards */}
      {gaussStep >= 3 && (
        <>
          {gaussSurfaceType === 'sphere' && fluxSphereGeo && (
            <mesh>
              <primitive object={fluxSphereGeo} />
              <meshPhysicalMaterial
                vertexColors
                transparent
                opacity={0.55}
                side={THREE.DoubleSide}
                depthWrite={false}
                roughness={0.3}
                metalness={0.0}
              />
              <lineSegments>
                <edgesGeometry args={[sphereEdgesGeo]} />
                <lineBasicMaterial color={edgeColor} transparent opacity={0.4} />
              </lineSegments>
            </mesh>
          )}

          {gaussSurfaceType === 'cylinder' && fluxCylinderGeo && (
            <mesh>
              <primitive object={fluxCylinderGeo} />
              <meshPhysicalMaterial
                vertexColors
                transparent
                opacity={0.55}
                side={THREE.DoubleSide}
                depthWrite={false}
                roughness={0.3}
                metalness={0.0}
              />
              <lineSegments>
                <edgesGeometry args={[cylinderEdgesGeo]} />
                <lineBasicMaterial color={edgeColor} transparent opacity={0.4} />
              </lineSegments>
            </mesh>
          )}

          {gaussSurfaceType === 'box' && fluxBoxGeo && (
            <mesh>
              <primitive object={fluxBoxGeo} />
              <meshPhysicalMaterial
                vertexColors
                transparent
                opacity={0.55}
                side={THREE.DoubleSide}
                depthWrite={false}
                roughness={0.3}
                metalness={0.0}
              />
              <lineSegments>
                <edgesGeometry args={[boxEdgesGeo]} />
                <lineBasicMaterial color={edgeColor} transparent opacity={0.4} />
              </lineSegments>
            </mesh>
          )}
        </>
      )}

      {/* STEP 4 & 5: 3D Enclosed Charge Q_int Volume (Gold-Yellow) */}
      {gaussStep >= 4 && (
        <group>
          {(configType === 'sphere' || gaussSurfaceType === 'sphere') && (
            <mesh>
              <sphereGeometry args={[Math.min(gaussSurfaceRadius, activeDist?.radius || 1.5), 32, 32]} />
              <meshBasicMaterial color="#f59e0b" transparent opacity={0.35} side={THREE.DoubleSide} depthWrite={false} />
              <lineSegments>
                <edgesGeometry args={[innerSphereEdgesGeo]} />
                <lineBasicMaterial color="#fbbf24" transparent opacity={0.7} />
              </lineSegments>
            </mesh>
          )}

          {(configType === 'cylinder' || configType === 'line' || gaussSurfaceType === 'cylinder') && (
            <mesh>
              <cylinderGeometry args={[Math.min(gaussSurfaceRadius, activeDist?.radius || 1.5), Math.min(gaussSurfaceRadius, activeDist?.radius || 1.5), gaussSurfaceHeight, 32]} />
              <meshBasicMaterial color="#f59e0b" transparent opacity={0.35} side={THREE.DoubleSide} depthWrite={false} />
              <lineSegments>
                <edgesGeometry args={[innerCylinderEdgesGeo]} />
                <lineBasicMaterial color="#fbbf24" transparent opacity={0.7} />
              </lineSegments>
            </mesh>
          )}

          {(configType === 'plane' || gaussSurfaceType === 'box') && (
            <mesh>
              <boxGeometry args={[gaussSurfaceWidth, 0.1, gaussSurfaceDepth]} />
              <meshBasicMaterial color="#f59e0b" transparent opacity={0.4} side={THREE.DoubleSide} depthWrite={false} />
              <lineSegments>
                <edgesGeometry args={[innerBoxEdgesGeo]} />
                <lineBasicMaterial color="#fbbf24" transparent opacity={0.8} />
              </lineSegments>
            </mesh>
          )}
        </group>
      )}

      {/* STEP 1: 3D Symmetry Planes Visualizer passing EXACTLY through Point M */}
      {gaussStep === 1 && (
        <group>
          {/* Plan 1 (Bleu) */}
          <mesh position={plane1Pos} rotation={plane1Rot}>
            <planeGeometry args={[planeSize, planeSize]} />
            <meshBasicMaterial color="#3b82f6" transparent opacity={0.2} side={THREE.DoubleSide} depthWrite={false} />
            <lineSegments>
              <edgesGeometry args={[planeEdgesGeo]} />
              <lineBasicMaterial color="#60a5fa" transparent opacity={0.6} />
            </lineSegments>
          </mesh>
          {/* Plan 2 (Rose/Violet) */}
          <mesh position={plane2Pos} rotation={plane2Rot}>
            <planeGeometry args={[planeSize, planeSize]} />
            <meshBasicMaterial color="#ec4899" transparent opacity={0.2} side={THREE.DoubleSide} depthWrite={false} />
            <lineSegments>
              <edgesGeometry args={[planeEdgesGeo]} />
              <lineBasicMaterial color="#f472b6" transparent opacity={0.6} />
            </lineSegments>
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


