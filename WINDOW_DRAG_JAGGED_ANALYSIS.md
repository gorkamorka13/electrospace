# Window Dragging Jagged Movement - Analysis & Fix Plan

## Root Cause

The window drag handlers in `PotentialXGraph.jsx` and `FieldGraph.jsx` (lines 327-339) use **async React state updates (`setWinRaw`)** on every `pointermove` event. This creates several compounding issues:

### 1. State Batching Lag
- `pointermove` fires at ~60-120Hz (every 8-16ms)
- React state updates are async and batched
- Visual position (from state) lags behind mouse by 1-3 frames

### 2. Stale Closure in `clampPos`
```javascript
const mv = (ev) => { setWinRaw(prev => { 
  const c = clampPos(ev.clientX - offX, ev.clientY - offY, prev.w, prev.h)
  return { ...c, w: prev.w, h: prev.h } 
}) }
```
- Rapid updates mean `prev.w`/`prev.h` can be stale
- Causes position jumps when width/height change mid-drag

### 3. No `requestAnimationFrame` Sync
- Visual position should update synchronously during drag
- Currently waits for React render cycle

### 4. Canvas Re-render Cascade
Position change → state update → re-render → canvas resize → canvas draw effect runs → more work per frame

### 5. Shared `dragCleanupRef`
Window drag, canvas drag, and resize all share one cleanup ref, causing potential cross-interference.

---

## Enhanced Fix Plan (Incorporating Review Feedback)

### 1. Use Ref for Live Drag Position + rAF Throttle (Not Continuous Loop)
```javascript
// In pointerdown:
dragRef.current = { x: startX, y: startY, rafScheduled: false }

// In pointermove (throttled via rAF):
const scheduleRaf = () => {
  if (dragRef.current.rafScheduled) return
  dragRef.current.rafScheduled = true
  requestAnimationFrame(() => {
    dragRef.current.rafScheduled = false
    if (draggingRef.current && winRef.current) {
      winRef.current.style.transform = `translate3d(${dragRef.current.x}px, ${dragRef.current.y}px, 0)`
    }
    if (draggingRef.current) scheduleRaf() // re-arm for next frame
  })
}

// In pointermove handler:
dragRef.current.x = clampedX
dragRef.current.y = clampedY
scheduleRaf()
```
- Only schedules rAF when mouse actually moves
- No wasted frames when mouse is stationary
- Same visual result, less CPU/GPU on modest machines

### 2. Pointer Capture (Critical)
```javascript
e.target.setPointerCapture(e.pointerId)  // in pointerdown
// ...
e.target.releasePointerCapture(e.pointerId)  // in pointerup
```
- Without this, fast mouse movement outside viewport/over other elements loses `pointermove` events
- Recreates lag/jump even with perfect rAF implementation

### 3. Commit to State Only on `pointerup` (With Caveat)
- Call `setWinRaw` **once** at end of drag with final position
- **Risk**: Any React consumer of `winRaw` (tooltips, connections, collision detection) stays stale during drag
- **Mitigation**: If other components must track window position live, either:
  - Drive them via DOM mutation too (same ref pattern), OR
  - Throttle commit to ~30fps during drag (`setWinRaw` every ~33ms) instead of only on `pointerup`

### 4. Separate Cleanup Refs
- `windowDragCleanupRef` - for window header dragging
- `canvasDragCleanupRef` - for canvas pointer drag (moving M point)
- `resizeCleanupRef` - for bottom-right resize handle
- Prevents cross-interference between drag operations

### 5. Fix `clampPos` Defaults During Drag
- Use `winRefState.current.w/h` (live ref) for clamping, not stale `prev.w/h`
- Ensure valid fallbacks from ref, not `|| 300/180`

### 6. CSS: Layer Isolation + No Transitions
```css
.pg-window {
  will-change: transform;  /* promotes to own compositor layer */
  /* verify NO transition on left/top/transform */
}
```
- `will-change: transform` helps browser isolate layer, avoid repaints
- Confirm `.pg-window` has no `transition` on position properties

### 7. Passive Event Listeners
- If `preventDefault()` not called in `pointermove` (shouldn't be needed with pointer capture), use `{ passive: true }` on listeners
- Gives browser scheduling headroom

### 8. Split Canvas Redraw Deps
- Canvas `useEffect` likely depends on entire `winRaw` object (x, y, w, h)
- **Split deps**: only redraw canvas when `w` or `h` change (resize), NOT when `x`/`y` change (drag)
- Position handled via CSS transform, canvas size stays constant during drag

---

## Files to Modify

1. `src/components/PotentialXGraph.jsx` - Window drag handler (lines 327-339), canvas drag, resize
2. `src/components/FieldGraph.jsx` - Same patterns, same fixes
3. `src/index.css` - Add `will-change: transform`, verify no transitions on `.pg-window`

---

## Expected Result

- Buttery-smooth 60fps window dragging
- Zero visual lag between mouse and window
- No position jumps during drag
- Clean separation between window drag, canvas drag, and resize operations
- Canvas only redraws on actual resize, not during drag
- Minimal CPU/GPU usage via rAF throttle + passive listeners

---

## Step-by-Step Implementation Plan

### Phase 1: CSS Foundation (Prerequisite - No JS Changes Yet)

**Step 1.1: Add `will-change: transform` to `.pg-window`**
- File: `src/index.css` (~line 1237)
- Add: `will-change: transform;`
- Verify: No `transition` property on `left`, `top`, or `transform` for `.pg-window`

**Step 1.2: Verify `.pg-canvas` has no position transitions**
- Ensure canvas doesn't reflow during drag
- Canvas size should be controlled by `w`/`h` only

---

### Phase 2: PotentialXGraph.jsx - Window Header Drag

**Step 2.1: Add dedicated refs for window drag**
- `windowDragRef = useRef({ x: 0, y: 0, rafScheduled: false, dragging: false })`
- `windowDragCleanupRef = useRef(null)` (separate from canvas/resize)

**Step 2.2: Replace header `onPointerDown` handler (lines 327-339)**
- Capture pointer: `e.target.setPointerCapture(e.pointerId)`
- Store initial offset: `offX = e.clientX - winRefState.current.x`, `offY = e.clientY - winRefState.current.y`
- Set `dragging: true` in ref
- Call `scheduleRaf()` to start rAF loop

**Step 2.3: Implement `scheduleRaf()` function**
- If `rafScheduled` return
- Set `rafScheduled = true`
- `requestAnimationFrame(() => { rafScheduled = false; if (dragging && winRef.current) winRef.current.style.transform = translate3d(x, y, 0); if (dragging) scheduleRaf() })`

**Step 2.4: Add `pointermove` listener on `window`**
- Update ref position: `x = clamp(ev.clientX - offX)`, `y = clamp(ev.clientY - offY)`
- Use `winRefState.current.w/h` for clamp bounds (live values)
- Call `scheduleRaf()`
- Add `{ passive: true }` option

**Step 2.5: Add `pointerup` listener on `window`**
- Release pointer capture
- Set `dragging: false`
- Commit final position to React state: `setWinRaw({ x: finalX, y: finalY, w, h })`
- Clean up listeners
- Clear `windowDragCleanupRef`

**Step 2.6: Initialize `winRef` for DOM access**
- `const winRef = useRef(null)`
- Attach to `<div className="pg-window" ref={winRef} ...>`

---

### Phase 3: PotentialXGraph.jsx - Canvas Drag (Moving M Point)

**Step 3.1: Add dedicated refs for canvas drag**
- `canvasDragRef = useRef({ dragging: false })`
- `canvasDragCleanupRef = useRef(null)` (separate from window drag)

**Step 3.2: Update `handleCanvasPointerDown` (line 56)**
- Add `e.target.setPointerCapture(e.pointerId)`
- Set `canvasDragRef.current.dragging = true`
- No rAF needed here (canvas drag already uses direct state update via `updateTestPoint`)

**Step 3.3: Update `handleCanvasPointerMove` (line 75)**
- Check `canvasDragRef.current.dragging` flag
- Keep existing logic (direct `updateTestPoint` call)

**Step 3.4: Update `handleCanvasPointerUp` (line 90)**
- Release pointer capture
- Set `canvasDragRef.current.dragging = false`
- Clear `canvasDragCleanupRef`

---

### Phase 4: PotentialXGraph.jsx - Resize Handle

**Step 4.1: Add dedicated refs for resize**
- `resizeRef = useRef({ dragging: false, startW: 0, startH: 0, startX: 0, startY: 0 })`
- `resizeCleanupRef = useRef(null)`

**Step 4.2: Update resize `onPointerDown` (line 360)**
- Capture pointer
- Store `startW = win.w`, `startH = win.h`, `startX = e.clientX`, `startY = e.clientY`
- Set `resizeRef.current.dragging = true`

**Step 4.3: Add `pointermove` listener for resize**
- Calculate `newW = clamp(startW + (e.clientX - startX), MIN_W, maxW)`
- Calculate `newH = clamp(startH + (e.clientY - startY), MIN_H, maxH)`
- Update React state: `setWinRaw(prev => ({ ...prev, w: newW, h: newH }))`
- State update here is fine (resize is lower frequency)

**Step 4.4: Add `pointerup` listener for resize**
- Release pointer capture
- Set `resizeRef.current.dragging = false`
- Clear `resizeCleanupRef`

---

### Phase 5: Canvas Redraw Dependency Split

**Step 5.1: Identify canvas redraw `useEffect` (around line 220)**
- Current deps likely include `win` object (x, y, w, h)

**Step 5.2: Split deps**
- Create `winSizeRef = useRef({ w, h })` updated when `w`/`h` change
- Canvas redraw effect deps: `[show, data, winSizeRef.current.w, winSizeRef.current.h, theme]`
- Remove `x`/`y` from deps (position handled by CSS transform)

---

### Phase 6: FieldGraph.jsx - Replicate All Fixes

**Step 6.1-6.4: Repeat Phases 2-5 for `FieldGraph.jsx`**
- Same patterns, same ref names for consistency
- Verify line numbers match (similar structure)

---

### Phase 7: Testing & Validation

**Step 7.1: Manual smoke test**
- Drag window header → verify 60fps, no lag, no jumps
- Drag canvas → verify M point moves smoothly
- Resize handle → verify smooth resize, canvas redraws only on release
- Fast drag off-screen → verify pointer capture works

**Step 7.2: DevTools performance check**
- Record drag interaction
- Verify no long frames (>16ms)
- Verify no layout thrashing
- Confirm compositor-only transforms (green in layers panel)

**Step 7.3: Edge cases**
- Rapid drag/release cycles
- Drag while canvas is computing (async chunk)
- Theme toggle during drag
- Window resize during drag

---

### Phase 8: Optional Polish (If Time Permits)

**Step 8.1: Throttle state commit during drag (if consumers need live position)**
- Add `lastCommitRef = useRef(0)` 
- In rAF loop: if `now - lastCommitRef.current > 33` (30fps), call `setWinRaw` and update `lastCommitRef`
- Keeps React consumers ~in sync without 60fps state churn

**Step 8.2: Cursor feedback**
- Header: `cursor: grab` / `cursor: grabbing` (already in CSS)
- Canvas: `cursor: ew-resize` when hovering yellow cursor
- Resize: `cursor: se-resize` (verify)

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| React consumers of `winRaw` stale during drag | Phase 8.1 throttle commit, or drive consumers via DOM too |
| Pointer capture fails on some browsers | Wrap in try/catch, fallback to window listeners without capture |
| z-index issues with `will-change` | Test layer stacking; `will-change` creates stacking context |
| Canvas flicker on resize | Ensure `winSizeRef` updates atomically with `setWinRaw` |

---

## Order of Execution

1. **Phase 1** (CSS) - 5 min, zero risk
2. **Phase 2** (Window drag refactor) - 30 min, core fix
3. **Phase 3** (Canvas drag cleanup) - 10 min, low risk
4. **Phase 4** (Resize refactor) - 15 min, low risk
5. **Phase 5** (Canvas deps split) - 10 min, critical for perf
6. **Phase 6** (FieldGraph replicate) - 20 min, same patterns
7. **Phase 7** (Testing) - 15 min
8. **Phase 8** (Polish) - optional

**Total estimated: ~1.5-2 hours**