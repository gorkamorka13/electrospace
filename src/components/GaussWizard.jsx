import { useState, useRef, useEffect } from 'react'
import { useStore } from '../store/useStore'
import { calculateGaussParameters } from '../physics/gauss'
import { formatElectricField } from '../physics/coulomb'

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

  // Calculate parameters for Gauss's Law dynamically
  const storeState = useStore.getState()
  const { qInt, flux, area, eField, configName, R, hollow, r_g, h_g, w_g, sigma, lambda, Q } = calculateGaussParameters(storeState)

  const activeDist = distributions[0] || null
  const activeType = activeDist ? activeDist.type : 'charges'

  // Validation checking for current step
  const getSymmetryRequirements = () => {
    if (activeType === 'sphere') return { symmetry: 'sphérique', surface: 'sphere', text: 'Symétrie Sphérique' }
    if (activeType === 'cylinder' || activeType === 'line') return { symmetry: 'cylindrique', surface: 'cylinder', text: 'Symétrie Cylindrique' }
    if (activeType === 'plane') return { symmetry: 'plane', surface: 'box', text: 'Symétrie Plane' }
    return { symmetry: 'aucune', surface: 'any', text: 'Symétrie complexe' }
  }

  const req = getSymmetryRequirements()

  const handleNext = () => {
    if (gaussStep < 4) setGaussStep(gaussStep + 1)
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
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            <path d="M2 12h20" />
          </svg>
          <h3>Théorème de Gauss</h3>
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
      {/* Step Indicator */}
      <div className="gw-steps">
        {[1, 2, 3, 4].map((step) => (
          <div key={step} className={`gw-step-item ${gaussStep === step ? 'active' : ''} ${gaussStep > step ? 'completed' : ''}`}>
            <div className="gw-step-circle">{step}</div>
            <span className="gw-step-label">
              {step === 1 && 'Symétrie'}
              {step === 2 && 'Surface'}
              {step === 3 && 'Flux'}
              {step === 4 && 'Champ E'}
            </span>
            {step < 4 && <div className="gw-step-line" />}
          </div>
        ))}
      </div>

      {/* Content Body */}
      <div className="gw-body">
        {gaussStep === 1 && (
          <div className="gw-step-content">
            <h4>Étape 1 : Analyse des symétries</h4>
            <p>
              Pour appliquer le théorème de Gauss, nous devons d'abord identifier les <strong>symétries</strong> de la distribution de charge.
            </p>
            
            <div className="gw-info-card">
              <h5>Distribution active :</h5>
              <div className="gw-dist-info">
                <span className="badge-dist">{activeDist ? activeDist.name : 'Charges ponctuelles'}</span>
                <p>
                  {activeType === 'sphere' && "Une sphère chargée présente une symétrie sphérique complète. Le champ électrique E ne dépend que de la distance r au centre et est purement radial."}
                  {activeType === 'cylinder' && "Un cylindre chargé de longueur infinie (ou très longue) possède une symétrie cylindrique. Le champ E est radial par rapport à l'axe du cylindre."}
                  {activeType === 'plane' && "Un plan chargé possède une symétrie plane. Le champ E est perpendiculaire au plan et uniforme de chaque côté."}
                  {activeType === 'charges' && "Les charges ponctuelles multiples créent un champ complexe sans symétrie globale évidente. Le théorème de Gauss est toujours vrai, mais difficile à utiliser analytiquement."}
                </p>
              </div>
            </div>

            <div className="gw-verification-box">
              {activeType !== 'charges' ? (
                <div className="gw-success-alert">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="alert-icon-check">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Symétrie identifiée : <strong>{req.text}</strong></span>
                </div>
              ) : (
                <div className="gw-warning-alert">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="alert-icon-warning">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>Ajoutez une distribution (sphère, cylindre, plan) pour une résolution analytique idéale.</span>
                </div>
              )}
            </div>
          </div>
        )}

        {gaussStep === 2 && (
          <div className="gw-step-content">
            <h4>Étape 2 : Choix de la surface de Gauss</h4>
            <p>
               Sélectionnez une surface de Gauss fermée imaginaire sur laquelle le champ électrique E est soit <strong>perpendiculaire</strong>, soit <strong>parallèle</strong> à la surface.
            </p>

            <div className="gw-surface-selector">
              <label>Type de surface :</label>
              <div className="surface-buttons">
                <button 
                  className={`surface-btn ${gaussSurfaceType === 'sphere' ? 'selected' : ''}`}
                  onClick={() => setGaussSurfaceType('sphere')}
                >
                  Sphère
                </button>
                <button 
                  className={`surface-btn ${gaussSurfaceType === 'cylinder' ? 'selected' : ''}`}
                  onClick={() => setGaussSurfaceType('cylinder')}
                >
                  Cylindre
                </button>
                <button 
                  className={`surface-btn ${gaussSurfaceType === 'box' ? 'selected' : ''}`}
                  onClick={() => setGaussSurfaceType('box')}
                >
                  Boîte
                </button>
              </div>
            </div>

            {/* Selection feedback */}
            <div className="gw-feedback-box">
              {gaussSurfaceType === req.surface ? (
                <div className="gw-success-alert">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="alert-icon-check">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span><strong>Excellent choix !</strong> Cette surface épouse parfaitement les symétries de la distribution.</span>
                </div>
              ) : (
                <div className="gw-hint-alert">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="alert-icon-hint">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <span>
                    {req.surface === 'sphere' && "Indice : Pour une sphère, une surface de Gauss sphérique garantit que le champ E est partout perpendiculaire et uniforme sur la surface."}
                    {req.surface === 'cylinder' && "Indice : Pour un cylindre, une surface de Gauss cylindrique permet au champ d'être perpendiculaire aux parois latérales et parallèle aux bases."}
                    {req.surface === 'box' && "Indice : Pour un plan, une boîte de Gauss (ou un cylindre perpendiculaire) est idéale car le champ n'a de flux qu'à travers les deux faces parallèles au plan."}
                  </span>
                </div>
              )}
            </div>

            {/* Sliders to resize surface */}
            <div className="gw-sliders-card">
              <h5>Ajuster la surface de Gauss :</h5>
              
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

        {gaussStep === 3 && (
          <div className="gw-step-content">
            <h4>Étape 3 : Calcul du Flux Électrique</h4>
            <p>
              Le flux du champ électrique à travers la surface fermée est donné par :
            </p>
            
            <div className="gw-math-block">
              <span className="math-label">Φ = ∮ E · dA = E · A</span>
            </div>

            <p>
              Puisque le champ électrique est uniforme et perpendiculaire à notre surface de Gauss choisie :
            </p>

            <div className="gw-formula-explanation">
              {gaussSurfaceType === 'sphere' && (
                <>
                  <div className="formula-line">
                    <span className="f-sym">A (Aire) = 4πr²</span>
                    <span className="f-val">= {area.toFixed(2)} m²</span>
                  </div>
                  <div className="formula-line">
                    <span className="f-sym">Φ (Flux) = E · 4πr²</span>
                    <span className="f-val">= E · ({area.toFixed(2)}) V·m</span>
                  </div>
                </>
              )}
              {gaussSurfaceType === 'cylinder' && (
                <>
                  <div className="formula-line">
                    <span className="f-sym">A (Latérale) = 2πr·h</span>
                    <span className="f-val">= {area.toFixed(2)} m²</span>
                  </div>
                  <div className="formula-line">
                    <span className="f-sym">Φ (Flux) = E · 2πr·h</span>
                    <span className="f-val">= E · ({area.toFixed(2)}) V·m</span>
                  </div>
                  <p className="note-text">
                     *Le flux à travers les bases supérieure et inférieure est nul car le champ E est parallèle à ces surfaces (E ⟂ dA).
                  </p>
                </>
              )}
              {gaussSurfaceType === 'box' && (
                <>
                  <div className="formula-line">
                    <span className="f-sym">A (2 faces active) = 2 · S</span>
                    <span className="f-val">= {area.toFixed(2)} m²</span>
                  </div>
                  <div className="formula-line">
                    <span className="f-sym">Φ (Flux) = E · (2 · S)</span>
                    <span className="f-val">= E · ({area.toFixed(2)}) V·m</span>
                  </div>
                  <p className="note-text">
                     *Le flux ne traverse que les 2 faces de la boîte parallèles au plan chargé. Le flux à travers les 4 autres faces est nul car E y est parallèle.
                  </p>
                </>
              )}
            </div>

            <div className="gw-interactive-reminder">
              <span className="sparkle">💡</span> 
              <span>Faites varier les dimensions à l'étape précédente pour voir l'aire évoluer en direct !</span>
            </div>
          </div>
        )}

        {gaussStep === 4 && (
          <div className="gw-step-content">
            <h4>Étape 4 : Charge Enfermée et Déduction de E</h4>
            <p>
              Le théorème de Gauss relie le flux à la <strong>charge totale contenue</strong> à l'intérieur de la surface :
            </p>

            <div className="gw-math-block-row">
              <div className="math-formula">
                <span>Φ = </span>
                <div className="math-frac">
                  <div className="num">Q<sub>int</sub></div>
                  <div className="den">ε<sub>0</sub></div>
                </div>
              </div>
              <span className="math-equal"> ⇒ </span>
              <div className="math-formula">
                <span>E = </span>
                <div className="math-frac">
                  <div className="num">Q<sub>int</sub></div>
                  <div className="den">ε<sub>0</sub> · A</div>
                </div>
              </div>
            </div>

            <div className="gw-stats-card">
              <div className="stat-row">
                <span className="stat-label">Charge enfermée (Q<sub>int</sub>) :</span>
                <span className="stat-val highlight-gold">{(qInt * 1e9).toFixed(3)} nC</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Aire active de Gauss (A) :</span>
                <span className="stat-val">{area.toFixed(3)} m²</span>
              </div>
              <div className="stat-row border-top">
                <span className="stat-label">Champ électrique théorique (E<sub>Gauss</sub>) :</span>
                <span className="stat-val highlight-green">{formatElectricField(eField)}</span>
              </div>
            </div>

            {configName === 'sphere' && (
              <div className="gw-derivation-box">
                <h5>Détail de la résolution (Sphère) :</h5>
                {hollow ? (
                  <p>
                    {r_g < R ? (
                      <span>Pour r &lt; R, aucune charge n'est enfermée (Q<sub>int</sub> = 0). Donc <strong>E = 0 V/m</strong>.</span>
                    ) : (
                      <span>Pour r {'>='} R, toute la charge Q est enfermée (Q<sub>int</sub> = <strong>{(+Q * 1e9).toFixed(2)} nC</strong>). Le champ est <strong>E = k<sub>e</sub> · Q / r²</strong>.</span>
                    )}
                  </p>
                ) : (
                  <p>
                    {r_g < R ? (
                      <span>Pour r &lt; R, seule une fraction de la charge est enfermée (Q<sub>int</sub> = Q · (r/R)³). Le champ croît linéairement : <strong>E = k<sub>e</sub> · Q · r / R³</strong>.</span>
                    ) : (
                      <span>Pour r {'>='} R, toute la charge Q est enfermée. Le champ décroît en 1/r² : <strong>E = k<sub>e</sub> · Q / r²</strong>.</span>
                    )}
                  </p>
                )}
              </div>
            )}

            {configName === 'cylinder' && (
              <div className="gw-derivation-box">
                <h5>Détail de la résolution (Cylindre) :</h5>
                {hollow ? (
                  <p>
                    {r_g < R ? (
                      <span>Pour r &lt; R, aucune charge n'est enfermée (Q<sub>int</sub> = 0). Donc <strong>E = 0 V/m</strong>.</span>
                    ) : (
                      <span>Pour r {'>='} R, la charge linéaire λ est enfermée. Le champ est <strong>E = 2·k<sub>e</sub>·λ / r</strong>.</span>
                    )}
                  </p>
                ) : (
                  <p>
                    {r_g < R ? (
                      <span>Pour r &lt; R, le champ croît linéairement avec le rayon : <strong>E = 2·k<sub>e</sub>·λ·r / R²</strong>.</span>
                    ) : (
                      <span>Pour r {'>='} R, le champ décroît en 1/r : <strong>E = 2·k<sub>e</sub>·λ / r</strong>.</span>
                    )}
                  </p>
                )}
              </div>
            )}

            {configName === 'plane' && (
              <div className="gw-derivation-box">
                <h5>Détail de la résolution (Plan) :</h5>
                <p>
                  Le flux traverse 2 faces d'aire S. La charge enfermée est Q<sub>int</sub> = σ · S. 
                  L'équation donne E · 2S = (σ · S) / ε₀, d'où : <strong>E = σ / (2·ε₀) = 2π·k<sub>e</sub>·σ</strong> (indépendant de la distance !).
                </p>
              </div>
            )}
            
            <p className="note-text-center">
              💡 Observez la partie colorée en <strong>jaune or</strong> dans la scène 3D : elle représente précisément la charge Q<sub>int</sub> captée par votre surface de Gauss !
            </p>
          </div>
        )}
      </div>

      {/* Footer Navigation */}
      <div className="gw-footer">
        <button className="gw-nav-btn" onClick={handlePrev} disabled={gaussStep === 1}>
          ◀ Précédent
        </button>
        <div className="gw-step-text">Étape {gaussStep} sur 4</div>
        <button className="gw-nav-btn next-btn" onClick={handleNext} disabled={gaussStep === 4}>
          Suivant ▶
        </button>
      </div>
      </>
      )}
    </div>
  )
}
