/* global __GIT_VERSION__ */
import { useState, useRef, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Billboard, Text, PerspectiveCamera, OrthographicCamera } from '@react-three/drei'
import * as THREE from 'three'
import { useStore } from '../store/useStore'
import { ErrorBoundary } from './ErrorBoundary'
import { ChargeSphere } from './ChargeSphere'
import { TestPoint } from './TestPoint'
import { ElectricFieldArrow } from './ElectricFieldArrow'
import { ForceArrows } from './ForceArrows'
import { FieldLines } from './FieldLines'
import { ThroughMLine } from './ThroughMLine'
import { Equipotentials } from './Equipotentials'
import { Equipotentials3D } from './Equipotentials3D'
import { ChargeMotion } from './ChargeMotion'
import { DipoleMoment } from './DipoleMoment'
import { ChargeTrajectory } from './ChargeTrajectory'
import { DistributionRenderer } from './DistributionVis'
import { FieldGraph } from './FieldGraph'
import { PotentialXGraph } from './PotentialXGraph'
import { CustomSelect } from './CustomSelect'
import { GaussianSurfaceVis } from './GaussianSurfaceVis'
import { GaussWizard } from './GaussWizard'
import { IndividualFieldArrows } from './IndividualFieldArrows'

function CameraController({ animationTargetRef, controlsRef }) {
  const { camera } = useThree()

  useFrame(() => {
    if (animationTargetRef.current && controlsRef.current) {
      const { cameraPos, lookAt } = animationTargetRef.current
      const step = 0.08

      camera.position.lerp(cameraPos, step)
      controlsRef.current.target.lerp(lookAt, step)
      controlsRef.current.update()

      if (
        camera.position.distanceTo(cameraPos) < 0.005 &&
        controlsRef.current.target.distanceTo(lookAt) < 0.005
      ) {
        camera.position.copy(cameraPos)
        controlsRef.current.target.copy(lookAt)
        controlsRef.current.update()
        animationTargetRef.current = null
      }
    }
  })

  return null
}


export function PhysicsCanvas({ rootRef }) {
  const charges = useStore((state) => state.charges)
  const distributions = useStore((state) => state.distributions)
  const isDragging = useStore((state) => state.isDragging)
  const theme = useStore((state) => state.theme)

  const snapEnabled = useStore((state) => state.snapEnabled)
  const snapSize = useStore((state) => state.snapSize)
  const setSnapEnabled = useStore((state) => state.setSnapEnabled)
  const setSnapSize = useStore((state) => state.setSnapSize)
  const lockedAxes = useStore((state) => state.lockedAxes)
  const toggleLockedAxis = useStore((state) => state.toggleLockedAxis)
  const activeView = useStore((state) => state.activeView)
  const setActiveView = useStore((state) => state.setActiveView)
  const cameraMode = useStore((state) => state.cameraMode)
  const setCameraMode = useStore((state) => state.setCameraMode)
  const showFieldLines = useStore((state) => state.showFieldLines)
  const setShowFieldLines = useStore((state) => state.setShowFieldLines)
  const showThroughMLine = useStore((state) => state.showThroughMLine)
  const setShowThroughMLine = useStore((state) => state.setShowThroughMLine)
  const showEquipotentials = useStore((state) => state.showEquipotentials)
  const setShowEquipotentials = useStore((state) => state.setShowEquipotentials)
  const showEquipotentials3D = useStore((state) => state.showEquipotentials3D)
  const setShowEquipotentials3D = useStore((state) => state.setShowEquipotentials3D)
  const showDipoleMoment = useStore((state) => state.showDipoleMoment)
  const setShowDipoleMoment = useStore((state) => state.setShowDipoleMoment)
  const showTrajectoryTrails = useStore((state) => state.showTrajectoryTrails)
  const setShowTrajectoryTrails = useStore((state) => state.setShowTrajectoryTrails)
  const showPotentialXGraph = useStore((state) => state.showPotentialXGraph)
  const setShowPotentialXGraph = useStore((state) => state.setShowPotentialXGraph)
  const showFieldGraph = useStore((state) => state.showFieldGraph)
  const setShowFieldGraph = useStore((state) => state.setShowFieldGraph)
  const sidebarOpen = useStore((state) => state.sidebarOpen)

  const chargeUnit = useStore((state) => state.chargeUnit)
  const undo = useStore((state) => state.undo)
  const redo = useStore((state) => state.redo)
  const historyLen = useStore((state) => state.history.length)
  const futureLen = useStore((state) => state.future.length)

  const controlsRef = useRef()
  const animationTarget = useRef(null)
  const [toolbarOpen, setToolbarOpen] = useState(true)

  const handleSetView = (viewName) => {
    setActiveView(viewName)
    let cameraPos, lookAt

    if (viewName === 'top') {
      setCameraMode('orthographic')
      cameraPos = new THREE.Vector3(0.001, 15, 0)
      lookAt = new THREE.Vector3(0, 0.5, 0)
    } else if (viewName === 'front') {
      setCameraMode('orthographic')
      cameraPos = new THREE.Vector3(0, 0.5, 15)
      lookAt = new THREE.Vector3(0, 0.5, 0)
    } else if (viewName === 'side') {
      setCameraMode('orthographic')
      cameraPos = new THREE.Vector3(15, 0.5, 0)
      lookAt = new THREE.Vector3(0, 0.5, 0)
    } else if (viewName === 'isometric') {
      setCameraMode('perspective')
      cameraPos = new THREE.Vector3(1.7, 8, 12)
      lookAt = new THREE.Vector3(0, 0.5, 0)
    }

    animationTarget.current = { cameraPos, lookAt }
  }

  // Active view from sidebar — trigger camera animation when changed
  useEffect(() => {
    if (activeView) handleSetView(activeView)
  }, [activeView])

  return (
    <ErrorBoundary>
    <div className="canvas-inner">
      {/* Toolbar toggle + 3D Camera Switching Controls */}
      <div className={`camera-wrapper ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <button
          className="toolbar-toggle"
          onClick={() => setToolbarOpen(!toolbarOpen)}
          title={toolbarOpen ? 'Masquer la barre' : 'Afficher la barre'}
          aria-label={toolbarOpen ? 'Masquer la barre' : 'Afficher la barre'}
        >
          {toolbarOpen ? '◀' : '▶'}
        </button>
        {toolbarOpen && (
          <div className="camera-controls">
            <button
              className={`camera-btn ${activeView === 'top' ? 'active' : ''}`}
              onClick={() => handleSetView('top')}
               title="Vue de dessus (XY)" aria-label="Vue de dessus"
            >
              <svg viewBox="0 0 50 50">
                <polygon points="5,15 25,5 45,15 25,25" className="cube-face-active" />
                <polygon points="45,15 45,35 25,45 25,25" className="cube-face-inactive-2" />
                <polygon points="5,15 5,35 25,45 25,25" className="cube-face-inactive-1" />
              </svg>
            </button>
            <button
              className={`camera-btn ${activeView === 'front' ? 'active' : ''}`}
              onClick={() => handleSetView('front')}
              title="Vue de face (XZ)" aria-label="Vue de face"
            >
              <svg viewBox="0 0 50 50">
                <polygon points="5,15 25,5 45,15 25,25" className="cube-face-inactive-1" />
                <polygon points="45,15 45,35 25,45 25,25" className="cube-face-inactive-2" />
                <polygon points="5,15 5,35 25,45 25,25" className="cube-face-active" />
              </svg>
            </button>
            <button
              className={`camera-btn ${activeView === 'side' ? 'active' : ''}`}
              onClick={() => handleSetView('side')}
              title="Vue de côté (YZ)" aria-label="Vue de côté"
            >
              <svg viewBox="0 0 50 50">
                <polygon points="5,15 25,5 45,15 25,25" className="cube-face-inactive-1" />
                <polygon points="45,15 45,35 25,45 25,25" className="cube-face-active" />
                <polygon points="5,15 5,35 25,45 25,25" className="cube-face-inactive-2" />
              </svg>
            </button>
            <button
              className={`camera-btn ${activeView === 'isometric' ? 'active' : ''}`}
              onClick={() => handleSetView('isometric')}
              title="Réinitialiser la vue (Isométrique)" aria-label="Réinitialiser la vue"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '20px', height: '20px' }}>
                <path d="M21.5 2v6h-6" />
                <path d="M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
            </button>
            <div className="controls-divider"></div>
            <button
              className={`camera-btn ${snapEnabled ? 'active' : ''}`}
              onClick={() => setSnapEnabled(!snapEnabled)}
              title={snapEnabled ? "Désactiver l'aimant" : "Activer l'aimant"}
              aria-label={snapEnabled ? "Désactiver l'aimant" : "Activer l'aimant"}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '24px', height: '24px' }}>
                <path d="M6 15a4 4 0 0 0 4 4h4a4 4 0 0 0 4-4v-1a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v1z" />
                <path d="M8 8V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v4" />
                <path d="M10 10v4" />
                <path d="M14 10v4" />
              </svg>
            </button>
            {snapEnabled && (
              <div className="snap-select-container">
                <CustomSelect value={snapSize} options={[{key:1.0,label:'1.0'},{key:0.5,label:'0.5'},{key:0.1,label:'0.1'}]} onChange={setSnapSize} className="snap-select" />
              </div>
            )}
            <div className="controls-divider"></div>
            {['x','y','z'].map(axis => (
              <button key={axis}
                className={`camera-btn ${lockedAxes[axis] ? 'locked' : ''}`}
                onClick={() => toggleLockedAxis(axis)}
                title={lockedAxes[axis] ? `Axe ${axis.toUpperCase()} verrouillé` : `Axe ${axis.toUpperCase()} libre`}
                aria-label={lockedAxes[axis] ? `Déverrouiller l'axe ${axis.toUpperCase()}` : `Verrouiller l'axe ${axis.toUpperCase()}`}
              >
                <span style={{ fontSize: '0.7rem', fontWeight: 700 }}>{axis.toUpperCase()}</span>
              </button>
            ))}
            <div className="controls-divider"></div>
            <button
              className={`camera-btn ${showFieldLines ? 'active' : ''}`}
              onClick={() => setShowFieldLines(!showFieldLines)}
              title={showFieldLines ? 'Masquer les lignes de champ' : 'Afficher les lignes de champ'}
              aria-label={showFieldLines ? 'Masquer les lignes de champ' : 'Afficher les lignes de champ'}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" style={{ width: '24px', height: '24px' }}>
                <path d="M12 9 Q16 7 19 10" /><path d="M12 15 Q8 17 5 14" />
                <path d="M15 12 Q17 16 14 19" /><path d="M9 12 Q7 8 10 5" />
                <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
              </svg>
            </button>
            <div className="controls-divider"></div>
            <button
              className={`camera-btn ${showThroughMLine ? 'active' : ''}`}
              onClick={() => setShowThroughMLine(!showThroughMLine)}
              title="Ligne passant par M"
              aria-label="Ligne passant par M"
              style={{ width: '36px', height: '36px' }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: '24px', height: '24px' }}>
                <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
                <path d="M12 3 Q18 6 19 12 Q18 18 12 21" /><path d="M12 3 Q6 6 5 12 Q6 18 12 21" />
              </svg>
            </button>
            <button
              className={`camera-btn ${showEquipotentials ? 'active' : ''}`}
              onClick={() => setShowEquipotentials(!showEquipotentials)}
              title="Équipotentielles"
              aria-label="Équipotentielles"
              style={{ width: '36px', height: '36px' }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: '24px', height: '24px' }}>
                <ellipse cx="12" cy="12" rx="8" ry="4" /><ellipse cx="12" cy="12" rx="5" ry="2.5" /><ellipse cx="12" cy="12" rx="2.5" ry="1.2" />
              </svg>
            </button>
            <button
              className={`camera-btn ${showEquipotentials3D ? 'active' : ''}`}
              onClick={() => setShowEquipotentials3D(!showEquipotentials3D)}
              title="Équipotentielles 3D"
              aria-label="Équipotentielles 3D"
              style={{ width: '36px', height: '36px' }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: '24px', height: '24px' }}>
                <ellipse cx="12" cy="12" rx="9" ry="5" />
                <ellipse cx="12" cy="12" rx="6" ry="3" />
                <ellipse cx="12" cy="12" rx="3" ry="1.5" />
                <line x1="3" y1="7" x2="3" y2="17" strokeWidth="1" opacity="0.5" />
                <line x1="21" y1="7" x2="21" y2="17" strokeWidth="1" opacity="0.5" />
              </svg>
            </button>
            <div className="controls-divider"></div>
            <button
              className={`camera-btn ${showDipoleMoment ? 'active' : ''}`}
              onClick={() => setShowDipoleMoment(!showDipoleMoment)}
              title="Moment dipolaire"
              aria-label="Moment dipolaire"
              style={{ width: '36px', height: '36px' }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: '24px', height: '24px' }}>
                <circle cx="8" cy="12" r="2" fill="currentColor" stroke="none" /><circle cx="16" cy="12" r="2" fill="currentColor" stroke="none" />
                <line x1="10" y1="12" x2="14" y2="12" /><polyline points="11,9 14,12 11,15" />
              </svg>
            </button>
            <button
              className={`camera-btn ${showTrajectoryTrails ? 'active' : ''}`}
              onClick={() => setShowTrajectoryTrails(!showTrajectoryTrails)}
              title="Trajectoires des charges"
              aria-label="Trajectoires des charges"
              style={{ width: '36px', height: '36px' }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: '24px', height: '24px' }}>
                <path d="M3 20 Q 6 10, 10 14 T 16 8 T 21 12" />
                <circle cx="21" cy="12" r="1.5" fill="currentColor" stroke="none" />
              </svg>
            </button>
            <button
              className={`camera-btn ${showPotentialXGraph ? 'active' : ''}`}
              onClick={() => setShowPotentialXGraph(!showPotentialXGraph)}
              title="V(x) au centre"
              aria-label="V(x) au centre"
              style={{ width: '36px', height: '36px' }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '24px', height: '24px' }}>
                <polyline points="4,18 8,10 12,14 16,6 20,8" />
                <line x1="4" y1="20" x2="20" y2="20" /><line x1="4" y1="4" x2="4" y2="20" />
                <text x="8" y="6" fontSize="4" fill="currentColor">X</text>
              </svg>
            </button>
            <button
              className={`camera-btn ${showFieldGraph ? 'active' : ''}`}
              onClick={() => setShowFieldGraph(!showFieldGraph)}
              title="|E|(x) au centre"
              aria-label="|E|(x) au centre"
              style={{ width: '36px', height: '36px' }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '24px', height: '24px' }}>
                <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
                <line x1="12" y1="3" x2="12" y2="8" /><polyline points="9,6 12,3 15,6" />
                <line x1="12" y1="21" x2="12" y2="16" /><polyline points="9,18 12,21 15,18" />
                <line x1="5" y1="12" x2="10" y2="12" /><polyline points="8,9 5,12 8,15" />
                <line x1="19" y1="12" x2="14" y2="12" /><polyline points="16,9 19,12 16,15" />
              </svg>
            </button>
            <div className="controls-divider"></div>
            <button
              className={`camera-btn`}
              disabled={historyLen === 0}
              onClick={() => undo()}
              title="Annuler (Ctrl+Z)"
              aria-label="Annuler"
              style={{ width: '36px', height: '36px', opacity: historyLen === 0 ? 0.4 : 1 }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: '24px', height: '24px' }}>
                <polyline points="1,4 1,10 7,10" /><path d="M3.5 15.5A9 9 0 1 0 5.5 7" />
              </svg>
            </button>
            <button
              className={`camera-btn`}
              disabled={futureLen === 0}
              onClick={() => redo()}
              title="Rétablir (Ctrl+Shift+Z)"
              aria-label="Rétablir"
              style={{ width: '36px', height: '36px', opacity: futureLen === 0 ? 0.4 : 1 }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: '24px', height: '24px' }}>
                <polyline points="23,4 23,10 17,10" /><path d="M20.5 15.5A9 9 0 1 1 18.5 7" />
              </svg>
            </button>
            <div className="controls-divider"></div>
          </div>
        )}
      </div>

      {/* Floating legend: unit + scale */}
      <div className="canvas-legend">
        {(() => {
          const labels = { uC: 'µC', nC: 'nC', C: 'C', e: 'e⁻' }
          return `Unité : ${labels[chargeUnit] || chargeUnit} | Échelle : 1 = 1 mètre`
        })()}
      </div>

      {/* Subtle bottom-center watermark credits */}
      <div className="canvas-credits">
        © 2026 Michel ESPARSA — {__GIT_VERSION__}
      </div>

      <FieldGraph />
      <PotentialXGraph />
      <GaussWizard />

      <Canvas
        eventSource={rootRef}
        gl={{ antialias: true, preserveDrawingBuffer: true }}
        shadows="pcf"
        onPointerMissed={() => {}}
      >
        {cameraMode === 'orthographic' ? (
          <OrthographicCamera
            makeDefault
            zoom={45}
            near={-1000}
            far={1000}
          />
        ) : (
          <PerspectiveCamera makeDefault position={[1.7, 8, 12]} fov={50} />
        )}
        <CameraController animationTargetRef={animationTarget} controlsRef={controlsRef} />

        {/* Background Color matching our active theme */}
        <color attach="background" args={[theme === 'dark' ? '#070a13' : '#f8fafc']} />

        {/* Environment Lights */}
        <ambientLight intensity={theme === 'dark' ? 0.5 : 0.7} />
        <directionalLight
          position={[10, 15, 10]}
          intensity={theme === 'dark' ? 1.2 : 1.4}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <pointLight position={[-10, -10, -10]} intensity={theme === 'dark' ? 0.3 : 0.4} />

        {/* Reference grid on the XZ plane */}
        <gridHelper
          args={[
            30,
            30,
            theme === 'dark' ? '#1d263b' : '#cbd5e1',
            theme === 'dark' ? '#111827' : '#e2e8f0'
          ]}
          position={[0, 0, 0]}
        />

        {/* Colored axes helper with custom arrows and Billboard labels (X, Y, Z) centered at the origin */}
        <group>
          {/* Axis X - Red */}
          <arrowHelper
            args={[
              new THREE.Vector3(1, 0, 0),
              new THREE.Vector3(0, 0, 0),
              6,
              '#ff3e3e',
              0.5,
              0.25
            ]}
          />
          <Billboard position={[6.6, 0, 0]}>
            <Text
              fontSize={0.4}
              color="#ff3e3e"
              anchorX="center"
              anchorY="middle"
              outlineColor={theme === 'dark' ? '#070a13' : '#f8fafc'}
              outlineWidth={0.04}
            >
              X
            </Text>
          </Billboard>

          {/* Axis Y - Green */}
          <arrowHelper
            args={[
              new THREE.Vector3(0, 1, 0),
              new THREE.Vector3(0, 0, 0),
              6,
              theme === 'dark' ? '#00ff66' : '#059669',
              0.5,
              0.25
            ]}
          />
          <Billboard position={[0, 6.6, 0]}>
            <Text
              fontSize={0.4}
              color={theme === 'dark' ? '#00ff66' : '#059669'}
              anchorX="center"
              anchorY="middle"
              outlineColor={theme === 'dark' ? '#070a13' : '#f8fafc'}
              outlineWidth={0.04}
            >
              Y
            </Text>
          </Billboard>

          {/* Axis Z - Blue */}
          <arrowHelper
            args={[
              new THREE.Vector3(0, 0, 1),
              new THREE.Vector3(0, 0, 0),
              6,
              '#3e8bff',
              0.5,
              0.25
            ]}
          />
          <Billboard position={[0, 0, 6.6]}>
            <Text
              fontSize={0.4}
              color="#3e8bff"
              anchorX="center"
              anchorY="middle"
              outlineColor={theme === 'dark' ? '#070a13' : '#f8fafc'}
              outlineWidth={0.04}
            >
              Z
            </Text>
          </Billboard>
        </group>

        {/* Physics objects - hidden when a distribution is active */}
        {distributions.length === 0 && charges.map((charge) => (
          <ChargeSphere key={charge.id} charge={charge} />
        ))}

        {/* Test Point M */}
        <TestPoint />

        {/* Superposition: individual field vectors (faded) — toggled via showIndividualFields */}
        <IndividualFieldArrows />

        {/* Electric Field Vector Arrow at M */}
        <ElectricFieldArrow />

        {/* Coulomb Force Arrows (one resultant per charge) — toggled via showForces */}
        <ForceArrows />

        {/* Electric Field Lines — toggled via showFieldLines */}
        <FieldLines />

        {/* v1.2 — Advanced visualizations */}
        <ThroughMLine />
        <Equipotentials />
        <Equipotentials3D />

        {/* v1.3 — Interactive physics */}
        <ChargeMotion />
        <ChargeTrajectory />
        <DipoleMoment />

        {/* Distributions continues */}
        <DistributionRenderer />

        {/* Gaussian Surface Visualization for Gauss Companion */}
        <GaussianSurfaceVis />

        {/* Orbit Camera Controls (disabled while dragging to prevent rotation conflicts) */}
        <OrbitControls
          ref={controlsRef}
          enableDamping
          dampingFactor={0.05}
          makeDefault
          enabled={!isDragging}
          onStart={() => {
            // Cancel camera animation as soon as the user interacts with the mouse
            animationTarget.current = null
          }}
          onChange={() => {
            if (!animationTarget.current && !useStore.getState().isDragging) {
              if (useStore.getState().activeView !== null) {
                useStore.getState().setActiveView(null)
              }
            }
          }}
        />
      </Canvas>
    </div>
    </ErrorBoundary>
  )
}
