/* global __GIT_VERSION__ */
import { useState, useRef, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Billboard, Text, PerspectiveCamera, OrthographicCamera } from "@react-three/drei";
import * as THREE from "three";
import { useStore } from "../store/useStore";
import { ErrorBoundary } from "./ErrorBoundary";
import { ChargeSphere } from "./ChargeSphere";
import { TestPoint } from "./TestPoint";
import { ElectricFieldArrow } from "./ElectricFieldArrow";
import { ForceArrows } from "./ForceArrows";
import { FieldLines } from "./FieldLines";
import { ThroughMLine } from "./ThroughMLine";
import { Equipotentials } from "./Equipotentials";
import { Equipotentials3D } from "./Equipotentials3D";
import { ChargeMotion } from "./ChargeMotion";
import { DipoleMoment } from "./DipoleMoment";
import { ChargeTrajectory } from "./ChargeTrajectory";
import { DistributionRenderer } from "./DistributionVis";
import { FieldGraph } from "./FieldGraph";
import { PotentialXGraph } from "./PotentialXGraph";
import { CustomSelect } from "./CustomSelect";
import { GaussianSurfaceVis } from "./GaussianSurfaceVis";
import { GaussWizard } from "./GaussWizard";
import { IndividualFieldArrows } from "./IndividualFieldArrows";

function CameraController({ animationTargetRef, controlsRef }) {
  const { camera } = useThree();

  useFrame(() => {
    if (animationTargetRef.current && controlsRef.current) {
      const { cameraPos, lookAt } = animationTargetRef.current;
      const step = 0.08;

      camera.position.lerp(cameraPos, step);
      controlsRef.current.target.lerp(lookAt, step);
      controlsRef.current.update();

      if (camera.position.distanceTo(cameraPos) < 0.005 && controlsRef.current.target.distanceTo(lookAt) < 0.005) {
        camera.position.copy(cameraPos);
        controlsRef.current.target.copy(lookAt);
        controlsRef.current.update();
        animationTargetRef.current = null;
      }
    }
  });

  return null;
}

export function PhysicsCanvas() {
  const charges = useStore((state) => state.charges);
  const distributions = useStore((state) => state.distributions);
  const isDragging = useStore((state) => state.isDragging);
  const theme = useStore((state) => state.theme);

  const snapEnabled = useStore((state) => state.snapEnabled);
  const snapSize = useStore((state) => state.snapSize);
  const setSnapEnabled = useStore((state) => state.setSnapEnabled);
  const setSnapSize = useStore((state) => state.setSnapSize);
  const lockedAxes = useStore((state) => state.lockedAxes);
  const toggleLockedAxis = useStore((state) => state.toggleLockedAxis);
  const activeView = useStore((state) => state.activeView);
  const setActiveView = useStore((state) => state.setActiveView);
  const cameraMode = useStore((state) => state.cameraMode);
  const setCameraMode = useStore((state) => state.setCameraMode);
  const showFieldLines = useStore((state) => state.showFieldLines);
  const setShowFieldLines = useStore((state) => state.setShowFieldLines);
  const showThroughMLine = useStore((state) => state.showThroughMLine);
  const setShowThroughMLine = useStore((state) => state.setShowThroughMLine);
  const showEquipotentials = useStore((state) => state.showEquipotentials);
  const setShowEquipotentials = useStore((state) => state.setShowEquipotentials);
  const showEquipotentials3D = useStore((state) => state.showEquipotentials3D);
  const setShowEquipotentials3D = useStore((state) => state.setShowEquipotentials3D);
  const showDipoleMoment = useStore((state) => state.showDipoleMoment);
  const setShowDipoleMoment = useStore((state) => state.setShowDipoleMoment);
  const showTrajectoryTrails = useStore((state) => state.showTrajectoryTrails);
  const setShowTrajectoryTrails = useStore((state) => state.setShowTrajectoryTrails);
  const showPotentialXGraph = useStore((state) => state.showPotentialXGraph);
  const setShowPotentialXGraph = useStore((state) => state.setShowPotentialXGraph);
  const showFieldGraph = useStore((state) => state.showFieldGraph);
  const setShowFieldGraph = useStore((state) => state.setShowFieldGraph);
  const sidebarOpen = useStore((state) => state.sidebarOpen);

  const chargeUnit = useStore((state) => state.chargeUnit);
  const undo = useStore((state) => state.undo);
  const redo = useStore((state) => state.redo);
  const historyLen = useStore((state) => state.history.length);
  const futureLen = useStore((state) => state.future.length);

  const controlsRef = useRef();
  const animationTarget = useRef(null);
  const canvasRef = useRef();
  const [toolbarOpen, setToolbarOpen] = useState(true);

  const handleSetView = (viewName) => {
    setActiveView(viewName);
    let cameraPos, lookAt;

    if (viewName === "top") {
      setCameraMode("orthographic");
      cameraPos = new THREE.Vector3(0.001, 15, 0);
      lookAt = new THREE.Vector3(0, 0.5, 0);
    } else if (viewName === "front") {
      setCameraMode("orthographic");
      cameraPos = new THREE.Vector3(0, 0.5, 15);
      lookAt = new THREE.Vector3(0, 0.5, 0);
    } else if (viewName === "side") {
      setCameraMode("orthographic");
      cameraPos = new THREE.Vector3(15, 0.5, 0);
      lookAt = new THREE.Vector3(0, 0.5, 0);
    } else if (viewName === "isometric") {
      setCameraMode("perspective");
      cameraPos = new THREE.Vector3(1.7, 8, 12);
      lookAt = new THREE.Vector3(0, 0.5, 0);
    }

    animationTarget.current = { cameraPos, lookAt };
  };

  // Active view from sidebar — trigger camera animation when changed
  useEffect(() => {
    if (activeView) handleSetView(activeView);
  }, [activeView]);

  return (
    <ErrorBoundary>
      <div ref={canvasRef} className="canvas-inner">
        {/* Toolbar toggle + 3D Camera Switching Controls */}
        <div className={`camera-wrapper ${sidebarOpen ? "sidebar-open" : ""}`}>
          <button
            className="toolbar-toggle"
            onClick={() => setToolbarOpen(!toolbarOpen)}
            title={toolbarOpen ? "Masquer la barre" : "Afficher la barre"}
            aria-label={toolbarOpen ? "Masquer la barre" : "Afficher la barre"}
          >
            {toolbarOpen ? "◀" : "▶"}
          </button>
          {toolbarOpen && (
            <div className="camera-controls">
              <button
                className={`camera-btn ${activeView === "top" ? "active" : ""}`}
                onClick={() => handleSetView("top")}
                title="Vue de dessus (XY)"
                aria-label="Vue de dessus"
              >
                <svg viewBox="0 0 50 50">
                  <polygon points="5,15 25,5 45,15 25,25" className="cube-face-active" />
                  <polygon points="45,15 45,35 25,45 25,25" className="cube-face-inactive-2" />
                  <polygon points="5,15 5,35 25,45 25,25" className="cube-face-inactive-1" />
                </svg>
              </button>
              <button
                className={`camera-btn ${activeView === "front" ? "active" : ""}`}
                onClick={() => handleSetView("front")}
                title="Vue de face (XZ)"
                aria-label="Vue de face"
              >
                <svg viewBox="0 0 50 50">
                  <polygon points="5,15 25,5 45,15 25,25" className="cube-face-inactive-1" />
                  <polygon points="45,15 45,35 25,45 25,25" className="cube-face-inactive-2" />
                  <polygon points="5,15 5,35 25,45 25,25" className="cube-face-active" />
                </svg>
              </button>
              <button
                className={`camera-btn ${activeView === "side" ? "active" : ""}`}
                onClick={() => handleSetView("side")}
                title="Vue de côté (YZ)"
                aria-label="Vue de côté"
              >
                <svg viewBox="0 0 50 50">
                  <polygon points="5,15 25,5 45,15 25,25" className="cube-face-inactive-1" />
                  <polygon points="45,15 45,35 25,45 25,25" className="cube-face-active" />
                  <polygon points="5,15 5,35 25,45 25,25" className="cube-face-inactive-2" />
                </svg>
              </button>
              <button
                className={`camera-btn ${activeView === "isometric" ? "active" : ""}`}
                onClick={() => handleSetView("isometric")}
                title="Réinitialiser la vue (Isométrique)"
                aria-label="Réinitialiser la vue"
              >
                <svg
                  viewBox="0 0 36 36"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  style={{ width: "36px", height: "36px" }}
                >
                  <polygon points="18,4 32,12 18,20 4,12" />
                  <polygon points="18,20 32,12 32,26 18,34" />
                  <polygon points="4,12 18,20 18,34 4,26" />
                </svg>
              </button>
              <div className="controls-divider"></div>
              <button
                className={`camera-btn ${snapEnabled ? "active" : ""}`}
                onClick={() => setSnapEnabled(!snapEnabled)}
                title={snapEnabled ? "Désactiver l'aimant" : "Activer l'aimant"}
                aria-label={snapEnabled ? "Désactiver l'aimant" : "Activer l'aimant"}
              >
                <svg
                  viewBox="0 0 36 36"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ width: "36px", height: "36px" }}
                >
                  <g transform="rotate(90 18 18)">
                    {/* Corps du fer à cheval */}
                    <path d="M11 6v11a7 7 0 0 0 14 0V6" />

                    {/* Pôles pleins */}
                    <path d="M8 6h6v6H8z" fill="currentColor" stroke="none" />
                    <path d="M22 6h6v6h-6z" fill="currentColor" stroke="none" />

                    {/* Lettres N/S, contre-tournées pour rester droites */}
                    <text
                      x="11"
                      y="10.8"
                      transform="rotate(-90 11 10.8)"
                      textAnchor="middle"
                      fontSize="6"
                      fontWeight="800"
                      fill="var(--camera-btn-bg, #1a1a1a)"
                      stroke="none"
                      fontFamily="Arial, Helvetica, sans-serif"
                    >
                      N
                    </text>
                    <text
                      x="25"
                      y="10.8"
                      transform="rotate(-90 25 10.8)"
                      textAnchor="middle"
                      fontSize="6"
                      fontWeight="800"
                      fill="var(--camera-btn-bg, #1a1a1a)"
                      stroke="none"
                      fontFamily="Arial, Helvetica, sans-serif"
                    >
                      S
                    </text>
                  </g>
                </svg>
              </button>

              {snapEnabled && (
                <div className="snap-select-container">
                  <CustomSelect
                    value={snapSize}
                    options={[
                      { key: 1.0, label: "1.0" },
                      { key: 0.5, label: "0.5" },
                      { key: 0.1, label: "0.1" },
                    ]}
                    onChange={setSnapSize}
                    className="snap-select"
                  />
                </div>
              )}
              <div className="controls-divider"></div>
              {["x", "y", "z"].map((axis) => (
                <button
                  key={axis}
                  className={`camera-btn ${lockedAxes[axis] ? "locked" : ""}`}
                  onClick={() => toggleLockedAxis(axis)}
                  title={lockedAxes[axis] ? `Axe ${axis.toUpperCase()} verrouillé` : `Axe ${axis.toUpperCase()} libre`}
                  aria-label={
                    lockedAxes[axis]
                      ? `Déverrouiller l'axe ${axis.toUpperCase()}`
                      : `Verrouiller l'axe ${axis.toUpperCase()}`
                  }
                >
                  <span style={{ fontSize: "1rem", fontWeight: 700 }}>{axis.toUpperCase()}</span>
                </button>
              ))}
              <div className="controls-divider"></div>
              <button
                className={`camera-btn ${showFieldLines ? "active" : ""}`}
                onClick={() => setShowFieldLines(!showFieldLines)}
                title={showFieldLines ? "Masquer les lignes de champ" : "Afficher les lignes de champ"}
                aria-label={showFieldLines ? "Masquer les lignes de champ" : "Afficher les lignes de champ"}
                style={{ width: "36px", height: "36px" }}
              >
                <svg viewBox="0 0 36 36" fill="none" style={{ width: "36px", height: "36px" }}>
                  <circle cx="10" cy="18" r="5" fill="currentColor" opacity="0.35" stroke="none" />
                  <text
                    x="10"
                    y="19.5"
                    textAnchor="middle"
                    fontSize="7.5"
                    fontWeight="800"
                    fill="currentColor"
                    stroke="none"
                    fontFamily="Arial, Helvetica, sans-serif"
                  >
                    +
                  </text>
                  <circle cx="26" cy="18" r="5" fill="currentColor" opacity="0.35" stroke="none" />
                  <text
                    x="26"
                    y="19.5"
                    textAnchor="middle"
                    fontSize="7.5"
                    fontWeight="800"
                    fill="currentColor"
                    stroke="none"
                    fontFamily="Arial, Helvetica, sans-serif"
                  >
                    −
                  </text>
                  <path d="M14 11 Q18 3.5 22 11" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M19.2 7.25L17.4 6.45v1.6z" fill="currentColor" stroke="none" />
                  <path d="M14 16 Q18 13 22 16" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M19.2 16L17.4 15.2v1.6z" fill="currentColor" stroke="none" />
                  <path d="M14 22 Q18 25 22 22" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M19.2 22L17.4 21.2v1.6z" fill="currentColor" stroke="none" />
                  <path d="M14 27 Q18 32.5 22 27" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M19.2 29.75L17.4 28.95v1.6z" fill="currentColor" stroke="none" />
                </svg>
              </button>
              <div className="controls-divider"></div>
              <button
                className={`camera-btn ${showThroughMLine ? "active" : ""}`}
                onClick={() => setShowThroughMLine(!showThroughMLine)}
                title="Ligne passant par M"
                aria-label="Ligne passant par M"
                style={{ width: "36px", height: "36px" }}
              >
                <svg viewBox="0 0 36 36" fill="none" style={{ width: "36px", height: "36px" }}>
                  <circle cx="9" cy="20" r="4.5" fill="currentColor" opacity="0.35" stroke="none" />
                  <text
                    x="9"
                    y="21.5"
                    textAnchor="middle"
                    fontSize="7.5"
                    fontWeight="800"
                    fill="currentColor"
                    stroke="none"
                    fontFamily="Arial, Helvetica, sans-serif"
                  >
                    +
                  </text>
                  <circle cx="27" cy="20" r="4.5" fill="currentColor" opacity="0.35" stroke="none" />
                  <text
                    x="27"
                    y="21.5"
                    textAnchor="middle"
                    fontSize="7.5"
                    fontWeight="800"
                    fill="currentColor"
                    stroke="none"
                    fontFamily="Arial, Helvetica, sans-serif"
                  >
                    −
                  </text>
                  <path d="M13 16 Q18 4 23 16" stroke="currentColor" strokeWidth="1.8" />
                  <circle cx="18" cy="10" r="2.5" fill="#fbbf24" stroke="none" />
                  <text x="18" y="12" fontSize="5" fontWeight="bold" fill="#000" stroke="none" textAnchor="middle">
                    M
                  </text>
                </svg>
              </button>
              <button
                className={`camera-btn ${showEquipotentials ? "active" : ""}`}
                onClick={() => setShowEquipotentials(!showEquipotentials)}
                title="Équipotentielles"
                aria-label="Équipotentielles"
                style={{ width: "36px", height: "36px" }}
              >
                <svg viewBox="0 0 36 36" fill="none" style={{ width: "36px", height: "36px" }}>
                  <ellipse cx="18" cy="6" rx="13" ry="4.5" stroke="currentColor" strokeWidth="1.5" />
                  <ellipse cx="18" cy="6" rx="9" ry="3" stroke="currentColor" strokeWidth="1.2" opacity="0.6" />
                  <ellipse cx="18" cy="6" rx="5" ry="1.8" stroke="currentColor" strokeWidth="1" opacity="0.4" />
                  <line x1="5" y1="6" x2="5" y2="15" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2" />
                  <line x1="31" y1="6" x2="31" y2="15" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2" />
                  <path d="M5 15 Q18 20 31 15" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2" />
                </svg>
              </button>
              <button
                className={`camera-btn ${showEquipotentials3D ? "active" : ""}`}
                onClick={() => setShowEquipotentials3D(!showEquipotentials3D)}
                title="Équipotentielles 3D"
                aria-label="Équipotentielles 3D"
                style={{ width: "36px", height: "36px" }}
              >
                <svg viewBox="0 0 36 36" fill="none" style={{ width: "36px", height: "36px" }}>
                  <ellipse cx="18" cy="11" rx="13" ry="5.5" stroke="currentColor" strokeWidth="1.5" />
                  <line x1="5" y1="11" x2="5" y2="25" stroke="currentColor" strokeWidth="1.5" />
                  <line x1="31" y1="11" x2="31" y2="25" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M5 25 A13 5.5 0 0 0 31 25" stroke="currentColor" strokeWidth="1.5" />
                  <ellipse cx="18" cy="11" rx="9.5" ry="4" stroke="currentColor" strokeWidth="1.2" opacity="0.6" />
                  <ellipse cx="18" cy="11" rx="6" ry="2.5" stroke="currentColor" strokeWidth="1" opacity="0.4" />
                </svg>
              </button>
              <div className="controls-divider"></div>
              <button
                className={`camera-btn ${showDipoleMoment ? "active" : ""}`}
                onClick={() => setShowDipoleMoment(!showDipoleMoment)}
                title="Moment dipolaire"
                aria-label="Moment dipolaire"
                style={{ width: "36px", height: "36px" }}
              >
                <svg
                  viewBox="0 0 36 36"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  style={{ width: "36px", height: "36px" }}
                >
                  <circle cx="12" cy="18" r="3.5" fill="currentColor" stroke="none" opacity="0.4" />
                  <circle cx="24" cy="18" r="3.5" fill="currentColor" stroke="none" opacity="0.4" />
                  <line x1="15.5" y1="18" x2="20.5" y2="18" />
                  <polyline points="17,14 20.5,18 17,22" />
                </svg>
              </button>
              <button
                className={`camera-btn ${showTrajectoryTrails ? "active" : ""}`}
                onClick={() => setShowTrajectoryTrails(!showTrajectoryTrails)}
                title="Trajectoires des charges"
                aria-label="Trajectoires des charges"
                style={{ width: "36px", height: "36px" }}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  style={{ width: "24px", height: "24px" }}
                >
                  <path d="M3 20 Q 6 10, 10 14 T 16 8 T 21 12" />
                  <circle cx="21" cy="12" r="1.5" fill="currentColor" stroke="none" />
                </svg>
              </button>
              <button
                className={`camera-btn ${showPotentialXGraph ? "active" : ""}`}
                onClick={() => setShowPotentialXGraph(!showPotentialXGraph)}
                title="V(x) au centre"
                aria-label="V(x) au centre"
                style={{ width: "36px", height: "36px" }}
              >
                <svg
                  viewBox="0 0 36 36"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  style={{ width: "36px", height: "36px" }}
                >
                  <path d="M4 30 L32 30" />
                  <path d="M6 32 L6 4" />
                  <path d="M8 22 Q14 16 20 20 Q26 10 29 8" strokeWidth="2" />
                  <text
                    x="18"
                    y="26"
                    fontSize="18"
                    fontWeight="bold"
                    fill="currentColor"
                    stroke="none"
                    textAnchor="middle"
                  >
                    V
                  </text>
                </svg>
              </button>
              <button
                className={`camera-btn ${showFieldGraph ? "active" : ""}`}
                onClick={() => setShowFieldGraph(!showFieldGraph)}
                title="|E|(x) au centre"
                aria-label="|E|(x) au centre"
                style={{ width: "36px", height: "36px" }}
              >
                <svg
                  viewBox="0 0 36 36"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  style={{ width: "36px", height: "36px" }}
                >
                  <path d="M4 30 L32 30" />
                  <path d="M6 32 L6 4" />
                  <path d="M8 12 Q16 24 28 10" strokeWidth="2" />
                  <text
                    x="18"
                    y="26"
                    fontSize="18"
                    fontWeight="bold"
                    fill="currentColor"
                    stroke="none"
                    textAnchor="middle"
                  >
                    E
                  </text>
                </svg>
              </button>
              <div className="controls-divider"></div>
              <button
                className={`camera-btn`}
                disabled={historyLen === 0}
                onClick={() => undo()}
                title="Annuler (Ctrl+Z)"
                aria-label="Annuler"
                style={{ width: "36px", height: "36px", opacity: historyLen === 0 ? 0.4 : 1 }}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  style={{ width: "24px", height: "24px" }}
                >
                  <polyline points="1,4 1,10 7,10" />
                  <path d="M3.5 15.5A9 9 0 1 0 5.5 7" />
                </svg>
              </button>
              <button
                className={`camera-btn`}
                disabled={futureLen === 0}
                onClick={() => redo()}
                title="Rétablir (Ctrl+Shift+Z)"
                aria-label="Rétablir"
                style={{ width: "36px", height: "36px", opacity: futureLen === 0 ? 0.4 : 1 }}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  style={{ width: "24px", height: "24px" }}
                >
                  <polyline points="23,4 23,10 17,10" />
                  <path d="M20.5 15.5A9 9 0 1 1 18.5 7" />
                </svg>
              </button>
              <div className="controls-divider"></div>
            </div>
          )}
        </div>

        {/* Floating legend: unit + scale */}
        <div className="canvas-legend">
          {(() => {
            const labels = { uC: "µC", nC: "nC", C: "C", e: "e⁻" };
            return `Unité : ${labels[chargeUnit] || chargeUnit} | Échelle : 1 = 1 mètre`;
          })()}
        </div>

        {/* Subtle bottom-center watermark credits */}
        <div className="canvas-credits">© 2026 Michel ESPARSA — {__GIT_VERSION__}</div>

        <FieldGraph />
        <PotentialXGraph />
        <GaussWizard />

        <Canvas
          eventSource={canvasRef}
          gl={{ antialias: true, preserveDrawingBuffer: true }}
          shadows="pcf"
          onPointerMissed={() => {}}
        >
          {cameraMode === "orthographic" ? (
            <OrthographicCamera makeDefault zoom={45} near={-1000} far={1000} />
          ) : (
            <PerspectiveCamera makeDefault position={[1.7, 8, 12]} fov={50} />
          )}
          <CameraController animationTargetRef={animationTarget} controlsRef={controlsRef} />

          {/* Background Color matching our active theme */}
          <color attach="background" args={[theme === "dark" ? "#070a13" : "#f8fafc"]} />

          {/* Environment Lights */}
          <ambientLight intensity={theme === "dark" ? 0.5 : 0.7} />
          <directionalLight
            position={[10, 15, 10]}
            intensity={theme === "dark" ? 1.2 : 1.4}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
          />
          <pointLight position={[-10, -10, -10]} intensity={theme === "dark" ? 0.3 : 0.4} />

          {/* Reference grid on the XZ plane */}
          <gridHelper
            args={[30, 30, theme === "dark" ? "#1d263b" : "#cbd5e1", theme === "dark" ? "#111827" : "#e2e8f0"]}
            position={[0, 0, 0]}
          />

          {/* Colored axes helper with custom arrows and Billboard labels (X, Y, Z) centered at the origin */}
          <group>
            {/* Axis X - Red */}
            <arrowHelper args={[new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), 6, "#ff3e3e", 0.5, 0.25]} />
            <Billboard position={[6.6, 0, 0]}>
              <Text
                fontSize={0.4}
                color="#ff3e3e"
                anchorX="center"
                anchorY="middle"
                outlineColor={theme === "dark" ? "#070a13" : "#f8fafc"}
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
                theme === "dark" ? "#00ff66" : "#059669",
                0.5,
                0.25,
              ]}
            />
            <Billboard position={[0, 6.6, 0]}>
              <Text
                fontSize={0.4}
                color={theme === "dark" ? "#00ff66" : "#059669"}
                anchorX="center"
                anchorY="middle"
                outlineColor={theme === "dark" ? "#070a13" : "#f8fafc"}
                outlineWidth={0.04}
              >
                Y
              </Text>
            </Billboard>

            {/* Axis Z - Blue */}
            <arrowHelper args={[new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 0), 6, "#3e8bff", 0.5, 0.25]} />
            <Billboard position={[0, 0, 6.6]}>
              <Text
                fontSize={0.4}
                color="#3e8bff"
                anchorX="center"
                anchorY="middle"
                outlineColor={theme === "dark" ? "#070a13" : "#f8fafc"}
                outlineWidth={0.04}
              >
                Z
              </Text>
            </Billboard>
          </group>

          {/* Physics objects - hidden when a distribution is active */}
          {distributions.length === 0 && charges.map((charge) => <ChargeSphere key={charge.id} charge={charge} />)}

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
              animationTarget.current = null;
            }}
            onChange={() => {
              if (!animationTarget.current && !useStore.getState().isDragging) {
                if (useStore.getState().activeView !== null) {
                  useStore.getState().setActiveView(null);
                }
              }
            }}
          />
        </Canvas>
      </div>
    </ErrorBoundary>
  );
}
