# Electrospace — Progress & Status

## Current Status: v1.3 — Stabilization Phase

The project has completed Phases 1-3 of the 6-phase roadmap. Most Sprint 1 stabilization items have been resolved. Sprint 2 UX work has begun — screenshot export of the 3D scene is now implemented. The onboarding tour has been removed entirely.

---

## What Works (✅ Complete)

### Phase 1: Point Charges & Field Vectors
- ✅ Point charge creation, deletion, selection
- ✅ Drag-to-move charges (via `@react-three/drei` DragControls)
- ✅ Charge value adjustment (positive/negative, magnitude)
- ✅ Real-time electric field vector at test point M
- ✅ Test point M movable by drag and keyboard
- ✅ Coulomb's law calculation (E, V, F) with SI units
- ✅ Charge unit system (C, nC, µC, pC, e)
- ✅ Grid helper and 3D scene setup
- ✅ Keyboard shortcuts (WASD/ZQSD, arrows, PageUp/Down)
- ✅ Context menu (right-click on charges)
- ✅ Undo/redo (50-entry history buffer)
- ✅ Scene export/import (JSON)

### Phase 2: Dipole & Field Visualization
- ✅ Preset configurations (dipole, quadrupole, capacitor, single, cubic quadrupole, tripole, tetrahedron)
- ✅ OrbitControls for camera manipulation
- ✅ Field line tracing from charges
- ✅ Equipotential contours (2D)
- ✅ Equipotential isosurfaces (3D via marching cubes)
- ✅ Dipole moment vector visualization
- ✅ Force arrows between charges
- ✅ Field line through test point M

### Phase 3: Continuous Distributions
- ✅ Distribution types: sphere, cylinder, plane, disk, circle (ring), frame, line, box
- ✅ Configurable parameters: density, radius, height, width, depth
- ✅ Hollow/solid toggle for sphere and cylinder
- ✅ Inner/outer radius for thick shells
- ✅ 3D geometry rendering for each distribution type
- ✅ Analytical field calculation for all distribution types
- ✅ Numerical integration fallback for complex geometries
- ✅ 2D graphs: E(x) and V(x) along configurable axis

### Phase 4: Gauss Companion
- ✅ 5-step wizard structure (Symmetry → Surface → Flux → Field → Potential)
- ✅ Gaussian surface types: sphere, cylinder, box
- ✅ Surface parameter controls (radius, height, width, depth)
- ✅ `calculateGaussParameters()` with full pedagogical metadata
- ✅ KaTeX formula rendering for all steps
- ✅ Symmetry analysis with LaTeX descriptions
- ✅ Surface flux decomposition
- ✅ E(r) and V(r) formulas for sphere, cylinder, plane
- ✅ Step 5: potential integration from field
- ✅ Quiz/self-assessment mode (multiple choice questions at each step with score tracking)
- ✅ Flux density colormap on Gaussian surface (E·dS computed per vertex, color-mapped via meshPhysicalMaterial)

### Infrastructure
- ✅ Vite dev server with HMR
- ✅ Cloudflare Pages deployment via wrangler
- ✅ Dark/light theme with localStorage persistence
- ✅ Responsive layout (mobile sidebar overlay)
- ✅ Toast notification system
- ✅ Error boundary for R3F crashes
- ✅ Help modal with keyboard shortcuts
- ✅ Git version embedded in build (`__GIT_VERSION__`)

### UX & UI
- ✅ Sidebar with tabbed panels (Scene / Analysis / Pedagogy / Settings)
- ✅ Coordinate tooltip on charges during drag (Billboard R3F, auto-hides after 1s)
- ✅ Floating unit + scale legend in 3D canvas
- ✅ Graph export (PNG download + CSV copy) for E(x) and V(x) plots
- ✅ ARIA labels on toolbar buttons
- ✅ Context menu bounds checking (clampX/clampY)
- ✅ Import error handling via Toast notifications
- ✅ KaTeX helpers extracted to shared `utils/math.jsx`
- ✅ Screenshot export of 3D scene (WebGL canvas capture via "📷 Capture" button in Scènes panel)

### Performance
- ✅ FieldGraph async chunked computation via `requestIdleCallback` with `CHUNK_SIZE = 30`
- ✅ PotentialXGraph async chunked computation via `requestIdleCallback` with `CHUNK_SIZE = 30`
- ✅ Real-time cursor update on both graphs decoupled from heavy curve computation
- ✅ `preserveDrawingBuffer: true` on Canvas for screenshot capture

### Testing
- ✅ Gauss theorem unit tests (`gauss.test.js`)
- ✅ Coulomb's law unit tests (`utils.test.js` — covers `calculateFieldFromCharge`, `calculateTotalField`, `calculateTotalPotential`, `calculateFieldFromSphere`, `calculateFieldFromCylinder` with 398 lines of tests)
- ✅ Utility function tests (`utils.test.js` — covers `makeLocalFrame`, `worldFromLocal`, `fibonacciSphere`, constants)

---

## What's Left to Build (❌ Not Started / 🟡 Partial)

### Phase 4: Gauss Companion (🟡 Partial)
- ❌ Interactive surface manipulation (TransformControls)
- ❌ Surface orientation controls (axis alignment)

### Phase 5: Hand-Drawn Conductors (❌ Not Started)
- ❌ 2D drawing canvas overlaid on 3D scene
- ❌ Contour analysis (curvature radius calculation)
- ❌ Charge density heatmap (σ ∝ 1/R)
- ❌ 3D extrusion of drawn shapes

### Phase 6: Laplace/Poisson Solver (❌ Not Started)
- ❌ 2D grid (N×N) with configurable resolution — grille carrée superposée sur un plan de coupe, chaque cellule stocke V(i,j)
- ❌ Electrode placement by user — l'utilisateur dessine des régions à potentiel fixe (conditions de Dirichlet)
- ❌ Gauss-Seidel relaxation algorithm — itérations V(i,j) = moyenne des 4 voisins, avec SOR pour accélération
- ❌ Web Worker for background computation — évite le blocage de l'interface pendant les milliers d'itérations
- ❌ Heatmap visualization of potential — carte de couleurs (rouge = haut, bleu = bas) superposée sur le plan
- ❌ Field lines from gradient of potential — lignes de champ calculées par différences finies du gradient

### Major Features Missing
- ❌ Side-by-side distribution comparison (Sprint 3)
- ❌ RK4 trajectory integrator for test charges (Sprint 4)
- ❌ Multi-point measurement (M1…M5) (Sprint 3)
- ❌ Realistic capacitor module (Sprint 3)
- ❌ Magnetism extension (Biot-Savart, Lorentz force) (Sprint 4)
- ❌ i18n / English language toggle
- ❌ Auto-save to localStorage

### UX Improvements Needed
- ❌ Fullscreen mode toggle
- ❌ Reset camera button
- ❌ Charge labels in 3D (CSS2DRenderer)
- ❌ Measurement tool (distance between two points)
- ❌ Superposition visualization (individual E_i vectors faded + total bold)

### Testing Gaps
- ❌ No component tests for `Sidebar.jsx` or `GaussWizard.jsx`
- ❌ No integration tests for store + physics interaction
- ❌ No visual regression tests for 3D rendering

---

## Known Issues

### 🟡 Moderate Issues
1. **KaTeX CDN dependency** — `index.html` loads KaTeX from `cdn.jsdelivr.net`. `math.jsx` uses `window.katex` — no offline fallback if CDN unavailable.

### 🟢 Minor Issue
1. **Sidebar monolith** — 783 lines, hard to maintain and navigate (though tabbed structure exists).

---

## Evolution of Project Decisions

| Date | Decision | Rationale |
|------|----------|-----------|
| Initial | React + Vite + Three.js (R3F) stack | Best combination for interactive 3D web apps with React |
| Initial | Zustand for state management | Lightweight, no boilerplate, good performance with selectors |
| v1.0 | Single store architecture | Simplicity for early development |
| v1.1 | Continuous distributions added | Phase 3 of roadmap, core educational feature |
| v1.2 | Gauss Companion wizard | Phase 4 implementation, 5-step pedagogical tool |
| v1.3 | Stabilization sprint | Bug fixes, tests, toast system, KaTeX extraction, UX polish |
| 2026-07-24 | Async chunked computation for graph components | Eliminates main thread blocking during cursor drag on FieldGraph and PotentialXGraph |
| 2026-07-26 | Screenshot export of 3D scene | WebGL canvas capture with `preserveDrawingBuffer: true`, WebGL context detection to skip 2D graph canvases |
| 2026-07-26 | Onboarding tour removed | User requested removal of the feature |
| Future | Web Workers for heavy computation | Main thread blocking identified as performance bottleneck |

---

## Sprint Roadmap

### Sprint 1 — Stabilization (Complete ✅)
- ✅ Fix history push during drag — confirmed: `updateChargePosition` does NOT call `pushHistory()`
- ✅ Geometry useMemo in GaussianSurfaceVis — confirmed: all geometries use `useMemo()`
- ✅ GaussVis warning — confirmed: shows warning banner when no distribution present
- ✅ Toast notification system — implemented in useStore
- ✅ KaTeX helpers extracted to utils/math.jsx
- ✅ Import error handling via Toast
- ✅ Context menu bounds checking
- ✅ ARIA labels on toolbar buttons
- ✅ **Main thread blocking in FieldGraph** — refactored to process 30 samples per idle callback (`CHUNK_SIZE = 30`) with `requestIdleCallback` + `setTimeout` fallback
- ✅ **Main thread blocking in PotentialXGraph** — same refactoring applied (2026-07-24)

### Sprint 2 — UX Core
- [x] Screenshot export of 3D scene (📷 Capture button in Scènes panel)
- [ ] Fullscreen mode toggle
- [ ] Reset camera button
- [ ] Charge labels in 3D (CSS2DRenderer)
- [ ] Measurement tool (distance between two points)
- [ ] Superposition visualization (individual E_i vectors faded + total bold)

### Sprint 3 — Pedagogy
- [ ] Multi-point measurement table (M1…M5)
- [ ] Realistic capacitor module
- [ ] Side-by-side distribution comparison

### Sprint 4 — Advanced Physics
- [ ] RK4 trajectory integrator + heatmap
- [ ] Marching cubes isosurfaces (existing file!)
- [ ] Laplace/Poisson solver in Web Worker
- [ ] Magnetism extension (Biot-Savart + Lorentz force)
- [ ] Hand-drawn conductor tool (Phase 5)
