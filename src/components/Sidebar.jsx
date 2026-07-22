import { useState, useMemo, memo } from 'react'
import { useStore, DIST_PARAMS } from '../store/useStore'
import { formatElectricField, formatPotential, formatForce } from '../physics/coulomb'

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

  const { E, V, ENorm } = useMemo(() => {
    const E = useStore.getState().getElectricField(testPoint)
    const V = useStore.getState().getPotential(testPoint)
    return { E, V, ENorm: E.length() }
  }, [charges, distributions, chargeUnit, testPoint])

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

  if (distributions.length > 0 || !showForces || charges.length < 2) return null

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
  const removeCharge = useStore((s) => s.removeCharge)
  const updateChargeQ = useStore((s) => s.updateChargeQ)
  const updateChargePosition = useStore((s) => s.updateChargePosition)
  const toggleFreeCharge = useStore((s) => s.toggleFreeCharge)
  const resetChargePositions = useStore((s) => s.resetChargePositions)
  const addCharge = useStore((s) => s.addCharge)
  const loadPreset = useStore((s) => s.loadPreset)

  if (distributions.length > 0) return null

  const handleChargeCoordinateChange = (id, position, axis, val) => {
    const newPos = [...position]
    newPos[axis] = val
    updateChargePosition(id, newPos)
  }

  return (
    <>
    <CollapsibleSection title="Charges locales"
      headerExtra={
        charges.length > 0 && (
          <button className="btn-text" onClick={(e) => { e.stopPropagation(); clearCharges() }}>
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
        <select className="preset-select" defaultValue=""
          onChange={(e) => { if (e.target.value) loadPreset(e.target.value); e.target.value = '' }}
        >
          <option value="">Préréglages...</option>
          <option value="single">Charge unique</option>
          <option value="dipole">Dipôle (+ / -)</option>
          <option value="quadrupole">Quadrupôle</option>
          <option value="capacitor">Condensateur</option>
          <option value="cubicQuadrupole">Quadripôle cubique</option>
        </select>
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

/* ─── Main Sidebar ─── */

export function Sidebar() {
  // Stable action selectors (these never cause re-renders)
  const exportScene = useStore((s) => s.exportScene)
  const importScene = useStore((s) => s.importScene)
  const setSidebarOpen = useStore((s) => s.setSidebarOpen)

  // State that changes rarely
  const sidebarOpen = useStore((s) => s.sidebarOpen)
  const theme = useStore((s) => s.theme)
  const toggleTheme = useStore((s) => s.toggleTheme)
  const chargeUnit = useStore((s) => s.chargeUnit)
  const setChargeUnit = useStore((s) => s.setChargeUnit)
  const vectorScale = useStore((s) => s.vectorScale)
  const setVectorScale = useStore((s) => s.setVectorScale)
  const fieldLinesPerCharge = useStore((s) => s.fieldLinesPerCharge)
  const setFieldLinesPerCharge = useStore((s) => s.setFieldLinesPerCharge)
  const selectedObjectId = useStore((s) => s.selectedObjectId)
  const setSelectedObjectId = useStore((s) => s.setSelectedObjectId)
  const distributions = useStore((s) => s.distributions)
  const addDistribution = useStore((s) => s.addDistribution)
  const removeDistribution = useStore((s) => s.removeDistribution)
  const updateDistribution = useStore((s) => s.updateDistribution)
  const clearDistributions = useStore((s) => s.clearDistributions)
  const showGaussCompanion = useStore((s) => s.showGaussCompanion)
  const setShowGaussCompanion = useStore((s) => s.setShowGaussCompanion)

  // Only used in the FieldAndPotential memo sub-component (separate subscription)
  const testPoint = useStore((s) => s.testPoint)
  const updateTestPoint = useStore((s) => s.updateTestPoint)

  // Touch gesture state for swipe-to-close
  const [touchStart, setTouchStart] = useState(null)

  const handleTouchStart = (e) => {
    const touch = e.touches[0]
    setTouchStart({
      x: touch.clientX,
      y: touch.clientY,
    })
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

  const handleTouchEnd = () => {
    setTouchStart(null)
  }

  const handleMCoordinateChange = (axis, val) => {
    const newPos = [...testPoint]
    newPos[axis] = val
    updateTestPoint(newPos)
  }

  return (
    <aside
      className={`sidebar ${sidebarOpen ? '' : 'closed'}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="flex-row:sb brand-header">
        <div className="brand">
          <h2><img src="/icon-192.png" alt="" className="brand-icon" />ElectroSpace 3D</h2>
          {/* <p className="subtitle">Phase 1 : Bac à sable des charges</p> */}
        </div>
        <button
          onClick={toggleTheme}
          className="theme-toggle-btn"
          title={theme === 'dark' ? "Activer le mode clair" : "Activer le mode sombre"}
        >
          {theme === 'dark' ? (
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="5"></circle>
              <line x1="12" y1="1" x2="12" y2="3"></line>
              <line x1="12" y1="21" x2="12" y2="23"></line>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
              <line x1="1" y1="12" x2="3" y2="12"></line>
              <line x1="21" y1="12" x2="23" y2="12"></line>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
            </svg>
          ) : (
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>
          )}
        </button>
      </div>

      <CollapsibleSection title="Scènes" defaultOpen={true}>
        <div className="flex-row gap-2">
          <button className="btn-text scene-btn" onClick={exportScene}>
            <span aria-hidden="true">💾</span> Exporter
          </button>
          <label className="btn-text scene-btn" style={{ cursor: 'pointer' }}>
            <span aria-hidden="true">📂</span> Importer
            <input type="file" accept=".json" style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (!file) return
                const reader = new FileReader()
                reader.onload = (ev) => { importScene(ev.target.result); e.target.value = '' }
                reader.readAsText(file)
              }}
            />
          </label>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Configuration Physique">
        <div className="data-box" style={{ padding: '0.8rem 1rem' }}>
          <div className="flex-col gap-6">
            <div>
              <span className="label" style={{ display: 'block', marginBottom: '0.4rem' }}>Unité de Charge</span>
              <div className="flex-row gap-3">
                {[
                  { value: 'uC', label: 'µC', title: 'Microcoulomb (10⁻⁶ C)' },
                  { value: 'nC', label: 'nC', title: 'Nanocoulomb (10⁻⁹ C)' },
                  { value: 'C', label: 'C', title: 'Coulomb (1 C)' },
                  { value: 'e', label: 'e', title: 'Charge élémentaire (1.602 × 10⁻¹⁹ C - Électron/Proton)' }
                ].map((unit) => (
                  <button
                    key={unit.value}
                    className={`btn-unit ${chargeUnit === unit.value ? 'active' : ''}`}
                    onClick={() => setChargeUnit(unit.value)}
                    title={unit.title}
                  >
                    {unit.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-col gap-3">
              <div className="flex-row:sb">
                <span className="label">Échelle Visuelle Flèche</span>
                <span className="value font-mono">{vectorScale.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="10.0"
                step="0.1"
                value={vectorScale}
                onChange={(e) => setVectorScale(parseFloat(e.target.value))}
                className="slider"
              />
            </div>

            <div className="flex-col gap-3">
              <div className="flex-row:sb">
                <span className="label">Lignes de champ par charge</span>
                <span className="value font-mono">{fieldLinesPerCharge}</span>
              </div>
              <input
                type="range"
                min="4"
                max="32"
                step="2"
                value={fieldLinesPerCharge}
                onChange={(e) => setFieldLinesPerCharge(parseInt(e.target.value, 10))}
                className="slider"
              />
            </div>
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Point de Test M"
        headerExtra={
          <span
            className={`select-indicator ${selectedObjectId === 'testPoint' ? 'active' : ''}`}
            onClick={(e) => { e.stopPropagation(); setSelectedObjectId('testPoint') }}
          >
            {selectedObjectId === 'testPoint' ? '● Actif' : 'Sélectionner'}
          </span>
        }
      >
        <div
          className={`data-box clickable-box ${selectedObjectId === 'testPoint' ? 'box-selected' : ''}`}
          onClick={() => setSelectedObjectId('testPoint')}
        >
          <div className="data-row">
            <span className="label">Position M</span>
            <span className="value font-mono">
              [{testPoint[0].toFixed(2)}, {testPoint[1].toFixed(2)}, {testPoint[2].toFixed(2)}]
            </span>
          </div>

          <div className="coord-inputs" onClick={(e) => e.stopPropagation()}>
            <CoordInput
              label="X"
              value={testPoint[0]}
              onChange={(val) => handleMCoordinateChange(0, val)}
            />
            <CoordInput
              label="Y"
              value={testPoint[1]}
              onChange={(val) => handleMCoordinateChange(1, val)}
            />
            <CoordInput
              label="Z"
              value={testPoint[2]}
              onChange={(val) => handleMCoordinateChange(2, val)}
            />
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Champ Élect &amp; Potentiel EN M">
        <FieldAndPotential testPoint={testPoint} />
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
                {DIST_PARAMS[d.type]?.map((param) => {
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
                        <DistInput value={outerVal} onChange={(v) => updateDistribution(d.id, { [param.key]: v })}
                          className="dist-param-input" style={{ width: '3rem' }} />
                        {!hideInner && (
                          <>
                            <span className="label" style={{ fontSize: '0.6rem', whiteSpace: 'nowrap' }}>{param.innerLabel}</span>
                            <DistInput value={innerVal} onChange={(v) => updateDistribution(d.id, { [param.innerKey]: v })}
                              className="dist-param-input" style={{ width: '3rem' }} />
                          </>
                        )}
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
            <button className="btn-text accent" onClick={clearDistributions}>
              Tout effacer
            </button>
          </div>
        )}
      </CollapsibleSection>

      <CollapsibleSection title="Théorème de Gauss">
        {(() => {
          const GAUSS_COMPATIBLE = ['sphere', 'cylinder', 'line', 'plane']
          const hasCompatible = distributions.some(d => GAUSS_COMPATIBLE.includes(d.type))
          return hasCompatible ? (
            <button
              className={`gauss-toggle ${showGaussCompanion ? 'active' : 'inactive'}`}
              onClick={() => setShowGaussCompanion(!showGaussCompanion)}
            >
              <span aria-hidden="true">{showGaussCompanion ? '❌' : '📖'}</span> {showGaussCompanion ? 'Masquer le compagnon' : 'Lancer le compagnon'}
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button className="gauss-toggle inactive" disabled style={{ opacity: 0.45, cursor: 'not-allowed' }}>
                <span aria-hidden="true">🔒</span> Compagnon indisponible
              </button>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0, lineHeight: '1.4' }}>
                ⚠️ Le Théorème de Gauss nécessite une <strong>distribution continue avec symétrie</strong> (sphère, cylindre, fil infini ou plan infini). Ajoutez une telle distribution pour activer le compagnon.
              </p>
            </div>
          )
        })()}
      </CollapsibleSection>

      <div className="sidebar-footer">
        <div>© 2026 Michel ESPARSA</div>
        <div>{__GIT_VERSION__}</div>
      </div>
    </aside>
  )
}
