import { create } from 'zustand'
import { calculateTotalField, calculateTotalPotential, calculateTotalForceOnCharge, KE_REAL, E_CHARGE } from '../physics/coulomb'

export const UNIT_FACTORS = {
  uC: 1e-6,
  nC: 1e-9,
  pC: 1e-12,
  C: 1.0,
  e: E_CHARGE
}

const PRESETS = {
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
    { id: '1', q: 1.0, position: [0, 3, 0], name: 'A' },
    { id: '2', q: -1.0, position: [2, 0, 0], name: 'B' },
    { id: '3', q: 1.0, position: [-1, 0, 1.732], name: 'C' },
    { id: '4', q: -1.0, position: [-1, 0, -1.732], name: 'D' },
  ],
}

export { PRESETS }

const MAX_HISTORY = 50

function snapshot(state) {
  return {
    charges: JSON.parse(JSON.stringify(state.charges)),
    chargeInitialPositions: { ...state.chargeInitialPositions },
    freeCharges: { ...state.freeCharges },
    distributions: JSON.parse(JSON.stringify(state.distributions)),
  }
}

export const useStore = create((set, get) => ({
  charges: [
    { id: '1', q: 1.0, position: [2, 0, 0], name: 'A' },
    { id: '2', q: -1.0, position: [-2, 0, 0], name: 'B' },
  ],
  chargeInitialPositions: { '1': [2, 0, 0], '2': [-2, 0, 0] },
  testPoint: [1, 0.5, 2],
  selectedObjectId: 'testPoint',
  ke: KE_REAL,
  rMin: 0.5,
  eMax: 15,
  chargeUnit: 'e',
  vectorScale: 1.0,
  isDragging: false,
  sidebarOpen: typeof window !== 'undefined' ? window.innerWidth > 768 : true,
  theme: typeof window !== 'undefined' ? (localStorage.getItem('theme') || 'dark') : 'dark',
  snapEnabled: false,
  snapSize: 0.5,
  lockedAxes: { x: false, y: false, z: false },
  activeView: 'isometric',
  cameraMode: 'perspective',
  showForces: false,
  showFieldLines: false,
  fieldLinesPerCharge: 12,
  fieldLineStep: 0.15,
  showThroughMLine: false,
  showEquipotentials: false,
  showEquipotentials3D: false,
  // v1.3
  freeCharges: {},
  showDipoleMoment: false,
  showTrajectoryTrails: false,
  // Distributions continues
  distributions: [],
  showPotentialGraph: false,
  potentialGraphAxis: 'x',
  showPotentialXGraph: false,
  showFieldGraph: false,
  showIndividualFields: false,

  // Contexte menu
  contextMenu: null,

  // Gauss Companion State
  showGaussCompanion: false,
  gaussStep: 1,
  gaussSurfaceType: 'sphere',
  gaussSurfaceRadius: 2.0,
  gaussSurfaceHeight: 4.0,
  gaussSurfaceWidth: 4.0,
  gaussSurfaceDepth: 4.0,
  gaussCenter: [0, 0, 0],

  // Undo/Redo
  history: [],
  future: [],
  showHelp: false,
  toast: null,

  setDragging: (isDragging) => set({ isDragging }),
  setSelectedObjectId: (id) => set({ selectedObjectId: id }),
  openContextMenu: (x, y, id, type = 'charge') => set({ contextMenu: { x, y, id, type } }),
  closeContextMenu: () => set({ contextMenu: null }),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  toggleTheme: () => set((state) => {
    const newTheme = state.theme === 'dark' ? 'light' : 'dark'
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', newTheme)
    }
    return { theme: newTheme }
  }),
  setSnapEnabled: (snapEnabled) => set({ snapEnabled }),
  setSnapSize: (snapSize) => set({ snapSize }),
  toggleLockedAxis: (axis) => set((state) => ({ lockedAxes: { ...state.lockedAxes, [axis]: !state.lockedAxes[axis] } })),
  setActiveView: (activeView) => set({ activeView }),
  setCameraMode: (cameraMode) => set({ cameraMode }),
  setChargeUnit: (chargeUnit) => set({ chargeUnit }),
  setShowHelp: (v) => set({ showHelp: v }),
  setToast: ({ message, type = 'error', duration = 4000 }) => {
    set({ toast: { message, type } })
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        const current = get().toast
        if (current && current.message === message) set({ toast: null })
      }, duration)
    }
  },
  setVectorScale: (vectorScale) => set({ vectorScale }),
  setShowForces: (showForces) => set({ showForces }),
  setShowFieldLines: (showFieldLines) => set({ showFieldLines }),
  setFieldLinesPerCharge: (fieldLinesPerCharge) => set({ fieldLinesPerCharge }),
  setFieldLineStep: (fieldLineStep) => set({ fieldLineStep }),
  setShowThroughMLine: (v) => set({ showThroughMLine: v }),
  setShowEquipotentials: (v) => set({ showEquipotentials: v }),
  setShowEquipotentials3D: (v) => set({ showEquipotentials3D: v }),
  setShowDipoleMoment: (v) => set({ showDipoleMoment: v }),
  setShowTrajectoryTrails: (v) => set({ showTrajectoryTrails: v }),

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

  exportScene: () => {
    const state = get()
    const data = {
      version: 2,
      chargeUnit: state.chargeUnit,
      activeView: state.activeView,
      testPoint: state.testPoint,
      charges: state.charges.map(c => ({ q: c.q, position: c.position, name: c.name })),
      distributions: state.distributions.map(d => {
        // eslint-disable-next-line no-unused-vars
        const { id, ...rest } = d
        return rest
      }),
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `electro-scene-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
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
        // backward compat: ensure sphere and cylinder have both hollow and innerRadius
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
    // When distributions are active, point charges are hidden and must not contribute
    const physicalCharges = distributions.length > 0 ? [] : charges.map(c => ({ ...c, q: c.q * multiplier }))
    return calculateTotalField(physicalCharges, point, ke, rMin, distributions)
  },

  getPotential: (point) => {
    const { charges, chargeUnit, ke, rMin, distributions } = get()
    const multiplier = UNIT_FACTORS[chargeUnit] || 1e-6
    // When distributions are active, point charges are hidden and must not contribute
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
    if (!state.selectedObjectId || state.selectedObjectId === 'testPoint') {
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
      // eslint-disable-next-line no-unused-vars
      const { [id]: _, ...rest } = state.chargeInitialPositions || {}
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

  resetScene: () => {
    get().pushHistory()
    set(() => {
      const preset = PRESETS['dipole']
      if (!preset) return { distributions: [], freeCharges: {}, activeView: 'isometric' }
      const charges = preset.map((c, i) => ({ ...c, id: String(i + 1) }))
      const chargeInitialPositions = Object.fromEntries(charges.map((c) => [c.id, [...c.position]]))
      return {
        charges,
        chargeInitialPositions,
        freeCharges: {},
        distributions: [],
        selectedObjectId: null,
        activeView: 'isometric',
        showEquipotentials3D: false,
        showTrajectoryTrails: false,
      }
    })
  },

  /* Distribution actions */
  addDistribution: (type, params = {}) => {
    get().pushHistory()
    set((state) => {
      const id = Math.random().toString(36).substring(2, 9)
      const defaults = {
        line: { length: 10, density: 1e-9 },
        cylinder: { center: [0, 0, 0], axis: [0, 1, 0], radius: 2, height: 5, density: 1e-6, hollow: false, innerRadius: 0, e_ext: 0, e_int: 0 },
        plane: { center: [0, 0, 0], normal: [1, 0, 0], width: 8, height: 8, density: 1e-9 },
        disk: { center: [0, 0, 0], normal: [1, 0, 0], radius: 2, density: 1e-9 },
        circle: { center: [0, 0, 0], normal: [1, 0, 0], radius: 2, density: 1e-9 },
        frame: { center: [0, 0, 0], normal: [1, 0, 0], width: 4, height: 4, density: 1e-9 },
        sphere: { center: [0, 0, 0], radius: 2, density: 1e-6, innerRadius: 0, hollow: false, e_ext: 0, e_int: 0 },
        box: { center: [0, 0, 0], normal: [1, 0, 0], width: 8, height: 8, depth: 2, density: 1e-6, hollow: false },
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
        if (merged.innerRadius != null && merged.radius != null) {
          merged.innerRadius = Math.min(merged.innerRadius, merged.radius)
        }
        if (merged.e_ext != null) merged.e_ext = Math.max(0, merged.e_ext)
        if (merged.e_int != null) merged.e_int = Math.max(0, merged.e_int)
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
  setShowPotentialGraph: (v) => set({ showPotentialGraph: v }),
  setShowPotentialXGraph: (v) => set({ showPotentialXGraph: v }),
  setShowFieldGraph: (v) => set({ showFieldGraph: v }),
  setShowIndividualFields: (v) => set({ showIndividualFields: v }),
  setPotentialGraphAxis: (v) => set({ potentialGraphAxis: v }),

  // Gauss Companion Actions
  setShowGaussCompanion: (v) => set({ showGaussCompanion: v }),
  setGaussStep: (v) => set({ gaussStep: v }),
  setGaussSurfaceType: (v) => set({ gaussSurfaceType: v }),
  setGaussSurfaceRadius: (v) => set({ gaussSurfaceRadius: v }),
  setGaussSurfaceHeight: (v) => set({ gaussSurfaceHeight: v }),
  setGaussSurfaceWidth: (v) => set({ gaussSurfaceWidth: v }),
  setGaussSurfaceDepth: (v) => set({ gaussSurfaceDepth: v }),
  setGaussCenter: (v) => set({ gaussCenter: v }),
}))

/* Distribution default helpers (used by Sidebar) */
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

export const DIST_PARAMS = {
  line: [
    { key: 'length', label: 'Longueur (m)', type: 'number', step: 0.1, min: 0.1 },
    { key: 'density', label: 'λ (C/m)', type: 'number', step: 1e-10, min: 1e-12 },
  ],
  cylinder: [
    { key: 'center', label: 'Centre', type: 'vec3' },
    { key: 'axis', label: 'Axe', type: 'vec3' },
    { key: 'radius', label: 'Rayon', type: 'radii', innerKey: 'innerRadius', outerLabel: 'Ext.', innerLabel: 'Int.' },
    { key: 'e_ext', label: 'Épaisseur', type: 'radii', innerKey: 'e_int', outerLabel: 'Ext.', innerLabel: 'Int.' },
    { key: 'height', label: 'Hauteur (m)', type: 'number', step: 0.1, min: 0.1 },
    { key: 'density', label: 'ρ (C/m³)', type: 'number', step: 1e-7, min: 1e-9 },
  ],
  plane: [
    { key: 'center', label: 'Centre', type: 'vec3' },
    { key: 'normal', label: 'Normale', type: 'vec3' },
    { key: 'width', label: 'Largeur (m)', type: 'number', step: 0.1, min: 0.1 },
    { key: 'height', label: 'Hauteur (m)', type: 'number', step: 0.1, min: 0.1 },
    { key: 'density', label: 'σ (C/m²)', type: 'number', step: 1e-10, min: 1e-12 },
  ],
  disk: [
    { key: 'center', label: 'Centre', type: 'vec3' },
    { key: 'normal', label: 'Normale', type: 'vec3' },
    { key: 'radius', label: 'Rayon (m)', type: 'number', step: 0.1, min: 0.1 },
    { key: 'density', label: 'σ (C/m²)', type: 'number', step: 1e-10, min: 1e-12 },
  ],
  circle: [
    { key: 'center', label: 'Centre', type: 'vec3' },
    { key: 'normal', label: 'Normale', type: 'vec3' },
    { key: 'radius', label: 'Rayon (m)', type: 'number', step: 0.1, min: 0.1 },
    { key: 'density', label: 'λ (C/m)', type: 'number', step: 1e-10, min: 1e-12 },
  ],
  frame: [
    { key: 'center', label: 'Centre', type: 'vec3' },
    { key: 'normal', label: 'Normale', type: 'vec3' },
    { key: 'width', label: 'Largeur (m)', type: 'number', step: 0.1, min: 0.1 },
    { key: 'height', label: 'Hauteur (m)', type: 'number', step: 0.1, min: 0.1 },
    { key: 'density', label: 'λ (C/m)', type: 'number', step: 1e-10, min: 1e-12 },
  ],
  sphere: [
    { key: 'center', label: 'Centre', type: 'vec3' },
    { key: 'radius', label: 'Rayon', type: 'radii', innerKey: 'innerRadius', outerLabel: 'Ext.', innerLabel: 'Int.' },
    { key: 'e_ext', label: 'Épaisseur', type: 'radii', innerKey: 'e_int', outerLabel: 'Ext.', innerLabel: 'Int.' },
    { key: 'density', label: 'ρ (C/m³)', type: 'number', step: 1e-7, min: 1e-9 },
  ],
  box: [
    { key: 'center', label: 'Centre', type: 'vec3' },
    { key: 'normal', label: 'Normale', type: 'vec3' },
    { key: 'width', label: 'Largeur (m)', type: 'number', step: 0.1, min: 0.1 },
    { key: 'height', label: 'Hauteur (m)', type: 'number', step: 0.1, min: 0.1 },
    { key: 'depth', label: 'Profondeur (m)', type: 'number', step: 0.1, min: 0.1 },
    { key: 'density', label: 'ρ (C/m³)', type: 'number', step: 1e-7, min: 1e-9 },
  ],
}
