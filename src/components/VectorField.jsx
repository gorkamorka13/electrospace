import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useStore, UNIT_FACTORS } from '../store/useStore'
import { useFieldWorker } from '../hooks/useFieldWorker'
import { computeFieldGridBounds } from '../physics/utils'

// Field-vector grid: samples E on a 3D grid (1 field eval per point) and
// renders arrows as lineSegments + instanced cone tips. Far cheaper than
// tracing field lines (no iterative stepping).
const MAX_ARROW = 2.2
const MIN_ARROW = 0.35
const TIP_HEIGHT = 0.14

export function VectorField() {
  const charges = useStore((state) => state.charges)
  const distributions = useStore((state) => state.distributions)
  const showFieldVectors = useStore((state) => state.showFieldVectors)
  const chargeUnit = useStore((state) => state.chargeUnit)
  const vectorScale = useStore((state) => state.vectorScale)
  const eMax = useStore((state) => state.eMax)
  const gridRes = useStore((state) => state.vectorGridResolution)
  const { computeFieldGrid } = useFieldWorker()
  const [vectors, setVectors] = useState([])
  const cancelledRef = useRef(false)
  const tipMeshRef = useRef(null)

  const key = `${showFieldVectors}|${charges.length}|${distributions.length}|${gridRes}|${chargeUnit}|${vectorScale}|${eMax}`

  useEffect(() => {
    cancelledRef.current = false
    if (!showFieldVectors || (charges.length === 0 && distributions.length === 0)) {
      return
    }
    const { ke, rMin } = useStore.getState()
    const multiplier = UNIT_FACTORS[chargeUnit] || 1e-6
    const physicalCharges = distributions.length > 0 ? [] : charges.map((c) => ({ ...c, q: c.q * multiplier }))

    const { min, max } = computeFieldGridBounds({ charges: physicalCharges, distributions })
    const positions = []
    const res = Math.max(gridRes, 2)
    for (let iz = 0; iz < res; iz++) {
      const z = min.z + (iz / (res - 1)) * (max.z - min.z)
      for (let iy = 0; iy < res; iy++) {
        const y = min.y + (iy / (res - 1)) * (max.y - min.y)
        for (let ix = 0; ix < res; ix++) {
          const x = min.x + (ix / (res - 1)) * (max.x - min.x)
          positions.push([x, y, z])
        }
      }
    }

    computeFieldGrid(physicalCharges, positions, distributions, ke, rMin)
      .then((pts) => {
        if (cancelledRef.current) return
        setVectors(pts.map((p, i) => ({ pos: positions[i], e: [p.x, p.y, p.z] })))
      })
      .catch(() => { if (!cancelledRef.current) setVectors([]) })

    return () => { cancelledRef.current = true }
  }, [key, showFieldVectors, charges, distributions, gridRes, chargeUnit, computeFieldGrid])

  const data = useMemo(() => {
    if (!vectors.length) return null
    const positionsArr = []
    const colorsArr = []
    const tipsPos = []
    const tipsColor = []
    let eAbsMax = 1e-30
    for (const v of vectors) eAbsMax = Math.max(eAbsMax, Math.hypot(v.e[0], v.e[1], v.e[2]))

    for (const v of vectors) {
      const mag = Math.hypot(v.e[0], v.e[1], v.e[2])
      if (mag < 1e-25) continue
      const dir = [v.e[0] / mag, v.e[1] / mag, v.e[2] / mag]
      const t = eAbsMax > 1e-30 ? mag / eAbsMax : 0
      // Relative length: strongest vectors reach MAX_ARROW, weakest stay >= MIN_ARROW
      // (well above TIP_HEIGHT so the shaft is always visible past the cone).
      const len = Math.min(
        Math.max((MIN_ARROW + t * (MAX_ARROW - MIN_ARROW)) * vectorScale, MIN_ARROW),
        MAX_ARROW * Math.max(1, vectorScale),
      )
      const col = new THREE.Color().setHSL(0.62 - 0.62 * t, 0.9, 0.55)
      const sx = v.pos[0], sy = v.pos[1], sz = v.pos[2]
      positionsArr.push(sx, sy, sz, sx + dir[0] * len, sy + dir[1] * len, sz + dir[2] * len)
      for (let i = 0; i < 6; i++) { colorsArr.push(col.r, col.g, col.b) }
      // cone apex sits exactly at the line end; center is pulled back by h/2
      tipsPos.push([
        sx + dir[0] * (len - TIP_HEIGHT / 2),
        sy + dir[1] * (len - TIP_HEIGHT / 2),
        sz + dir[2] * (len - TIP_HEIGHT / 2),
        dir[0], dir[1], dir[2],
      ])
      tipsColor.push(col)
    }

    const lineGeo = new THREE.BufferGeometry()
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(positionsArr, 3))
    lineGeo.setAttribute('color', new THREE.Float32BufferAttribute(colorsArr, 3))

    return { lineGeo, tipsPos, tipsColor }
  }, [vectors, vectorScale])

  useEffect(() => {
    const mesh = tipMeshRef.current
    if (!data || !mesh) return
    const n = data.tipsPos.length
    mesh.count = n
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const yAxis = new THREE.Vector3(0, 1, 0)
    for (let i = 0; i < n; i++) {
      const [x, y, z, dx, dy, dz] = data.tipsPos[i]
      q.setFromUnitVectors(yAxis, new THREE.Vector3(dx, dy, dz))
      m.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(1, 1, 1))
      mesh.setMatrixAt(i, m)
      mesh.setColorAt(i, data.tipsColor[i])
    }
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [data])

  if (!showFieldVectors || !data) return null

  return (
    <group>
      <lineSegments geometry={data.lineGeo}>
        <lineBasicMaterial vertexColors transparent opacity={0.85} />
      </lineSegments>
      <instancedMesh key={data.tipsPos.length} ref={tipMeshRef} args={[undefined, undefined, Math.max(data.tipsPos.length, 1)]} frustumCulled={false}>
        <coneGeometry args={[0.05, TIP_HEIGHT, 8]} onUpdate={(g) => {
          // vertexColors + instancedMesh needs a per-vertex color attribute
          // (white) so instanceColor (setColorAt) multiplies to visible color.
          if (!g.getAttribute('color')) {
            const n = g.attributes.position.count
            g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3).fill(1), 3))
          }
        }} />
        <meshBasicMaterial vertexColors transparent opacity={0.9} side={THREE.DoubleSide} />
      </instancedMesh>
    </group>
  )
}
