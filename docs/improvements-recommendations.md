# Electrospace - Improvement Recommendations

> **Generated:** 2026-07-23
> **Purpose:** Comprehensive analysis of potential improvements across functionality, behavior, and features for the Electrospace educational physics application.

---

## Table of Contents

1. [Current State Overview](#current-state-overview)
2. [Functional Improvements](#1-functional-improvements)
3. [Behavioral Improvements](#2-behavioral-improvements)
4. [Feature Improvements](#3-feature-improvements)
5. [Implementation Priority](#implementation-priority)

---

## Current State Overview

Electrospace is a well-structured educational physics application combining **React**, **Three.js** (via `@react-three/fiber` and `@react-three/drei`), and **Zustand** for state management. It visualizes electric fields, supports charge manipulation, distributions, Gauss surfaces, and includes educational features like presets and field line visualization.

The architecture is solid with proper separation between UI (React components), 3D rendering (R3F), and state management (Zustand store). The codebase already implements many advanced features including undo/redo, scene export/import, and continuous charge distributions.

---

## 1. Functional Improvements

### Physics Accuracy & Completeness

- **Validation of SI units**: Currently `e` (elementary charge) is treated as unitless. Add clear unit conversion feedback showing actual charge values in Coulombs.
- **Force on test point M**: While `getPotential()` and `getElectricField()` exist, there's no visual force vector on a test charge at the test point.
- **Dipole moment vector**: State flag exists (`showDipoleMoment`) but may lack visual implementation. Should visualize $\vec{p} = q\vec{d}$ as an arrow.
- **Energy calculations**: Add potential energy display $U = \frac{1}{2}\sum q_i V_i$ for the configuration.
- **Boundary conditions in distributions**: For hollow vs solid shapes, clarify visualization of charge distribution.

### Data Persistence

- **Auto-save**: Save scene state to localStorage periodically or on major changes.
- **Session recovery**: On reload, restore last scene if localStorage exists.
- **Export improvements**: Add screenshot export (using Three.js `preserveDrawingBuffer` or R3F's `gl.domElement.toDataURL`).

---

## 2. Behavioral Improvements

### User Experience

- **Undo/Redo debouncing**: Currently `pushHistory()` is called on every position update during drag. Should debounce during continuous drag and snapshot on drag end only.
- **Responsive sidebar**: The overlay exists but could use transition animations for smoother mobile experience.
- **Keyboard shortcuts help**: Pressing `?` shows help modal, but a persistent scrollable shortcuts reference in sidebar would help discovery.
- **Context menu positioning**: Ensure `openContextMenu` bounds-checks so menus don't render off-screen.

### Performance

- **Distributions re-rendering**: When dragging charges with distributions active, updating distributions each frame may be costly. Consider web workers for complex field calculations.
- **Derivative state memoization**: Electric field, potential, and force calculations are re-computed repeatedly. Memoize or cache results.
- **Field line generation**: If implemented, these are computationally expensive; use web workers or throttle updates.

### Accessibility & Internationalization

- **Alt text**: Add ARIA labels to SVGs and icon buttons.
- **Keyboard navigation**: All controls should be tab-accessible with visible focus states.
- **i18n**: UI has French labels (`∑ distribution`, `Charges ponctuelles`). Provide English toggle or structured translation layer.

---

## 3. Feature Improvements

### Educational Enhancements

#### Phase 4 Preparation (Gauss Suites)

- The state structure for Gauss mode exists (`gaussStep`, `gaussSurfaceType`) but there's no wizard UI yet. Build this step-by-step integrator.
- **Interactive surface manipulation**: Use TransformControls from `@react-three/drei` to let users resize/position Gaussian surfaces visually.
- **Surface orientation controls**: Auto-create orientation handles (align to axes options).

#### Visualization Enhancements

- **Vector field slicing**: Add an interactive plane showing field vectors orthogonal to it (like a "flipbook" of 2D slices).
- **Trail rendering**: `showTrajectoryTrails` exists - implement visualization for charge movement paths.
- **Heatmap overlay**: Color-code regions by field strength on a translucent plane.
- **Equipotential lines**: Show 2D equipotential contours on any slicing plane.
- **Field line animation**: Animate particles moving along field lines with configurable start/end points.

#### Alpha & Beta Modes (simplified learning modes)

- **Alpha**: Hide advanced features (distributions, graphs) - just charges and vectors.
- **Beta**: Guided mode with step-by-step problem solving (e.g., "Place two charges, estimate E at M").

### Interactivity

- **Snap to grid**: Implement via `THREE.GridHelper` visual feedback + snap function in move handlers. Currently stored but not clearly visualized.
- **Charge labels in 3D**: Use `CSS2DRenderer` (via Drei's `Html` component) for floating labels above charges.
- **Measurement tool**: Click two points to measure distance, display $\vec{E}$ magnitude and direction between them.
- **Time-series simulation**: Animate charges moving in the field (show force on test charge during animation).

### UI/UX

- **Visual toggle panel**: Replace sidebar toggles with a grouped panel (Field Vectors, Lines, Equipotentials, Gauss Mode) with collapsible sections.
- **Preset descriptions**: Add tooltips explaining each preset's educational purpose.
- **Charge unit quick-switch**: Dropdown to switch between `pC`, `nC`, `μC`, `mC`, `C`.
- **Graph panel**: If `showPotentialGraph` flag exists, build the actual 2D canvas graph component drawing $V(x)$ along chosen axis.
- **Reset camera button**: Don't make users use browser refresh to reset view.
- **Fullscreen mode**: Toggle for immersive 3D viewing.

### Physics

- **Superposition visualization**: When multiple charges, show individual $\vec{E}_i$ vectors (faded) and total $\vec{E}$ (bold) - demonstrates vector addition visually.
- **Potential versus Field pedagogical mode**: Side-by-side 3D view of $V$ (as surface) and $\vec{E}$ (as arrows) to show their relationship.
- **Capacitance calculator**: Compute $C = \frac{Q}{V}$ for two-conductor setups.

---

## Implementation Priority

### High priority, low effort:

1. Debounce undo/redo during drag (performance)
2. Add persistent shortcuts reference in sidebar
3. Charge unit quick-switch in UI
4. Auto-save to localStorage
5. Memoize field/potential calculations

### Medium effort, high impact:

1. Superposition visualization with individual E_i vectors
2. Gaussian surface wizard UI (expands current Phase 4 state)
3. Field line animation (pending implementation of field lines)
4. Responsive sidebar transitions
5. Visualization planes slicing through field

### Higher effort:

1. 2D graph canvas for potential/field along axis
2. Web workers for distribution density calculations
3. Full i18n layer
4. Capacitance calculator mode
5. Alpha/Beta simplified modes

---

## Notes

- This document was generated from a codebase analysis session.
- Each recommendation should be evaluated against the project's educational goals and roadmap (see `electro_project.md` for the 6-phase development plan).
- Priority rankings are based on effort vs. impact balance.
