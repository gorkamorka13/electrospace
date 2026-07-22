import { useRef, useEffect, useMemo, useState, useCallback } from 'react'
import { useStore, UNIT_FACTORS } from '../store/useStore'
import { calculateTotalPotential } from '../physics/coulomb'

const PAD = 34
const SAMPLES = 300
const AXIS_RANGE = 10
const MIN_W = 200
const MIN_H = 140
const MARGIN = 10

function clampPos(x, y, w, h) {
  const mw = window.innerWidth, mh = window.innerHeight
  w = w || 300; h = h || 180
  return {
    x: Math.max(MARGIN, Math.min(x, mw - w - MARGIN)),
    y: Math.max(MARGIN, Math.min(y, mh - h - MARGIN)),
  }
}

const AXIS_LABELS = { x: 'X', y: 'Y', z: 'Z' }
const AXIS_KEYS = ['x', 'y', 'z']

export function PotentialXGraph() {
  const canvasRef = useRef()
  const winRef = useRef(null)
  const show = useStore((s) => s.showPotentialXGraph)
  const setShow = useStore((s) => s.setShowPotentialXGraph)
  const charges = useStore((s) => s.charges)
  const distributions = useStore((s) => s.distributions)
  const chargeUnit = useStore((s) => s.chargeUnit)
  const testPoint = useStore((s) => s.testPoint)
  const theme = useStore((s) => s.theme)
  const [potAxis, setPotAxis] = useState('x')

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
    const axisIdx = potAxis === 'x' ? 0 : potAxis === 'y' ? 1 : 2
    const t = Math.max(-AXIS_RANGE, Math.min(AXIS_RANGE, ((px - PAD) / plotW) * (AXIS_RANGE * 2) - AXIS_RANGE))
    const newPos = [...storeTestPoint]
    newPos[axisIdx] = t
    updateTestPoint(newPos)
  }, [potAxis, storeTestPoint, updateTestPoint])

  const handleCanvasPointerMove = useCallback((e) => {
    e.stopPropagation()
    if (!canvasDragRef.current) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const plotW = canvas.width - PAD * 2
    const px = e.clientX - rect.left
    const axisIdx = potAxis === 'x' ? 0 : potAxis === 'y' ? 1 : 2
    const t = Math.max(-AXIS_RANGE, Math.min(AXIS_RANGE, ((px - PAD) / plotW) * (AXIS_RANGE * 2) - AXIS_RANGE))
    const newPos = [...useStore.getState().testPoint]
    newPos[axisIdx] = t
    updateTestPoint(newPos)
  }, [potAxis, updateTestPoint])

  const handleCanvasPointerUp = useCallback((e) => {
    if (!canvasDragRef.current) return
    canvasDragRef.current = false
    const canvas = canvasRef.current
    if (canvas) canvas.releasePointerCapture(e.pointerId)
  }, [])

  const [win, setWinRaw] = useState(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('pgxWin') : null
    let parsed = null
    if (saved) { try { parsed = JSON.parse(saved) } catch(e) {} }
    const defW = window.innerWidth < 768 ? Math.min(220, window.innerWidth - 30) : 300
    const defH = 180
    if (parsed && typeof parsed.x === 'number') {
      const w = Math.min(parsed.w || defW, window.innerWidth - 2 * MARGIN)
      const h = Math.min(parsed.h || defH, window.innerHeight - 2 * MARGIN)
      return { ...clampPos(parsed.x, parsed.y || 60, w, h), w, h }
    }
    return { ...clampPos(window.innerWidth - defW - 20, window.innerHeight - defH - 80, defW, defH), w: defW, h: defH }
  })
  const { x, y, w, h } = win
  const setWin = useCallback((fn) => {
    setWinRaw(prev => {
      const next = typeof fn === 'function' ? fn(prev) : fn
      return { ...clampPos(next.x, next.y, next.w, next.h), w: next.w, h: next.h }
    })
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem('pgxWin', JSON.stringify({ x, y, w, h }))
  }, [x, y, w, h])

  useEffect(() => {
    const onResize = () => setWin(prev => ({ ...clampPos(prev.x, prev.y, prev.w, prev.h), w: prev.w, h: prev.h }))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [setWin])

  const data = useMemo(() => {
    if (!show) return null
    const multiplier = UNIT_FACTORS[chargeUnit] || 1e-6
    // When distributions are active, point charges are hidden and must not contribute
    const physicalCharges = distributions.length > 0 ? [] : charges.map(c => ({ ...c, q: c.q * multiplier }))
    const { ke, rMin } = useStore.getState()
    const axisIdx = potAxis === 'x' ? 0 : potAxis === 'y' ? 1 : 2
    const pos = [...testPoint]
    const pts = []
    let minV = Infinity, maxV = -Infinity
    for (let i = 0; i < SAMPLES; i++) {
      const t = (i / (SAMPLES - 1)) * (AXIS_RANGE * 2) - AXIS_RANGE
      pos[axisIdx] = t
      const V = calculateTotalPotential(physicalCharges, pos, ke, rMin, distributions)
      pts.push({ t, V })
      if (V < minV) minV = V
      if (V > maxV) maxV = V
    }
    const absMax = Math.max(Math.abs(minV), Math.abs(maxV), 1e-30)
    minV = -absMax; maxV = absMax
    const range = Math.max(maxV - minV, 1e-30)
    const testV = calculateTotalPotential(physicalCharges, testPoint, ke, rMin, distributions)
    return { pts, minV, maxV, range, testPos: testPoint[axisIdx], testV, axisLabel: AXIS_LABELS[potAxis] }
  }, [show, charges, distributions, chargeUnit, testPoint, potAxis])

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
    const titleColor = isDark ? 'rgba(255,255,255,0.7)' : 'rgba(15,23,42,0.75)'
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
    const yScale = (v) => PAD + (1 - (v - data.minV) / data.range) * plotH

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
    ctx.fillText(`${data.axisLabel.toLowerCase()} (m)`, PAD + plotW + 2, axisY + 3)

    ctx.beginPath()
    for (let i = 0; i < data.pts.length; i++) {
      const px = xScale(data.pts[i].t)
      const py = yScale(data.pts[i].V)
      if (i === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.strokeStyle = '#4ade80'
    ctx.lineWidth = 1.5
    ctx.stroke()

    const cx = xScale(data.testPos)
    ctx.beginPath()
    ctx.moveTo(cx, PAD)
    ctx.lineTo(cx, PAD + plotH)
    ctx.strokeStyle = '#fbbf24'
    ctx.lineWidth = 1
    ctx.setLineDash([2, 3])
    ctx.stroke()
    ctx.setLineDash([])

    const cy = yScale(data.testV)
    ctx.beginPath()
    ctx.arc(cx, cy, 3, 0, Math.PI * 2)
    ctx.fillStyle = '#fbbf24'
    ctx.fill()

    ctx.save()
    ctx.translate(PAD - 14, PAD + plotH / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.fillStyle = labelColor
    ctx.font = '11px monospace'
    ctx.fillText('V (V)', -16, 0)
    ctx.restore()
    ctx.fillStyle = titleColor
    ctx.font = '9px monospace'
    ctx.fillText(`V(${data.axisLabel}) passant par M`, PAD + 4, PAD + 12)
    ctx.fillStyle = infoColor
    ctx.font = '12px monospace'
    ctx.fillText(`M: ${data.axisLabel}=${data.testPos.toFixed(2)}`, PAD + 4, PAD + plotH - 4)
  }, [show, data, w, h, theme])

  const winRefState = useRef(win)
  winRefState.current = win

  if (!show || !data) return null

  return (
    <div className="pg-window" ref={winRef} style={{ left: x, top: y, width: w, height: h }}
      onPointerDown={(e) => {
        if (e.target.closest?.('select, button, .pg-close, .pg-axis-select, .pg-resize')) return
        const header = e.target.closest?.('.pg-header')
        if (!header) return
        e.preventDefault()
        e.stopPropagation()
        const cur = winRefState.current
        const offX = e.clientX - cur.x; const offY = e.clientY - cur.y
        const mv = (ev) => { setWinRaw(prev => { const c = clampPos(ev.clientX - offX, ev.clientY - offY, prev.w, prev.h); return { ...c, w: prev.w, h: prev.h } }) }
        const up = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); dragCleanupRef.current = null }
        window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up)
        dragCleanupRef.current = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up) }
      }}
    >
      <div className="pg-header">
        <span className="pg-title">V({AXIS_LABELS[potAxis]}) au centre</span>
        <select value={potAxis} onChange={(e) => setPotAxis(e.target.value)} className="pg-axis-select">
          {AXIS_KEYS.map(k => <option key={k} value={k}>Axe {AXIS_LABELS[k]}</option>)}
        </select>
        <span className="pg-test-val" style={{ color: '#4ade80' }}>{data.testV.toExponential(2)} V</span>
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
          try { target.setPointerCapture(e.pointerId) } catch {}
          const cur = winRefState.current
          const sw = cur.w, sh = cur.h
          const sx = e.clientX, sy = e.clientY
          const mv = (ev) => { setWinRaw(prev => {
            const mw = window.innerWidth, mh = window.innerHeight
            return { ...prev, w: Math.max(MIN_W, Math.min(mw - prev.x - MARGIN, sw + ev.clientX - sx)), h: Math.max(MIN_H, Math.min(mh - prev.y - MARGIN, sh + ev.clientY - sy)) }
          }) }
          const up = (ev) => {
            try { target.releasePointerCapture(ev.pointerId) } catch {}
            window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); dragCleanupRef.current = null
          }
          window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up)
          dragCleanupRef.current = () => {
            try { target.releasePointerCapture(e.pointerId) } catch {}
            window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up)
          }
        }}
      />
    </div>
  )
}
