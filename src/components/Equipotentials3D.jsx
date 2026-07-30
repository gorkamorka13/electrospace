import { useState, useEffect, useRef, useCallback } from 'react'
import * as THREE from 'three'
import { useStore, UNIT_FACTORS } from '../store/useStore'
import { buildIsosurfaceGeometry } from '../physics/marchingCubes'
import { MC_RESOLUTION, MC_HALF, MC_NUM_LEVELS } from '../physics/constants'
import { useFieldWorker } from '../hooks/useFieldWorker'

const BOUNDS = { min: [-MC_HALF, -MC_HALF, -MC_HALF], max: [MC_HALF, MC_HALF, MC_HALF] }

const LEVEL_COLORS = [
  '#f59e0b',
  '#f97316',
  '#fbbf24',
  '#fcd34d',
  '#fde68a',
]

export function Equipotentials3D() {
  const charges = useStore((state) => state.charges)
  const distributions = useStore((state) => state.distributions)
  const showEquipotentials3D = useStore((state) => state.showEquipotentials3D)
  const chargeUnit = useStore((state) => state.chargeUnit)
  const ke = useStore((state) => state.ke)
  const rMin = useStore((state) => state.rMin)
  const { sample3DGrid } = useFieldWorker()
  const [geometries, setGeometries] = useState([])
  const geoCacheRef = useRef([])
  const computationKey = `${showEquipotentials3D}|${charges.length}|${distributions.length}|${chargeUnit}|${ke}|${rMin}`

  const buildMeshes = useCallback((gridData) => {
    const range = gridData.maxV - gridData.minV
    if (range < 1e-30) return []

    const results = []
    for (let i = 1; i <= MC_NUM_LEVELS; i++) {
      const level = gridData.minV + (range * i) / (MC_NUM_LEVELS + 1)
      const geo = buildIsosurfaceGeometry(gridData, level, BOUNDS)
      if (geo) {
        results.push({ geometry: geo, color: LEVEL_COLORS[(i - 1) % LEVEL_COLORS.length], opacity: 0.15 + 0.08 * i })
      }
    }
    return results
  }, [])

  useEffect(() => {
    if (!showEquipotentials3D || (charges.length === 0 && distributions.length === 0)) {
      setGeometries([])
      return
    }
    let cancelled = false

    const multiplier = UNIT_FACTORS[chargeUnit] || 1e-6
    const physicalCharges = distributions.length > 0 ? [] : charges.map(c => ({ ...c, q: c.q * multiplier }))

    sample3DGrid(BOUNDS, MC_RESOLUTION, physicalCharges, ke, rMin, distributions)
      .then((gridData) => {
        if (cancelled) return
        const meshes = buildMeshes(gridData)
        if (cancelled) {
          meshes.forEach(m => m.geometry.dispose())
          return
        }
        setGeometries(meshes)
      })
      .catch(() => {
        if (!cancelled) setGeometries([])
      })

    return () => { cancelled = true }
  }, [computationKey, showEquipotentials3D, charges, distributions, chargeUnit, ke, rMin, sample3DGrid, buildMeshes])

  // Dispose previous geometries
  useEffect(() => {
    const prevGeos = geoCacheRef.current
    geoCacheRef.current = geometries

    return () => {
      prevGeos.forEach(g => g.geometry.dispose())
    }
  }, [geometries])

  if (!showEquipotentials3D || geometries.length === 0) return null

  return (
    <>
      {geometries.map((g, i) => (
        <mesh key={i} geometry={g.geometry}>
          <meshPhysicalMaterial
            color={g.color}
            transparent
            opacity={g.opacity}
            side={THREE.DoubleSide}
            depthWrite={false}
            roughness={0.4}
            metalness={0.0}
            clearcoat={0.05}
          />
        </mesh>
      ))}
    </>
  )
}
