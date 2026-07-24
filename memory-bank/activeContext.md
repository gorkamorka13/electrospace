# Electrospace — Active Context

## Current Focus

The project is at **v1.3** — core features (Phases 1-3) are complete and stable. The most recent work focused on stabilization and quality improvements as documented in the improvement analysis (2026-07-23). Fixed PotentialXGraph main thread blocking and cursor drag synchronicity issue (2026-07-24).

### Recent Changes (from git history)
```
e908650 Improvment2     — Latest: improvement analysis recommendations implemented
18d4d96 gausstests       — Gauss theorem unit tests added
8d119ee coordonnées      — Coordinate improvements (tooltip, labels)
b83e0da exports          — Scene export/import functionality
4da36a6 bug              — Bug fixes
76ef965 bugs             — More bug fixes
```
(6 additional commits before these)

### Latest Fix (2026-07-24) — PotentialXGraph main thread blocking
- **Problem**: `PotentialXGraph` used `useMemo` with `testPoint` in deps. Dragging the yellow cursor changed `testPoint` → triggered 300 synchronous `calculateTotalPotential` calls → blocked the main thread → cursor didn't update in real time.
- **Fix**: Refactored to match `FieldGraph` pattern — async chunked computation via `useEffect` + `requestIdleCallback` (`CHUNK_SIZE = 30`), with `testPoint` removed from heavy computation deps. A separate lightweight `useEffect` handles real-time cursor update on `testPoint` changes.
- **Result**: Dragging the yellow cursor on V(x) graph now updates M position and value instantly, just like the E(x) graph.

### What Is Being Worked On

The improvement analysis (`docs/improvements-recommendations.md` and `IMPROVEMENT_ANALYSIS.md`) identified 4 sprints of work:

**Sprint 1 — Stabilization** (complete ✅):
- ✅ Fix pushHistory during drag — confirmed: `updateChargePosition` does NOT call `pushHistory()`
- ✅ Geometry useMemo in GaussianSurfaceVis — confirmed: all geometries use `useMemo()` with proper deps
- ✅ GaussVis warning when charges present — confirmed: shows warning banner via `<Html>` component
- ✅ Toast notification system — implemented in useStore
- ✅ KaTeX helpers extracted to utils/math.jsx
- ✅ Main thread blocking in FieldGraph — refactored: processes 30 samples per idle callback (`CHUNK_SIZE = 30`) with `requestIdleCallback` + `setTimeout` fallback
- ✅ Main thread blocking in PotentialXGraph — same refactoring applied (2026-07-24)

**Sprint 2 — UX Core** (next):
- Screenshot export of 3D scene
- Fullscreen mode toggle
- Reset camera button
- Charge labels in 3D (CSS2DRenderer)
- Measurement tool (distance between two points)
- Superposition visualization (individual E_i vectors faded + total bold)
- Onboarding tour (localStorage flag)

**Sprint 3 — Pedagogy** (future):
- Quiz mode in Gauss Companion
- Flux colormap on Gauss surface (ShaderMaterial)
- Multi-point measurement table
- Realistic capacitor module

**Sprint 4 — Advanced Physics** (future):
- RK4 trajectory integrator
- Marching cubes isosurfaces
- Laplace/Poisson solver (Web Worker)
- Magnetism extension (Biot-Savart)

## Active Decisions

### Architecture Decisions
1. **Single Zustand store vs. multiple stores**: Currently using one store. As the app grows, consider splitting into logical stores (scene, ui, history) to reduce unnecessary re-renders.

2. **Web Worker path for heavy computation**: The marching cubes algorithm and field line generation are candidates for offloading. Phase 6 will introduce Web Workers for the Laplace solver.

3. **Sidebar refactoring approach**: The 759-line Sidebar is the top refactoring priority. The plan is to split into a navigable tab system (Scene / Analysis / Pedagogy / Settings panels).

4. **Testing strategy**: Currently only `gauss.js` and `utils.js` have tests. `coulomb.js` (896 lines) has no tests — this is a significant gap. `Sidebar.jsx` and `GaussWizard.jsx` have no component tests.

### UX Decisions
1. **French-first UI**: All labels and pedagogical content are in French. No i18n layer exists. Decision to maintain French as primary language, with potential English toggle later.
2. **Dark theme default**: Theme preference persisted in localStorage. User can toggle dark/light.
3. **Mobile sidebar overlay**: On small screens, sidebar appears as overlay with dimmed background.
4. **Keyboard shortcuts**: WASD/ZQSD for movement, PageUp/PageDown for Y-axis, Ctrl+Z/X for undo/redo, Delete to remove, ? for help.

## Important Patterns & Conventions

### Naming Conventions
- React components: PascalCase (`ChargeSphere`, `ElectricFieldArrow`)
- Physics functions: camelCase (`calculateTotalField`, `calculateGaussParameters`)
- Store actions: camelCase (`addCharge`, `updateChargePosition`)
- CSS classes: kebab-case (`section-header`, `coord-field`)
- Files: camelCase for JS/JSX files (`useStore.js`, `gaussWizard.jsx`)
- Constants: UPPER_SNAKE_CASE (`KE_REAL`, `MAX_HISTORY`, `WORLD_SIZE`)

### Code Conventions
- JSX with explicit imports from React (useState, useEffect, useRef, useMemo, memo)
- Three.js Vector3 used for all 3D math (not raw arrays)
- Store selectors use callback form: `useStore((state) => state.value)`
- Physics modules import * as THREE from 'three'
- Destructuring at top of component/function
- Prefer `args` prop for geometry (not inline `new THREE.*`)

### CSS Conventions
- Single `index.css` file (no CSS modules)
- Dark/light theme via `data-theme` attribute on `<html>`
- CSS variables for theme colors
- Responsive breakpoints: mobile (< 768px)

## Learnings & Insights

1. **Drag performance**: The original design pushed history on every drag frame, which saturated the 50-entry history buffer in 2 seconds. Lesson: only push history on drag end (pointer up).

2. **R3F geometry caching**: Passing `new THREE.SphereGeometry()` inline in JSX creates a new geometry on every render. Must use `args={[radius, segments]}` pattern or `useMemo`.

3. **Distribution vs. point charges**: When distributions are active, point charges are hidden and don't contribute to field calculations. This is intentional (distributions represent continuous charge, not discrete points) but caused confusion when GaussVis silently disappeared.

4. **KaTeX loading**: Using CDN means formulas don't render without internet. A potential improvement would be bundling KaTeX or using a pre-rendered fallback.

5. **PotentialXGraph cursor sync**: Same pattern as FieldGraph — the yellow cursor updates in real time via a lightweight useEffect dependent on testPoint, while the full 300-sample curve is computed asynchronously. Lesson: keep heavy computation deps separate from interactive UI state.

## Next Steps (Immediate)

1. Run test suite to confirm no regressions
2. Begin Sprint 2: screenshot export, fullscreen toggle, reset camera, CSS2D charge labels, measurement tool, superposition visualization, onboarding tour
3. Add component tests for `Sidebar.jsx` and `GaussWizard.jsx`
4. Add integration tests for store + physics interaction
5. Already completed: PotentialXGraph async chunked refactor matching FieldGraph pattern

## Open Questions
- Should the Sidebar refactoring use React Router or a simpler tab system? Current direction: tab system without routing for simplicity.
- Should distributions support multiple simultaneous displays (e.g., sphere vs. cylinder comparison)? Part of Sprint 3 planning.
- Should a maximized 3D view mode (hiding sidebar completely) be added?
