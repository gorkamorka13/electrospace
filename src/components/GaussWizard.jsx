import { useState, useRef, useEffect } from 'react'
import * as THREE from 'three'
import { useStore } from '../store/useStore'
import { calculateGaussParameters } from '../physics/gauss'
import { formatElectricField } from '../physics/coulomb'

// Rendu KaTeX natif (via window.katex du CDN dans index.html)
function renderKaTeX(math, displayMode = false) {
  if (typeof window !== 'undefined' && window.katex && typeof window.katex.renderToString === 'function') {
    try {
      return window.katex.renderToString(math, { displayMode, throwOnError: false })
    } catch {
      return math
    }
  }
  return math
}

function InlineMath({ math }) {
  const html = renderKaTeX(math, false)
  return <span dangerouslySetInnerHTML={{ __html: html }} />
}

function BlockMath({ math }) {
  const html = renderKaTeX(math, true)
  return <div className="gw-katex-block" dangerouslySetInnerHTML={{ __html: html }} />
}

// Composant pour mélanger du texte normal et des formules LaTeX entre $...$
function TextWithMath({ text }) {
  if (!text) return null
  const parts = text.split('$')
  return (
    <span>
      {parts.map((part, index) => {
        if (index % 2 === 1) {
          return <InlineMath key={index} math={part} />
        }
        return part
      })}
    </span>
  )
}

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
          <circle cx="100" cy="90" r="50" fill="rgba(59, 130, 246, 0.08)" stroke="rgba(59, 130, 246, 0.3)" strokeDasharray="3,3" strokeWidth="1.5" />
          <circle cx="100" cy="90" r="3" fill="#f59e0b" />
          <text x="90" y="94" fill="#f59e0b" fontSize="11" fontWeight="bold">O</text>
          
          <line x1="100" y1="90" x2="155" y2="50" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="2,2" />
          <circle cx="155" cy="50" r="4" fill="#f59e0b" />
          <text x="162" y="46" fill="#f59e0b" fontSize="12" fontWeight="bold">M</text>

          <line x1="155" y1="50" x2="195" y2="21" stroke="#ef4444" strokeWidth="2.5" markerEnd="url(#arrow-red)" />
          <text x="202" y="22" fill="#ef4444" fontSize="12" fontWeight="bold">e_r</text>

          <line x1="155" y1="50" x2="185" y2="90" stroke="#10b981" strokeWidth="2.5" markerEnd="url(#arrow-green)" />
          <text x="190" y="98" fill="#10b981" fontSize="12" fontWeight="bold">e_θ</text>

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
          <line x1="100" y1="140" x2="100" y2="20" stroke="#64748b" strokeWidth="1.5" strokeDasharray="4,3" />
          <text x="90" y="24" fill="#64748b" fontSize="11" fontWeight="bold">Axe z</text>

          <ellipse cx="100" cy="90" rx="60" ry="22" fill="rgba(16, 185, 129, 0.08)" stroke="rgba(16, 185, 129, 0.3)" strokeWidth="1.5" strokeDasharray="3,3" />
          
          <circle cx="160" cy="90" r="4" fill="#f59e0b" />
          <text x="165" y="105" fill="#f59e0b" fontSize="12" fontWeight="bold">M</text>

          <line x1="160" y1="90" x2="210" y2="90" stroke="#ef4444" strokeWidth="2.5" markerEnd="url(#arrow-red-c)" />
          <text x="215" y="94" fill="#ef4444" fontSize="12" fontWeight="bold">e_r</text>

          <line x1="160" y1="90" x2="140" y2="120" stroke="#10b981" strokeWidth="2.5" markerEnd="url(#arrow-green-c)" />
          <text x="135" y="134" fill="#10b981" fontSize="12" fontWeight="bold">e_θ</text>

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
        <polygon points="40,110 160,110 200,70 80,70" fill="rgba(59, 130, 246, 0.1)" stroke="rgba(59, 130, 246, 0.4)" strokeWidth="1.5" />
        
        <circle cx="120" cy="90" r="4" fill="#f59e0b" />
        <text x="110" y="105" fill="#f59e0b" fontSize="12" fontWeight="bold">M</text>

        <line x1="120" y1="90" x2="170" y2="90" stroke="#ef4444" strokeWidth="2.5" markerEnd="url(#arrow-red-p)" />
        <text x="175" y="94" fill="#ef4444" fontSize="12" fontWeight="bold">e_x</text>

        <line x1="120" y1="90" x2="150" y2="60" stroke="#10b981" strokeWidth="2.5" markerEnd="url(#arrow-green-p)" />
        <text x="155" y="58" fill="#10b981" fontSize="12" fontWeight="bold">e_y</text>

        <line x1="120" y1="90" x2="120" y2="35" stroke="#3b82f6" strokeWidth="2.5" markerEnd="url(#arrow-blue-p)" />
        <text x="125" y="32" fill="#3b82f6" fontSize="12" fontWeight="bold">e_z</text>
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
  
  const [minimized, setMinimized] = useState(false)
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768)
  const [pos, setPos] = useState(() => ({ x: Math.min(400, Math.max(0, window.innerWidth - 480)), y: null }))
  const [quizAnswers, setQuizAnswers] = useState({})
  const [quizFeedback, setQuizFeedback] = useState({})
  const [quizScore, setQuizScore] = useState({ correct: 0, total: 0 })
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

  const charges = useStore((state) => state.charges)
  const GAUSS_COMPATIBLE = ['sphere', 'cylinder', 'line', 'plane']
  const activeDist = distributions.find(d => GAUSS_COMPATIBLE.includes(d.type)) || null
  const activeType = activeDist ? activeDist.type : null
  const hasCompatibleDist = activeDist !== null

  // Auto-close companion only if there's no compatible distribution
  useEffect(() => {
    if (showGaussCompanion && !hasCompatibleDist) {
      setShowGaussCompanion(false)
    }
  }, [showGaussCompanion, hasCompatibleDist, setShowGaussCompanion])

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

  if (!showGaussCompanion || !hasCompatibleDist) return null

  const storeState = useStore.getState()
  const { 
    qInt, area, eField, 
    symmetryDetails, invariances, surfaceAnalysis, gaussStep4Detail, gaussStep5Detail
  } = calculateGaussParameters(storeState)

  const getSymmetryRequirements = () => {
    if (activeType === 'sphere') return { symmetry: 'sphérique', surface: 'sphere', text: 'Symétrie Sphérique (O)' }
    if (activeType === 'cylinder' || activeType === 'line') return { symmetry: 'cylindrique', surface: 'cylinder', text: 'Symétrie Axiale (Cylindrique)' }
    if (activeType === 'plane') return { symmetry: 'plane', surface: 'box', text: 'Symétrie Plane Infinitésimale' }
    return { symmetry: 'aucune', surface: 'any', text: 'Symétrie complexe (Multiple charges)' }
  }

  const req = getSymmetryRequirements()

  const handleNext = () => { if (gaussStep < 5) setGaussStep(gaussStep + 1) }
  const handlePrev = () => { if (gaussStep > 1) setGaussStep(gaussStep - 1) }

  // Quiz configuration per step
  const stepQuiz = (step) => {
    if (step === 1) {
      const radialLabel = symmetryDetails.basisType === 'cartesian' ? 'e_x (normale)' : 'e_r'
      const tan1Label = symmetryDetails.basisType === 'cartesian' ? 'e_y' : symmetryDetails.basisType === 'cylindrical' ? 'e_θ' : 'e_θ'
      const tan2Label = symmetryDetails.basisType === 'cartesian' ? 'e_z' : symmetryDetails.basisType === 'cylindrical' ? 'e_z' : 'e_φ'
      return {
        question: 'Quelle est la direction de $\\vec{E}(M)$ ?',
        options: [
          { value: 'radial', label: `$\\vec{e}_{${radialLabel.split('_')[1] || 'r'}}$ (${radialLabel})` },
          { value: 'tan1', label: `$\\vec{e}_{${tan1Label.split('_')[1] || 'θ'}}$ (${tan1Label})` },
          { value: 'tan2', label: `$\\vec{e}_{${tan2Label.split('_')[1] || 'φ'}}$ (${tan2Label})` },
        ],
        correct: 'radial',
        explanation: 'Par analyse des plans de symétrie, $\\vec{E}(M)$ est toujours radial (normal à la surface de Gauss).'
      }
    }
    if (step === 2) {
      return {
        question: 'La norme $E = |\\vec{E}(M)|$ dépend-elle de la position de $M$ ?',
        options: [
          { value: 'radial', label: 'Oui, uniquement de la coordonnée radiale $r$' },
          { value: 'constant', label: 'Non, elle est constante dans tout l\'espace' },
        ],
        correct: activeType === 'plane' ? 'constant' : 'radial',
        explanation: activeType === 'plane'
          ? 'Pour un plan infini, $E = \\sigma / (2\\varepsilon_0)$ est uniforme, indépendant de la distance au plan.'
          : 'Par invariance par rotation/translation, $E$ ne dépend que de la distance radiale $r$.'
      }
    }
    if (step === 3) {
      return {
        question: 'Quelle surface de Gauss est optimale pour cette distribution ?',
        options: [
          { value: 'sphere', label: 'Sphère' },
          { value: 'cylinder', label: 'Cylindre' },
          { value: 'box', label: 'Pavé / Boîte' },
        ],
        correct: req.surface,
        explanation: `La surface ${req.surface} exploite la symétrie ${req.symmetry} : $\\vec{E} \\parallel d\\vec{S}$ sur toute la surface active.`
      }
    }
    if (step === 4) {
      const correctVal = Math.round(qInt * 1e9 * 100) / 100
      return {
        question: 'Quelle est la valeur de $Q_{\\text{int}}$ en nC ?',
        type: 'number',
        correct: correctVal,
        tolerance: 0.05,
        explanation: `$Q_{\\text{int}} = ${correctVal.toFixed(2)} \\text{ nC}$ d'après le calcul avec les paramètres actuels.`
      }
    }
    if (step === 5) {
      return {
        question: 'Le potentiel $V(M)$ est-il une fonction continue dans tout l\'espace ?',
        options: [
          { value: 'yes', label: 'Oui, toujours' },
          { value: 'no', label: 'Non, il peut être discontinu' },
        ],
        correct: 'yes',
        explanation: 'Le potentiel $V$ est toujours continu (même si $\\vec{E}$ peut être discontinu à la traversée d\'une nappe de charge).'
      }
    }
    return null
  }

  const handleQuizCheck = (step) => {
    const quiz = stepQuiz(step)
    if (!quiz) return
    const userAnswer = quizAnswers[step]
    if (userAnswer === undefined || userAnswer === '') return

    let correct = false
    if (quiz.type === 'number') {
      const num = parseFloat(userAnswer)
      correct = !isNaN(num) && Math.abs(num - quiz.correct) <= quiz.tolerance
    } else {
      correct = userAnswer === quiz.correct
    }

    setQuizFeedback(prev => ({ ...prev, [step]: { checked: true, correct } }))
    if (!quizFeedback[step]?.checked) {
      setQuizScore(prev => ({ correct: prev.correct + (correct ? 1 : 0), total: prev.total + 1 }))
    }
  }

  const renderQuizSection = (step) => {
    const quiz = stepQuiz(step)
    if (!quiz) return null

    const feedback = quizFeedback[step]
    const userAnswer = quizAnswers[step]
    const isNumber = quiz.type === 'number'

    return (
      <div className="gw-quiz-section">
        <div className="gw-quiz-header">
          <span className="gw-quiz-icon">❓</span>
          <span className="gw-quiz-label">Auto-évaluation</span>
          <span className="gw-quiz-badge">Question</span>
        </div>
        <p className="gw-quiz-question">
          {(() => {
            const parts = quiz.question.split('$')
            return parts.map((part, i) =>
              i % 2 === 1 ? <InlineMath key={i} math={part} /> : part
            )
          })()}
        </p>
        {isNumber ? (
          <div className="gw-quiz-input-row">
            <input
              type="number"
              step="0.01"
              className="gw-quiz-input"
              placeholder="Saisir la valeur en nC..."
              value={userAnswer || ''}
              onChange={(e) => {
                setQuizAnswers(prev => ({ ...prev, [step]: e.target.value }))
                if (feedback?.checked) {
                  setQuizFeedback(prev => ({ ...prev, [step]: undefined }))
                }
              }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleQuizCheck(step) }}
              disabled={feedback?.checked}
            />
            <button className="gw-quiz-btn" onClick={() => handleQuizCheck(step)} disabled={feedback?.checked || !userAnswer && userAnswer !== 0}>
              Vérifier
            </button>
          </div>
        ) : (
          <div className="gw-quiz-options">
            {quiz.options.map(opt => (
              <button key={opt.value}
                className={`gw-quiz-option ${userAnswer === opt.value ? 'selected' : ''} ${feedback?.checked ? (opt.value === quiz.correct ? 'correct' : (userAnswer === opt.value ? 'wrong' : '')) : ''}`}
                onClick={() => {
                  if (feedback?.checked) return
                  setQuizAnswers(prev => ({ ...prev, [step]: opt.value }))
                }}
                disabled={feedback?.checked}
              >
                {(() => {
                  const parts = opt.label.split('$')
                  return parts.map((part, i) =>
                    i % 2 === 1 ? <InlineMath key={i} math={part} /> : part
                  )
                })()}
              </button>
            ))}
            {userAnswer && !feedback?.checked && (
              <button className="gw-quiz-btn" onClick={() => handleQuizCheck(step)}>Vérifier</button>
            )}
          </div>
        )}
        {feedback?.checked && (
          <div className={`gw-quiz-feedback ${feedback.correct ? 'correct' : 'wrong'}`}>
            <span className="gw-quiz-feedback-icon">{feedback.correct ? '✅' : '❌'}</span>
            <span>
              {feedback.correct ? 'Bonne réponse ! ' : 'Mauvaise réponse. '}
              <span className="gw-quiz-explain">
                {(() => {
                  const parts = quiz.explanation.split('$')
                  return parts.map((part, i) =>
                    i % 2 === 1 ? <InlineMath key={i} math={part} /> : part
                  )
                })()}
              </span>
            </span>
          </div>
        )}
      </div>
    )
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
          {quizScore.total > 0 && (
            <span className="gw-score-badge">
              {quizScore.correct}/{quizScore.total}
            </span>
          )}
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
      {/* Pedagogical Steps */}
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

      {/* Body */}
      <div className="gw-body">
        {/* STEP 1: DIRECTION DE E */}
        {gaussStep === 1 && (
          <div className="gw-step-content">
            <h4>Étape 1 : Direction de E (Symétries & Anti-symétries)</h4>
            <p>
              Pour déterminer la <strong>direction</strong> du champ électrique <InlineMath math="\vec{E}(M)" />, nous analysons les plans de symétrie <InlineMath math="\Pi_S" /> et d'anti-symétrie <InlineMath math="\Pi_A" />.
            </p>
            
            <div className="gw-rule-box">
              <div className="rule-item">
                <span className="badge-rule green">Plan de Symétrie (<InlineMath math="\Pi_S" />)</span>
                <span>Si la distribution est symétrique par rapport à <InlineMath math="\Pi_S" />, alors <strong><InlineMath math="\vec{E}(M) \in \Pi_S" /></strong>.</span>
              </div>
              <div className="rule-item">
                <span className="badge-rule red">Plan d'Anti-symétrie (<InlineMath math="\Pi_A" />)</span>
                <span>Si la distribution est anti-symétrique par rapport à <InlineMath math="\Pi_A" />, alors <strong><InlineMath math="\vec{E}(M) \perp \Pi_A" /></strong>.</span>
              </div>
            </div>

            <div className="gw-info-card">
              <h5>Analyse des plans pour : <span className="badge-dist">{activeDist ? activeDist.name : 'Charges ponctuelles'}</span></h5>
              <ul className="gw-planes-list">
                {symmetryDetails.planes.map((pText, idx) => (
                  <li key={idx}>🔹 <TextWithMath text={pText} /></li>
                ))}
              </ul>
            </div>

            <BasisVectorDiagram basisType={symmetryDetails.basisType} />

            <div className="gw-success-alert">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="alert-icon-check">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span><strong>Direction déduite :</strong> <TextWithMath text={symmetryDetails.directionText} /></span>
            </div>

            {renderQuizSection(1)}
          </div>
        )}

        {/* STEP 2: INVARIANCES */}
        {gaussStep === 2 && (
          <div className="gw-step-content">
            <h4>Étape 2 : Invariances & Dépendance des Coordonnées</h4>
            <p>Les <strong>isométries</strong> (translations et rotations) laissant la distribution invariante réduisent le nombre de variables dont dépend la norme du champ.</p>

            <div className="gw-info-card">
              <h5>Invariances identifiées :</h5>
              <ul className="gw-planes-list">
                {invariances.list.map((invText, idx) => (
                  <li key={idx}>🔹 <TextWithMath text={invText} /></li>
                ))}
              </ul>
            </div>

            <div className="gw-success-alert">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="alert-icon-check">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span><strong>Déduction scalaire :</strong> <TextWithMath text={invariances.deduction} /></span>
            </div>

            {renderQuizSection(2)}
          </div>
        )}

        {/* STEP 3: SURFACE DE GAUSS */}
        {gaussStep === 3 && (
          <div className="gw-step-content">
            <h4>Étape 3 : Surface de Gauss & Produit Scalaire</h4>
            <p>Pour calculer le flux <InlineMath math="\Phi = \oint_{\Sigma} \vec{E} \cdot d\vec{S}" /> facilement, on choisit une surface fermée s'appuyant sur la symétrie :</p>
            
            <div className="gw-surface-selector">
              <label>Choix de la géométrie de Gauss :</label>
              <div className="selector-options">
                {[
                  { id: 'sphere', label: 'Sphère' },
                  { id: 'cylinder', label: 'Cylindre' },
                  { id: 'box', label: 'Pavé / Boîte' }
                ].map((opt) => (
                  <button key={opt.id} className={`surface-btn ${gaussSurfaceType === opt.id ? 'active' : ''}`} onClick={() => setGaussSurfaceType(opt.id)}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {req.surface !== 'any' && (
              <div className={`gw-advisor-box ${gaussSurfaceType === req.surface ? 'good' : 'warn'}`}>
                {gaussSurfaceType === req.surface ? (
                  <span>✅ Surface optimale sélectionnée pour une distribution {req.symmetry}.</span>
                ) : (
                  <span>⚠️ Pour cette distribution, une surface de type <strong>{req.surface}</strong> simplifierait le calcul du flux !</span>
                )}
              </div>
            )}

            <div className="gw-info-card">
              <h5>Décomposition du Flux <InlineMath math="\Phi" /> :</h5>
              <div className="table-responsive">
                <table className="gw-dot-table">
                  <thead>
                    <tr>
                      <th>Face</th>
                      <th>Orientation (<InlineMath math="\vec{E} \cdot d\vec{S}" />)</th>
                      <th>Champ <InlineMath math="\vec{E}" /></th>
                      <th>Flux <InlineMath math="\Phi" /></th>
                    </tr>
                  </thead>
                  <tbody>
                    {surfaceAnalysis.fluxDecomposition.map((row, i) => (
                      <tr key={i}>
                        <td><strong><TextWithMath text={row.face} /></strong></td>
                        <td><span className="badge-rule green"><InlineMath math={row.dotProduct} /></span></td>
                        <td><TextWithMath text={row.eConst} /></td>
                        <td className="highlight-gold"><InlineMath math={row.fluxTerm} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {renderQuizSection(3)}
          </div>
        )}

        {/* STEP 4: CHAMP E */}
        {gaussStep === 4 && (
          <div className="gw-step-content">
            <h4>Étape 4 : Calcul Intégral & Déduction de E</h4>
            <p>Le Théorème de Gauss relie l'intégrale de flux à la charge totale intérieure <InlineMath math="Q_{\text{int}}" /> :</p>
            <BlockMath math="\Phi = \oint_{\Sigma} \vec{E} \cdot d\vec{S} = E \cdot A_{\text{active}} = \frac{Q_{\text{int}}}{\varepsilon_0}" />
            
            <div className="gw-stats-card">
              <div className="stat-row"><span className="stat-label">Bilan Charge Enfermée (<InlineMath math="Q_{\text{int}}" />) :</span><span className="stat-val highlight-gold">{(qInt * 1e9).toFixed(3)} nC</span></div>
              <div className="stat-row"><span className="stat-label">Aire Active de Gauss (<InlineMath math="A_{\text{active}}" />) :</span><span className="stat-val">{area.toFixed(3)} m²</span></div>
              <div className="stat-row border-top"><span className="stat-label">Norme du Champ Électrique (<InlineMath math="E" />) :</span><span className="stat-val highlight-green">{formatElectricField(eField)}</span></div>
            </div>
            
            <div className="gw-derivation-box">
              <h5>Résolution analytique :</h5>
              <p className="formula-text">🔹 <TextWithMath text={gaussStep4Detail.qIntFormula} /></p>
              <p className="formula-text">🔹 <TextWithMath text={gaussStep4Detail.eFieldFormula} /></p>
            </div>
            
            <div className="gw-final-vector-card" style={{ borderColor: '#10b981', background: 'rgba(16, 185, 129, 0.08)' }}>
              <div className="vector-label" style={{ color: '#10b981' }}>Expression Analytique &amp; Valeur au Point M (<InlineMath math="\vec{E}" />) :</div>
              <div className="vector-val" style={{ color: '#34d399', fontSize: '1.05rem', margin: '0.3rem 0' }}>
                <TextWithMath text={gaussStep4Detail.eFieldFormula} />
              </div>
              <div className="vector-val" style={{ fontSize: '1.15rem', color: '#fbbf24', marginTop: '0.3rem' }}>
                <InlineMath math={gaussStep4Detail.vectorResult} />
              </div>
            </div>

            <p className="note-text-center">
              💡 La région colorée en <strong>jaune or</strong> dans la vue 3D illustre précisément la charge <InlineMath math="Q_{\text{int}}" /> captée par votre surface de Gauss !
            </p>

            {renderQuizSection(4)}
          </div>
        )}

        {/* STEP 5: POTENTIEL V */}
        {gaussStep === 5 && gaussStep5Detail && (
          <div className="gw-step-content">
            <h4>Étape 5 : Calcul Analytique du Potentiel V(M) & Continuités</h4>
            <p>Le potentiel électrostatique <InlineMath math="V(M)" /> dérive du champ électrique par la relation locale :</p>
            <BlockMath math="\vec{E} = -\vec{\nabla}V \implies V(r) = -\int E(r)\,dr + C" />
            
            <div className="gw-derivation-box">
              <h5>1. Intégration par sous-domaines et constantes :</h5>
              <p className="formula-text">🔹 <strong>Zone Extérieure :</strong> <TextWithMath text={gaussStep5Detail.extIntegration} /></p>
              <p className="formula-text">🔹 <strong>Condition aux Limites :</strong> <TextWithMath text={gaussStep5Detail.extBoundary} /></p>
              <p className="formula-text">🔹 <strong>Zone Intérieure :</strong> <TextWithMath text={gaussStep5Detail.intIntegration} /></p>
            </div>

            <div className="gw-rule-box">
              <div className="rule-item">
                <span className="badge-rule green">Continuité du Potentiel <InlineMath math="V" /></span>
                <span><TextWithMath text={gaussStep5Detail.continuity} /></span>
              </div>
              <div className="rule-item">
                <span className="badge-rule gold">Constante d'intégration <InlineMath math="C_{\text{int}}" /></span>
                <span><TextWithMath text={gaussStep5Detail.constantResolution} /></span>
              </div>
            </div>

            <div className="gw-final-vector-card" style={{ borderColor: '#f59e0b', background: 'rgba(245, 158, 11, 0.08)' }}>
              <div className="vector-label" style={{ color: '#f59e0b' }}>Expression Analytique &amp; Valeur au Point M (<InlineMath math="V" />) :</div>
              <div className="vector-val" style={{ color: '#fbbf24', fontSize: '1.05rem', margin: '0.3rem 0' }}>
                <TextWithMath text={gaussStep5Detail.finalFormula.startsWith('$') ? gaussStep5Detail.finalFormula : `$${gaussStep5Detail.finalFormula}$`} />
              </div>
              <div className="vector-val" style={{ fontSize: '1.15rem', color: '#34d399', marginTop: '0.3rem' }}>
                <TextWithMath text={gaussStep5Detail.finalValueStr} />
              </div>
            </div>

            <p className="note-text-center">
              💡 Le potentiel <InlineMath math="V" /> est une fonction <strong>partout continue</strong> dans l'espace, même aux traversées de nappes de charge !
            </p>

            {renderQuizSection(5)}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="gw-footer">
        <button className="gw-nav-btn" onClick={handlePrev} disabled={gaussStep === 1}>◀ Précédent</button>
        <div className="gw-step-text">Étape {gaussStep} sur 5</div>
        <button className="gw-nav-btn next-btn" onClick={handleNext} disabled={gaussStep === 5}>Suivant ▶</button>
      </div>
      </>
      )}
    </div>
  )
}

export default GaussWizard
