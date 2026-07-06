import { useMemo, useRef, useEffect } from 'react'
import * as THREE from 'three'
import { useStore, UNIT_FACTORS } from '../store/useStore'
import { sample3DGrid, buildIsosurfaceGeometry } from '../physics/marchingCubes'
import { MC_RESOLUTION, MC_HALF, MC_NUM_LEVELS } from '../physics/constants'

const BOUNDS = { min: [-MC_HALF, -MC_HALF, -MC_HALF], max: [MC_HALF, MC_HALF, MC_HALF] }

const LEVEL_COLORS = [
  '#6d28d9',
  '#7c3aed',
  '#8b5cf6',
  '#a78bfa',
  '#c4b5fd',
]

export function Equipotentials3D() {
  const charges = useStore((state) => state.charges)
  const distributions = useStore((state) => state.distributions)
  const showEquipotentials3D = useStore((state) => state.showEquipotentials3D)
  const chargeUnit = useStore((state) => state.chargeUnit)
  const geoCacheRef = useRef([])

  useEffect(() => {
    return () => {
      geoCacheRef.current.forEach(g => g.geometry.dispose())
      geoCacheRef.current = []
    }
  }, [])

  const geometries = useMemo(() => {
    geoCacheRef.current.forEach(g => g.geometry.dispose())

    if (!showEquipotentials3D) { geoCacheRef.current = []; return [] }
    if (charges.length === 0 && distributions.length === 0) { geoCacheRef.current = []; return [] }

    const multiplier = UNIT_FACTORS[chargeUnit] || 1e-6
    const physicalCharges = distributions.length > 0 ? [] : charges.map(c => ({ ...c, q: c.q * multiplier }))
    const { ke, rMin } = useStore.getState()

    const gridData = sample3DGrid(BOUNDS, MC_RESOLUTION, physicalCharges, ke, rMin, distributions)
    const range = gridData.maxV - gridData.minV
    if (range < 1e-30) { geoCacheRef.current = []; return [] }

    const results = []
    for (let i = 1; i <= MC_NUM_LEVELS; i++) {
      const level = gridData.minV + (range * i) / (MC_NUM_LEVELS + 1)
      const geo = buildIsosurfaceGeometry(gridData, level, BOUNDS)
      if (geo) {
        results.push({ geometry: geo, color: LEVEL_COLORS[(i - 1) % LEVEL_COLORS.length], opacity: 0.15 + 0.08 * i })
      }
    }
    geoCacheRef.current = results
    return results
  }, [charges, distributions, showEquipotentials3D, chargeUnit])

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
