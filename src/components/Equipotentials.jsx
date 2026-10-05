import { useState, useEffect, useRef, useCallback } from 'react'
import { Line } from '@react-three/drei'
import * as THREE from 'three'
import { useStore, UNIT_FACTORS } from '../store/useStore'
import { useFieldWorker } from '../hooks/useFieldWorker'

const GRID = 64
const WORLD_SIZE = 20
const HALF = WORLD_SIZE / 2
const NUM_LEVELS = 8

function lerp(a, b, t) {
  return a + (b - a) * t
}

function extractContourSegments(grid, nx, ny, level) {
  const segs = []
  for (let iy = 0; iy < ny - 1; iy++) {
    for (let ix = 0; ix < nx - 1; ix++) {
      const idx = iy * nx + ix
      const v00 = grid[idx]
      const v10 = grid[idx + 1]
      const v01 = grid[idx + nx]
      const v11 = grid[idx + nx + 1]

      const above = (v) => v >= level ? 1 : 0
      const code = above(v00) | (above(v10) << 1) | (above(v11) << 2) | (above(v01) << 3)
      if (code === 0 || code === 15) continue

      const x0 = (ix / (nx - 1)) * WORLD_SIZE - HALF
      const x1 = ((ix + 1) / (nx - 1)) * WORLD_SIZE - HALF
      const y0 = (iy / (ny - 1)) * WORLD_SIZE - HALF
      const y1 = ((iy + 1) / (ny - 1)) * WORLD_SIZE - HALF

      const mid = (v0, v1, xa, xb, ya, yb, dim) => {
        const t = (level - v0) / (v1 - v0)
        if (dim === 'x') return [lerp(xa, xb, t), ya]
        return [xa, lerp(ya, yb, t)]
      }

      const edges = []
      if ((code & 1) !== (code & 2)) edges.push(mid(v00, v10, x0, x1, y0, y0, 'x'))
      if ((code & 2) !== (code & 4)) edges.push(mid(v10, v11, x1, x1, y0, y1, 'y'))
      if ((code & 4) !== (code & 8)) edges.push(mid(v11, v01, x1, x0, y1, y1, 'x'))
      if ((code & 8) !== (code & 1)) edges.push(mid(v01, v00, x0, x0, y1, y0, 'y'))
      if (edges.length === 2) {
        segs.push([new THREE.Vector3(edges[0][0], edges[0][1], 0), new THREE.Vector3(edges[1][0], edges[1][1], 0)])
      }
    }
  }
  return segs
}

export function Equipotentials() {
  const charges = useStore((state) => state.charges)
  const distributions = useStore((state) => state.distributions)
  const showEquipotentials = useStore((state) => state.showEquipotentials)
  const chargeUnit = useStore((state) => state.chargeUnit)
  const theme = useStore((state) => state.theme)
  const { computePotentialGrid } = useFieldWorker()
  const [contours, setContours] = useState([])
  const cancelledRef = useRef(false)

  const buildContours = useCallback((grid, minV, maxV) => {
    const range = maxV - minV
    if (range < 1e-30) return []
    const lines = []
    const color = new THREE.Color(theme === 'dark' ? '#f59e0b' : '#d97706')
    for (let i = 1; i <= NUM_LEVELS; i++) {
      const level = minV + (range * i) / (NUM_LEVELS + 1)
      const segs = extractContourSegments(grid, GRID, GRID, level)
      const alpha = 0.3 + 0.6 * (i / NUM_LEVELS)
      for (const seg of segs) {
        lines.push({ points: seg, color, opacity: alpha })
      }
    }
    return lines
  }, [theme])

  useEffect(() => {
    cancelledRef.current = false
    if (!showEquipotentials || (charges.length === 0 && distributions.length === 0)) {
      return
    }

    const multiplier = UNIT_FACTORS[chargeUnit] || 1e-6
    const physicalCharges = distributions.length > 0 ? [] : charges.map(c => ({ ...c, q: c.q * multiplier }))
    const { ke, rMin } = useStore.getState()

    const nx = GRID
    const ny = GRID
    const positions = []
    for (let iy = 0; iy < ny; iy++) {
      for (let ix = 0; ix < nx; ix++) {
        const x = (ix / (nx - 1)) * WORLD_SIZE - HALF
        const y = (iy / (ny - 1)) * WORLD_SIZE - HALF
        positions.push([x, y, 0])
      }
    }

    computePotentialGrid(physicalCharges, positions, distributions, ke, rMin)
      .then((values) => {
        if (cancelledRef.current) return
        const grid = new Float32Array(values)
        let minV = Infinity, maxV = -Infinity
        for (let i = 0; i < grid.length; i++) {
          if (grid[i] < minV) minV = grid[i]
          if (grid[i] > maxV) maxV = grid[i]
        }
        const lines = buildContours(grid, minV, maxV)
        if (!cancelledRef.current) setContours(lines)
      })
      .catch(() => {
        if (!cancelledRef.current) setContours([])
      })

    return () => { cancelledRef.current = true }
  }, [charges, distributions, showEquipotentials, chargeUnit, theme, computePotentialGrid, buildContours])

  if (!showEquipotentials || contours.length === 0) return null

  return (
    <>
      {contours.map((c, i) => (
        <Line
          key={i}
          points={c.points}
          color={c.color}
          lineWidth={0.8}
          opacity={c.opacity}
          transparent
        />
      ))}
    </>
  )
}
