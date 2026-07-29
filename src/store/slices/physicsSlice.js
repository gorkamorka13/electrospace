import { KE_REAL } from '../../physics/coulomb'

export const createPhysicsSlice = (set) => ({
  ke: KE_REAL,
  rMin: 0.5,
  eMax: 15,
  chargeUnit: 'e',
  vectorScale: 1.0,
  fieldLinesPerCharge: 12,
  fieldLineStep: 0.15,

  setKe: (ke) => set({ ke }),
  setRMin: (rMin) => set({ rMin }),
  setEMax: (eMax) => set({ eMax }),
  setChargeUnit: (chargeUnit) => set({ chargeUnit }),
  setVectorScale: (vectorScale) => set({ vectorScale }),
  setFieldLinesPerCharge: (fieldLinesPerCharge) => set({ fieldLinesPerCharge }),
  setFieldLineStep: (fieldLineStep) => set({ fieldLineStep }),
})
