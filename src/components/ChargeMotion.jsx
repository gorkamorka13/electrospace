import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../store/useStore'
import { FORCE_SCALE, MASS_SCALE, FRICTION, MAX_SPEED, BOUNDARY } from '../physics/constants'

export function ChargeMotion() {
  const velRef = useRef({})

  useFrame((_, delta) => {
    const state = useStore.getState()
    const { charges, freeCharges, rMin } = state
    if (charges.length === 0) return
    const freeIds = Object.keys(freeCharges).filter((id) => freeCharges[id])
    if (freeIds.length === 0) return

    const dt = Math.min(delta, 0.05)
    const tmp = new THREE.Vector3()

    for (const id of freeIds) {
      const charge = charges.find(c => c.id === id)
      if (!charge) continue

      if (!velRef.current[id]) velRef.current[id] = new THREE.Vector3()

      const totalForce = new THREE.Vector3()
      for (const other of charges) {
        if (other.id === id) continue
        const posA = new THREE.Vector3(...charge.position)
        const posB = new THREE.Vector3(...other.position)
        const rVec = tmp.copy(posA).sub(posB)
        const r = Math.max(rVec.length(), rMin)
        const mag = FORCE_SCALE * (charge.q * other.q) / (r * r)
        totalForce.add(rVec.clone().normalize().multiplyScalar(mag))
      }

      const mass = Math.abs(charge.q) * MASS_SCALE + 0.0001
      const acc = totalForce.divideScalar(mass)
      const vel = velRef.current[id]
      vel.add(acc.multiplyScalar(dt))
      vel.multiplyScalar(FRICTION)

      const speed = vel.length()
      if (speed > MAX_SPEED) vel.multiplyScalar(MAX_SPEED / speed)

      const newPos = [
        charge.position[0] + vel.x * dt,
        charge.position[1] + vel.y * dt,
        charge.position[2] + vel.z * dt,
      ]

      for (let i = 0; i < 3; i++) {
        if (Math.abs(newPos[i]) > BOUNDARY) {
          newPos[i] = Math.sign(newPos[i]) * BOUNDARY
          vel.setComponent(i, -vel.getComponent(i) * 0.5)
        }
      }

      let collided = false
      for (const other of charges) {
        if (other.id === id) continue
        const dx = newPos[0] - other.position[0]
        const dy = newPos[1] - other.position[1]
        const dz = newPos[2] - other.position[2]
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
        if (dist < rMin && charge.q * other.q < 0) {
          vel.set(0, 0, 0)
          collided = true
          break
        }
      }

      if (state.freeCharges[id] && !collided) {
        state.updateChargePosition(id, newPos)
      }
    }
  })

  return null
}
