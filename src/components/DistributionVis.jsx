import * as THREE from 'three'
import { useStore } from '../store/useStore'
import { makeLocalFrame } from '../physics/utils'

const DIST_COLOR = '#9b59b6'
const DIST_OPACITY = 0.35

const ctxMenuDist = (dist, open) => (e) => {
  e.stopPropagation()
  open(e.nativeEvent.clientX, e.nativeEvent.clientY, dist.id, 'dist')
}

function LineVis({ dist }) {
  const openContextMenu = useStore((s) => s.openContextMenu)
  const len = dist.length
  if (len < 1e-6) return null
  return (
    <mesh onContextMenu={ctxMenuDist(dist, openContextMenu)} position={[0, 0, 0]}>
      <capsuleGeometry args={[0.08, len, 4, 8]} />
      <meshPhongMaterial color={DIST_COLOR} transparent opacity={DIST_OPACITY} />
    </mesh>
  )
}

function CylinderVis({ dist }) {
  const openContextMenu = useStore((s) => s.openContextMenu)
  const frame = makeLocalFrame(dist.center, dist.axis)
  const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), frame.z)
  
  const showGauss = useStore((state) => state.showGaussCompanion && state.gaussStep >= 3)
  const r_g = useStore((state) => state.gaussSurfaceRadius)
  const h_g = useStore((state) => state.gaussSurfaceHeight)
  const R = dist.radius
  const H = dist.height
  const a = dist.innerRadius || 0
  const hollow = dist.hollow
  const e_ext = dist.e_ext || 0
  const e_int = dist.e_int || 0
  const highlightColor = '#fbbf24'

  if (showGauss) {
    if (hollow) {
      const isInside = r_g >= R
      const h_eff = Math.min(H, h_g)
      const hasOuter = !isInside || h_g < H
      return (
        <group position={frame.origin} quaternion={quat}>
          {isInside && h_eff > 1e-4 && (
            <mesh onContextMenu={ctxMenuDist(dist, openContextMenu)}>
              <cylinderGeometry args={[R, R, h_eff, 24, 1, true]} />
              <meshPhongMaterial color={highlightColor} transparent opacity={0.7} side={THREE.DoubleSide} />
            </mesh>
          )}
          {hasOuter && (
            <mesh onContextMenu={ctxMenuDist(dist, openContextMenu)}>
              <cylinderGeometry args={[R, R, H, 24, 1, true]} />
              <meshPhongMaterial color={DIST_COLOR} transparent opacity={0.15} side={THREE.DoubleSide} wireframe />
            </mesh>
          )}
        </group>
      )
    }
    if (a > 0) {
      const isOutside = r_g >= R
      const isInsideCavity = r_g <= a
      const h_eff = Math.min(H, h_g)
      return (
        <group position={frame.origin} quaternion={quat}>
          {isOutside && (
            <mesh onContextMenu={ctxMenuDist(dist, openContextMenu)}>
              <cylinderGeometry args={[R, R, h_eff, 24]} />
              <meshPhongMaterial color={highlightColor} transparent opacity={0.7} />
            </mesh>
          )}
          {isInsideCavity && (
            <mesh onContextMenu={ctxMenuDist(dist, openContextMenu)}>
              <cylinderGeometry args={[a, a, h_eff, 24]} />
              <meshPhongMaterial color={highlightColor} transparent opacity={0.2} />
            </mesh>
          )}
          {!isOutside && !isInsideCavity && (
            <mesh onContextMenu={ctxMenuDist(dist, openContextMenu)}>
              <cylinderGeometry args={[r_g, r_g, h_eff, 24]} />
              <meshPhongMaterial color={highlightColor} transparent opacity={0.7} />
            </mesh>
          )}
          {(isInsideCavity || !isOutside) && (
            <mesh onContextMenu={ctxMenuDist(dist, openContextMenu)}>
              <cylinderGeometry args={[R, R, H, 24]} />
              <meshPhongMaterial color={DIST_COLOR} transparent opacity={0.15} side={THREE.DoubleSide} wireframe />
            </mesh>
          )}
        </group>
      )
    } else {
      const r_eff = Math.min(R, r_g)
      const h_eff = Math.min(H, h_g)
      const hasOuter = r_g < R || h_g < H
      return (
        <group position={frame.origin} quaternion={quat}>
          {r_eff > 1e-4 && h_eff > 1e-4 && (
            <mesh onContextMenu={ctxMenuDist(dist, openContextMenu)}>
              <cylinderGeometry args={[r_eff, r_eff, h_eff, 24]} />
              <meshPhongMaterial color={highlightColor} transparent opacity={0.7} />
            </mesh>
          )}
          {hasOuter && (
            <mesh onContextMenu={ctxMenuDist(dist, openContextMenu)}>
              <cylinderGeometry args={[R, R, H, 24]} />
              <meshPhongMaterial color={DIST_COLOR} transparent opacity={0.15} side={THREE.DoubleSide} wireframe />
            </mesh>
          )}
        </group>
      )
    }
  }

  if (hollow) {
    return (
      <mesh onContextMenu={ctxMenuDist(dist, openContextMenu)} position={frame.origin} quaternion={quat}>
        <cylinderGeometry args={[R, R, H, 24, 1, true]} />
        <meshPhongMaterial color={DIST_COLOR} transparent opacity={0.6} side={THREE.DoubleSide} wireframe />
      </mesh>
    )
  }

  const shellOpacity = 0.35
  const innerShellOpacity = 0.2
  const showInnerShell = a > 0

  return (
    <group position={frame.origin} quaternion={quat}>
      {/* Outer shell */}
      <mesh onContextMenu={ctxMenuDist(dist, openContextMenu)}>
        <cylinderGeometry args={[R, R, H, 24, 1, true]} />
        <meshPhongMaterial color={DIST_COLOR} transparent opacity={shellOpacity} side={THREE.DoubleSide} />
      </mesh>
      {e_ext > 0 && (
        <mesh onContextMenu={ctxMenuDist(dist, openContextMenu)}>
          <cylinderGeometry args={[Math.max(R - e_ext, 0.01), Math.max(R - e_ext, 0.01), H, 24, 1, true]} />
          <meshPhongMaterial color={DIST_COLOR} transparent opacity={innerShellOpacity} side={THREE.DoubleSide} />
        </mesh>
      )}
      {/* Inner shell */}
      {showInnerShell && e_int > 0 && (
        <mesh onContextMenu={ctxMenuDist(dist, openContextMenu)}>
          <cylinderGeometry args={[a, a, H, 24, 1, true]} />
          <meshPhongMaterial color={DIST_COLOR} transparent opacity={shellOpacity} side={THREE.DoubleSide} />
        </mesh>
      )}
      {showInnerShell && e_int > 0 && (
        <mesh onContextMenu={ctxMenuDist(dist, openContextMenu)}>
          <cylinderGeometry args={[Math.max(a - e_int, 0.01), Math.max(a - e_int, 0.01), H, 24, 1, true]} />
          <meshPhongMaterial color={DIST_COLOR} transparent opacity={innerShellOpacity} side={THREE.DoubleSide} />
        </mesh>
      )}
      {showInnerShell && e_int === 0 && (
        <mesh onContextMenu={ctxMenuDist(dist, openContextMenu)}>
          <cylinderGeometry args={[a, a, H, 24, 1, true]} />
          <meshPhongMaterial color={DIST_COLOR} transparent opacity={0.4} side={THREE.DoubleSide} wireframe />
        </mesh>
      )}
    </group>
  )
}

function PlaneVis({ dist }) {
  const openContextMenu = useStore((s) => s.openContextMenu)
  const frame = makeLocalFrame(dist.center, dist.normal)
  const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), frame.z)
  
  const showGauss = useStore((state) => state.showGaussCompanion && state.gaussStep >= 3)
  const w_g = useStore((state) => state.gaussSurfaceWidth)
  const h_g = useStore((state) => state.gaussSurfaceHeight)
  const highlightColor = '#fbbf24'

  if (showGauss) {
    const w_eff = Math.min(dist.width, w_g)
    const h_eff = Math.min(dist.height, h_g)
    const hasOuter = w_g < dist.width || h_g < dist.height
    return (
      <group position={frame.origin} quaternion={quat}>
        {w_eff > 1e-4 && h_eff > 1e-4 && (
          <mesh onContextMenu={ctxMenuDist(dist, openContextMenu)}>
            <planeGeometry args={[w_eff, h_eff]} />
            <meshPhongMaterial color={highlightColor} transparent opacity={0.8} side={THREE.DoubleSide} />
          </mesh>
        )}
        {hasOuter && (
          <mesh onContextMenu={ctxMenuDist(dist, openContextMenu)}>
            <planeGeometry args={[dist.width, dist.height]} />
            <meshPhongMaterial color={DIST_COLOR} transparent opacity={0.15} side={THREE.DoubleSide} wireframe />
          </mesh>
        )}
      </group>
    )
  }

  return (
    <mesh onContextMenu={ctxMenuDist(dist, openContextMenu)} position={frame.origin} quaternion={quat}>
      <planeGeometry args={[dist.width, dist.height]} />
      <meshPhongMaterial color={DIST_COLOR} transparent opacity={DIST_OPACITY * 0.7} side={THREE.DoubleSide} />
    </mesh>
  )
}

function DiskVis({ dist }) {
  const openContextMenu = useStore((s) => s.openContextMenu)
  const frame = makeLocalFrame(dist.center, dist.normal)
  const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), frame.z)
  
  const showGauss = useStore((state) => state.showGaussCompanion && state.gaussStep >= 3)
  const r_g = useStore((state) => state.gaussSurfaceRadius)
  const highlightColor = '#fbbf24'

  if (showGauss) {
    const r_eff = Math.min(dist.radius, r_g)
    const hasOuter = r_g < dist.radius
    return (
      <group position={frame.origin} quaternion={quat}>
        {r_eff > 1e-4 && (
          <mesh onContextMenu={ctxMenuDist(dist, openContextMenu)}>
            <circleGeometry args={[r_eff, 32]} />
            <meshPhongMaterial color={highlightColor} transparent opacity={0.8} side={THREE.DoubleSide} />
          </mesh>
        )}
        {hasOuter && (
          <mesh onContextMenu={ctxMenuDist(dist, openContextMenu)}>
            <circleGeometry args={[dist.radius, 32]} />
            <meshPhongMaterial color={DIST_COLOR} transparent opacity={0.15} side={THREE.DoubleSide} wireframe />
          </mesh>
        )}
      </group>
    )
  }

  return (
    <mesh onContextMenu={ctxMenuDist(dist, openContextMenu)} position={frame.origin} quaternion={quat}>
      <circleGeometry args={[dist.radius, 32]} />
      <meshPhongMaterial color={DIST_COLOR} transparent opacity={DIST_OPACITY * 0.7} side={THREE.DoubleSide} />
    </mesh>
  )
}

function RingVis({ dist }) {
  const openContextMenu = useStore((s) => s.openContextMenu)
  const frame = makeLocalFrame(dist.center, dist.normal)
  const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), frame.z)
  return (
    <mesh onContextMenu={ctxMenuDist(dist, openContextMenu)} position={frame.origin} quaternion={quat}>
      <torusGeometry args={[dist.radius, 0.06, 8, 32]} />
      <meshPhongMaterial color={DIST_COLOR} transparent opacity={DIST_OPACITY} />
    </mesh>
  )
}

function FrameVis({ dist }) {
  const frame = makeLocalFrame(dist.center, dist.normal)
  const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), frame.z)
  const hw = dist.width / 2, hh = dist.height / 2
  const pts = new Float32Array([
    -hw, -hh, 0,  hw, -hh, 0,
    hw, -hh, 0,   hw,  hh, 0,
    hw,  hh, 0,  -hw,  hh, 0,
    -hw,  hh, 0, -hw, -hh, 0,
  ])
  return (
    <lineSegments position={frame.origin} quaternion={quat}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={8} array={pts} itemSize={3} />
      </bufferGeometry>
      <lineBasicMaterial color={DIST_COLOR} transparent opacity={0.6} />
    </lineSegments>
  )
}

function BoxVis({ dist }) {
  const openContextMenu = useStore((s) => s.openContextMenu)
  const frame = makeLocalFrame(dist.center, dist.normal)
  const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), frame.z)
  if (dist.hollow) {
    return (
      <mesh onContextMenu={ctxMenuDist(dist, openContextMenu)} position={frame.origin} quaternion={quat}>
        <boxGeometry args={[dist.width, dist.height, dist.depth]} />
        <meshPhongMaterial color={DIST_COLOR} transparent opacity={0.6} side={THREE.DoubleSide} wireframe />
      </mesh>
    )
  }
  return (
    <mesh onContextMenu={ctxMenuDist(dist, openContextMenu)} position={frame.origin} quaternion={quat}>
      <boxGeometry args={[dist.width, dist.height, dist.depth]} />
      <meshPhongMaterial color={DIST_COLOR} transparent opacity={DIST_OPACITY} side={THREE.DoubleSide} />
    </mesh>
  )
}

function SphereVis({ dist }) {
  const openContextMenu = useStore((s) => s.openContextMenu)
  const showGauss = useStore((state) => state.showGaussCompanion && state.gaussStep >= 3)
  const r_g = useStore((state) => state.gaussSurfaceRadius)
  const R = dist.radius
  const a = dist.innerRadius || 0
  const hollow = dist.hollow
  const e_ext = dist.e_ext || 0
  const e_int = dist.e_int || 0
  const highlightColor = '#fbbf24'

  const outerPos = new THREE.Vector3(...dist.center)

  if (showGauss) {
    if (hollow) {
      const isInside = r_g >= R
      return (
        <mesh onContextMenu={ctxMenuDist(dist, openContextMenu)} position={outerPos}>
          <sphereGeometry args={[R, 24, 18]} />
          <meshPhongMaterial color={isInside ? highlightColor : DIST_COLOR} transparent opacity={isInside ? 0.75 : 0.6} wireframe />
        </mesh>
      )
    }
    if (a > 0) {
      const isOutside = r_g >= R
      const isInsideCavity = r_g <= a
      return (
        <group position={outerPos}>
          {isOutside && (
            <mesh onContextMenu={ctxMenuDist(dist, openContextMenu)}>
              <sphereGeometry args={[R, 24, 18]} />
              <meshPhongMaterial color={highlightColor} transparent opacity={0.75} />
            </mesh>
          )}
          {isInsideCavity && (
            <mesh onContextMenu={ctxMenuDist(dist, openContextMenu)}>
              <sphereGeometry args={[a, 24, 18]} />
              <meshPhongMaterial color={highlightColor} transparent opacity={0.2} />
            </mesh>
          )}
          {!isOutside && !isInsideCavity && (
            <mesh onContextMenu={ctxMenuDist(dist, openContextMenu)}>
              <sphereGeometry args={[r_g, 24, 18]} />
              <meshPhongMaterial color={highlightColor} transparent opacity={0.7} />
            </mesh>
          )}
          {(isInsideCavity || !isOutside) && (
            <mesh onContextMenu={ctxMenuDist(dist, openContextMenu)}>
              <sphereGeometry args={[R, 24, 18]} />
              <meshPhongMaterial color={DIST_COLOR} transparent opacity={0.15} wireframe />
            </mesh>
          )}
        </group>
      )
    } else {
      const r_eff = Math.min(R, r_g)
      const hasOuter = r_g < R
      return (
        <group position={outerPos}>
          {r_eff > 1e-4 && (
            <mesh onContextMenu={ctxMenuDist(dist, openContextMenu)}>
              <sphereGeometry args={[r_eff, 24, 18]} />
              <meshPhongMaterial color={highlightColor} transparent opacity={0.7} />
            </mesh>
          )}
          {hasOuter && (
            <mesh onContextMenu={ctxMenuDist(dist, openContextMenu)}>
              <sphereGeometry args={[R, 24, 18]} />
              <meshPhongMaterial color={DIST_COLOR} transparent opacity={0.15} wireframe />
            </mesh>
          )}
        </group>
      )
    }
  }

  if (hollow) {
    return (
      <mesh onContextMenu={ctxMenuDist(dist, openContextMenu)} position={outerPos}>
        <sphereGeometry args={[R, 24, 18]} />
        <meshPhongMaterial color={DIST_COLOR} transparent opacity={0.6} wireframe />
      </mesh>
    )
  }

  const shellOpacity = 0.35
  const innerShellOpacity = 0.2
  const showInnerShell = a > 0

  return (
    <group position={outerPos}>
      {/* Outer shell */}
      <mesh onContextMenu={ctxMenuDist(dist, openContextMenu)} renderOrder={0}>
        <sphereGeometry args={[R, 24, 18]} />
        <meshPhongMaterial color={DIST_COLOR} transparent opacity={shellOpacity} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {e_ext > 0 && (
        <mesh onContextMenu={ctxMenuDist(dist, openContextMenu)} renderOrder={0}>
          <sphereGeometry args={[Math.max(R - e_ext, 0.01), 24, 18]} />
          <meshPhongMaterial color={DIST_COLOR} transparent opacity={innerShellOpacity} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      )}
      {/* Inner shell */}
      {showInnerShell && e_int > 0 && (
        <mesh onContextMenu={ctxMenuDist(dist, openContextMenu)} renderOrder={1}>
          <sphereGeometry args={[a, 24, 18]} />
          <meshPhongMaterial color={DIST_COLOR} transparent opacity={shellOpacity} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      )}
      {showInnerShell && e_int > 0 && (
        <mesh onContextMenu={ctxMenuDist(dist, openContextMenu)} renderOrder={1}>
          <sphereGeometry args={[Math.max(a - e_int, 0.01), 24, 18]} />
          <meshPhongMaterial color={DIST_COLOR} transparent opacity={innerShellOpacity} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      )}
      {showInnerShell && e_int === 0 && (
        <mesh onContextMenu={ctxMenuDist(dist, openContextMenu)} renderOrder={1}>
          <sphereGeometry args={[a, 24, 18]} />
          <meshPhongMaterial color={DIST_COLOR} transparent opacity={0.4} side={THREE.DoubleSide} depthWrite={false} wireframe />
        </mesh>
      )}
    </group>
  )
}

export function DistributionRenderer() {
  const distributions = useStore((state) => state.distributions)
  if (!distributions || distributions.length === 0) return null
  return (
    <>
      {distributions.map((d) => {
        switch (d.type) {
          case 'line': return <LineVis key={d.id} dist={d} />
          case 'cylinder': return <CylinderVis key={d.id} dist={d} />
          case 'plane': return <PlaneVis key={d.id} dist={d} />
          case 'disk': return <DiskVis key={d.id} dist={d} />
          case 'circle': return <RingVis key={d.id} dist={d} />
          case 'frame': return <FrameVis key={d.id} dist={d} />
          case 'sphere': return <SphereVis key={d.id} dist={d} />
          case 'box': return <BoxVis key={d.id} dist={d} />
          default: return null
        }
      })}
    </>
  )
}
