import { calculateTotalField, calculateTotalPotential, calculateTotalForceOnCharge, E_CHARGE } from '../../physics/coulomb'

export const UNIT_FACTORS = {
  uC: 1e-6,
  nC: 1e-9,
  pC: 1e-12,
  C: 1.0,
  e: E_CHARGE,
}

export const PRESETS = {
  dipole: [
    { id: '1', q: 1.0, position: [2, 0, 0], name: 'A' },
    { id: '2', q: -1.0, position: [-2, 0, 0], name: 'B' },
  ],
  quadrupole: [
    { id: '1', q: 1.0, position: [2, 0, 2], name: 'A' },
    { id: '2', q: -1.0, position: [-2, 0, 2], name: 'B' },
    { id: '3', q: -1.0, position: [2, 0, -2], name: 'C' },
    { id: '4', q: 1.0, position: [-2, 0, -2], name: 'D' },
  ],
  capacitor: [
    { id: '1', q: 1.0, position: [3, 0, 0], name: 'A' },
    { id: '2', q: -1.0, position: [-3, 0, 0], name: 'B' },
    { id: '3', q: 1.0, position: [3, 0, 1.5], name: 'C' },
    { id: '4', q: -1.0, position: [-3, 0, 1.5], name: 'D' },
    { id: '5', q: 1.0, position: [3, 0, -1.5], name: 'E' },
    { id: '6', q: -1.0, position: [-3, 0, -1.5], name: 'F' },
  ],
  single: [
    { id: '1', q: 1.0, position: [0, 0, 0], name: 'A' },
  ],
  cubicQuadrupole: [
    { id: '1', q: 1, position: [2, 2, 2], name: 'A' },
    { id: '2', q: -1, position: [2, 2, -2], name: 'B' },
    { id: '3', q: -1, position: [2, -2, 2], name: 'C' },
    { id: '4', q: 1, position: [2, -2, -2], name: 'D' },
    { id: '5', q: -1, position: [-2, 2, 2], name: 'E' },
    { id: '6', q: 1, position: [-2, 2, -2], name: 'F' },
    { id: '7', q: 1, position: [-2, -2, 2], name: 'G' },
    { id: '8', q: -1, position: [-2, -2, -2], name: 'H' },
  ],
  tripole: [
    { id: '1', q: 1.0, position: [0, 2, 0], name: 'A' },
    { id: '2', q: -1.0, position: [1.732, -1, 0], name: 'B' },
    { id: '3', q: 1.0, position: [-1.732, -1, 0], name: 'C' },
  ],
  tetrahedron: [
    { id: '1', q: -1.0, position: [0, 3, 0], name: 'A' },
    { id: '2', q: 1.0, position: [2, 0, 0], name: 'B' },
    { id: '3', q: 1.0, position: [-1, 0, 1.732], name: 'C' },
    { id: '4', q: 1.0, position: [-1, 0, -1.732], name: 'D' },
  ],
}

export const DIST_TYPE_NAMES = {
  line: 'Ligne',
  cylinder: 'Cylindre',
  plane: 'Plan',
  disk: 'Disque',
  circle: 'Anneau',
  frame: 'Cadre',
  sphere: 'Sphère',
  box: 'Boîte',
}

const MAX_HISTORY = 50

function snapshot(state) {
  return {
    charges: JSON.parse(JSON.stringify(state.charges)),
    chargeInitialPositions: JSON.parse(JSON.stringify(state.chargeInitialPositions)),
    freeCharges: { ...state.freeCharges },
    distributions: JSON.parse(JSON.stringify(state.distributions)),
    testPoint: [...state.testPoint],
    ke: state.ke,
    rMin: state.rMin,
    eMax: state.eMax,
    chargeUnit: state.chargeUnit,
    vectorScale: state.vectorScale,
    showForces: state.showForces,
    showFieldLines: state.showFieldLines,
    showThroughMLine: state.showThroughMLine,
    showEquipotentials: state.showEquipotentials,
    showEquipotentials3D: state.showEquipotentials3D,
    showDipoleMoment: state.showDipoleMoment,
    showTrajectoryTrails: state.showTrajectoryTrails,
    showPotentialGraph: state.showPotentialGraph,
    showPotentialXGraph: state.showPotentialXGraph,
    showFieldGraph: state.showFieldGraph,
    showIndividualFields: state.showIndividualFields,
    snapEnabled: state.snapEnabled,
    snapSize: state.snapSize,
    lockedAxes: { ...state.lockedAxes },
    activeView: state.activeView,
    cameraMode: state.cameraMode,
    showGaussCompanion: state.showGaussCompanion,
    gaussStep: state.gaussStep,
    gaussSurfaceType: state.gaussSurfaceType,
    gaussSurfaceRadius: state.gaussSurfaceRadius,
    gaussSurfaceHeight: state.gaussSurfaceHeight,
    gaussSurfaceWidth: state.gaussSurfaceWidth,
    gaussSurfaceDepth: state.gaussSurfaceDepth,
    gaussCenter: [...state.gaussCenter],
    showTestPoint: state.showTestPoint,
    integrationMethod: state.integrationMethod,
  }
}

export const createSceneSlice = (set, get) => ({
  charges: [
    { id: '1', q: 1.0, position: [2, 0, 0], name: 'A' },
    { id: '2', q: -1.0, position: [-2, 0, 0], name: 'B' },
  ],
  chargeInitialPositions: { '1': [2, 0, 0], '2': [-2, 0, 0] },
  testPoint: [1, 0.5, 2],
  freeCharges: {},
  distributions: [],
  fieldGraphZ: 1000,
  potentialGraphZ: 1001,
  history: [],
  future: [],

  pushHistory: () => set((state) => {
    const s = snapshot(state)
    const history = [...state.history, s]
    if (history.length > MAX_HISTORY) history.shift()
    return { history, future: [] }
  }),

  undo: () => set((state) => {
    if (state.history.length === 0) return state
    const prev = state.history[state.history.length - 1]
    const current = snapshot(state)
    return {
      ...prev,
      history: state.history.slice(0, -1),
      future: [current, ...state.future],
    }
  }),

  redo: () => set((state) => {
    if (state.future.length === 0) return state
    const next = state.future[0]
    const current = snapshot(state)
    return {
      ...next,
      history: [...state.history, current],
      future: state.future.slice(1),
    }
  }),

  loadPreset: (name) => {
    get().pushHistory()
    const preset = PRESETS[name]
    if (!preset) return
    const charges = preset.map((c, i) => ({ ...c, id: String(i + 1) }))
    const chargeInitialPositions = Object.fromEntries(charges.map((c) => [c.id, [...c.position]]))
    set({ charges, chargeInitialPositions, freeCharges: {}, selectedObjectId: null })
  },

  toggleFreeCharge: (id) => set((state) => {
    const next = { ...state.freeCharges }
    if (next[id]) {
      delete next[id]
    } else {
      next[id] = true
    }
    return { freeCharges: next }
  }),

  zIndexCounter: 1002,
  bringToFront: (id) => set((state) => {
    const newZ = state.zIndexCounter + 1
    return { [`${id}Z`]: newZ, zIndexCounter: newZ }
  }),

  exportScene: () => {
    try {
      const state = get()
      const data = {
        version: 2,
        chargeUnit: state.chargeUnit,
        activeView: state.activeView,
        testPoint: state.testPoint,
        charges: state.charges.map(c => ({ q: c.q, position: c.position, name: c.name })),
        distributions: state.distributions.map((d) => { const copy = { ...d }; delete copy.id; return copy }),
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `electro-scene-${Date.now()}.json`
      a.click()
      URL.revokeObjectURL(url)
      return { success: true, error: null }
    } catch (err) {
      return { success: false, error: err.message }
    }
  },

  importScene: (jsonStr) => {
    try {
      const data = JSON.parse(jsonStr)
      if (!data.charges || !Array.isArray(data.charges)) {
        return { success: false, error: 'Fichier invalide : propriété "charges" manquante ou non valide.' }
      }
      get().pushHistory()
      const charges = data.charges.map((c, i) => ({
        id: String(i + 1),
        q: c.q ?? 1,
        position: c.position ?? [0, 0, 0],
        name: c.name ?? String.fromCharCode(65 + i),
      }))
      const chargeInitialPositions = Object.fromEntries(charges.map((c) => [c.id, [...c.position]]))
      const distributions = (data.distributions || []).map((d) => {
        if (d.type === 'sphere' || d.type === 'cylinder') {
          const hasHollow = 'hollow' in d
          const hasInner = 'innerRadius' in d
          if (!hasHollow && !hasInner) {
            return { id: Math.random().toString(36).substring(2, 9), ...d, innerRadius: 0, hollow: false }
          }
          if (hasHollow && !hasInner) {
            return { id: Math.random().toString(36).substring(2, 9), ...d, innerRadius: d.hollow ? (d.radius || 2) * 0.99 : 0 }
          }
          if (!hasHollow && hasInner) {
            return { id: Math.random().toString(36).substring(2, 9), ...d, hollow: false }
          }
        }
        return {
          id: Math.random().toString(36).substring(2, 9),
          ...d,
        }
      })
      set({
        charges,
        chargeInitialPositions,
        freeCharges: {},
        distributions,
        testPoint: data.testPoint || [0, 0.5, 2],
        chargeUnit: data.chargeUnit || 'e',
        activeView: data.activeView || 'isometric',
        selectedObjectId: null,
      })
      return { success: true, error: null }
    } catch (e) {
      return { success: false, error: `Erreur de lecture du fichier : ${e.message}` }
    }
  },

  getElectricField: (point) => {
    const { charges, chargeUnit, ke, rMin, distributions } = get()
    const multiplier = UNIT_FACTORS[chargeUnit] || 1e-6
    const physicalCharges = distributions.length > 0 ? [] : charges.map(c => ({ ...c, q: c.q * multiplier }))
    return calculateTotalField(physicalCharges, point, ke, rMin, distributions)
  },

  getPotential: (point) => {
    const { charges, chargeUnit, ke, rMin, distributions } = get()
    const multiplier = UNIT_FACTORS[chargeUnit] || 1e-6
    const physicalCharges = distributions.length > 0 ? [] : charges.map(c => ({ ...c, q: c.q * multiplier }))
    return calculateTotalPotential(physicalCharges, point, ke, rMin, distributions)
  },

  getCoulombForces: (chargeId) => {
    const { charges, chargeUnit, ke, rMin } = get()
    const multiplier = UNIT_FACTORS[chargeUnit] || 1e-6
    const physicalCharges = charges.map(c => ({ ...c, q: c.q * multiplier }))
    const target = physicalCharges.find(c => c.id === chargeId)
    if (!target) return null
    return calculateTotalForceOnCharge(target, physicalCharges, ke, rMin)
  },

  nudgePosition: (dx, dz) => set((state) => {
    if ((!state.selectedObjectId || state.selectedObjectId === 'testPoint') && state.showTestPoint) {
      const step = state.snapEnabled ? state.snapSize : 0.1
      const [x, y, z] = state.testPoint
      const nx = x + Math.sign(dx) * step
      const nz = z + Math.sign(dz) * step
      return {
        testPoint: state.snapEnabled
          ? [Math.round(nx / state.snapSize) * state.snapSize, y, Math.round(nz / state.snapSize) * state.snapSize]
          : [nx, y, nz]
      }
    }
    const step = state.snapEnabled ? state.snapSize : 0.1
    const finalDx = Math.sign(dx) * step
    const finalDz = Math.sign(dz) * step
    return {
      charges: state.charges.map((c) => {
        if (c.id === state.selectedObjectId) {
          const nx = c.position[0] + finalDx
          const nz = c.position[2] + finalDz
          return { ...c, position: state.snapEnabled
            ? [Math.round(nx / state.snapSize) * state.snapSize, c.position[1], Math.round(nz / state.snapSize) * state.snapSize]
            : [nx, c.position[1], nz]
          }
        }
        return c
      })
    }
  }),

  nudgeY: (dy) => set((state) => {
    if (state.selectedObjectId && state.selectedObjectId !== 'testPoint') {
      const step = state.snapEnabled ? state.snapSize : 0.1
      const finalDy = Math.sign(dy) * step
      return {
        charges: state.charges.map((c) => {
          if (c.id === state.selectedObjectId) {
            const ny = c.position[1] + finalDy
            return { ...c, position: [c.position[0], ny, c.position[2]] }
          }
          return c
        })
      }
    }
    return {}
  }),

  addCharge: (q) => {
    get().pushHistory()
    set((state) => {
      const newId = Math.random().toString(36).substring(2, 9)
      const usedNames = state.charges.map((c) => c.name)
      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
      let nextName = 'A'
      for (let i = 0; i < alphabet.length; i++) {
        if (!usedNames.includes(alphabet[i])) {
          nextName = alphabet[i]
          break
        }
      }
      return {
        charges: [...state.charges, { id: newId, q, position: [0, 0, 0], name: nextName }],
        chargeInitialPositions: { ...state.chargeInitialPositions, [newId]: [0, 0, 0] },
        selectedObjectId: newId,
      }
    })
  },

  removeCharge: (id) => {
    get().pushHistory()
    set((state) => {
      const rest = { ...state.chargeInitialPositions }
      delete rest[id]
      return {
        charges: state.charges.filter((c) => c.id !== id),
        freeCharges: Object.fromEntries(Object.entries(state.freeCharges).filter(([k]) => k !== id)),
        chargeInitialPositions: rest,
        selectedObjectId: state.selectedObjectId === id ? null : state.selectedObjectId,
      }
    })
  },

  updateChargePosition: (id, position) => {
    set((state) => ({
      charges: state.charges.map((c) => (c.id === id ? { ...c, position } : c)),
    }))
  },

  updateChargeQ: (id, q) => {
    get().pushHistory()
    set((state) => ({
      charges: state.charges.map((c) => (c.id === id ? { ...c, q } : c)),
    }))
  },

  resetChargePositions: () => {
    get().pushHistory()
    set((state) => ({
      charges: state.charges.map((c) => ({
        ...c,
        position: state.chargeInitialPositions[c.id] ? [...state.chargeInitialPositions[c.id]] : c.position,
      })),
      freeCharges: {},
    }))
  },

  updateTestPoint: (position) => set({ testPoint: position }),

  clearCharges: () => {
    get().pushHistory()
    set({ charges: [], freeCharges: {}, chargeInitialPositions: {} })
  },

  addDistribution: (type, params = {}) => {
    get().pushHistory()
    set(() => {
      const id = Math.random().toString(36).substring(2, 9)
      const defaults = {
        line: { length: 10, density: 1e-9, mode: 'finite' },
        cylinder: { center: [0, 0, 0], axis: [0, 1, 0], radius: 2, height: 5, density: 1e-6, hollow: false, innerRadius: 0, e_ext: 0, e_int: 0, mode: 'finite' },
        plane: { center: [0, 0, 0], normal: [1, 0, 0], width: 10, height: 10, density: 1e-9, linkWH: false, mode: 'finite' },
        disk: { center: [0, 0, 0], normal: [1, 0, 0], radius: 2, density: 1e-9 },
        circle: { center: [0, 0, 0], normal: [1, 0, 0], radius: 2, density: 1e-9 },
        frame: { center: [0, 0, 0], normal: [1, 0, 0], width: 4, height: 4, density: 1e-9, linkWH: false },
        sphere: { center: [0, 0, 0], radius: 2, density: 1e-6, innerRadius: 0, hollow: false, e_ext: 0, e_int: 0 },
        box: { center: [0, 0, 0], normal: [1, 0, 0], width: 10, height: 10, depth: 2, density: 1e-6, hollow: false, linkWH: false },
      }
      const dist = { id, type, name: DIST_TYPE_NAMES[type] || type, ...defaults[type], ...params }
      return { distributions: [dist], selectedObjectId: id }
    })
  },

  removeDistribution: (id) => {
    get().pushHistory()
    set((state) => ({
      distributions: state.distributions.filter((d) => d.id !== id),
    }))
  },

  updateDistribution: (id, updates) => {
    get().pushHistory()
    set((state) => ({
      distributions: state.distributions.map((d) => {
        if (d.id !== id) return d
        const merged = { ...d, ...updates }
        // Sync linked width/height
        if (d.linkWH && 'width' in updates && !('height' in updates)) merged.height = updates.width
        if (d.linkWH && 'height' in updates && !('width' in updates)) merged.width = updates.height
        if (merged.innerRadius != null && merged.radius != null) {
          merged.innerRadius = Math.min(merged.innerRadius, merged.radius)
        }
        if (merged.e_ext != null) merged.e_ext = Math.max(0, merged.e_ext)
        if (merged.e_int != null) merged.e_int = Math.max(0, merged.e_int)
        if (merged.e_int != null && merged.e_ext != null) {
          merged.e_int = Math.min(merged.e_int, merged.e_ext)
        }
        return merged
      }),
    }))
  },

  updateDistributionPosition: (id, position) => set((state) => ({
    distributions: state.distributions.map((d) => {
      if (d.id !== id) return d
      if (d.center) return { ...d, center: position }
      return d
    }),
  })),

  clearDistributions: () => {
    get().pushHistory()
    set({ distributions: [] })
  },
})
