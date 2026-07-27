Application Audit Summary
✅ Current Status
Build: ✅ Passing (881ms)
Tests: ✅ 90/90 passing (38 utils + 52 gauss)
TypeScript/ESLint: ❌ 63 errors, 8 warnings
🔴 Critical Bugs (React Hooks Violations)
File	Issue	Severity
Equipotentials3D.jsx	Ref read/write in useMemo during render (lines 32-35, 43, 53)	CRITICAL - breaks rendering
FieldGraph.jsx	Ref assignment during render (line 309), setState in effects (lines 151, 155), empty catch blocks	CRITICAL
PotentialXGraph.jsx	Ref assignment during render (line 304), setState in effects (lines 137, 144), empty catch blocks	CRITICAL
PhysicsCanvas.jsx	useFrame mutates animationTarget ref (line 43), __GIT_VERSION__ undefined (line 342)	CRITICAL
Sidebar.jsx	__GIT_VERSION__ undefined (line 784)	HIGH
⚠️ Runtime Risks
File	Issue
Equipotentials.jsx	useMemo missing distributions dependency
GaussianSurfaceVis.jsx	useMemo missing fluxSurfaceParams dependency (3×)
Sidebar.jsx	useMemo has unnecessary dependencies
FieldGraph/PotentialXGraph	Missing testPoint in effect deps
🧹 Dead Code / Unused (63 errors)
Unused imports: THREE, KE_REAL, E_CHARGE, UNIT_FACTORS, useMemo, volumeCharge, axis, ke, rMin, len, id, i, charges, state, seededRef, gaussSurface* vars, showHelp, _rootRef
Unused params: _err (3×), e (3×), _ (1×)
Empty catch blocks (5×)
Useless assignments (gitVersion, vFieldFormula, vValue)
🧠 Memory/Leak Risks
Multiple addEventListener without proper cleanup in ContextMenu, FieldGraph, PotentialXGraph, GaussWizard
setTimeout in useStore.setToast but no cleanup on unmount
Ref caches in Equipotentials3D never fully disposed
Memory Bank Update
# electrospace — State as of 2026-07-27

## Working Features
- 4 bugs from IMPROVEMENT_ANALYSIS.md fixed (memoization, pushHistory, warning banner, idle callback)
- Feature 2.2: Flux density visualization on Gaussian surfaces
- Feature 2.3: PNG/CSV export for FieldGraph & PotentialXGraph
- Feature 3.1: Sidebar split into 4 tabs (Scene/Analysis/Pedagogy/Settings)
- Feature 3.2: Floating legend (unit + scale) + charge color gradient
- Feature 3.4: Drag coordinate tooltip for charges & test point M
- Feature 3.5: Toast notifications for import errors
- Feature 2.1: Gauss Wizard quiz mode (5 steps, score tracking)
- Feature 5.2: KaTeX helpers extracted to src/utils/math.jsx
- Feature 5.3: 52 unit tests for calculateGaussParameters (sphere/cylinder/plane/line/charges)
- UI: Removed "F" force button from toolbar; kept in sidebar

## Known Issues (from ESLint)
- 71 lint problems (63 errors, 8 warnings)
- Critical: ref misuse in useMemo (Equipotentials3D, FieldGraph, PotentialXGraph)
- Critical: setState in useEffect (FieldGraph, PotentialXGraph, GaussWizard)
- Critical: __GIT_VERSION__ undefined in PhysicsCanvas & Sidebar
- Multiple event listener leaks
- 30+ unused vars/imports
Improvement Plan (Priority Order)
🚨 Phase 1: Fix Critical Runtime Bugs (1-2 days)
Equipotentials3D.jsx — Move ref disposal to useEffect, fix useMemo deps
FieldGraph.jsx & PotentialXGraph.jsx — Fix ref assignment in render, move setCursorPos to event handlers, remove empty catches
PhysicsCanvas.jsx — Fix animationTarget mutation in useFrame, define __GIT_VERSION__
Sidebar.jsx — Define __GIT_VERSION__
🔧 Phase 2: Code Quality & Lint Clean (1 day)
Remove all unused imports/variables (30+)
Fill empty catch blocks with proper error handling
Fix useMemo/useEffect dependency arrays
Rename math.jsx → math.ts (or move to utils/katex.jsx) to satisfy react-refresh/only-export-components
🏗️ Phase 3: Architecture Hardening (2-3 days)
Event system centralization — Create useEventListener hook to replace manual add/removeEventListener
Store refactor — Split useStore.js (577 lines) into slices: chargesSlice, distributionsSlice, uiSlice, gaussSlice, historySlice
Physics workers — Move calculateTotalField/Potential to Web Worker (already using requestIdleCallback in FieldGraph)
Error boundaries — Add per-component error boundaries for 3D canvas
✨ Phase 4: Features & Polish (ongoing)
Accessibility — ARIA labels, keyboard nav for all toolbar buttons
Mobile UX — Touch gestures for rotate/pan/zoom, responsive sidebar
i18n — Extract all strings to locale files (currently mixed FR/EN)
CI/CD — Add GitHub Actions: lint, test:run, build, deploy on push
Visual regression — Storybook + Chromatic for component snapshots
Performance — Code-split GaussWizard, DistributionVis, Graphs with React.lazy
Quick Wins (can do today)
Fix __GIT_VERSION__ in vite.config.js and components
Remove unused imports in 8 files
Add eslint-disable comments only where intentional (e.g., _err in catch)
Run npm run lint -- --fix for auto-fixable issues
