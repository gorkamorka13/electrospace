import { useRef, useEffect, useMemo, useState, useCallback } from 'react'
import { useStore, UNIT_FACTORS } from '../store/useStore'
import { calculateTotalField } from '../physics/coulomb'

const PAD = 34
const SAMPLES = 300
const CHUNK_SIZE = 30  // Process 30 samples per idle callback to avoid blocking
const AXIS_RANGE = 10
const MIN_W = 200
const MIN_H = 140
const MARGIN = 10

// requestIdleCallback with fallback for unsupported browsers
const ric = typeof window !== 'undefined' && window.requestIdleCallback
  ? (cb, opts) => window.requestIdleCallback(cb, opts)
  : (cb) => setTimeout(() => cb({ timeRemaining: () => 50 }), 0)

const FIELD_OPTIONS = [
  { key: 'ex', label: 'Ex' },
  { key: 'ey', label: 'Ey' },
  { key: 'ez', label: 'Ez' },
  { key: 'mag', label: '|E|' },
]
const SWEEP_OPTIONS = [
  { key: 'x', label: 'X' },
  { key: 'y', label: 'Y' },
  { key: 'z', label: 'Z' },
]

function clampPos(x, y, w, h) {
  const mw = window.innerWidth, mh = window.innerHeight
  w = w || 300; h = h || 180
  return {
    x: Math.max(MARGIN, Math.min(x, mw - w - MARGIN)),
    y: Math.max(MARGIN, Math.min(y, mh - h - MARGIN)),
  }
}

export function FieldGraph() {
  const canvasRef = useRef()
  const winRef = useRef(null)
  const show = useStore((s) => s.showFieldGraph)
  const setShow = useStore((s) => s.setShowFieldGraph)
  const charges = useStore((s) => s.charges)
  const distributions = useStore((s) => s.distributions)
  const chargeUnit = useStore((s) => s.chargeUnit)
  const testPoint = useStore((s) => s.testPoint)
  const theme = useStore((s) => s.theme)
  const [fieldKey, setFieldKey] = useState('ex')
  const [sweepAxis, setSweepAxis] = useState('x')

  const dragCleanupRef = useRef(null)
  const updateTestPoint = useStore((s) => s.updateTestPoint)
  const storeTestPoint = useStore((s) => s.testPoint)
  const canvasDragRef = useRef(false)

  useEffect(() => {
    return () => {
      if (dragCleanupRef.current) {
        dragCleanupRef.current()
        dragCleanupRef.current = null
      }
    }
  }, [])

  const handleCanvasPointerDown = useCallback((e) => {
    e.stopPropagation()
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const plotW = canvas.width - PAD * 2
    const plotH = canvas.height - PAD * 2
    const px = e.clientX - rect.left
    const py = e.clientY - rect.top
    if (px < PAD || px > PAD + plotW || py < PAD || py > PAD + plotH) return
    canvas.setPointerCapture(e.pointerId)
    canvasDragRef.current = true
    const axisIdx = 'xyz'.indexOf(sweepAxis)
    const t = Math.max(-AXIS_RANGE, Math.min(AXIS_RANGE, ((px - PAD) / plotW) * (AXIS_RANGE * 2) - AXIS_RANGE))
    const newPos = [...storeTestPoint]
    newPos[axisIdx] = t
    updateTestPoint(newPos)
  }, [sweepAxis, storeTestPoint, updateTestPoint])

  const handleCanvasPointerMove = useCallback((e) => {
    e.stopPropagation()
    if (!canvasDragRef.current) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const plotW = canvas.width - PAD * 2
    const px = e.clientX - rect.left
    const axisIdx = 'xyz'.indexOf(sweepAxis)
    const t = Math.max(-AXIS_RANGE, Math.min(AXIS_RANGE, ((px - PAD) / plotW) * (AXIS_RANGE * 2) - AXIS_RANGE))
    const newPos = [...useStore.getState().testPoint]
    newPos[axisIdx] = t
    updateTestPoint(newPos)
  }, [sweepAxis, updateTestPoint])

  const handleCanvasPointerUp = useCallback((e) => {
    if (!canvasDragRef.current) return
    canvasDragRef.current = false
    const canvas = canvasRef.current
    if (canvas) canvas.releasePointerCapture(e.pointerId)
  }, [])

  const [win, setWinRaw] = useState(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('efWin') : null
    let parsed = null
    if (saved) { try { parsed = JSON.parse(saved) } catch { /* ignore parse errors */ } }
    const defW = window.innerWidth < 768 ? Math.min(220, window.innerWidth - 30) : 300
    const defH = 180
    if (parsed && typeof parsed.x === 'number') {
      const w = Math.min(parsed.w || defW, window.innerWidth - 2 * MARGIN)
      const h = Math.min(parsed.h || defH, window.innerHeight - 2 * MARGIN)
      return { ...clampPos(parsed.x, parsed.y || 60, w, h), w, h }
    }
    return { ...clampPos(window.innerWidth - defW - 20, 60, defW, defH), w: defW, h: defH }
  })
  const { x, y, w, h } = win
  const setWin = useCallback((fn) => {
    setWinRaw(prev => {
      const next = typeof fn === 'function' ? fn(prev) : fn
      return { ...clampPos(next.x, next.y, next.w, next.h), w: next.w, h: next.h }
    })
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem('efWin', JSON.stringify({ x, y, w, h }))
  }, [x, y, w, h])

  useEffect(() => {
    const onResize = () => setWin(prev => ({ ...clampPos(prev.x, prev.y, prev.w, prev.h), w: prev.w, h: prev.h }))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [setWin])

  const [data, setData] = useState(null)
  const dataVersionRef = useRef(0)

  // Real-time cursor position derived from testPoint — no setState in effects
  const cursorPos = useMemo(() => {
    if (!show) return { testPos: 0, testVal: 0 }
    const multiplier = UNIT_FACTORS[chargeUnit] || 1e-6
    const physicalCharges = distributions.length > 0 ? [] : charges.map(c => ({ ...c, q: c.q * multiplier }))
    const { ke, rMin } = useStore.getState()
    const axisIndex = 'xyz'.indexOf(sweepAxis)
    const E = calculateTotalField(physicalCharges, testPoint, ke, rMin, distributions)
    const testVal = fieldKey === 'mag' ? E.length() : E[fieldKey[1]]
    return { testPos: testPoint[axisIndex], testVal }
  }, [show, testPoint, charges, distributions, chargeUnit, fieldKey, sweepAxis])

  useEffect(() => {
    if (!show) { setData(null); return }
    const version = ++dataVersionRef.current
    const multiplier = UNIT_FACTORS[chargeUnit] || 1e-6
    const physicalCharges = distributions.length > 0 ? [] : charges.map(c => ({ ...c, q: c.q * multiplier }))
    const { ke, rMin } = useStore.getState()
    const axisIndex = 'xyz'.indexOf(sweepAxis)
    const pos = [0, 0, 0]
    const pts = []
    let minVal = Infinity, maxVal = -Infinity
    let currentIndex = 0

    const computeChunk = (deadline) => {
      const end = Math.min(currentIndex + CHUNK_SIZE, SAMPLES)
      for (let i = currentIndex; i < end; i++) {
        const t = (i / (SAMPLES - 1)) * (AXIS_RANGE * 2) - AXIS_RANGE
        pos[axisIndex] = t
        const E = calculateTotalField(physicalCharges, pos, ke, rMin, distributions)
        const val = fieldKey === 'mag' ? E.length() : E[fieldKey[1]]
        pts.push({ t, val })
        if (val < minVal) minVal = val
        if (val > maxVal) maxVal = val
      }
      currentIndex = end

      if (currentIndex < SAMPLES && deadline.timeRemaining() < 5) {
        ric(computeChunk, { timeout: 50 })
        return
      }

      if (currentIndex < SAMPLES) {
        ric(computeChunk, { timeout: 50 })
        return
      }

      if (version !== dataVersionRef.current) return
      const absMax = Math.max(Math.abs(minVal), Math.abs(maxVal), 1e-30)
      if (fieldKey !== 'mag') { minVal = -absMax; maxVal = absMax }
      const range = Math.max(maxVal - minVal, 1e-30)
      const testE = calculateTotalField(physicalCharges, testPoint, ke, rMin, distributions)
      const testVal = fieldKey === 'mag' ? testE.length() : testE[fieldKey[1]]
      setData({ pts, minVal, maxVal, range, testPos: testPoint[axisIndex], testVal })
    }

    ric(computeChunk, { timeout: 100 })
  }, [show, charges, distributions, chargeUnit, fieldKey, sweepAxis])
  // Note: testPoint intentionally NOT in deps above — we don't restart async calc on every drag frame

  const colors = useMemo(() => ({ mag: '#f59e0b', ex: '#ef4444', ey: '#22c55e', ez: '#3b82f6' }), [])

  useEffect(() => {
    if (!show || !data || !canvasRef.current) return
    const canvas = canvasRef.current
    const rect = canvas.parentElement.getBoundingClientRect()
    const W = Math.round(rect.width)
    const H = Math.round(rect.height)
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, W, H)

    const plotW = W - PAD * 2
    const plotH = H - PAD * 2

    const isDark = theme === 'dark'

    ctx.fillStyle = isDark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.85)'
    ctx.fillRect(0, 0, W, H)

    const borderColor = isDark ? 'rgba(255,255,255,0.2)' : 'rgba(15,23,42,0.15)'
    const gridColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.08)'
    const axisColor = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(15,23,42,0.2)'
    const labelColor = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(15,23,42,0.55)'
    const infoColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(15,23,42,0.6)'

    ctx.strokeStyle = borderColor
    ctx.strokeRect(PAD, PAD, plotW, plotH)

    ctx.strokeStyle = gridColor
    for (let i = 0; i <= 4; i++) {
      const y2 = PAD + (plotH * i) / 4
      ctx.beginPath()
      ctx.moveTo(PAD, y2)
      ctx.lineTo(PAD + plotW, y2)
      ctx.stroke()
    }

    const xScale = (t) => PAD + ((t + AXIS_RANGE) / (AXIS_RANGE * 2)) * plotW
    const yScale = (v) => PAD + (1 - (v - data.minVal) / data.range) * plotH

    const axisY = yScale(0)
    ctx.strokeStyle = axisColor
    ctx.lineWidth = 0.8
    ctx.beginPath()
    ctx.moveTo(PAD, axisY)
    ctx.lineTo(PAD + plotW, axisY)
    ctx.stroke()
    const axisX = xScale(0)
    ctx.beginPath()
    ctx.moveTo(axisX, PAD)
    ctx.lineTo(axisX, PAD + plotH)
    ctx.stroke()
    ctx.fillStyle = labelColor
    ctx.font = '11px monospace'
    ctx.fillText('0', axisX - 4, axisY + 14)
    for (let tick = -10; tick <= 10; tick += 2.5) {
      if (tick === 0) continue
      const tx = xScale(tick)
      ctx.beginPath()
      ctx.moveTo(tx, axisY - 3)
      ctx.lineTo(tx, axisY + 3)
      ctx.stroke()
    }
    ctx.fillStyle = labelColor
    ctx.font = '11px monospace'
    ctx.fillText(sweepAxis + ' (m)', PAD + plotW + 2, axisY + 3)

    ctx.beginPath()
    for (let i = 0; i < data.pts.length; i++) {
      const px = xScale(data.pts[i].t)
      const py = yScale(data.pts[i].val)
      if (i === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.strokeStyle = colors[fieldKey]
    ctx.lineWidth = 1.8
    ctx.stroke()

    // Yellow cursor line showing current test point position
    const cx = xScale(cursorPos.testPos)
    ctx.beginPath()
    ctx.moveTo(cx, PAD)
    ctx.lineTo(cx, PAD + plotH)
    ctx.strokeStyle = '#fbbf24'
    ctx.lineWidth = 1
    ctx.setLineDash([2, 3])
    ctx.stroke()
    ctx.setLineDash([])

    ctx.save()
    ctx.translate(PAD - 14, PAD + plotH / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.fillStyle = labelColor
    ctx.font = '11px monospace'
    ctx.fillText(`${FIELD_OPTIONS.find(o => o.key === fieldKey)?.label} (V/m)`, -22, 0)
    ctx.restore()
    ctx.fillStyle = infoColor
    ctx.font = '12px monospace'
    ctx.fillText(`M: ${FIELD_OPTIONS.find(o => o.key === fieldKey)?.label}=${cursorPos.testVal.toExponential(2)} V/m`, PAD + 4, PAD + plotH - 4)
  }, [show, data, w, h, fieldKey, colors, theme, sweepAxis, cursorPos])

  useEffect(() => {
    winRefState.current = win
  }, [win])
  const winRefState = useRef(win)

  const exportPng = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `field-graph-${sweepAxis}-${fieldKey}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }, [sweepAxis, fieldKey])

  const exportCsv = useCallback(() => {
    if (!data) return
    const header = `position_${sweepAxis}_m,${fieldKey}_Vm\n`
    const rows = data.pts.map(p => `${p.t},${p.val}`).join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv' })
    const link = document.createElement('a')
    link.download = `field-graph-${sweepAxis}-${fieldKey}.csv`
    link.href = URL.createObjectURL(blob)
    link.click()
    URL.revokeObjectURL(link.href)
  }, [data, sweepAxis, fieldKey])

  if (!show || !data) return null

  return (
    <div className="pg-window" ref={winRef} style={{ left: x, top: y, width: w, height: h }}
      onPointerDown={(e) => {
        if (e.target.closest?.('select, button, .pg-close, .pg-axis-select, .pg-export-btn, .pg-resize')) return
        const header = e.target.closest?.('.pg-header')
        if (!header) return
        e.preventDefault()
        e.stopPropagation()
        const cur = winRefState.current
        const offX = e.clientX - cur.x
        const offY = e.clientY - cur.y
        const mv = (ev) => { setWinRaw(prev => { const c = clampPos(ev.clientX - offX, ev.clientY - offY, prev.w, prev.h); return { ...c, w: prev.w, h: prev.h } }) }
        const up = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); dragCleanupRef.current = null }
        window.addEventListener('pointermove', mv)
        window.addEventListener('pointerup', up)
        dragCleanupRef.current = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up) }
      }}
    >
      <div className="pg-header">
        <span className="pg-title">E({sweepAxis}) — balayage depuis l'origine</span>
        <select value={sweepAxis} onChange={(e) => setSweepAxis(e.target.value)} className="pg-axis-select">
          {SWEEP_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
        </select>
        <select value={fieldKey} onChange={(e) => setFieldKey(e.target.value)} className="pg-axis-select">
          {FIELD_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
        </select>
        <span className="pg-test-val" style={{ color: colors[fieldKey] }}>{data.testVal.toExponential(2)} V/m</span>
        <button className="pg-export-btn" onClick={exportPng} title="Exporter PNG">🖼</button>
        <button className="pg-export-btn" onClick={exportCsv} title="Copier CSV">📋</button>
        <button className="pg-close" onClick={() => setShow(false)}>&times;</button>
      </div>
      <div className="pg-body">
        <canvas ref={canvasRef} className="pg-canvas"
          onPointerDown={handleCanvasPointerDown}
          onPointerMove={handleCanvasPointerMove}
          onPointerUp={handleCanvasPointerUp}
          style={{ cursor: 'pointer' }}
        />
      </div>
      <div className="pg-resize"
        onPointerDown={(e) => {
          e.preventDefault()
          e.stopPropagation()
          const target = e.currentTarget
          try { target.setPointerCapture(e.pointerId) } catch (err) { console.error('setPointerCapture failed:', err) }
          const cur = winRefState.current
          const sw = cur.w, sh = cur.h
          const sx = e.clientX, sy = e.clientY
          const mv = (ev) => { setWinRaw(prev => {
            const mw = window.innerWidth, mh = window.innerHeight
            return { ...prev, w: Math.max(MIN_W, Math.min(mw - prev.x - MARGIN, sw + ev.clientX - sx)), h: Math.max(MIN_H, Math.min(mh - prev.y - MARGIN, sh + ev.clientY - sy)) }
          }) }
          const up = (ev) => {
            try { target.releasePointerCapture(ev.pointerId) } catch (err) { console.error('releasePointerCapture failed:', err) }
            window.removeEventListener('pointermove', mv)
            window.removeEventListener('pointerup', up)
            dragCleanupRef.current = null
          }
          window.addEventListener('pointermove', mv)
          window.addEventListener('pointerup', up)
          dragCleanupRef.current = () => {
            try { target.releasePointerCapture(e.pointerId) } catch (err) { console.error('releasePointerCapture failed:', err) }
            window.removeEventListener('pointermove', mv)
            window.removeEventListener('pointerup', up)
          }
        }}
      />
    </div>
  )
}
