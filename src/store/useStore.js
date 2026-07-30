import { create } from 'zustand'
import { createSceneSlice, PRESETS, DIST_TYPE_NAMES, UNIT_FACTORS } from './slices/sceneSlice'
import { createPhysicsSlice } from './slices/physicsSlice'
import { createUISlice } from './slices/uiSlice'
import { createVisualsSlice } from './slices/visualsSlice'

export { PRESETS, DIST_TYPE_NAMES, UNIT_FACTORS }
export { KE_REAL, E_CHARGE } from '../physics/coulomb'

export const useStore = create((set, get, api) => ({
  ...createSceneSlice(set, get, api),
  ...createPhysicsSlice(set, get, api),
  ...createUISlice(set, get, api),
  ...createVisualsSlice(set, get, api),
}))

/* Distribution default helpers (used by Sidebar & ContextMenu) */
export const DIST_PARAMS = {
  line: [
    { key: 'length', label: 'Longueur (m)', type: 'range' },
    { key: 'density', label: 'λ (C/m)', type: 'number', step: 1e-10, min: 1e-12 },
  ],
  cylinder: [
    { key: 'center', label: 'Centre', type: 'vec3' },
    { key: 'axis', label: 'Axe', type: 'vec3' },
    { key: 'radius', label: 'Rayon', type: 'radii', innerKey: 'innerRadius', outerLabel: 'Cyl. 1', innerLabel: 'Cyl. 2' },
    { key: 'e_ext', label: 'Épaisseur', type: 'radii', innerKey: 'e_int', outerLabel: 'Cyl. 1', innerLabel: 'Cyl. 2' },
    { key: 'height', label: 'Hauteur (m)', type: 'range' },
    { key: 'density', label: 'ρ (C/m³)', type: 'number', step: 1e-7, min: 1e-9 },
  ],
  plane: [
    { key: 'center', label: 'Centre', type: 'vec3' },
    { key: 'normal', label: 'Normale', type: 'vec3' },
    { key: 'width', label: 'Largeur (m)', type: 'range', linkKey: 'height' },
    { key: 'height', label: 'Hauteur (m)', type: 'range', linkKey: 'width' },
    { key: 'density', label: 'σ (C/m²)', type: 'number', step: 1e-10, min: 1e-12 },
  ],
  disk: [
    { key: 'center', label: 'Centre', type: 'vec3' },
    { key: 'normal', label: 'Normale', type: 'vec3' },
    { key: 'radius', label: 'Rayon (m)', type: 'range' },
    { key: 'density', label: 'σ (C/m²)', type: 'number', step: 1e-10, min: 1e-12 },
  ],
  circle: [
    { key: 'center', label: 'Centre', type: 'vec3' },
    { key: 'normal', label: 'Normale', type: 'vec3' },
    { key: 'radius', label: 'Rayon (m)', type: 'range' },
    { key: 'density', label: 'λ (C/m)', type: 'number', step: 1e-10, min: 1e-12 },
  ],
  frame: [
    { key: 'center', label: 'Centre', type: 'vec3' },
    { key: 'normal', label: 'Normale', type: 'vec3' },
    { key: 'width', label: 'Largeur (m)', type: 'range', linkKey: 'height' },
    { key: 'height', label: 'Hauteur (m)', type: 'range', linkKey: 'width' },
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
    { key: 'width', label: 'Largeur (m)', type: 'range', linkKey: 'height' },
    { key: 'height', label: 'Hauteur (m)', type: 'range', linkKey: 'width' },
    { key: 'depth', label: 'Profondeur (m)', type: 'range' },
    { key: 'density', label: 'ρ (C/m³)', type: 'number', step: 1e-7, min: 1e-9 },
  ],
}
