import { KE_REAL } from '../../physics/coulomb'

/**
 * Slice de store pour les paramètres physiques.
 * Contient les constantes, unités, et paramètres de simulation.
 */
export const createPhysicsSlice = (set) => ({
  ke: KE_REAL,
  rMin: 0.5,
  eMax: 15,
  chargeUnit: 'e',
  vectorScale: 1.0,
  fieldLinesPerCharge: 12,
  fieldLineStep: 0.15,
  /** Méthode d'intégration pour le tracé des lignes de champ : 'euler' | 'rk4' */
  integrationMethod: 'euler',
  /** Résolution de la grille du champ vectoriel (points par axe) */
  vectorGridResolution: 8,

  setKe: (ke) => set({ ke }),
  setRMin: (rMin) => set({ rMin }),
  setEMax: (eMax) => set({ eMax }),
  setChargeUnit: (chargeUnit) => set({ chargeUnit }),
  setVectorScale: (vectorScale) => set({ vectorScale }),
  setFieldLinesPerCharge: (fieldLinesPerCharge) => set({ fieldLinesPerCharge }),
  setFieldLineStep: (fieldLineStep) => set({ fieldLineStep }),
  /** Définit la méthode d'intégration (euler ou rk4) */
  setIntegrationMethod: (integrationMethod) => set({ integrationMethod }),
  /** Définit la résolution de la grille du champ vectoriel */
  setVectorGridResolution: (vectorGridResolution) => set({ vectorGridResolution }),
})
