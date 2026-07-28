import { useState, useRef, useCallback } from 'react'
import { useStore, DIST_PARAMS } from '../store/useStore'

function toSigFigs(v, n) {
  if (v === 0) return '0'
  const d = Math.floor(Math.log10(Math.abs(v)))
  return v.toFixed(Math.max(0, n - 1 - d))
}

function CoordInput({ value, onChange, label }) {
  const [raw, setRaw] = useState(null)
  const display = raw !== null ? raw : toSigFigs(value, 4)

  const handleChange = (e) => {
    const rawVal = e.target.value
    if (/^-?\d*\.?\d*$/.test(rawVal) || rawVal === '') {
      setRaw(rawVal)
      const parsed = parseFloat(rawVal)
      if (!isNaN(parsed) && rawVal !== '-' && !rawVal.endsWith('.')) {
        onChange(parsed)
      }
    }
  }

  const handleBlur = () => setRaw(null)

  return (
    <div className="ctx-param-row">
      <span className="ctx-param-label">{label}</span>
      <input
        value={display}
        onChange={handleChange}
        onBlur={handleBlur}
        className="ctx-input"
      />
    </div>
  )
}

function CtxNumberInput({ value, onChange, className, style }) {
  const [raw, setRaw] = useState(null)
  const display = raw !== null ? raw : String(Number(value))

  const handleChange = (e) => {
    const rawVal = e.target.value
    if (/^-?\d*\.?\d*$/.test(rawVal) || rawVal === '') {
      setRaw(rawVal)
      const parsed = parseFloat(rawVal)
      if (!isNaN(parsed) && rawVal !== '-' && !rawVal.endsWith('.')) {
        onChange(parsed)
      }
    }
  }

  const handleBlur = () => {
    if (raw !== null) {
      const parsed = parseFloat(raw)
      if (!isNaN(parsed) && raw !== '-' && !raw.endsWith('.')) {
        onChange(parsed)
      }
    }
    setRaw(null)
  }

  return <input type="text" value={display} onChange={handleChange} onBlur={handleBlur} className={className} style={style} />
}

export function ContextMenu() {
  const contextMenu = useStore((s) => s.contextMenu)
  const closeContextMenu = useStore((s) => s.closeContextMenu)
  const charges = useStore((s) => s.charges)
  const distributions = useStore((s) => s.distributions)
  const chargeUnit = useStore((s) => s.chargeUnit)
  const freeCharges = useStore((s) => s.freeCharges)
  const updateChargeQ = useStore((s) => s.updateChargeQ)
  const updateChargePosition = useStore((s) => s.updateChargePosition)
  const pushHistory = useStore((s) => s.pushHistory)
  const updateDistribution = useStore((s) => s.updateDistribution)
  const toggleFreeCharge = useStore((s) => s.toggleFreeCharge)
  const removeCharge = useStore((s) => s.removeCharge)
  const removeDistribution = useStore((s) => s.removeDistribution)
  const resetChargePositions = useStore((s) => s.resetChargePositions)

  const [dragOff, setDragOff] = useState({ x: 0, y: 0 })
  const draggingRef = useRef(false)
  const startRef = useRef({ x: 0, y: 0, offX: 0, offY: 0 })

  const onHeaderPointerDown = useCallback((e) => {
    e.preventDefault()
    draggingRef.current = true
    startRef.current = { x: e.clientX, y: e.clientY, offX: dragOff.x, offY: dragOff.y }

    const onMove = (ev) => {
      if (!draggingRef.current) return
      const dx = ev.clientX - startRef.current.x
      const dy = ev.clientY - startRef.current.y
      setDragOff({ x: startRef.current.offX + dx, y: startRef.current.offY + dy })
    }
    const onUp = () => {
      draggingRef.current = false
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
    }
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
  }, [dragOff])

  if (!contextMenu) return null

  const clampX = Math.max(10, Math.min(contextMenu.x, window.innerWidth - 240))
  const clampY = Math.max(10, Math.min(contextMenu.y, window.innerHeight - 320))

  if (contextMenu.type === 'dist') {
    const dist = distributions.find((d) => d.id === contextMenu.id)
    if (!dist) return null
    const params = DIST_PARAMS[dist.type] || []

    return (
      <div className="ctx-menu" style={{ left: clampX + dragOff.x, top: clampY + dragOff.y }}>
        <div className="ctx-header" onPointerDown={onHeaderPointerDown}>
          <span className="ctx-header-name dist">
            {dist.name}
          </span>
          <div className="ctx-header-actions">
            <button onClick={closeContextMenu} className="ctx-btn ctx-btn-close" title="Fermer">&times;</button>
          </div>
        </div>
        {params.map((param) => {
          if (param.type === 'vec3') {
            const val = Array.isArray(dist[param.key]) ? dist[param.key] : [0, 0, 0]
            return (
              <div key={param.key} className="ctx-param-row">
                <span className="ctx-param-label mini">{param.label}</span>
                {['X', 'Y', 'Z'].map((c, ci) => (
                  <CtxNumberInput key={c} value={val[ci] ?? 0}
                    onChange={(v) => {
                      const arr = [...val]
                      arr[ci] = v
                      updateDistribution(dist.id, { [param.key]: arr })
                    }}
                    className="ctx-input small"
                  />
                ))}
              </div>
            )
          }
          if (param.type === 'radii') {
            const outerVal = dist[param.key] ?? 0
            const innerVal = dist[param.innerKey] ?? 0
            const hideInner = param.innerKey === 'e_int' && !dist.innerRadius
            return (
              <div key={param.key} className="ctx-param-row" style={{ gap: '4px' }}>
                <span className="ctx-param-label mini">{param.label}</span>
                <span className="ctx-param-label" style={{ fontSize: '0.55rem' }}>{param.outerLabel}</span>
                <input type="range" min={param.key === 'e_ext' ? 0 : 1} max={10} step={0.1}
                  value={outerVal}
                  onChange={(e) => updateDistribution(dist.id, { [param.key]: parseFloat(e.target.value) })}
                  className="slider" style={{ flex: 1, margin: '0 2px', height: '4px' }} />
                <CtxNumberInput value={outerVal} onChange={(v) => updateDistribution(dist.id, { [param.key]: v })}
                  className="ctx-input small" style={{ width: '2.5rem' }} />
                {!hideInner && (
                  <>
                    <span className="ctx-param-label" style={{ fontSize: '0.55rem' }}>{param.innerLabel}</span>
                    <input type="range" min={0} max={outerVal} step={0.1}
                      value={innerVal}
                      onChange={(e) => updateDistribution(dist.id, { [param.innerKey]: parseFloat(e.target.value) })}
                      className="slider" style={{ flex: 1, margin: '0 2px', height: '4px' }} />
                    <CtxNumberInput value={innerVal} onChange={(v) => updateDistribution(dist.id, { [param.innerKey]: v })}
                      className="ctx-input small" style={{ width: '2.5rem' }} />
                  </>
                )}
              </div>
            )
          }
          if (param.type === 'range') {
            return (
              <div key={param.key} className="ctx-param-row">
                <span className="ctx-param-label mini">{param.label}</span>
                <input type="range" min={1} max={100} step={1}
                  value={dist[param.key] ?? 0}
                  onChange={(e) => updateDistribution(dist.id, { [param.key]: parseFloat(e.target.value) })}
                  className="slider" style={{ flex: 1, margin: '0 4px', height: '18px' }} />
                <CtxNumberInput value={dist[param.key] ?? 0}
                  onChange={(v) => updateDistribution(dist.id, { [param.key]: v })}
                  className="ctx-input small" style={{ width: '3rem' }} />
              </div>
            )
          }
          return (
            <CoordInput key={param.key} value={dist[param.key] ?? 0}
              onChange={(v) => updateDistribution(dist.id, { [param.key]: v })}
              label={param.label}
            />
          )
        })}
        {(dist.type === 'cylinder' || dist.type === 'sphere' || dist.type === 'box') && (
          <div className="ctx-param-row" style={{ gap: '4px' }}>
            <span className="ctx-param-label">Creux</span>
            <label className="ctx-switch">
              <input type="checkbox" checked={!!dist.hollow}
                onChange={(e) => updateDistribution(dist.id, { hollow: e.target.checked })} />
              <span className={`ctx-switch-slider ${dist.hollow ? 'on' : ''}`}>
                <span className="ctx-switch-knob" />
              </span>
            </label>
          </div>
        )}
        <div className="ctx-separator" />
        <button onClick={() => { removeDistribution(dist.id); closeContextMenu() }}
          className="ctx-action-btn ctx-btn-danger">
          Supprimer
        </button>
      </div>
    )
  }

  const charge = charges.find((c) => c.id === contextMenu.id)
  if (!charge) return null

  const unitLabel = chargeUnit === 'uC' ? 'µC' : chargeUnit

  const handleQChange = (val) => updateChargeQ(charge.id, val)
  const handlePosChange = (axis, val) => {
    const newPos = [...charge.position]
    newPos[axis] = val
    pushHistory()
    updateChargePosition(charge.id, newPos)
  }

  return (
    <div className="ctx-menu" style={{ left: clampX + dragOff.x, top: clampY + dragOff.y }}>
      <div className="ctx-header" onPointerDown={onHeaderPointerDown}>
        <span className="ctx-header-name charge">
          Point {charge.name}
        </span>
        <div className="ctx-header-actions">
          <button
            onClick={() => { updateChargeQ(charge.id, -charge.q); closeContextMenu() }}
            className="ctx-btn"
            title="Inverser le signe"
          >
            +/-
          </button>
          <button onClick={closeContextMenu} className="ctx-btn ctx-btn-close" title="Fermer">&times;</button>
        </div>
      </div>

      <CoordInput value={charge.q} onChange={handleQChange} label={`q (${unitLabel})`} />
      <input type="range" min="-10" max="10" step="0.1" value={charge.q}
        onChange={(e) => updateChargeQ(charge.id, parseFloat(e.target.value))}
        className="ctx-range"
      />

      <div className="ctx-separator" />

      <CoordInput value={charge.position[0]} onChange={(v) => handlePosChange(0, v)} label="X" />
      <CoordInput value={charge.position[1]} onChange={(v) => handlePosChange(1, v)} label="Y" />
      <CoordInput value={charge.position[2]} onChange={(v) => handlePosChange(2, v)} label="Z" />

      <div className="ctx-separator" />

      <button onClick={() => { toggleFreeCharge(charge.id); closeContextMenu() }}
        className="ctx-action-btn"
        style={{
          color: freeCharges[charge.id] ? 'var(--color-accent)' : 'var(--text-secondary)',
          borderColor: freeCharges[charge.id] ? 'var(--color-accent)' : 'var(--border-color)',
        }}>
        {freeCharges[charge.id] ? '🔴 Attraper' : '🟢 Lâcher'}
      </button>
      <button onClick={() => { resetChargePositions(); closeContextMenu() }} className="ctx-action-btn">RAZ position</button>
      <button onClick={() => { navigator.clipboard.writeText(`${charge.position[0].toFixed(2)}, ${charge.position[1].toFixed(2)}, ${charge.position[2].toFixed(2)}`); closeContextMenu() }} className="ctx-action-btn">Copier coordonnées</button>
      <button onClick={() => { removeCharge(charge.id); closeContextMenu() }} className="ctx-action-btn ctx-btn-danger">Supprimer</button>
    </div>
  )
}
