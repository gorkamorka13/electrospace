import { useState, useRef, useEffect } from 'react'
import * as THREE from 'three'
import { useStore } from '../store/useStore'
import { calculateGaussParameters } from '../physics/gauss'
import { formatElectricField } from '../physics/coulomb'

// Component to render 2D SVG schematics of Coordinate Basis Vectors (er, eteta, ephi/ez)
function BasisVectorDiagram({ basisType }) {
  if (basisType === 'spherical') {
    return (
      <div className="gw-basis-svg-card">
        <div className="basis-title">Repère Sphérique (O, e_r, e_θ, e_φ)</div>
        <svg viewBox="0 0 240 160" className="basis-svg">
          <defs>
            <marker id="arrow-red" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#ef4444" />
            </marker>
            <marker id="arrow-green" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#10b981" />
            </marker>
            <marker id="arrow-blue" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#3b82f6" />
            </marker>
          </defs>
          {/* Sphere circle */}
          <circle cx="100" cy="90" r="50" fill="rgba(59, 130, 246, 0.08)" stroke="rgba(59, 130, 246, 0.3)" strokeDasharray="3,3" strokeWidth="1.5" />
          {/* Center O */}
          <circle cx="100" cy="90" r="3" fill="#f59e0b" />
          <text x="90" y="94" fill="#f59e0b" fontSize="11" fontWeight="bold">O</text>
          
          {/* Position vector r to point M */}
          <line x1="100" y1="90" x2="155" y2="50" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="2,2" />
          <circle cx="155" cy="50" r="4" fill="#f59e0b" />
          <text x="162" y="46" fill="#f59e0b" fontSize="12" fontWeight="bold">M</text>

          {/* Basis vector e_r (Red) */}
          <line x1="155" y1="50" x2="195" y2="21" stroke="#ef4444" strokeWidth="2.5" markerEnd="url(#arrow-red)" />
          <text x="202" y="22" fill="#ef4444" fontSize="12" fontWeight="bold">e_r</text>

          {/* Basis vector e_θ (Green) */}
          <line x1="155" y1="50" x2="185" y2="90" stroke="#10b981" strokeWidth="2.5" markerEnd="url(#arrow-green)" />
          <text x="190" y="98" fill="#10b981" fontSize="12" fontWeight="bold">e_θ</text>

          {/* Basis vector e_φ (Blue) */}
          <line x1="155" y1="50" x2="125" y2="25" stroke="#3b82f6" strokeWidth="2.5" markerEnd="url(#arrow-blue)" />
          <text x="110" y="24" fill="#3b82f6" fontSize="12" fontWeight="bold">e_φ</text>
        </svg>
      </div>
    )
  }

  if (basisType === 'cylindrical') {
    return (
      <div className="gw-basis-svg-card">
        <div className="basis-title">Repère Cylindrique (O, e_r, e_θ, e_z)</div>
        <svg viewBox="0 0 240 160" className="basis-svg">
          <defs>
            <marker id="arrow-red-c" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#ef4444" />
            </marker>
            <marker id="arrow-green-c" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#10b981" />
            </marker>
            <marker id="arrow-blue-c" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#3b82f6" />
            </marker>
          </defs>
          {/* Axis z */}
          <line x1="100" y1="140" x2="100" y2="20" stroke="#64748b" strokeWidth="1.5" strokeDasharray="4,3" />
          <text x="90" y="24" fill="#64748b" fontSize="11" fontWeight="bold">Axis z</text>

          {/* Cylinder cross-section ellipse */}
          <ellipse cx="100" cy="90" rx="60" ry="22" fill="rgba(16, 185, 129, 0.08)" stroke="rgba(16, 185, 129, 0.3)" strokeWidth="1.5" strokeDasharray="3,3" />
          
          {/* Point M */}
          <circle cx="160" cy="90" r="4" fill="#f59e0b" />
          <text x="165" y="105" fill="#f59e0b" fontSize="12" fontWeight="bold">M</text>

          {/* Basis vector e_r (Radial - Red) */}
          <line x1="160" y1="90" x2="210" y2="90" stroke="#ef4444" strokeWidth="2.5" markerEnd="url(#arrow-red-c)" />
          <text x="215" y="94" fill="#ef4444" fontSize="12" fontWeight="bold">e_r</text>

          {/* Basis vector e_θ (Tangent - Green) */}
          <line x1="160" y1="90" x2="140" y2="120" stroke="#10b981" strokeWidth="2.5" markerEnd="url(#arrow-green-c)" />
          <text x="135" y="134" fill="#10b981" fontSize="12" fontWeight="bold">e_θ</text>

          {/* Basis vector e_z (Axial - Blue) */}
          <line x1="160" y1="90" x2="160" y2="45" stroke="#3b82f6" strokeWidth="2.5" markerEnd="url(#arrow-blue-c)" />
          <text x="165" y="42" fill="#3b82f6" fontSize="12" fontWeight="bold">e_z</text>
        </svg>
      </div>
    )
  }

  return (
    <div className="gw-basis-svg-card">
      <div className="basis-title">Repère Cartésien du Plan (O, e_x, e_y, e_z)</div>
      <svg viewBox="0 0 240 160" className="basis-svg">
        <defs>
          <marker id="arrow-red-p" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#ef4444" />
          </marker>
          <marker id="arrow-green-p" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#10b981" />
          </marker>
          <marker id="arrow-blue-p" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#3b82f6" />
          </marker>
        </defs>
        {/* Plane plane */}
        <polygon points="40,110 160,110 200,70 80,70" fill="rgba(192, 132, 252, 0.12)" stroke="#c084fc" strokeWidth="1.5" />
        <text x="100" y="95" fill="#c084fc" fontSize="11" fontWeight="bold">Plan Chargé (xy)</text>

        {/* Point M */}
        <circle cx="120" cy="70" r="4" fill="#f59e0b" />
        <text x="128" y="72" fill="#f59e0b" fontSize="12" fontWeight="bold">M</text>

        {/* Vector e_z (Normal - Red) */}
        <line x1="120" y1="70" x2="120" y2="20" stroke="#ef4444" strokeWidth="2.5" markerEnd="url(#arrow-red-p)" />
        <text x="126" y="22" fill="#ef4444" fontSize="12" fontWeight="bold">e_z (e_n)</text>

        {/* Vector e_x (Green) */}
        <line x1="120" y1="70" x2="175" y2="70" stroke="#10b981" strokeWidth="2.5" markerEnd="url(#arrow-green-p)" />
        <text x="180" y="74" fill="#10b981" fontSize="12" fontWeight="bold">e_x</text>

        {/* Vector e_y (Blue) */}
        <line x1="120" y1="70" x2="80" y2="100" stroke="#3b82f6" strokeWidth="2.5" markerEnd="url(#arrow-blue-p)" />
        <text x="65" y="112" fill="#3b82f6" fontSize="12" fontWeight="bold">e_y</text>
      </svg>
    </div>
  )
}

export function GaussWizard() {
  const showGaussCompanion = useStore((state) => state.showGaussCompanion)
  const setShowGaussCompanion = useStore((state) => state.setShowGaussCompanion)
  
  const gaussStep = useStore((state) => state.gaussStep)
  const setGaussStep = useStore((state) => state.setGaussStep)
  
  const gaussSurfaceType = useStore((state) => state.gaussSurfaceType)
  const setGaussSurfaceType = useStore((state) => state.setGaussSurfaceType)
  
  const gaussSurfaceRadius = useStore((state) => state.gaussSurfaceRadius)
  const setGaussSurfaceRadius = useStore((state) => state.setGaussSurfaceRadius)
  
  const gaussSurfaceHeight = useStore((state) => state.gaussSurfaceHeight)
  const setGaussSurfaceHeight = useStore((state) => state.setGaussSurfaceHeight)
  
  const gaussSurfaceWidth = useStore((state) => state.gaussSurfaceWidth)
  const setGaussSurfaceWidth = useStore((state) => state.setGaussSurfaceWidth)
  
  const gaussSurfaceDepth = useStore((state) => state.gaussSurfaceDepth)
  const setGaussSurfaceDepth = useStore((state) => state.setGaussSurfaceDepth)
  
  const testPoint = useStore((state) => state.testPoint)
  const gaussCenter = useStore((state) => state.gaussCenter)
  const distributions = useStore((state) => state.distributions)
  const charges = useStore((state) => state.charges)
  const theme = useStore((state) => state.theme)

  const [minimized, setMinimized] = useState(false)
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768)
  const [pos, setPos] = useState(() => ({ x: Math.min(400, Math.max(0, window.innerWidth - 480)), y: null }))
  const panelRef = useRef(null)
  const dragCleanupRef = useRef(null)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    const handler = (e) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => {
      mq.removeEventListener('change', handler)
      if (dragCleanupRef.current) {
        dragCleanupRef.current()
        dragCleanupRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('gwPos')
      if (saved) { try { setPos(JSON.parse(saved)) } catch {} }
    }
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem('gwPos', JSON.stringify(pos))
  }, [pos])

  const activeDist = distributions[0] || null
  const activeType = activeDist ? activeDist.type : 'charges'

  // Auto-adapt Gauss Surface type according to active distribution geometry
  useEffect(() => {
    if (!showGaussCompanion) return
    if (activeType === 'cylinder' || activeType === 'line') {
      setGaussSurfaceType('cylinder')
    } else if (activeType === 'plane') {
      setGaussSurfaceType('box')
    } else if (activeType === 'sphere') {
      setGaussSurfaceType('sphere')
    }
  }, [showGaussCompanion, activeType, setGaussSurfaceType])

  // Auto-sync Gauss surface dimensions so that the surface passes EXACTLY through Point M
  useEffect(() => {
    if (!showGaussCompanion) return
    if (!testPoint || !gaussCenter) return
    const mWorld = new THREE.Vector3(...testPoint)
    const cWorld = new THREE.Vector3(...gaussCenter)
    const relM = mWorld.clone().sub(cWorld)

    if (gaussSurfaceType === 'sphere') {
      const rM = Math.max(0.2, Math.min(8.0, relM.length()))
      setGaussSurfaceRadius(rM)
    } else if (gaussSurfaceType === 'cylinder') {
      const rM = Math.max(0.2, Math.min(8.0, Math.sqrt(relM.x * relM.x + relM.z * relM.z)))
      setGaussSurfaceRadius(rM)
    } else if (gaussSurfaceType === 'box') {
      const hM = Math.max(0.5, Math.min(8.0, 2 * Math.abs(relM.y)))
      setGaussSurfaceHeight(hM)
    }
  }, [showGaussCompanion, testPoint, gaussSurfaceType, gaussCenter, setGaussSurfaceRadius, setGaussSurfaceHeight])

  const handlePointerDown = (e) => {
    if (e.target.closest?.('button, .gw-minimize, .gw-close')) return
    e.preventDefault()
    const rect = panelRef.current?.getBoundingClientRect()
    if (!rect) return
    const offX = e.clientX - rect.left
    const offY = e.clientY - rect.top
    const mv = (ev) => {
      setPos({ x: ev.clientX - offX, y: ev.clientY - offY })
    }
    const up = () => {
      window.removeEventListener('pointermove', mv)
      window.removeEventListener('pointerup', up)
      dragCleanupRef.current = null
    }
    window.addEventListener('pointermove', mv)
    window.addEventListener('pointerup', up)
    dragCleanupRef.current = () => {
      window.removeEventListener('pointermove', mv)
      window.removeEventListener('pointerup', up)
    }
  }

  if (!showGaussCompanion) return null

  // Dynamic parameters & pedagogical metadata
  const storeState = useStore.getState()
  const { 
    qInt, flux, area, eField, configName, R, hollow, r_g, h_g, w_g, sigma, lambda, Q,
    symmetryDetails, invariances, surfaceAnalysis, gaussStep4Detail, gaussStep5Detail
  } = calculateGaussParameters(storeState)

  const getSymmetryRequirements = () => {
    if (activeType === 'sphere') return { symmetry: 'sphérique', surface: 'sphere', text: 'Symétrie Sphérique (O)' }
    if (activeType === 'cylinder' || activeType === 'line') return { symmetry: 'cylindrique', surface: 'cylinder', text: 'Symétrie Axiale (Cylindrique)' }
    if (activeType === 'plane') return { symmetry: 'plane', surface: 'box', text: 'Symétrie Plane Infinitésimale' }
    return { symmetry: 'aucune', surface: 'any', text: 'Symétrie complexe (Multiple charges)' }
  }

  const req = getSymmetryRequirements()

  const handleNext = () => {
    if (gaussStep < 5) setGaussStep(gaussStep + 1)
  }

  const handlePrev = () => {
    if (gaussStep > 1) setGaussStep(gaussStep - 1)
  }

  return (
    <div ref={panelRef} className={`gauss-wizard-panel ${minimized ? 'minimized' : ''}`} style={{ left: isMobile ? undefined : pos.x, top: pos.y ?? undefined, bottom: pos.y ? undefined : '1.5rem' }}>
      {/* Header */}
      <div className="gw-header" onPointerDown={handlePointerDown} style={{ cursor: 'grab' }}>
        <div className="gw-title-container">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="gw-icon">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10z" />
            <path d="M2 12h20" />
          </svg>
          <h3>Compagnon Théorème de Gauss</h3>
        </div>
        <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
          <button className="gw-minimize" onClick={() => setMinimized(!minimized)} title={minimized ? 'Agrandir' : 'Réduire'}>
            {minimized ? '□' : '−'}
          </button>
          <button className="gw-close" onClick={() => setShowGaussCompanion(false)} title="Fermer le compagnon">×</button>
        </div>
      </div>

      {!minimized && (
      <>
      {/* Pedagogical Step Indicator */}
      <div className="gw-steps">
        {[
          { step: 1, label: '1. Direction E' },
          { step: 2, label: '2. Invariances' },
          { step: 3, label: '3. Surface' },
          { step: 4, label: '4. Champ E' },
          { step: 5, label: '5. Potentiel V' }
        ].map(({ step, label }) => (
          <div key={step} className={`gw-step-item ${gaussStep === step ? 'active' : ''} ${gaussStep > step ? 'completed' : ''}`}>
            <div className="gw-step-circle">{step}</div>
            <span className="gw-step-label">{label}</span>
            {step < 5 && <div className="gw-step-line" />}
          </div>
        ))}
      </div>

      {/* Content Body */}
      <div className="gw-body">
        {/* STEP 1: DIRECTION DE E (SYMÉTRIES & ANTI-SYMÉTRIES) */}
        {gaussStep === 1 && (
          <div className="gw-step-content">
            <h4>Étape 1 : Direction de E (Symétries & Anti-symétries)</h4>
            <p>
              Pour déterminer la <strong>direction</strong> du champ électrique <span className="math-label">E(M)</span>, nous analysons les plans de symétrie <span className="math-label">Π_S</span> et d'anti-symétrie <span className="math-label">Π_A</span>.
            </p>
            
            <div className="gw-rule-box">
              <div className="rule-item">
                <span className="badge-rule green">Plan de Symétrie (Π_S)</span>
                <span>Si la distribution est symétrique par rapport à Π_S, alors <strong>E(M) ∈ Π_S</strong>.</span>
              </div>
              <div className="rule-item">
                <span className="badge-rule red">Plan d'Anti-symétrie (Π_A)</span>
                <span>Si la distribution est anti-symétrique par rapport à Π_A, alors <strong>E(M) ⊥ Π_A</strong>.</span>
              </div>
            </div>

            <div className="gw-info-card">
              <h5>Analyse des plans pour : <span className="badge-dist">{activeDist ? activeDist.name : 'Charges ponctuelles'}</span></h5>
              <ul className="gw-planes-list">
                {symmetryDetails.planes.map((pText, idx) => (
                  <li key={idx}>🔹 {pText}</li>
                ))}
              </ul>
            </div>

            {/* Visualisation de la base locale 2D/SVG */}
            <BasisVectorDiagram basisType={symmetryDetails.basisType} />

            <div className="gw-success-alert">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="alert-icon-check">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span><strong>Direction déduite :</strong> {symmetryDetails.directionText}</span>
            </div>
          </div>
        )}

        {/* STEP 2: INVARIANCES & DÉPENDANCE DES COORDONNÉES */}
        {gaussStep === 2 && (
          <div className="gw-step-content">
            <h4>Étape 2 : Invariances & Dépendance des Coordonnées</h4>
            <p>
              Les <strong>isométries</strong> (translations et rotations) laissant la distribution invariante réduisent le nombre de variables dont dépend la norme du champ.
            </p>

            <div className="gw-info-card">
              <h5>Invariances identifiées :</h5>
              <ul className="gw-planes-list">
                {invariances.list.map((invText, idx) => (
                  <li key={idx}>🔹 {invText}</li>
                ))}
              </ul>
            </div>

            <div className="gw-success-alert">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="alert-icon-check">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span><strong>Déduction scalaire :</strong> {invariances.deduction}</span>
            </div>
          </div>
        )}

        {/* STEP 3: CHOIX DE LA SURFACE DE GAUSS */}
        {gaussStep === 3 && (
          <div className="gw-step-content">
            <h4>Étape 3 : Surface de Gauss & Produit Scalaire</h4>
            <p>
              Pour calculer le flux <span className="math-label">Φ = ∮ E · dS</span> facilement, on choisit une surface fermée s'appuyant sur la symétrie :
            </p>

            {/* Manual selector */}
            <div className="gw-surface-selector">
              <label>Choix de la géométrie de Gauss :</label>
              <div className="selector-options">
                {[
                  { id: 'sphere', label: 'Sphère' },
                  { id: 'cylinder', label: 'Cylindre' },
                  { id: 'box', label: 'Pavé / Boîte' }
                ].map((opt) => (
                  <button
                    key={opt.id}
                    className={`surface-btn ${gaussSurfaceType === opt.id ? 'active' : ''}`}
                    onClick={() => setGaussSurfaceType(opt.id)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Advisory Check */}
            {req.surface !== 'any' && (
              <div className={`gw-advisor-box ${gaussSurfaceType === req.surface ? 'good' : 'warn'}`}>
                {gaussSurfaceType === req.surface ? (
                  <span>✅ Surface optimale sélectionnée pour une distribution {req.symmetry}.</span>
                ) : (
                  <span>⚠️ Pour cette distribution, une surface de type <strong>{req.surface}</strong> simplifierait le calcul du flux !</span>
                )}
              </div>
            )}

            {/* Flux breakdown table */}
            <div className="gw-info-card">
              <h5>Décomposition du Flux Φ = ∮ E · dS :</h5>
              <div className="table-responsive">
                <table className="gw-dot-table">
                  <thead>
                    <tr>
                      <th>Face</th>
                      <th>Orientation (E · dS)</th>
                      <th>Champ E</th>
                      <th>Flux Φ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {surfaceAnalysis.fluxDecomposition.map((row, i) => (
                      <tr key={i}>
                        <td><strong>{row.face}</strong></td>
                        <td><span className="badge-rule green">{row.dotProduct}</span></td>
                        <td>{row.eConst}</td>
                        <td className="highlight-gold">{row.fluxTerm}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Sliders to resize surface */}
            <div className="gw-sliders-card">
              <h5>Ajuster les dimensions de la surface :</h5>
              
              {gaussSurfaceType === 'sphere' && (
                <div className="slider-group">
                  <div className="slider-header">
                    <span>Rayon (r) :</span>
                    <span className="slider-val">{gaussSurfaceRadius.toFixed(2)} m</span>
                  </div>
                  <input 
                    type="range" min="0.2" max="6.0" step="0.05" 
                    value={gaussSurfaceRadius} 
                    onChange={(e) => setGaussSurfaceRadius(parseFloat(e.target.value))} 
                  />
                </div>
              )}

              {gaussSurfaceType === 'cylinder' && (
                <>
                  <div className="slider-group">
                    <div className="slider-header">
                      <span>Rayon (r) :</span>
                      <span className="slider-val">{gaussSurfaceRadius.toFixed(2)} m</span>
                    </div>
                    <input 
                      type="range" min="0.2" max="6.0" step="0.05" 
                      value={gaussSurfaceRadius} 
                      onChange={(e) => setGaussSurfaceRadius(parseFloat(e.target.value))} 
                    />
                  </div>
                  <div className="slider-group">
                    <div className="slider-header">
                      <span>Hauteur (h) :</span>
                      <span className="slider-val">{gaussSurfaceHeight.toFixed(2)} m</span>
                    </div>
                    <input 
                      type="range" min="0.5" max="8.0" step="0.1" 
                      value={gaussSurfaceHeight} 
                      onChange={(e) => setGaussSurfaceHeight(parseFloat(e.target.value))} 
                    />
                  </div>
                </>
              )}

              {gaussSurfaceType === 'box' && (
                <>
                  <div className="slider-group">
                    <div className="slider-header">
                      <span>Largeur (w) :</span>
                      <span className="slider-val">{gaussSurfaceWidth.toFixed(2)} m</span>
                    </div>
                    <input 
                      type="range" min="0.5" max="8.0" step="0.1" 
                      value={gaussSurfaceWidth} 
                      onChange={(e) => setGaussSurfaceWidth(parseFloat(e.target.value))} 
                    />
                  </div>
                  <div className="slider-group">
                    <div className="slider-header">
                      <span>Hauteur (h) :</span>
                      <span className="slider-val">{gaussSurfaceHeight.toFixed(2)} m</span>
                    </div>
                    <input 
                      type="range" min="0.5" max="8.0" step="0.1" 
                      value={gaussSurfaceHeight} 
                      onChange={(e) => setGaussSurfaceHeight(parseFloat(e.target.value))} 
                    />
                  </div>
                  <div className="slider-group">
                    <div className="slider-header">
                      <span>Profondeur (d) :</span>
                      <span className="slider-val">{gaussSurfaceDepth.toFixed(2)} m</span>
                    </div>
                    <input 
                      type="range" min="0.5" max="8.0" step="0.1" 
                      value={gaussSurfaceDepth} 
                      onChange={(e) => setGaussSurfaceDepth(parseFloat(e.target.value))} 
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* STEP 4: CALCUL INTÉGRAL DU FLUX & DÉDUCTION DU CHAMP E */}
        {gaussStep === 4 && (
          <div className="gw-step-content">
            <h4>Étape 4 : Calcul Intégral & Déduction de E</h4>
            <p>
              Le Théorème de Gauss relie l'intégrale de flux à la charge totale intérieure <span className="math-label">Q_int</span> :
            </p>

            <div className="gw-math-block-row">
              <div className="math-formula">
                <span>Φ = ∮ E · dS = E · A<sub>act</sub></span>
              </div>
              <span className="math-equal"> = </span>
              <div className="math-formula">
                <div className="math-frac">
                  <div className="num">Q<sub>int</sub></div>
                  <div className="den">ε<sub>0</sub></div>
                </div>
              </div>
            </div>

            <div className="gw-stats-card">
              <div className="stat-row">
                <span className="stat-label">Bilan Charge Enfermée (Q<sub>int</sub>) :</span>
                <span className="stat-val highlight-gold">{(qInt * 1e9).toFixed(3)} nC</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Aire Active de Gauss (A<sub>act</sub>) :</span>
                <span className="stat-val">{area.toFixed(3)} m²</span>
              </div>
              <div className="stat-row border-top">
                <span className="stat-label">Norme du Champ Électrique (E) :</span>
                <span className="stat-val highlight-green">{formatElectricField(eField)}</span>
              </div>
            </div>

            <div className="gw-derivation-box">
              <h5>Résolution analytique :</h5>
              <p className="formula-text">🔹 {gaussStep4Detail.qIntFormula}</p>
              <p className="formula-text">🔹 {gaussStep4Detail.eFieldFormula}</p>
            </div>

            <div className="gw-final-vector-card">
              <div className="vector-label">Champ Vectoriel Final E(M) :</div>
              <div className="vector-val">{gaussStep4Detail.vectorResult}</div>
            </div>

            <p className="note-text-center">
              💡 La région colorée en <strong>jaune or</strong> dans la vue 3D illustre précisément la charge <span className="math-label">Q_int</span> captée par votre surface de Gauss !
            </p>
          </div>
        )}

        {/* STEP 5: CALCUL ANALYTIQUE DU POTENTIEL V & CONTINUITÉS */}
        {gaussStep === 5 && gaussStep5Detail && (
          <div className="gw-step-content">
            <h4>Étape 5 : Calcul Analytique du Potentiel V(M) & Continuités</h4>
            <p>
              Le potentiel électrostatique <span className="math-label">V(M)</span> dérive du champ électrique par la relation locale <span className="math-label">E = -∇ V</span> :
            </p>

            <div className="gw-math-block-row">
              <div className="math-formula">
                <span>E(M) = -∇ V</span>
              </div>
              <span className="math-equal"> ⟹ </span>
              <div className="math-formula">
                <span>{gaussStep5Detail.relation}</span>
              </div>
            </div>

            <div className="gw-derivation-box">
              <h5>1. Intégration par sous-domaines et constantes :</h5>
              <p className="formula-text">🔹 <strong>Zone Extérieure :</strong> {gaussStep5Detail.extIntegration}</p>
              <p className="formula-text">🔹 <strong>Condition aux Limites :</strong> {gaussStep5Detail.extBoundary}</p>
              <p className="formula-text">🔹 <strong>Zone Intérieure :</strong> {gaussStep5Detail.intIntegration}</p>
            </div>

            <div className="gw-rule-box">
              <div className="rule-item">
                <span className="badge-rule green">Continuité du Potentiel V</span>
                <span>{gaussStep5Detail.continuity}</span>
              </div>
              <div className="rule-item">
                <span className="badge-rule gold">Constante d'intégration C_int</span>
                <span>{gaussStep5Detail.constantResolution}</span>
              </div>
            </div>

            <div className="gw-final-vector-card" style={{ borderColor: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)' }}>
              <div className="vector-label" style={{ color: '#f59e0b' }}>Expression Analytique & Valeur au Point M :</div>
              <div className="vector-val" style={{ color: '#fbbf24' }}>{gaussStep5Detail.finalFormula}</div>
              <div className="vector-val" style={{ fontSize: '1.2rem', color: '#10b981', marginTop: '0.4rem' }}>{gaussStep5Detail.finalValueStr}</div>
            </div>

            <p className="note-text-center">
              💡 Le potentiel <span className="math-label">V</span> est une fonction <strong>partout continue</strong> dans l'espace, même aux traversées de nappes de charge !
            </p>
          </div>
        )}
      </div>

      {/* Footer Navigation */}
      <div className="gw-footer">
        <button className="gw-nav-btn" onClick={handlePrev} disabled={gaussStep === 1}>
          ◀ Précédent
        </button>
        <div className="gw-step-text">Étape {gaussStep} sur 5</div>
        <button className="gw-nav-btn next-btn" onClick={handleNext} disabled={gaussStep === 5}>
          Suivant ▶
        </button>
      </div>
      </>
      )}
    </div>
  )
}
