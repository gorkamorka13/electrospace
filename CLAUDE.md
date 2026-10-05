# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

ElectroSpace is a French-language, client-side 3D electrostatics teaching tool: point charges, continuous charge distributions (line/ring/disk/plane/cylinder/sphere/box), vector field / field-line / equipotential visualization, a step-by-step Gauss's-theorem wizard, and 2D E(x)/V(x) graphs. Pure static SPA, no backend — built with React 19 + React Three Fiber (Three.js) + Zustand, bundled with Vite, deployed to Cloudflare Pages/Workers via Wrangler.

## Commands

```bash
npm run dev        # Vite dev server with HMR
npm run build      # Production build
npm run preview    # Build + wrangler dev (local CF Workers preview)
npm run lint        # ESLint (flat config, eslint.config.js)
npm run test        # Vitest watch mode
npm run test:run    # Vitest single run (use this in CI/scripts, not `test`)
npm run deploy      # Build + wrangler deploy
```

Run a single test file: `npx vitest run src/physics/gauss.test.js`. Tests live next to the code they cover (`*.test.js`), currently only under `src/physics/` — there is no React Testing Library setup and no component-level tests.

There is no `.github/workflows` — lint/test/build are not enforced in CI, so run them locally before considering a change done.

## Architecture

**State**: a single Zustand store (`src/store/useStore.js`) assembled from slices in `src/store/slices/`: `sceneSlice` (charges, distributions, history/undo-redo, presets), `physicsSlice` (k_e, rMin, etc.), `visualsSlice` (vector/field-line/equipotential display toggles), `uiSlice` (tabs, modals, selection). Components subscribe to individual fields via selectors (`useStore((state) => state.charges)`), not the whole store, to avoid over-rendering. There is no `persist` middleware — `localStorage` reads/writes (theme, window positions) are hand-rolled in components.

**Undo/redo**: destructive actions call `pushHistory()` *before* mutating state (grep call sites in `sceneSlice.js` before adding a new mutation). Convention: push once per logical action, not per intermediate value — e.g. dragging a charge or point M in the 3D view (`ChargeSphere.jsx`, `TestPoint.jsx`) pushes history once, on the first frame that actually moves it (via `moveCharge`/`moveTestPoint`), then uses the raw setters `updateChargePosition`/`updateTestPoint` for the remaining frames; a held nudge key records only its first, non-repeat `keydown`. Numeric coordinate inputs in `Sidebar.jsx` currently push on every keystroke instead of on blur/commit — be aware of this inconsistency if touching nearby code rather than treating either pattern as the one to copy.

**Physics engine** (`src/physics/`): pure, stateless, side-effect-free functions — this is what's unit-tested. `coulomb.js` has `calculateFieldFrom*`/`calculatePotentialFrom*` pairs per source type (point charge, line, ring/circle, plane, disk, frame, box, cylinder, sphere) plus the aggregators `calculateTotalField`/`calculateTotalPotential` that sum over `charges` + `distributions`. `gauss.js` computes the analytical Gauss's-theorem parameters (symmetry, surface choice, Q_int, flux) driving `GaussWizard`. `marchingCubes.js` extracts 3D isosurfaces for equipotentials. `constants.js` holds world/physics constants (`WORLD_SIZE`, `R_MIN`, `MC_RESOLUTION`, etc.) — `R_MIN` is the singularity cutoff for the 1/r² law and should stay the single source of truth rather than being redefined locally. Every `calculate*` function takes `ke`/`rMin` as explicit parameters with defaults (`KE_REAL`, `R_MIN`) rather than reading global state, which is what keeps this layer pure and testable — preserve that shape when extending it.

**Axis convention**: the world is **Z-up** (physics convention), not Three.js's default Y-up — `THREE.Object3D.DEFAULT_UP` is set to `(0, 0, 1)` in `src/main.jsx`, the reference grid lies in XY, and stored `[x, y, z]` coordinates are the physics coordinates. Three.js primitives that are intrinsically Y-aligned (`CylinderGeometry`, `CapsuleGeometry`, `gridHelper`) must be rotated when they represent something vertical. The `line` distribution is fixed along world Z, and `makeLocalFrame` uses Z as its reference up so a plane's `height` is vertical for a horizontal normal. Scene files exported before `version: 3` were Y-up and are converted on import (`importScene`).

**3D rendering** (`src/components/`, rendered inside R3F's `<Canvas>` from `PhysicsCanvas.jsx`): each visual concern is its own presentational component reading from the store — `ChargeSphere`, `DistributionVis`, `GaussianSurfaceVis`, `Equipotentials3D`, `FieldLines`, `VectorField`/`ElectricFieldArrow`, `ChargeTrajectory`, etc. Field arrows are individual meshes (no `THREE.InstancedMesh` anywhere in the codebase), so dense grids cost one draw call per arrow. A single `ErrorBoundary` wraps the entire canvas content (`PhysicsCanvas.jsx`) plus one each around `Sidebar` and `ContextMenu` in `App.jsx` — a crash in any one 3D visual currently takes down the whole viewport, not just that layer.

**Off-main-thread computation**: `src/workers/fieldWorker.js` + `src/hooks/useFieldWorker.js` handle grid-sampling work (`totalField`, `totalPotential`, `fieldGrid`, `potentialGrid`, `traceFieldLines`, `sample3DGrid`) via a promise-per-message-id protocol (see `useFieldWorker.js` for the pattern before adding a new message type). Marching Cubes for 3D equipotentials currently runs on the main thread, not through this worker.

**2D graphs**: `FieldGraph.jsx` / `PotentialXGraph.jsx` use native HTML Canvas 2D (not R3F/WebGL) — kept separate deliberately to avoid R3F overhead for flat plots.

**Keyboard shortcuts**: centralized in one `keydown` listener in `App.jsx` (arrow keys / WASD nudge the selected object, Ctrl+Z / Ctrl+Shift+Z undo/redo, `?` help, Delete removes selection, Shift+X/Y/Z zeroes an axis on the test point). Add new shortcuts there rather than attaching listeners in individual components, and mind the existing `document.activeElement.tagName === 'INPUT'` guard.

**No TypeScript** — `@types/react`/`@types/react-dom` are installed but unused for actual type-checking; the whole codebase is `.js`/`.jsx`.

**`src/utils/math.jsx`** mixes component exports and plain helper-function exports in one file, which breaks Vite Fast Refresh (`react-refresh/only-export-components`, already flagged by ESLint) — don't add more of one kind of export to it without separating them, and prefer creating a new file for genuinely new helpers over growing this one.

## Conventions to know before editing

- Large files exist by history, not by design: `src/workers/fieldWorker.js`, `src/physics/coulomb.js`, `src/components/Sidebar.jsx`, `src/components/PhysicsCanvas.jsx`, and `src/components/GaussWizard.jsx` are all 700+ lines and mix multiple concerns (e.g. `Sidebar.jsx` handles charge management, distribution management, visual-settings toggles, and preset loading together). Don't assume the existing size/shape of these files is the intended structure — but also don't refactor them incidentally while making an unrelated change.
- Distribution definitions and their editable parameters are declared in `DIST_PARAMS` (`src/store/useStore.js`) — this is the single place that drives which fields `Sidebar` renders per distribution type (line/cylinder/plane/disk/circle/frame/sphere/box).
- The repo root currently has several overlapping/stale planning docs (`AUDIT_QUALITE_CODE.md`, `implementation_plan.md`, `walkthrough.md`, `electro_project.md`, `memory-bank.md`, `.clinerules/memory-bank/*`, `docs/fix-plan.md`, `docs/improvements-recommendations.md`, `docs/evolution-plan.md`). Some describe themselves as superseded but are still present — treat `docs/evolution-plan.md` as the most current improvement plan, and verify any specific claim from the older docs against the live code before relying on it, since several "already fixed" claims in them are stale.
- `pdf_extracted_text.txt`, `npm-install.log`, `vite-dev.log`, `vite-dev.err.log` are tracked build/reference artifacts, not source — don't treat them as project documentation.
