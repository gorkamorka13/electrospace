# Electrospace — Fix Plan
Generated: 2026-07-27


> ## ⚠️ SUPERSEDED — 10 Août 2026
> Ce document liste des problèmes **déjà corrigés** dans le code actuel. Vérifié sur la branche `master` :
> - ESLint : **0 erreur / 0 avertissement** (les 63 erreurs / 8 warnings listés n'existent plus).
> - Tests : **117/117** passent (et non 90).
> - Code mort & zones à risque : **nettoyés** (dead code supprimé, `rMin` centralisé via `constants.R_MIN`).
> Ce plan est conservé à titre historique. Se référer à l'état réel du code pour tout travail futur.

---

## Summary

| Metric | Status |
|--------|--------|
| Build | ✅ Passing (~725ms) |
| Tests | ✅ 90/90 passing (38 utils + 52 gauss) |
| ESLint | ❌ 63 errors, 8 warnings |
| Critical bugs found | 5 files affected |
| Runtime risks | 4 files affected |
| Dead code locations | 14+ files |
| Memory/leak risks | 3 areas identified |
| Audit inaccuracies | 1 (ContextMenu event cleanup is actually correct) |

---

## Phase 1 — Fix Critical Runtime Bugs

### 1.1 Equipotentials3D.jsx — Ref misuse in `useMemo`

**Severity**: CRITICAL — breaks React 19 rendering

**Problem**: `geoCacheRef.current` is both read and written inside `useMemo` (lines 32-35, 43, 53). React 19 forbids ref access during render.

**Lines affected**: 30-55

**Fix**: Move all ref operations (dispose, reset, assign) into a `useEffect`. Keep geometry computation in `useMemo` but use local variables instead of ref.

**Before:**
```jsx
const geometries = useMemo(() => {
  geoCacheRef.current.forEach(g => g.geometry.dispose())
  if (!showEquipotentials3D) { geoCacheRef.current = []; return [] }
  // ... computation ...
  geoCacheRef.current = results
  return results
}, [charges, distributions, showEquipotentials3D, chargeUnit])
```

**After:**
```jsx
const geometries = useMemo(() => {
  // No ref access here — pure computation
  if (!showEquipotentials3D) return []
  if (charges.length === 0 && distributions.length === 0) return []
  // ... computation (using local variable) ...
  return results
}, [charges, distributions, showEquipotentials3D, chargeUnit])

useEffect(() => {
  // Dispose previous geometries
  geoCacheRef.current.forEach(g => g.geometry.dispose())
  geoCacheRef.current = geometries
  // Cleanup on unmount
  return () => {
    geometries.forEach(g => g.geometry.dispose())
  }
}, [geometries])
```

---

### 1.2 FieldGraph.jsx — 3 issues

**Severity**: CRITICAL

#### 1.2a Ref assignment during render (line 309)
```jsx
const winRefState = useRef(win)
winRefState.current = win  // ❌ Cannot update ref during render
```
**Fix**: Move to `useEffect`:
```jsx
useEffect(() => { winRefState.current = win }, [win])
```

#### 1.2b setState in effects (lines 151, 155)
```jsx
useEffect(() => {
  setCursorPos(...)  // ❌ setState synchronously in effect
}, [testPoint, ...])

useEffect(() => {
  setData(null)  // ❌ same problem
}, [show])
```
**Fix**: Replace with `useMemo` for derived data. `cursorPos` can be computed directly. `setData` can use a flag state.

#### 1.2c Empty catch blocks (lines 378, 387, 395)
**Fix**: Add `console.error`:
```jsx
catch (err) { console.error('Export failed:', err) }
```

---

### 1.3 PotentialXGraph.jsx — 3 issues

**Severity**: CRITICAL

Same pattern as FieldGraph (mirror implementation).

#### 1.3a Ref assignment during render (line 304)
Same fix as 1.2a.

#### 1.3b setState in effects (lines 137, 144)
Same fix as 1.2b.

#### 1.3c Empty catch blocks (lines 368, 377, 382)
Same fix as 1.2c.

---

### 1.4 PhysicsCanvas.jsx — 2 issues

**Severity**: CRITICAL

#### 1.4a animationTarget mutation in useFrame (line 43)
```jsx
useFrame(() => {
  if (animationTarget.current && controlsRef.current) {
    // ... lerp logic ...
    animationTarget.current = null  // ❌ Cannot modify after render
  }
})
```
**Fix**: Use a state flag `setAnimating(false)` instead of mutating the ref. Or restructure to check animation completion differently.

#### 1.4b `__GIT_VERSION__` undefined (line 342)
```jsx
<div>{__GIT_VERSION__}</div>  // ❌ no-undef
```
**Fix**: Add ESLint directive: `/* global __GIT_VERSION__ */` at top of file. Or use a fallback: `const GIT_VERSION = typeof __GIT_VERSION__ !== 'undefined' ? __GIT_VERSION__ : 'dev'`

---

### 1.5 Sidebar.jsx — 1 issue

**Severity**: HIGH

#### 1.5a `__GIT_VERSION__` undefined (line 784)
Same fix as 1.4b.

---

## Phase 2 — Code Quality & Lint Clean

### 2.1 Remove unused imports/variables (~30 items across 14 files)

| File | Variable to remove | Line |
|------|-------------------|------|
| `src/App.jsx` | `showHelp` assignment | 14 |
| `src/components/ChargeSphere.jsx` | `_err` param | 85 |
| `src/components/ChargeTrajectory.jsx` | `seededRef` | 13 |
| `src/components/ContextMenu.jsx` | `UNIT_FACTORS` import | 2 |
| `src/components/Equipotentials.jsx` | `KE_REAL` import | 5 |
| `src/components/FieldGraph.jsx` | `e` param | 111 |
| `src/components/FieldLines.jsx` | `THREE` import | 3 |
| `src/components/GaussWizard.jsx` | `gaussSurfaceRadius`, `gaussSurfaceHeight`, `gaussSurfaceWidth`, `setGaussSurfaceWidth`, `gaussSurfaceDepth`, `setGaussSurfaceDepth`, `charges` | 126-175 |
| `src/components/PhysicsCanvas.jsx` | `_rootRef` param | 52 |
| `src/components/PotentialXGraph.jsx` | `useMemo` import | 1 |
| `src/components/PotentialXGraph.jsx` | `e` param | 101 |
| `src/components/TestPoint.jsx` | `_err` param | 87 |
| `src/physics/coulomb.js` | `rMin`, `len` | 198, 742 |
| `src/physics/gauss.js` | `ke`, `rMin`, `volumeCharge`, `axis` | 5-59 |
| `src/physics/marchingCubes.js` | `KE_REAL` import | 2 |
| `src/store/useStore.js` | `id`, `i`, `_`, `state` | 225-448 |
| `src/utils/math.jsx` | (rename file) | — |
| `vite.config.js` | useless `gitVersion` variable, `e` param | 8-11 |

### 2.2 Fix empty catch blocks (5 total)

| File | Lines | Fix |
|------|-------|-----|
| `FieldGraph.jsx` | 378, 387, 395 | `console.error('Export failed:', err)` |
| `PotentialXGraph.jsx` | 368, 377, 382 | `console.error('Export failed:', err)` |
| `GaussWizard.jsx` | 167 | `console.error('JSON parse failed:', err)` |

### 2.3 Fix dependency arrays

| File | Line | Current | Fix |
|------|------|---------|-----|
| `Equipotentials.jsx` | 102 | Missing `distributions` | Add `distributions` to deps |
| `GaussianSurfaceVis.jsx` | 115 | Missing `fluxSurfaceParams` | Add `fluxSurfaceParams` |
| `GaussianSurfaceVis.jsx` | 121 | Missing `fluxSurfaceParams` | Add `fluxSurfaceParams` |
| `GaussianSurfaceVis.jsx` | 127 | Missing `fluxSurfaceParams` | Add `fluxSurfaceParams` |
| `Sidebar.jsx` | 98 | Has unnecessary `chargeUnit`, `charges`, `distributions` | Remove from deps |
| `FieldGraph.jsx` | 202 | Missing `testPoint` | Add `testPoint` to deps |
| `PotentialXGraph.jsx` | 189 | Missing `testPoint` | Add `testPoint` to deps |

### 2.4 Rename math.jsx

**File**: `src/utils/math.jsx → src/utils/katex.js`
**Problem**: `react-refresh/only-export-components` rule requires only component exports in `.jsx` files.
**Fix**: Rename file to `katex.js` (no JSX needed — only exports utility functions). Update all imports.

---

## Phase 3 — Architecture Hardening

### 3.1 Centralized event system

**Problem**: Manual `addEventListener`/`removeEventListener` in multiple components risks memory leaks if cleanup is missed.

**Fix**: Create a reusable `useEventListener` hook:

```jsx
// src/hooks/useEventListener.js
export function useEventListener(eventName, handler, element = window) {
  const savedHandler = useRef()

  useEffect(() => {
    savedHandler.current = handler
  }, [handler])

  useEffect(() => {
    const eventListener = (event) => savedHandler.current(event)
    element.addEventListener(eventName, eventListener)
    return () => element.removeEventListener(eventName, eventListener)
  }, [eventName, element])
}
```

**Components to refactor**:
- `FieldGraph.jsx` — Canvas event listeners
- `PotentialXGraph.jsx` — Canvas event listeners
- `GaussWizard.jsx` — Window/keyboard event listeners

**Note**: `ContextMenu.jsx`'s `onHeaderPointerDown` already properly cleans up (verified) — no change needed.

### 3.2 Store refactoring

**Problem**: `useStore.js` is 577 lines containing all state slices, actions, and history logic in one file.

**Fix**: Split into separate files:

```
src/store/
├── index.js            # Combine all slices with create()
├── chargesSlice.js     # charges, addCharge, removeCharge, updateChargeQ, etc.
├── distributionsSlice.js  # distributions, addDistribution, removeDistribution, etc.
├── uiSlice.js          # theme, sidebarOpen, activeTab, toasts, etc.
├── gaussSlice.js       # gauss wizard state
└── historySlice.js     # undo/redo history buffer
```

### 3.3 Physics workers

**Problem**: `calculateTotalField`/`calculateTotalPotential` can block the main thread for complex scenes.

**Current state**: FieldGraph and PotentialXGraph already use `requestIdleCallback` with `CHUNK_SIZE = 30` as a mitigation.

**Fix**: Move heavy computation to a Web Worker:
- Create `src/physics/worker.js` — receives charge data, target position; posts back E, V
- Create `src/physics/workerClient.js` — wraps worker with fallback to main thread
- Replace direct calls in FieldGraph, PotentialXGraph, and sidebar displays

### 3.4 Error boundaries

**Problem**: R3F component crashes can take down the entire 3D canvas.

**Fix**: Add per-component error boundaries:

```jsx
// src/components/R3FErrorBoundary.jsx
class R3FErrorBoundary extends React.Component {
  // ... standard error boundary pattern with fallback UI
}
```

**Wrap these components**:
- `ChargeSphere`
- `DistributionVis`
- `GaussianSurfaceVis`
- `FieldLines`
- `Equipotentials3D`

---

## Phase 4 — Features & Polish

### 4.1 Accessibility
- Add `aria-label` to all icon-only buttons in sidebar tabs and toolbar
- Ensure keyboard navigation works for all interactive elements

### 4.2 Mobile UX
- Already has touch gesture handler in Sidebar (lines 422-441)
- Consider adding touch rotation/zoom for the 3D canvas
- Improve responsive sidebar behavior

### 4.3 CI/CD
- Add `.github/workflows/ci.yml`:
```yaml
name: CI
on: [push]
jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run lint
      - run: npm run test:run
      - run: npm run build
      - run: npm run deploy
```

### 4.4 Performance
- Code-split with `React.lazy`:
  - `GaussWizard`
  - `DistributionVis`
  - `FieldGraph`
  - `PotentialXGraph`
  - `Equipotentials3D`

---

## Quick Wins (can be done immediately)

| # | Task | Effort | Files |
|---|------|--------|-------|
| 1 | Add `/* global __GIT_VERSION__ */` to PhysicsCanvas.jsx and Sidebar.jsx | 2 min | 2 |
| 2 | Remove unused imports in 14 files | 15 min | 14 |
| 3 | Add `console.error` to 5 empty catch blocks | 5 min | 3 |
| 4 | Run `npm run lint -- --fix` for auto-fixable issues | 1 min | Many |
| 5 | Rename `math.jsx` → `katex.js` | 5 min | 2 |

---

## Estimated Effort

| Phase | Time | Files Touched | Dependencies |
|-------|------|---------------|-------------|
| Quick wins | ~30 min | 15+ | None |
| Phase 1 — Critical bugs | 2-3 hours | 5 | None |
| Phase 2 — Lint clean | 1-2 hours | 14+ | Quick wins first |
| Phase 3 — Architecture | 4-6 hours | 8+ | Phases 1-2 |
| Phase 4 — Features | Ongoing | Many | All above |

**Total estimated**: ~8-12 hours for Phases 1-3

---

## Execution Order

1. **Quick wins** — fastest risk reduction
2. **Phase 1** — fix actual runtime bugs (prevents rendering issues)
3. **Phase 2** — clean up lint (improves code quality and catches future bugs)
4. **Phase 3** — architecture hardening (best done on clean code)
5. **Phase 4** — ongoing improvements

---

## Verification

After each phase, run:
```bash
npm run test:run    # 90 tests must all pass
npm run build       # Must succeed
npm run lint        # Track error count reduction
```

**Target after all phases**: 0 ESLint errors, 0 warnings, 90/90 tests passing, build passing.
