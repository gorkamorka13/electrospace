# Electrospace — System Patterns & Architecture

## System Architecture

Electrospace follows a **unidirectional data flow** architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────┐
│                      React UI Layer                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐   │
│  │  Sidebar  │  │  Modals  │  │  Toasts  │  │  Menu  │   │
│  └─────┬────┘  └──────────┘  └──────────┘  └────────┘   │
│        │              React State (useStore)              │
├────────┼──────────────────────────────────────────────────┤
│        ▼                                                  │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────────┐   │
│  │PhysicsCanvas│  │ R3F Components │  │ Three.js Scene   │   │
│  │(container) │  │ (declarative) │  │ (managed by R3F)  │   │
│  └──────────┘  └──────────────┘  └───────────────────┘   │
│                     3D Rendering Layer                    │
├──────────────────────────────────────────────────────────┤
│                    Physics Engine                         │
│  ┌────────────┐  ┌──────────┐  ┌─────────────────────┐   │
│  │ coulomb.js  │  │ gauss.js  │  │ marchingCubes.js     │   │
│  │ (E, V, F)   │  │ (Φ, Qint) │  │ (equipotentials)    │   │
│  └────────────┘  └──────────┘  └─────────────────────┘   │
└──────────────────────────────────────────────────────────┘
```

### Key Architectural Decisions

1. **Zustand for global state** — lightweight, no boilerplate, supports subscriptions and selectors for optimal rendering. All application state (charges, distributions, UI state, history) lives in a single store.

2. **R3F for 3D integration** — React Three Fiber bridges React and Three.js declaratively. Three.js objects are React components, managed by R3F's render loop. Physics calculations happen in JS, not in shaders.

3. **Physics engine as pure functions** — `coulomb.js` and `gauss.js` export stateless computation functions. They take state parameters and return results with no side effects, making them testable and predictable.

4. **Canvas 2D for graphs** — FieldGraph and PotentialXGraph use native HTML Canvas for 2D plots, keeping them separate from the 3D scene and avoiding R3F overhead for 2D rendering.

## Design Patterns

### State Management Pattern (Zustand)
- Single `useStore` with atomic state slices
- **PushHistory before mutations**: All destructive actions (add, remove, reset) call `pushHistory()` before modifying state
- **Selective subscriptions**: Components subscribe to only the slices they need via `useStore((state) => state.someValue)`
- **Getters**: `getElectricField()`, `getPotential()` are computed on demand, not cached in state

### Component Patterns

**Container/Presentational Split:**
- `PhysicsCanvas` (container) sets up R3F Canvas, lighting, controls, and orchestrates scene content
- Individual components (`ChargeSphere`, `ElectricFieldArrow`, `FieldLines`, etc.) are presentational — they read from store and render

**R3F Component Patterns:**
- Components use `useFrame` for per-frame updates (animating field vectors)
- Components use `useThree` for access to camera, gl, scene
- Drag behavior via `@react-three/drei` `DragControls`
- Geometry arguments passed via `args` prop (not inline `new THREE.*` — avoids re-creation)
- `useMemo` for expensive geometry/calculation caching

**UI Component Patterns:**
- `CollapsibleSection` for grouped controls
- Custom `CoordInput` and `DistInput` for number input with validation
- `memo` wrapping for performance-critical list items

### Data Flow

```
User Interaction (drag, click, slider)
       │
       ▼
Zustand Action (updateChargePosition, setGaussStep, etc.)
       │
       ▼
State Update (React re-render)
       │
       ├──▶ Sidebar re-renders (numerical displays, controls)
       │
       └──▶ R3F Canvas re-renders
                │
                ├──▶ useFrame loop (per-frame updates)
                │       ├── ElectricFieldArrow: recalculates E at test point
                │       ├── FieldLines: recomputes line traces
                │       ├── Equipotentials3D: updates marching cubes mesh
                │       └── ChargeTrajectory: integrates motion
                │
                └──▶ Static geometry updates (on parameter change)
                        ├── DistributionVis: new geometry for sphere/cylinder/plane
                        └── GaussianSurfaceVis: resized Gauss surface
```

## Component Relationships

### 3D Scene Components (rendered within R3F Canvas)
- `ChargeSphere` — renders +/− charge sphere, handles drag
- `ElectricFieldArrow` — field vector at test point M
- `TestPoint` — movable measurement point
- `FieldLines` — field line tracing from charges
- `ForceArrows` — Coulomb force visualization
- `Equipotentials` — 2D equipotential contours
- `Equipotentials3D` — 3D isosurfaces via marching cubes
- `DistributionVis` — renders continuous distributions (sphere, cylinder, plane, etc.)
- `GaussianSurfaceVis` — renders the Gaussian surface (sphere/cylinder/box)
- `DipoleMoment` — dipole moment vector arrow
- `ChargeMotion` — dynamic charge animation
- `ChargeTrajectory` — trajectory trail visualization
- `ThroughMLine` — field line through test point M
- `ErrorBoundary` — catches R3F errors gracefully

### UI Components
- `Sidebar` — main control panel (759 lines, monolith — targeted for refactoring)
- `GaussWizard` — 5-step pedagogical companion (embedded in sidebar)
- `ContextMenu` — right-click menu on charges
- `HelpModal` — keyboard shortcuts reference
- `Toast` — notification system
- `FieldGraph` — 2D canvas plot of E(x)
- `PotentialXGraph` — 2D canvas plot of V(x)

### Physics Modules
- `coulomb.js` — Coulomb's law, field/potential calculation for point charges and distributions (896 lines)
- `gauss.js` — Gauss theorem parameters, pedagogical metadata for symmetries/surfaces/flux (381 lines)
- `marchingCubes.js` — 3D isosurface generation for equipotentials
- `constants.js` — world size, physics constants, grid parameters
- `utils.js` — vector helpers, coordinate transforms, Fibonacci sphere sampling

### Store
- `useStore.js` — Zustand store with all application state, actions, and history (577 lines)

## Critical Implementation Paths

1. **Field calculation path**: `getElectricField()` → `calculateTotalField()` → per-charge `calculateFieldFromCharge()` + per-distribution `calculateFieldFromDistribution()` → returns `THREE.Vector3` → rendered by `ElectricFieldArrow` via `useFrame`

2. **Gauss companion path**: `calculateGaussParameters()` → reads distribution type, radius, density → performs analytical Gauss theorem calculation → returns pedagogical metadata (symmetry, surface, flux, E, V) → rendered by `GaussWizard` with KaTeX formulas

3. **Event handling path**: Keyboard events → `handleKeyDown` → arrow keys nudge charges/test point → `nudgePosition()` / `nudgeY()` → Zustand set → React re-render. Modifier keys (Ctrl+Z) trigger undo/redo.

4. **Drag path**: `DragControls` (Drei) → onDrag → `updateChargePosition()` → Zustand set (no history push) → on pointer up → (future: pushHistory once)

5. **Distribution rendering path**: `addDistribution()` → Zustand set → `DistributionVis` reads from store → selects geometry renderer based on `type` (sphere → SphereGeometry, cylinder → CylinderGeometry, etc.) → applies material (solid/hollow, wireframe, transparency)
