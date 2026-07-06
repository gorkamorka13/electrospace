import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../store/useStore'

export function DipoleMoment() {
  const arrowRef = useRef()

  useFrame(() => {
    const arrow = arrowRef.current
    if (!arrow) return
    const state = useStore.getState()
    if (!state.showDipoleMoment || state.charges.length < 2) {
      arrow.visible = false
      return
    }

    const posCharges = state.charges.filter(c => c.q > 0)
    const negCharges = state.charges.filter(c => c.q < 0)
    if (posCharges.length === 0 || negCharges.length === 0) {
      arrow.visible = false
      return
    }

    const pos = new THREE.Vector3(...posCharges[0].position)
    const neg = new THREE.Vector3(...negCharges[0].position)
    const d = new THREE.Vector3().copy(pos).sub(neg)
    const dist = d.length()
    if (dist < 0.01) {
      arrow.visible = false
      return
    }

    const mid = new THREE.Vector3().addVectors(pos, neg).multiplyScalar(0.5)
    const dir = d.clone().normalize()
    const arrowLen = Math.min(dist * 0.8, 6)

    arrow.setDirection(dir)
    arrow.setLength(arrowLen, Math.min(arrowLen * 0.3, 0.6), Math.min(arrowLen * 0.15, 0.25))
    arrow.setColor(new THREE.Color('#a855f7'))
    arrow.position.copy(mid)
    arrow.visible = true
  })

  return (
    <arrowHelper
      ref={arrowRef}
      args={[new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), 1, '#a855f7']}
      visible={false}
    />
  )
}
