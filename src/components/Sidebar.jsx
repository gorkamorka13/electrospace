import { useState, useMemo, memo, useCallback } from 'react'
import { useStore, DIST_PARAMS } from '../store/useStore'
import { formatElectricField, formatPotential, formatForce } from '../physics/coulomb'
import { InlineMath, BlockMath } from '../utils/math'
import { CustomSelect } from './CustomSelect'

function CoordInput({ value, onChange, label }) {
  const [raw, setRaw] = useState(null)
  const display = raw !== null ? raw : value.toFixed(2)

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
    const parsed = parseFloat(display)
    setRaw(null)
    if (!isNaN(parsed)) {
      onChange(parsed)
    }
  }

  return (
    <div className="coord-field">
      <label>{label}</label>
      <input
        type="text"
        value={display}
        onChange={handleChange}
        onBlur={handleBlur}
      />
    </div>
  )
}

function DistInput({ value, onChange, className, style }) {
  const [raw, setRaw] = useState(null)
  const display = raw !== null ? raw : value != null ? String(Number(value)) : '0'

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

  return (
    <input type="text" value={display} onChange={handleChange} onBlur={handleBlur} className={className} style={style} />
  )
}

function CollapsibleSection({ title, defaultOpen = true, children, headerExtra }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="section">
      <div className="section-header collapsible-header" onClick={() => setOpen(!open)}>
        <div className="flex-row gap-3">
          <span className={`arrow-icon ${open ? 'open' : 'closed'}`}>▶</span>
          <h3 style={{ border: 'none', padding: 0, margin: 0 }}>{title}</h3>
        </div>
        {headerExtra}
      </div>
      {open && children}
    </div>
  )
}

/* ─── memo sub-components ─── */

const FieldAndPotential = memo(({ testPoint }) => {
  const charges = useStore((s) => s.charges)
  const distributions = useStore((s) => s.distributions)
  const chargeUnit = useStore((s) => s.chargeUnit)
  const showTestPoint = useStore((s) => s.showTestPoint)

  const { E, V, ENorm } = useMemo(() => {
    // Reference state deps for electric field & potential calculation
    const E = useStore.getState().getElectricField(testPoint)
    const V = useStore.getState().getPotential(testPoint)
    return { E, V, ENorm: E.length() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [charges, distributions, chargeUnit, testPoint])

  if (!showTestPoint) return null

  return (
    <div className="data-box highlight">
      <div className="data-row">
        <span className="label">||E|| (Champ)</span>
        <span className="value font-mono highlight-text">{formatElectricField(ENorm)}</span>
      </div>
      <div className="data-row separator">
        <span className="label">Ex</span>
        <span className="value font-mono">{formatElectricField(E.x)}</span>
      </div>
      <div className="data-row">
        <span className="label">Ey</span>
        <span className="value font-mono">{formatElectricField(E.y)}</span>
      </div>
      <div className="data-row">
        <span className="label">Ez</span>
        <span className="value font-mono">{formatElectricField(E.z)}</span>
      </div>
      <div className="data-row data-row-sep">
        <span className="label data-row-label">V (Potentiel)</span>
        <span className="value font-mono highlight-text data-row-value">{formatPotential(V)}</span>
      </div>
    </div>
  )
})

const CoulombForces = memo(() => {
  const charges = useStore((s) => s.charges)
  const showForces = useStore((s) => s.showForces)
  const setShowForces = useStore((s) => s.setShowForces)
  const distributions = useStore((s) => s.distributions)

  if (!showForces || charges.length < 2) return null
  if (distributions.length > 0) {
    return <p className="text-muted" style={{ fontSize: '0.85rem', padding: '0.5rem 0' }}>Forces désactivées avec des distributions de charge.</p>
  }

  return (
    <CollapsibleSection title="Forces de Coulomb" defaultOpen={false}
      headerExtra={
        <button className="btn-text accent" onClick={(e) => { e.stopPropagation(); setShowForces(false) }}>
          Masquer
        </button>
      }
    >
      <div className="flex-col gap-4">
        {charges.map((charge) => {
          const result = useStore.getState().getCoulombForces(charge.id)
          if (!result) return null
          const { resultant } = result
          const mag = resultant.length()
          const isRepulsive  = result.contributions.every(({ force }) => force.dot(resultant) > 0)
          const isAttractive = result.contributions.every(({ force }) => force.dot(resultant) < 0)
          const forceColor = isRepulsive ? '#f97316' : isAttractive ? '#a855f7' : '#facc15'
          return (
            <div
              key={charge.id}
              className="data-box force-box"
              style={{ borderColor: `${forceColor}33` }}
            >
              <div className="data-row">
                <span className="label force-label" style={{ color: forceColor }}>
                  F⃗{charge.name ?? charge.id}
                </span>
                <span className="value font-mono" style={{ color: forceColor }}>
                  {formatForce(mag)}
                </span>
              </div>
              <div className="data-row">
                <span className="label">Fx</span>
                <span className="value font-mono">{formatForce(resultant.x)}</span>
              </div>
              <div className="data-row">
                <span className="label">Fy</span>
                <span className="value font-mono">{formatForce(resultant.y)}</span>
              </div>
              <div className="data-row">
                <span className="label">Fz</span>
                <span className="value font-mono">{formatForce(resultant.z)}</span>
              </div>
            </div>
          )
        })}
      </div>
    </CollapsibleSection>
  )
})

const ChargeListSection = memo(({ selectedObjectId, setSelectedObjectId }) => {
  const charges = useStore((s) => s.charges)
  const distributions = useStore((s) => s.distributions)
  const chargeUnit = useStore((s) => s.chargeUnit)
  const freeCharges = useStore((s) => s.freeCharges)
  const clearCharges = useStore((s) => s.clearCharges)
  const setToast = useStore((s) => s.setToast)
  const removeCharge = useStore((s) => s.removeCharge)
  const updateChargeQ = useStore((s) => s.updateChargeQ)
  const updateChargePosition = useStore((s) => s.updateChargePosition)
  const pushHistory = useStore((s) => s.pushHistory)
  const toggleFreeCharge = useStore((s) => s.toggleFreeCharge)
  const resetChargePositions = useStore((s) => s.resetChargePositions)
  const addCharge = useStore((s) => s.addCharge)
  const loadPreset = useStore((s) => s.loadPreset)

  if (distributions.length > 0) return null

  const handleChargeCoordinateChange = (id, position, axis, val) => {
    const newPos = [...position]
    newPos[axis] = val
    pushHistory()
    updateChargePosition(id, newPos)
  }

  return (
    <>
    <CollapsibleSection title="Charges locales"
      headerExtra={
        charges.length > 0 && (
          <button className="btn-text" onClick={(e) => { e.stopPropagation(); clearCharges(); setToast({ message: 'Charges effacées — Ctrl+Z pour annuler', type: 'success' }) }}>
            Tout effacer
          </button>
        )
      }
    >
      <div className="btn-group mb-4">
        <button className="btn btn-primary" onClick={() => addCharge(1.0)}>
          + Charge (+1.0 {chargeUnit === 'uC' ? 'µC' : chargeUnit})
        </button>
        <button className="btn btn-secondary" onClick={() => addCharge(-1.0)}>
          - Charge (-1.0 {chargeUnit === 'uC' ? 'µC' : chargeUnit})
        </button>
      </div>
      <div className="flex-row gap-3 mb-6">
        <CustomSelect value="" options={[{key:'single',label:'Charge unique'},{key:'dipole',label:'Dipôle (+ / -)'},{key:'tripole',label:'Tripôle'},{key:'quadrupole',label:'Quadrupôle'},{key:'tetrahedron',label:'Tétraèdre'},{key:'capacitor',label:'Condensateur'},{key:'cubicQuadrupole',label:'Quadripôle cubique'}]} onChange={loadPreset} className="preset-select" placeholder="Préréglages..." />
      </div>
      <div className="charges-list">
        {charges.length === 0 ? (
          <p className="empty-message">
            Aucune charge active.
          </p>
        ) : (
          charges.map((charge) => (
            <div
              key={charge.id}
              className={`charge-item clickable-box ${selectedObjectId === charge.id ? 'box-selected' : ''}`}
              onClick={() => setSelectedObjectId(charge.id)}
            >
              <div className="charge-header">
                <span
                  className={`charge-badge ${charge.q >= 0 ? 'pos' : 'neg'}`}
                  style={{ cursor: 'pointer' }}
                  title="Cliquer pour inverser le signe (+/-)"
                  onClick={(e) => {
                    e.stopPropagation()
                    updateChargeQ(charge.id, -charge.q)
                  }}
                >
                  {charge.q >= 0 ? '+' : ''}{charge.q.toFixed(2)} {chargeUnit === 'uC' ? 'µC' : chargeUnit}
                </span>
                <span className="charge-id-label font-mono">Point {charge.name || charge.id}</span>
                <div className="flex-row gap-4">
                  <button
                    className="btn-sign-toggle"
                    title="Inverser le signe (+/-)"
                    onClick={(e) => {
                      e.stopPropagation()
                      updateChargeQ(charge.id, -charge.q)
                    }}
                  >
                    +/-
                  </button>
                  <button
                    className="btn-close"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeCharge(charge.id)
                    }}
                  >
                    &times;
                  </button>
                </div>
              </div>
              <div className="charge-controls" onClick={(e) => e.stopPropagation()}>
                <div className="flex-row gap-3 mb-4">
                  <CoordInput
                    label={`Charge (${chargeUnit === 'uC' ? 'µC' : chargeUnit})`}
                    value={charge.q}
                    onChange={(val) => updateChargeQ(charge.id, val)}
                  />
                </div>
                <input
                  type="range"
                  min="-10"
                  max="10"
                  step="0.1"
                  value={charge.q}
                  onChange={(e) => updateChargeQ(charge.id, parseFloat(e.target.value))}
                  className="slider mb-6"
                />

                <div className="flex-row gap-3 mb-4">
                  <button
                    className={`freeze-toggle ${freeCharges[charge.id] ? 'active' : 'inactive'}`}
                    onClick={(e) => { e.stopPropagation(); toggleFreeCharge(charge.id) }}
                  >
                    <span aria-hidden="true">{freeCharges[charge.id] ? '🔴' : '🟢'}</span> {freeCharges[charge.id] ? 'Attraper' : 'Lâcher'}
                  </button>
                  <button
                    className="raz-btn"
                    onClick={(e) => { e.stopPropagation(); resetChargePositions() }}
                    title="Remettre toutes les charges à leur position initiale"
                  >
                    RAZ
                  </button>
                </div>
                <div className={`coord-inputs ${freeCharges[charge.id] ? 'dim-coords' : ''}`}>
                  <CoordInput
                    label="X"
                    value={charge.position[0]}
                    onChange={(val) => handleChargeCoordinateChange(charge.id, charge.position, 0, val)}
                  />
                  <CoordInput
                    label="Y"
                    value={charge.position[1]}
                    onChange={(val) => handleChargeCoordinateChange(charge.id, charge.position, 1, val)}
                  />
                  <CoordInput
                    label="Z"
                    value={charge.position[2]}
                    onChange={(val) => handleChargeCoordinateChange(charge.id, charge.position, 2, val)}
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </CollapsibleSection>
    </>
  )
})

/* ─── Tab icons as SVG components (lightweight, no emoji in code) ─── */

function TabIcon({ id, active }) {
  const color = active ? 'var(--accent)' : 'var(--text-secondary)'
  const props = { width: 16, height: 16, fill: 'none', stroke: color, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }
  switch (id) {
    case 'scene':
      return <svg {...props}><circle cx="6" cy="6" r="3" /><circle cx="16" cy="16" r="3" /><path d="M6 9v6m0 0a3 3 0 0 0 3 3" /><path d="M16 13a3 3 0 0 0-3-3" /></svg>
    case 'analysis':
      return <svg {...props}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
    case 'pedagogy':
      return <svg {...props}><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
    case 'settings':
      return <svg {...props}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
    default: return null
  }
}

/* ─── Main Sidebar ─── */

const TABS = [
  { id: 'scene', label: 'Scène' },
  { id: 'analysis', label: 'Analyse' },
  { id: 'pedagogy', label: 'Pédagogie' },
  { id: 'settings', label: 'Paramètres' },
]

export function Sidebar() {
  const [activeTab, setActiveTab] = useState('scene')
  const [formula, setFormula] = useState('charge')

  // Stable action selectors
  const exportScene = useStore((s) => s.exportScene)
  const importScene = useStore((s) => s.importScene)
  const setToast = useStore((s) => s.setToast)
  const setSidebarOpen = useStore((s) => s.setSidebarOpen)
  const sidebarOpen = useStore((s) => s.sidebarOpen)
  const theme = useStore((s) => s.theme)
  const toggleTheme = useStore((s) => s.toggleTheme)
  const cameraMode = useStore((s) => s.cameraMode)
  const setCameraMode = useStore((s) => s.setCameraMode)

  // Scene tab
  const distributions = useStore((s) => s.distributions)
  const addDistribution = useStore((s) => s.addDistribution)
  const removeDistribution = useStore((s) => s.removeDistribution)
  const updateDistribution = useStore((s) => s.updateDistribution)
  const clearDistributions = useStore((s) => s.clearDistributions)
  const selectedObjectId = useStore((s) => s.selectedObjectId)
  const setSelectedObjectId = useStore((s) => s.setSelectedObjectId)

  // Analysis tab
  const testPoint = useStore((s) => s.testPoint)
  const updateTestPoint = useStore((s) => s.updateTestPoint)
  const showFieldGraph = useStore((s) => s.showFieldGraph)
  const setShowFieldGraph = useStore((s) => s.setShowFieldGraph)
  const showPotentialXGraph = useStore((s) => s.showPotentialXGraph)
  const setShowPotentialXGraph = useStore((s) => s.setShowPotentialXGraph)
  const bringToFront = useStore((s) => s.bringToFront)
  const showIndividualFields = useStore((s) => s.showIndividualFields)
  const setShowIndividualFields = useStore((s) => s.setShowIndividualFields)

  // Settings tab
  const snapEnabled = useStore((s) => s.snapEnabled)
  const setSnapEnabled = useStore((s) => s.setSnapEnabled)
  const snapSize = useStore((s) => s.snapSize)
  const setSnapSize = useStore((s) => s.setSnapSize)
  const chargeUnit = useStore((s) => s.chargeUnit)
  const setChargeUnit = useStore((s) => s.setChargeUnit)
  const vectorScale = useStore((s) => s.vectorScale)
  const setVectorScale = useStore((s) => s.setVectorScale)
  const fieldLinesPerCharge = useStore((s) => s.fieldLinesPerCharge)
  const setFieldLinesPerCharge = useStore((s) => s.setFieldLinesPerCharge)
  const showForces = useStore((s) => s.showForces)
  const setShowForces = useStore((s) => s.setShowForces)
  const showFieldLines = useStore((s) => s.showFieldLines)
  const setShowFieldLines = useStore((s) => s.setShowFieldLines)

  const activeView = useStore((s) => s.activeView)
  const setActiveView = useStore((s) => s.setActiveView)

  // Pedagogy tab
  const showGaussCompanion = useStore((s) => s.showGaussCompanion)
  const setShowGaussCompanion = useStore((s) => s.setShowGaussCompanion)

  // Touch gesture
  const [touchStart, setTouchStart] = useState(null)

  const handleTouchStart = (e) => {
    const touch = e.touches[0]
    setTouchStart({ x: touch.clientX, y: touch.clientY })
  }

  const handleTouchMove = (e) => {
    if (!touchStart) return
    const touch = e.touches[0]
    const diffX = touch.clientX - touchStart.x
    const diffY = touch.clientY - touchStart.y
    if (diffX < -50 && Math.abs(diffX) > Math.abs(diffY)) {
      setSidebarOpen(false)
      setTouchStart(null)
    }
  }

  const handleTouchEnd = () => setTouchStart(null)

  const handleMCoordinateChange = (axis, val) => {
    const newPos = [...testPoint]
    newPos[axis] = val
    updateTestPoint(newPos)
  }

  // Screenshot capture of the 3D scene — find the WebGL canvas, not 2D graph canvases
  const captureScreenshot = useCallback(() => {
    const canvases = document.querySelectorAll('canvas')
    let canvas = null
    for (const c of canvases) {
      const ctx = c.getContext('webgl2') || c.getContext('webgl')
      if (ctx) { canvas = c; break }
    }
    if (!canvas) {
      setToast({ message: 'Impossible de capturer la scène 3D', type: 'error' })
      return
    }
    try {
      const dataUrl = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.download = `electrospace-${Date.now()}.png`
      link.href = dataUrl
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      setToast({ message: 'Capture d\'écran téléchargée', type: 'success' })
    } catch (err) {
      setToast({ message: 'Erreur lors de la capture : ' + err.message, type: 'error' })
    }
  }, [setToast])

  const handleExportScene = useCallback(() => {
    const res = exportScene()
    if (res && res.success) {
      setToast({ message: 'Fichier de scène téléchargé', type: 'success' })
    } else {
      setToast({ message: 'Erreur lors de l\'exportation : ' + (res?.error || 'Inconnue'), type: 'error' })
    }
  }, [exportScene, setToast])

  return (
    <aside className={`sidebar ${sidebarOpen ? '' : 'closed'}`}
      onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
    >
      <div className="sidebar-brand">
        <div className="brand">
          <h2><img src="/icon-192.png" alt="" className="brand-icon" />ElectroSpace 3D</h2>
        </div>
      </div>

      {/* Tab navigation */}
      <nav className="sidebar-tabs">
        {TABS.map((tab) => (
          <button key={tab.id}
            className={`sidebar-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <TabIcon id={tab.id} active={activeTab === tab.id} />
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* Tab content */}
      <div className="sidebar-tab-content">
        {activeTab === 'scene' && (
          <div className="tab-panel">
            <CollapsibleSection title="Scènes" defaultOpen={true}>
              <div className="flex-row gap-2">
                <label className="btn-text scene-btn" style={{ cursor: 'pointer' }}>
                  <span aria-hidden="true">📂</span> Importer
                  <input type="file" accept=".json" style={{ display: 'none' }} aria-label="Importer un fichier de scène"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      const reader = new FileReader()
                      reader.onload = (ev) => {
                        const result = importScene(ev.target.result)
                        if (result && result.success) {
                          setToast({ message: 'Scène importée avec succès', type: 'success' })
                        } else {
                          setToast({ message: result?.error || 'Erreur lors de l\'importation', type: 'error' })
                        }
                        e.target.value = ''
                      }
                      reader.readAsText(file)
                    }}
                  />
                </label>
                <button className="btn-text scene-btn" onClick={handleExportScene}>
                  <span aria-hidden="true">💾</span> Exporter
                </button>
                <button className="btn-text scene-btn" onClick={captureScreenshot}>
                  <span aria-hidden="true">📷</span> Capture
                </button>
              </div>
            </CollapsibleSection>

            <ChargeListSection selectedObjectId={selectedObjectId} setSelectedObjectId={setSelectedObjectId} />

            <CollapsibleSection title="Distributions continues">
              <div className="dist-btn-row">
                {[
                  { type: 'line', label: 'Fil' },
                  { type: 'cylinder', label: 'Cylindre' },
                  { type: 'plane', label: 'Plan' },
                  { type: 'disk', label: 'Disque' },
                  { type: 'circle', label: 'Anneau' },
                  { type: 'frame', label: 'Cadre' },
                  { type: 'sphere', label: 'Sphère' },
                  { type: 'box', label: 'Boîte' },
                ].map((b) => (
                  <button key={b.type} className="btn btn-small" onClick={() => addDistribution(b.type)}>
                    +{b.label}
                  </button>
                ))}
              </div>
              {distributions.length > 0 && (
                <div className="dist-list">
                  {distributions.map((d) => (
                    <div key={d.id} className="data-box dist-item">
                      <div className="dist-item-header">
                        <span className="dist-item-name">{d.name}</span>
                        <button className="btn-close" onClick={() => removeDistribution(d.id)}>&times;</button>
                      </div>
                      {DIST_PARAMS[d.type]?.map((param, idx, arr) => {
                        // Skip if this was already rendered as part of a linked pair
                        if (idx > 0 && arr[idx - 1]?.linkKey === param.key) return null
                        const val = d[param.key]
                        if (param.type === 'vec3') {
                          return (
                            <div key={param.key} className="dist-vec3-row">
                              <span className="label dist-vec3-label">{param.label}</span>
                              {['X', 'Y', 'Z'].map((c, ci) => (
                                <input key={c} type="text" value={Array.isArray(val) ? String(Number(val[ci]) || 0) : '0'}
                                  onChange={(e) => {
                                    const arr = [...(Array.isArray(val) ? val : [0, 0, 0])]
                                    arr[ci] = parseFloat(e.target.value) || 0
                                    updateDistribution(d.id, { [param.key]: arr })
                                  }}
                                  className="dist-vec3-input"
                                />
                              ))}
                            </div>
                          )
                        }
                        if (param.type === 'radii') {
                          const outerVal = d[param.key] ?? 0
                          const innerVal = d[param.innerKey] ?? 0
                          const hideInner = param.innerKey === 'e_int' && !d.innerRadius
                          return (
                            <div key={param.key} className="dist-param-row" style={{ gap: '0.25rem' }}>
                              <span className="label dist-param-label" style={{ minWidth: 'auto', marginRight: '0.25rem' }}>{param.label}</span>
                              <span className="label" style={{ fontSize: '0.6rem', whiteSpace: 'nowrap' }}>{param.outerLabel}</span>
                              <input type="range" min={param.key === 'e_ext' ? 0 : 1} max={10} step={0.1}
                                value={outerVal}
                                onChange={(e) => updateDistribution(d.id, { [param.key]: parseFloat(e.target.value) })}
                                className="slider" style={{ flex: 1, margin: '0 2px', height: '4px' }} />
                              <DistInput value={outerVal} onChange={(v) => updateDistribution(d.id, { [param.key]: v })}
                                className="dist-param-input" style={{ width: '2.5rem' }} />
                              {!hideInner && (
                                <>
                                  <span className="label" style={{ fontSize: '0.6rem', whiteSpace: 'nowrap' }}>{param.innerLabel}</span>
                                  <input type="range" min={0} max={outerVal} step={0.1}
                                    value={innerVal}
                                    onChange={(e) => updateDistribution(d.id, { [param.innerKey]: parseFloat(e.target.value) })}
                                    className="slider" style={{ flex: 1, margin: '0 2px', height: '4px' }} />
                                  <DistInput value={innerVal} onChange={(v) => updateDistribution(d.id, { [param.innerKey]: v })}
                                    className="dist-param-input" style={{ width: '2.5rem' }} />
                                </>
                              )}
                            </div>
                          )
                        }
                        if (param.type === 'range') {
                          const next = arr[idx + 1]
                          const isLinked = param.linkKey && next?.key === param.linkKey
                          if (isLinked) {
                            const nextVal = d[next.key] ?? 0
                            const linked = !!d.linkWH
                            return (
                              <div key={param.key} style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', marginBottom: '0.15rem' }}>
                                <div className="dist-param-row">
                                  <span className="label dist-param-label">{param.label}</span>
                                  <input type="range" min={1} max={200} step={1}
                                    value={val ?? 0}
                                    onChange={(e) => updateDistribution(d.id, { [param.key]: parseFloat(e.target.value), ...(linked ? { [next.key]: parseFloat(e.target.value) } : {}) })}
                                    className="slider" style={{ flex: 1, margin: '0 4px' }} />
                                  <DistInput value={val ?? 0} onChange={(v) => updateDistribution(d.id, { [param.key]: v, ...(linked ? { [next.key]: v } : {}) })}
                                    className="dist-param-input" style={{ width: '3rem' }} />
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0.05rem 0' }}>
                                  <button onClick={() => updateDistribution(d.id, { linkWH: !linked })}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', padding: '0.1rem 0.3rem', borderRadius: '3px', color: linked ? '#f59e0b' : '#666', lineHeight: 1, width: '1.8rem', textAlign: 'center' }}
                                    title={linked ? 'Dimensions liées' : 'Lier les dimensions'}>{linked ? '🔗' : '⛓'}
                                  </button>
                                </div>
                                <div className="dist-param-row">
                                  <span className="label dist-param-label">{next.label}</span>
                                  <input type="range" min={1} max={200} step={1}
                                    value={nextVal}
                                    onChange={(e) => updateDistribution(d.id, { [next.key]: parseFloat(e.target.value), ...(linked ? { [param.key]: parseFloat(e.target.value) } : {}) })}
                                    className="slider" style={{ flex: 1, margin: '0 4px' }} />
                                  <DistInput value={nextVal} onChange={(v) => updateDistribution(d.id, { [next.key]: v, ...(linked ? { [param.key]: v } : {}) })}
                                    className="dist-param-input" style={{ width: '3rem' }} />
                                </div>
                              </div>
                            )
                          }
                          return (
                            <div key={param.key} className="dist-param-row">
                              <span className="label dist-param-label">{param.label}</span>
                              <input type="range" min={1} max={200} step={1}
                                value={val ?? 0}
                                onChange={(e) => updateDistribution(d.id, { [param.key]: parseFloat(e.target.value) })}
                                className="slider" style={{ flex: 1, margin: '0 4px' }} />
                              <DistInput value={val ?? 0} onChange={(v) => updateDistribution(d.id, { [param.key]: v })}
                                className="dist-param-input" style={{ width: '3rem' }} />
                            </div>
                          )
                        }
                        return (
                          <div key={param.key} className="dist-param-row">
                            <span className="label dist-param-label">{param.label}</span>
                            <DistInput value={val ?? 0} onChange={(v) => updateDistribution(d.id, { [param.key]: v })}
                              className="dist-param-input" />
                          </div>
                        )
                      })}
                      {(d.type === 'cylinder' || d.type === 'sphere' || d.type === 'box') && (
                        <div className="flex-row gap-3 mt-3">
                          <span className="label" style={{ fontSize: '0.65rem' }}>Creux</span>
                          <label className="switch">
                            <input type="checkbox" checked={!!d.hollow}
                              onChange={(e) => updateDistribution(d.id, { hollow: e.target.checked })} />
                            <span className={`switch-slider ${d.hollow ? 'on' : ''}`}>
                              <span className="switch-knob" />
                            </span>
                          </label>
                        </div>
                      )}
                    </div>
                  ))}
                  <button className="btn-text accent" onClick={() => { clearDistributions(); setToast({ message: 'Distributions effacées — Ctrl+Z pour annuler', type: 'success' }) }}>
                    Tout effacer
                  </button>
                </div>
              )}
            </CollapsibleSection>
          </div>
        )}

        {activeTab === 'analysis' && (
          <div className="tab-panel">
            <CollapsibleSection title="Point de Test M"
              headerExtra={
                <span className={`select-indicator ${selectedObjectId === 'testPoint' ? 'active' : ''}`}
                  onClick={(e) => { e.stopPropagation(); setSelectedObjectId('testPoint') }}
                >
                  {selectedObjectId === 'testPoint' ? '● Actif' : 'Sélectionner'}
                </span>
              }
            >
              <div className={`data-box clickable-box ${selectedObjectId === 'testPoint' ? 'box-selected' : ''}`}
                onClick={() => setSelectedObjectId('testPoint')}
              >
                <div className="data-row">
                  <span className="label">Position M</span>
                  <span className="value font-mono">
                    [{testPoint[0].toFixed(2)}, {testPoint[1].toFixed(2)}, {testPoint[2].toFixed(2)}]
                  </span>
                </div>
                <div className="coord-inputs" onClick={(e) => e.stopPropagation()}>
                  <CoordInput label="X" value={testPoint[0]} onChange={(v) => handleMCoordinateChange(0, v)} />
                  <CoordInput label="Y" value={testPoint[1]} onChange={(v) => handleMCoordinateChange(1, v)} />
                  <CoordInput label="Z" value={testPoint[2]} onChange={(v) => handleMCoordinateChange(2, v)} />
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="Champ Élect & Potentiel en M">
              <FieldAndPotential testPoint={testPoint} />
            </CollapsibleSection>

            <CollapsibleSection title="Forces & Graphiques">
              <div className="flex-col gap-3" style={{ padding: '0.3rem 0' }}>
                <label className="toggle-row" style={distributions.length > 0 ? { opacity: 0.4, pointerEvents: 'none' } : {}}>
                  <input type="checkbox" checked={showForces} disabled={distributions.length > 0} onChange={(e) => setShowForces(e.target.checked)} />
                  <span>Afficher les forces de Coulomb</span>
                </label>
                <label className="toggle-row">
                  <input type="checkbox" checked={showFieldLines} onChange={(e) => setShowFieldLines(e.target.checked)} />
                  <span>Afficher les lignes de champ</span>
                </label>
                <label className="toggle-row">
                  <input type="checkbox" checked={showFieldGraph} onChange={(e) => {
                    setShowFieldGraph(e.target.checked)
                    if (e.target.checked) bringToFront('fieldGraph')
                  }} />
                  <span>Afficher le graphique E(x)</span>
                </label>
                <label className="toggle-row">
                  <input type="checkbox" checked={showPotentialXGraph} onChange={(e) => {
                    setShowPotentialXGraph(e.target.checked)
                    if (e.target.checked) bringToFront('potentialGraph')
                  }} />
                  <span>Afficher le graphique V(x)</span>
                </label>
                <label className="toggle-row" style={distributions.length > 0 ? { opacity: 0.4, pointerEvents: 'none' } : {}}>
                  <input type="checkbox" checked={showIndividualFields} disabled={distributions.length > 0} onChange={(e) => setShowIndividualFields(e.target.checked)} />
                  <span>Superposition des champs E<sub>i</sub></span>
                </label>
              </div>
              <CoulombForces />
            </CollapsibleSection>
          </div>
        )}

        {activeTab === 'pedagogy' && (
          <div className="tab-panel">
            <CollapsibleSection title="Théorème de Gauss">
              {(() => {
                const GAUSS_COMPATIBLE = ['sphere', 'cylinder', 'line', 'plane']
                const hasCompatible = distributions.some(d => GAUSS_COMPATIBLE.includes(d.type))

                return hasCompatible ? (
                  <button className={`gauss-toggle ${showGaussCompanion ? 'active' : 'inactive'}`}
                    onClick={() => setShowGaussCompanion(!showGaussCompanion)}
                  >
                    <span aria-hidden="true">{showGaussCompanion ? '❌' : '📖'}</span>
                    {showGaussCompanion ? 'Masquer le compagnon' : 'Lancer le compagnon'}
                  </button>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <button className="gauss-toggle inactive" disabled style={{ opacity: 0.45, cursor: 'not-allowed' }}>
                      <span aria-hidden="true">🔒</span> Compagnon indisponible
                    </button>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0, lineHeight: '1.4' }}>
                      ⚠️ Le Théorème de Gauss nécessite une <strong>distribution continue avec symétrie</strong> (sphère, cylindre, fil infini ou plan infini).
                    </p>
                  </div>
                )
              })()}
            </CollapsibleSection>

            <CollapsibleSection title="Formules Électrostatique" defaultOpen={false}>
              {(() => {
                const FORMULAS = {
                  charge: {
                    label: 'Charge ponctuelle',
                    content: (
                      <div className="formula-content">
                        <p><strong>Champ électrique :</strong></p>
                        <BlockMath math="E = k\,\frac{|q|}{r^2}" />
                        <p><strong>Potentiel électrique :</strong></p>
                        <BlockMath math="V = k\,\frac{q}{r}" />
                        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          <InlineMath math="k = 8.99\times10^{9}\ \mathrm{N{\cdot}m^{2}{\cdot}C^{-2}}" /> — Constante de Coulomb
                        </p>
                      </div>
                    ),
                  },
                  line: {
                    label: 'Fil infini (ligne)',
                    content: (
                      <div className="formula-content">
                        <p><strong>Champ électrique :</strong></p>
                        <BlockMath math="E = \frac{\lambda}{2\pi\varepsilon_0\,r}" />
                        <p><strong>Potentiel :</strong></p>
                        <BlockMath math="V(r) = \frac{\lambda}{2\pi\varepsilon_0}\,\ln\!\left(\frac{r_0}{r}\right)" />
                        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          <InlineMath math="\lambda" /> — densité linéique (C/m), <InlineMath math="r" /> — distance au fil
                        </p>
                      </div>
                    ),
                  },
                  plane: {
                    label: 'Plan infini',
                    content: (
                      <div className="formula-content">
                        <p><strong>Champ électrique :</strong></p>
                        <BlockMath math="E = \frac{\sigma}{2\varepsilon_0}" />
                        <p><strong>(indépendant de la distance)</strong></p>
                        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          <InlineMath math="\sigma" /> — densité surfacique (C/m²)
                        </p>
                      </div>
                    ),
                  },
                  ring: {
                    label: 'Anneau (cercle) — axe',
                    content: (
                      <div className="formula-content">
                        <p><strong>Champ électrique sur l\'axe :</strong></p>
                        <BlockMath math="E = k\,\frac{Q\,z}{(z^2 + R^2)^{3/2}}" />
                        <p><strong>Potentiel sur l\'axe :</strong></p>
                        <BlockMath math="V = \frac{k\,Q}{\sqrt{z^2 + R^2}}" />
                        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          <InlineMath math="R" /> — rayon, <InlineMath math="z" /> — distance au centre sur l&apos;axe
                        </p>
                      </div>
                    ),
                  },
                  sphere_hollow: {
                    label: 'Sphère creuse',
                    content: (
                      <div className="formula-content">
                        <p><strong>À l\'intérieur (<InlineMath math="r &lt; R" />) :</strong></p>
                        <BlockMath math="E = 0 \qquad V = \frac{k\,Q}{R}" />
                        <p><strong>À l\'extérieur (<InlineMath math="r \ge R" />) :</strong></p>
                        <BlockMath math="E = \frac{k\,Q}{r^2} \qquad V = \frac{k\,Q}{r}" />
                        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          Comme une charge ponctuelle <InlineMath math="Q" /> au centre
                        </p>
                      </div>
                    ),
                  },
                  sphere_solid: {
                    label: 'Sphère pleine',
                    content: (
                      <div className="formula-content">
                        <p><strong>À l\'intérieur (<InlineMath math="r &lt; R" />) :</strong></p>
                        <BlockMath math="E = \frac{k\,Q\,r}{R^3}" />
                        <BlockMath math="V = \frac{k\,Q}{2R}\left(3 - \frac{r^2}{R^2}\right)" />
                        <p><strong>À l\'extérieur (<InlineMath math="r \ge R" />) :</strong></p>
                        <BlockMath math="E = \frac{k\,Q}{r^2} \qquad V = \frac{k\,Q}{r}" />
                        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          <InlineMath math="\rho = \frac{3Q}{4\pi R^3}" /> — densité volumique uniforme
                        </p>
                      </div>
                    ),
                  },
                  disk: {
                    label: 'Disque — axe',
                    content: (
                      <div className="formula-content">
                        <p><strong>Champ électrique sur l\'axe :</strong></p>
                        <BlockMath math="E = \frac{\sigma}{2\varepsilon_0}\left[1 - \frac{z}{\sqrt{z^2 + R^2}}\right]" />
                        <p><strong>Potentiel sur l\'axe :</strong></p>
                        <BlockMath math="V = \frac{\sigma}{2\varepsilon_0}\left[\sqrt{z^2 + R^2} - z\right]" />
                        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          <InlineMath math="\sigma" /> — densité surfacique, <InlineMath math="z" /> — distance sur l&apos;axe
                        </p>
                      </div>
                    ),
                  },
                  cylinder: {
                    label: 'Cylindre infini',
                    content: (
                      <div className="formula-content">
                        <p><strong>À l\'extérieur (<InlineMath math="r \ge R" />) :</strong></p>
                        <BlockMath math="E = \frac{\lambda}{2\pi\varepsilon_0\,r}" />
                        <p><strong>À l\'intérieur (<InlineMath math="r &lt; R" />, plein uniforme) :</strong></p>
                        <BlockMath math="E = \frac{\rho\,r}{2\varepsilon_0}" />
                        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          <InlineMath math="\lambda" /> — densité linéique, <InlineMath math="\rho" /> — densité volumique
                        </p>
                      </div>
                    ),
                  },
                  dipole: {
                    label: 'Dipôle électrique (lointain)',
                    content: (
                      <div className="formula-content">
                        <p><strong>Champ sur l\'axe (<InlineMath math="r \gg d" />) :</strong></p>
                        <BlockMath math="E = \frac{2k\,p}{r^3}" />
                        <p><strong>Champ transverse (<InlineMath math="r \gg d" />) :</strong></p>
                        <BlockMath math="E = \frac{k\,p}{r^3}" />
                        <p><strong>Potentiel :</strong></p>
                        <BlockMath math="V = \frac{k\,p\cos\theta}{r^2}" />
                        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          <InlineMath math="p = q\cdot d" /> — moment dipolaire
                        </p>
                      </div>
                    ),
                  },
                }
                return (
                  <div style={{ padding: '0.5rem 0' }}>
                    <CustomSelect value={formula} options={Object.entries(FORMULAS).map(([k, f]) => ({ key: k, label: f.label }))} onChange={setFormula} className="formula-select" triggerStyle={{ width: '100%', padding: '0.4rem', borderRadius: '6px', fontSize: '0.85rem' }} />
                    <div style={{ marginTop: '0.75rem', padding: '0.5rem', background: 'var(--bg-secondary)', borderRadius: '6px', lineHeight: '1.6' }}>
                      {FORMULAS[formula].content}
                    </div>
                  </div>
                )
              })()}
            </CollapsibleSection>

            <CollapsibleSection title="Équations de Maxwell" defaultOpen={false}>
              <div className="formula-content" style={{ padding: '0.5rem 0' }}>
                <p style={{ fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.3rem' }}>Forme différentielle</p>
                <BlockMath math="\vec{\nabla}\cdot\vec{E} = \frac{\rho}{\varepsilon_0}" />
                <BlockMath math="\vec{\nabla}\cdot\vec{B} = 0" />
                <BlockMath math="\vec{\nabla}\times\vec{E} = -\frac{\partial\vec{B}}{\partial t}" />
                <BlockMath math="\vec{\nabla}\times\vec{B} = \mu_0\!\left(\vec{J} + \varepsilon_0\frac{\partial\vec{E}}{\partial t}\right)" />

                <p style={{ fontSize: '0.78rem', fontWeight: 600, marginTop: '0.8rem', marginBottom: '0.3rem' }}>Forme intégrale</p>
                <BlockMath math="\oint_{\Sigma}\vec{E}\cdot d\vec{S} = \frac{Q_{\text{int}}}{\varepsilon_0}" />
                <BlockMath math="\oint_{\Sigma}\vec{B}\cdot d\vec{S} = 0" />
                <BlockMath math="\oint_{\Gamma}\vec{E}\cdot d\vec{l} = -\frac{d}{dt}\iint_{\Sigma}\vec{B}\cdot d\vec{S}" />
                <BlockMath math="\oint_{\Gamma}\vec{B}\cdot d\vec{l} = \mu_0\!\left(I + \varepsilon_0\frac{d}{dt}\iint_{\Sigma}\vec{E}\cdot d\vec{S}\right)" />

                <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.5rem', lineHeight: '1.4' }}>
                  <InlineMath math="\vec{E}" /> — champ électrique, <InlineMath math="\vec{B}" /> — champ magnétique,<br />
                  <InlineMath math="\rho" /> — densité de charge, <InlineMath math="\vec{J}" /> — densité de courant,<br />
                  <InlineMath math="\varepsilon_0" /> — permittivité du vide, <InlineMath math="\mu_0" /> — perméabilité du vide
                </p>
              </div>
            </CollapsibleSection>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="tab-panel">
            <CollapsibleSection title="Affichage & Thème">
              <div className="flex-col gap-4" style={{ padding: '0.8rem 1rem' }}>
                <div className="flex-row:sb">
                  <span className="label">Thème</span>
                  <button onClick={toggleTheme} className="theme-toggle-btn-sm" aria-label="Changer le thème (clair/sombre)">
                    {theme === 'dark' ? '☀️ Clair' : '🌙 Sombre'}
                  </button>
                </div>
                <div className="flex-row:sb">
                  <span className="label">Mode Caméra</span>
                  <button onClick={() => setCameraMode(cameraMode === 'perspective' ? 'orthographic' : 'perspective')} className="theme-toggle-btn-sm">
                    {cameraMode === 'perspective' ? '🎥 Perspective' : '📐 Orthographique'}
                  </button>
                </div>
                <div className="flex-col gap-2 mt-2">
                  <span className="label">Vues rapides</span>
                  <div className="flex-row gap-2">
                    {[
                      { id: 'isometric', label: 'Iso' },
                      { id: 'top', label: 'Haut' },
                      { id: 'front', label: 'Face' },
                      { id: 'side', label: 'Côté' },
                    ].map((v) => (
                      <button key={v.id} className={`btn btn-small ${activeView === v.id ? 'active' : ''}`}
                        onClick={() => setActiveView(v.id)}
                      >
                        {v.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="Constantes & Unités">
              <div className="flex-col gap-3" style={{ padding: '0.8rem 1rem' }}>
                <span className="label" style={{ display: 'block', marginBottom: '0.2rem' }}>Unité de Charge</span>
                <div className="flex-row gap-3" style={{ flexWrap: 'wrap' }}>
                  {[
                    { value: 'uC', label: 'µC', title: 'Microcoulomb (10⁻⁶ C)' },
                    { value: 'nC', label: 'nC', title: 'Nanocoulomb (10⁻⁹ C)' },
                    { value: 'C', label: 'C', title: 'Coulomb' },
                    { value: 'e', label: 'e⁻', title: 'Charge élémentaire' }
                  ].map((unit) => (
                    <button key={unit.value} className={`btn-unit ${chargeUnit === unit.value ? 'active' : ''}`}
                      onClick={() => setChargeUnit(unit.value)} title={unit.title}
                    >
                      {unit.label}
                    </button>
                  ))}
                </div>

                <div className="flex-col gap-2 mt-3">
                  <div className="flex-row:sb">
                    <span className="label">Échelle des flèches</span>
                    <span className="value font-mono">{vectorScale.toFixed(1)}x</span>
                  </div>
                  <input type="range" min="0.1" max="10.0" step="0.1" value={vectorScale}
                    onChange={(e) => setVectorScale(parseFloat(e.target.value))} className="slider" />
                </div>

                <div className="flex-col gap-2">
                  <div className="flex-row:sb">
                    <span className="label">Lignes de champ / charge</span>
                    <span className="value font-mono">{fieldLinesPerCharge}</span>
                  </div>
                  <input type="range" min="4" max="32" step="2" value={fieldLinesPerCharge}
                    onChange={(e) => setFieldLinesPerCharge(parseInt(e.target.value, 10))} className="slider" />
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="Grille & Alignement" defaultOpen={false}>
              <div className="flex-col gap-3" style={{ padding: '0.8rem 1rem' }}>
                <div className="flex-row:sb">
                  <span className="label">Magnétisme (Snap)</span>
                  <label className="switch-sm">
                    <input type="checkbox" checked={snapEnabled}
                      onChange={(e) => setSnapEnabled(e.target.checked)} />
                    <span className="switch-slider-sm" />
                  </label>
                </div>
                <div className="flex-row:sb">
                  <span className="label">Pas de grille</span>
                  <CustomSelect value={snapSize} options={[{key:0.1,label:'0.1 m'},{key:0.25,label:'0.25 m'},{key:0.5,label:'0.5 m'},{key:1.0,label:'1.0 m'}]} onChange={setSnapSize} className="formula-select" triggerStyle={{ width:'80px', padding:'0.2rem' }} />
                </div>
              </div>
            </CollapsibleSection>
          </div>
        )}
      </div>
    </aside>
  )
}
