import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../store/useStore'
import { TRAJECTORY_MAX_POINTS, TRAJECTORY_SAMPLE_INTERVAL } from '../physics/constants'

export function ChargeTrajectory() {
  const show = useStore((state) => state.showTrajectoryTrails)
  const trailsRef = useRef({})
  const frameRef = useRef(0)
  const linesRef = useRef({})
  const groupRef = useRef()
  useEffect(() => {
    const currentGroup = groupRef.current
    return () => {
      Object.values(linesRef.current).forEach((l) => {
        if (currentGroup) currentGroup.remove(l)
        l.geometry.dispose()
        l.material.dispose()
      })
      linesRef.current = {}
      trailsRef.current = {}
    }
  }, [])

  const showRef = useRef(false)

  useEffect(() => {
    const group = groupRef.current
    if (show) {
      Object.values(linesRef.current).forEach((l) => {
        if (group) group.remove(l)
        l.geometry.dispose()
        l.material.dispose()
      })
      linesRef.current = {}
      trailsRef.current = {}
      const state = useStore.getState()
      for (const charge of state.charges) {
        const pos = charge.position
        trailsRef.current[charge.id] = [[pos[0], pos[1], pos[2]]]
      }
      frameRef.current = 0
    } else {
      Object.values(linesRef.current).forEach((l) => {
        if (group) group.remove(l)
        l.geometry.dispose()
        l.material.dispose()
      })
      linesRef.current = {}
      trailsRef.current = {}
    }
    showRef.current = show
  }, [show])

  useFrame(() => {
    if (!show) return
    const state = useStore.getState()
    const { charges } = state
    const group = groupRef.current
    if (!group) return

    frameRef.current++
    if (frameRef.current % TRAJECTORY_SAMPLE_INTERVAL === 0) {
      for (const charge of charges) {
        if (!trailsRef.current[charge.id]) {
          const pos = charge.position
          trailsRef.current[charge.id] = [[pos[0], pos[1], pos[2]]]
        }
        const trail = trailsRef.current[charge.id]
        const last = trail[trail.length - 1]
        const pos = charge.position
        if (last && Math.abs(last[0] - pos[0]) < 0.001 && Math.abs(last[1] - pos[1]) < 0.001 && Math.abs(last[2] - pos[2]) < 0.001) continue
        trail.push([pos[0], pos[1], pos[2]])
        if (trail.length > TRAJECTORY_MAX_POINTS) trail.shift()
      }
    }

    const active = new Set(charges.map((c) => c.id))
    for (const id of Object.keys(linesRef.current)) {
      if (!active.has(id)) {
        const line = linesRef.current[id]
        group.remove(line)
        line.geometry.dispose()
        line.material.dispose()
        delete linesRef.current[id]
        delete trailsRef.current[id]
      }
    }

    for (const charge of charges) {
      const pts = trailsRef.current[charge.id]
      if (!pts || pts.length < 2) {
        if (linesRef.current[charge.id]) {
          group.remove(linesRef.current[charge.id])
          delete linesRef.current[charge.id]
        }
        continue
      }

      const color = charge.q >= 0 ? '#ff6b6b' : '#4dabf7'
      if (!linesRef.current[charge.id]) {
        const positions = new Float32Array(pts.length * 3)
        for (let i = 0; i < pts.length; i++) {
          positions[i * 3] = pts[i][0]
          positions[i * 3 + 1] = pts[i][1]
          positions[i * 3 + 2] = pts[i][2]
        }
        const geo = new THREE.BufferGeometry()
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
        geo.setDrawRange(0, pts.length)
        const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.5 })
        const line = new THREE.Line(geo, mat)
        linesRef.current[charge.id] = line
        group.add(line)
        continue
      }

      const line = linesRef.current[charge.id]
      const posAttr = line.geometry.attributes.position
      if (posAttr.array.length < pts.length * 3) {
        const newArray = new Float32Array(pts.length * 3)
        const newAttr = new THREE.BufferAttribute(newArray, 3)
        line.geometry.setAttribute('position', newAttr)
      }
      const array = line.geometry.attributes.position.array
      for (let i = 0; i < pts.length; i++) {
        array[i * 3] = pts[i][0]
        array[i * 3 + 1] = pts[i][1]
        array[i * 3 + 2] = pts[i][2]
      }
      line.geometry.attributes.position.needsUpdate = true
      line.geometry.attributes.position.count = pts.length
      line.geometry.setDrawRange(0, pts.length)
      if (line.material.color.getStyle() !== color) line.material.color.set(color)
    }
  })

  return <group ref={groupRef} />
}
