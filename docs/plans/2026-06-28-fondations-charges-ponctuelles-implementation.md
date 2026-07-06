# Plan d'implémentation - Phase 1 : Les fondations

Ce plan détaille la mise en œuvre de la Phase 1 (le bac à sable des charges ponctuelles) dans le projet **electro-web**.

## Objectif
Créer un bac à sable 3D interactif avec R3F où des charges ponctuelles positives et négatives et un point de test M peuvent être glissés à la souris. Le champ électrique total résultant au point M est calculé en temps réel et tracé à l'aide d'un vecteur dynamique. Une barre latérale au design premium permet d'ajouter/modifier des charges et d'analyser les valeurs physiques.

## Architecture
- **Gestion de l'état** : Zustand pour un store léger et réactif.
- **Moteur de physique** : Fichier JS pur utilisant la classe `THREE.Vector3` de Three.js.
- **Rendu 3D** : R3F + `@react-three/drei` pour la scène 3D, les sphères et le tracé vectoriel.
- **Interface Utilisateur** : Design sombre néon avec effet de flou en verre dépoli (glassmorphism) sur le panneau de configuration.

## Tech Stack
- React 19 / Vite
- Three.js / React Three Fiber / @react-three/drei
- Zustand (à installer)

---

## Modifications proposées

### Dépendances

#### [MODIFY] [package.json](file:///c:/wamp64/www/electro-web/package.json)
- Ajouter `zustand` en dépendance.

---

### Physique & État Global

#### [NEW] [coulomb.js](file:///c:/wamp64/www/electro-web/src/physics/coulomb.js)
- Implémenter les calculs vectoriels physiques basés sur la loi de Coulomb et le principe de superposition.

#### [NEW] [useStore.js](file:///c:/wamp64/www/electro-web/src/store/useStore.js)
- Créer le store Zustand pour stocker les positions et valeurs des charges, la position de M et les actions associées.

---

### Composants de Rendu 3D

#### [NEW] [ChargeSphere.jsx](file:///c:/wamp64/www/electro-web/src/components/ChargeSphere.jsx)
- Rendre les charges sous forme de sphères rouges ($q > 0$) et bleues ($q < 0$) avec interaction `<DragControls>`.

#### [NEW] [TestPoint.jsx](file:///c:/wamp64/www/electro-web/src/components/TestPoint.jsx)
- Rendre le point de test M sous forme de sphère jaune/blanche avec interaction `<DragControls>`.

#### [NEW] [ElectricFieldArrow.jsx](file:///c:/wamp64/www/electro-web/src/components/ElectricFieldArrow.jsx)
- Rendre le vecteur $\vec{E}$ total au point M avec un composant Three.js `<arrowHelper>` dynamique mis à jour dans un hook `useFrame`.

#### [NEW] [PhysicsCanvas.jsx](file:///c:/wamp64/www/electro-web/src/components/PhysicsCanvas.jsx)
- Assembler la scène 3D (lumières, grille, charges, point M et flèche du champ) et gérer la désactivation temporaire de `OrbitControls` lors des phases de drag.

---

### Interface Utilisateur & Style

#### [NEW] [Sidebar.jsx](file:///c:/wamp64/www/electro-web/src/components/Sidebar.jsx)
- Créer un panneau de contrôle latéral au design premium (effet flou verre dépoli, thème sombre néon, typographies Google Fonts) pour interagir avec la scène.

#### [MODIFY] [index.css](file:///c:/wamp64/www/electro-web/src/index.css)
- Configurer les variables globales CSS, la police Inter/Outfit, les styles pour la mise en page générale, la sidebar et les boutons.

#### [MODIFY] [App.jsx](file:///c:/wamp64/www/electro-web/src/App.jsx)
- Remplacer le template par défaut par l'assemblage de `Sidebar` and `PhysicsCanvas`.

---

## Étapes de mise en œuvre détaillée

### Étape 1 : Installation de Zustand
- **Commande** : `npm install zustand`

### Étape 2 : Écrire et Valider le Moteur Physique [coulomb.js](file:///c:/wamp64/www/electro-web/src/physics/coulomb.js)
- Code de `src/physics/coulomb.js` :
```javascript
import * as THREE from 'three'

export function calculateFieldFromCharge(charge, targetPos, ke = 10, rMin = 0.5) {
  const q = charge.q
  const chargePos = new THREE.Vector3(...charge.position)
  const M = new THREE.Vector3(...targetPos)
  
  const rVec = new THREE.Vector3().subVectors(M, chargePos)
  let r = rVec.length()
  
  if (r < rMin) {
    r = rMin
  }
  
  const u = rVec.clone().normalize()
  const intensity = (ke * q) / (r * r)
  return u.multiplyScalar(intensity)
}

export function calculateTotalField(charges, targetPos, ke = 10, rMin = 0.5) {
  const totalField = new THREE.Vector3(0, 0, 0)
  charges.forEach(charge => {
    totalField.add(calculateFieldFromCharge(charge, targetPos, ke, rMin))
  })
  return totalField
}
```

### Étape 3 : Créer le Store Zustand [useStore.js](file:///c:/wamp64/www/electro-web/src/store/useStore.js)
- Code de `src/store/useStore.js` :
```javascript
import { create } from 'zustand'

export const useStore = create((set) => ({
  charges: [
    { id: '1', q: 1.5, position: [2, 0.5, 0] },
    { id: '2', q: -1.5, position: [-2, 0.5, 0] },
  ],
  testPoint: [0, 0.5, 2],
  ke: 10,
  rMin: 0.5,
  eMax: 15,
  isDragging: false,

  setDragging: (isDragging) => set({ isDragging }),
  addCharge: (q) => set((state) => ({
    charges: [
      ...state.charges,
      {
        id: Math.random().toString(36).substring(2, 9),
        q,
        position: [(Math.random() - 0.5) * 6, 0.5, (Math.random() - 0.5) * 6],
      },
    ],
  })),
  removeCharge: (id) => set((state) => ({
    charges: state.charges.filter((c) => c.id !== id),
  })),
  updateChargePosition: (id, position) => set((state) => ({
    charges: state.charges.map((c) => (c.id === id ? { ...c, position } : c)),
  })),
  updateChargeQ: (id, q) => set((state) => ({
    charges: state.charges.map((c) => (c.id === id ? { ...c, q } : c)),
  })),
  updateTestPoint: (position) => set({ testPoint: position }),
  clearCharges: () => set({ charges: [] }),
}))
```

### Étape 4 : Développer le Composant [ChargeSphere.jsx](file:///c:/wamp64/www/electro-web/src/components/ChargeSphere.jsx)
- Permet de déplacer une charge et de synchroniser sa position dans le store global.
- Code de `src/components/ChargeSphere.jsx` :
```jsx
import { useRef } from 'react'
import * as THREE from 'three'
import { DragControls } from '@react-three/drei'
import { useStore } from '../store/useStore'

export function ChargeSphere({ charge }) {
  const updateChargePosition = useStore((state) => state.updateChargePosition)
  const setDragging = useStore((state) => state.setDragging)
  const meshRef = useRef()

  const handleDrag = () => {
    if (meshRef.current) {
      const pos = meshRef.current.position
      updateChargePosition(charge.id, [pos.x, pos.y, pos.z])
    }
  }

  const color = charge.q >= 0 ? '#ff3e3e' : '#3e8bff'
  const emissive = charge.q >= 0 ? '#5a0000' : '#00005a'

  return (
    <DragControls
      autoTransform
      onDragStart={() => setDragging(true)}
      onDrag={handleDrag}
      onDragEnd={() => setDragging(false)}
    >
      <mesh ref={meshRef} position={charge.position}>
        <sphereGeometry args={[0.4, 32, 32]} />
        <meshStandardMaterial
          color={color}
          roughness={0.1}
          metalness={0.1}
          emissive={emissive}
          emissiveIntensity={1.5}
        />
      </mesh>
    </DragControls>
  )
}
```

### Étape 5 : Développer le Composant [TestPoint.jsx](file:///c:/wamp64/www/electro-web/src/components/TestPoint.jsx)
- Rendu du point de test M déplaçable avec DragControls.
- Code de `src/components/TestPoint.jsx` :
```jsx
import { useRef } from 'react'
import { DragControls } from '@react-three/drei'
import { useStore } from '../store/useStore'

export function TestPoint() {
  const testPoint = useStore((state) => state.testPoint)
  const updateTestPoint = useStore((state) => state.updateTestPoint)
  const setDragging = useStore((state) => state.setDragging)
  const meshRef = useRef()

  const handleDrag = () => {
    if (meshRef.current) {
      const pos = meshRef.current.position
      updateTestPoint([pos.x, pos.y, pos.z])
    }
  }

  return (
    <DragControls
      autoTransform
      onDragStart={() => setDragging(true)}
      onDrag={handleDrag}
      onDragEnd={() => setDragging(false)}
    >
      <mesh ref={meshRef} position={testPoint}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial
          color="#ffff00"
          emissive="#555500"
          emissiveIntensity={2}
          roughness={0.2}
        />
      </mesh>
    </DragControls>
  )
}
```

### Étape 6 : Développer le Composant [ElectricFieldArrow.jsx](file:///c:/wamp64/www/electro-web/src/components/ElectricFieldArrow.jsx)
- Met à jour l'orientation et la longueur de l'arrowHelper à chaque frame.
- Code de `src/components/ElectricFieldArrow.jsx` :
```jsx
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../store/useStore'
import { calculateTotalField } from '../physics/coulomb'

export function ElectricFieldArrow() {
  const charges = useStore((state) => state.charges)
  const testPoint = useStore((state) => state.testPoint)
  const ke = useStore((state) => state.ke)
  const rMin = useStore((state) => state.rMin)
  const eMax = useStore((state) => state.eMax)
  
  const arrowRef = useRef()

  useFrame(() => {
    if (!arrowRef.current) return

    // 1. Calcul du champ
    const E = calculateTotalField(charges, testPoint, ke, rMin)
    const length = E.length()

    if (length < 0.001) {
      arrowRef.current.visible = false
      return
    }

    arrowRef.current.visible = true

    // 2. Détermination de la longueur du rendu (limitée à eMax)
    const renderLength = Math.min(length, eMax)

    // 3. Mise à jour de la flèche
    const dir = E.clone().normalize()
    arrowRef.current.setDirection(dir)
    arrowRef.current.setLength(renderLength, Math.min(renderLength * 0.25, 0.8), Math.min(renderLength * 0.1, 0.25))

    // Positionner le début de la flèche au point M
    arrowRef.current.position.set(testPoint[0], testPoint[1], testPoint[2])
  })

  return (
    <arrowHelper
      ref={arrowRef}
      args={[new THREE.Vector3(1, 0, 0), new THREE.Vector3(...testPoint), 1, '#00ff66']}
    />
  )
}
```

### Étape 7 : Développer le Composant [PhysicsCanvas.jsx](file:///c:/wamp64/www/electro-web/src/components/PhysicsCanvas.jsx)
- Assemblage de la scène 3D et des lumières.
- Code de `src/components/PhysicsCanvas.jsx` :
```jsx
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useStore } from '../store/useStore'
import { ChargeSphere } from './ChargeSphere'
import { TestPoint } from './TestPoint'
import { ElectricFieldArrow } from './ElectricFieldArrow'

export function PhysicsCanvas() {
  const charges = useStore((state) => state.charges)
  const isDragging = useStore((state) => state.isDragging)

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Canvas
        camera={{ position: [0, 8, 12], fov: 50 }}
        gl={{ antialias: true }}
      >
        <color attach="background" args={['#070a13']} />
        
        {/* Lumières */}
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 15, 10]} intensity={1.2} castShadow />
        <pointLight position={[-10, -10, -10]} intensity={0.5} />

        {/* Grille de référence */}
        <gridHelper args={[30, 30, '#1d263b', '#111827']} position={[0, 0, 0]} />

        {/* Composants physiques */}
        {charges.map((charge) => (
          <ChargeSphere key={charge.id} charge={charge} />
        ))}

        <TestPoint />
        <ElectricFieldArrow />

        {/* Contrôles de la caméra (désactivés lors du drag pour éviter les conflits) */}
        <OrbitControls enableDamping dampingFactor={0.05} makeDefault enabled={!isDragging} />
      </Canvas>
    </div>
  )
}
```

### Étape 8 : Développer le Composant [Sidebar.jsx](file:///c:/wamp64/www/electro-web/src/components/Sidebar.jsx)
- Interface de gestion en verre dépoli avec affichage des calculs physiques en direct.
- Code de `src/components/Sidebar.jsx` :
```jsx
import { useStore } from '../store/useStore'
import { calculateTotalField } from '../physics/coulomb'

export function Sidebar() {
  const {
    charges,
    testPoint,
    addCharge,
    removeCharge,
    updateChargeQ,
    clearCharges,
    ke,
    rMin,
  } = useStore()

  // Calcul du champ à afficher dans l'UI
  const E = calculateTotalField(charges, testPoint, ke, rMin)
  const ENorm = E.length()

  return (
    <aside className="sidebar">
      <div className="brand">
        <h2>ElectroSpace 3D</h2>
        <p className="subtitle">Phase 1 : Bac à sable des charges</p>
      </div>

      <div className="section">
        <h3>Point de Test M</h3>
        <div className="data-box">
          <div className="data-row">
            <span className="label">Position M</span>
            <span className="value font-mono">
              [{testPoint[0].toFixed(2)}, {testPoint[1].toFixed(2)}, {testPoint[2].toFixed(2)}]
            </span>
          </div>
        </div>
      </div>

      <div className="section">
        <h3>Champ Électrique &Evec;</h3>
        <div className="data-box highlight">
          <div className="data-row">
            <span className="label">||E|| (U.A.)</span>
            <span className="value font-mono highlight-text">{ENorm.toFixed(3)}</span>
          </div>
          <div className="data-row separator">
            <span className="label">Ex</span>
            <span className="value font-mono">{E.x.toFixed(3)}</span>
          </div>
          <div className="data-row">
            <span className="label">Ey</span>
            <span className="value font-mono">{E.y.toFixed(3)}</span>
          </div>
          <div className="data-row">
            <span className="label">Ez</span>
            <span className="value font-mono">{E.z.toFixed(3)}</span>
          </div>
        </div>
      </div>

      <div className="section">
        <h3>Actions rapides</h3>
        <div className="btn-group">
          <button className="btn btn-primary" onClick={() => addCharge(1.0)}>
            + Charge (+1.0)
          </button>
          <button className="btn btn-secondary" onClick={() => addCharge(-1.0)}>
            - Charge (-1.0)
          </button>
        </div>
      </div>

      <div className="section flex-grow">
        <div className="section-header">
          <h3>Liste des Charges</h3>
          {charges.length > 0 && (
            <button className="btn-text" onClick={clearCharges}>
              Tout effacer
            </button>
          )}
        </div>
        <div className="charges-list">
          {charges.length === 0 ? (
            <p className="empty-message">Aucune charge dans la scène. Cliquez sur les boutons ci-dessus pour en ajouter.</p>
          ) : (
            charges.map((charge) => (
              <div key={charge.id} className="charge-item">
                <div className="charge-header">
                  <span className={`charge-badge ${charge.q >= 0 ? 'pos' : 'neg'}`}>
                    {charge.q >= 0 ? `+${charge.q.toFixed(1)}` : charge.q.toFixed(1)}
                  </span>
                  <button className="btn-close" onClick={() => removeCharge(charge.id)}>
                    &times;
                  </button>
                </div>
                <div className="charge-controls">
                  <input
                    type="range"
                    min="-5"
                    max="5"
                    step="0.1"
                    value={charge.q}
                    onChange={(e) => updateChargeQ(charge.id, parseFloat(e.target.value))}
                    className="slider"
                  />
                  <div className="charge-pos">
                    Pos: [{charge.position[0].toFixed(1)}, {charge.position[1].toFixed(1)}, {charge.position[2].toFixed(1)}]
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </aside>
  )
}
```

### Étape 9 : Configurer l'Esthétique Globale [index.css](file:///c:/wamp64/www/electro-web/src/index.css)
- Mettre en place la police, le reset, le layout flexbox, et le style verre dépoli/néon.
- Code de `src/index.css` :
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

:root {
  --bg-primary: #070a13;
  --bg-sidebar: rgba(13, 18, 30, 0.7);
  --border-color: rgba(255, 255, 255, 0.08);
  --text-primary: #f3f4f6;
  --text-secondary: #9ca3af;
  --color-pos: #ff3e3e;
  --color-neg: #3e8bff;
  --color-accent: #00ff66;
  --font-sans: 'Inter', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body, html, #root {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background-color: var(--bg-primary);
  font-family: var(--font-sans);
  color: var(--text-primary);
  -webkit-font-smoothing: antialiased;
}

/* Layout général */
.app-container {
  display: flex;
  width: 100%;
  height: 100%;
  position: relative;
}

.canvas-container {
  flex-grow: 1;
  height: 100%;
  position: relative;
}

/* Sidebar Glassmorphism */
.sidebar {
  width: 380px;
  height: 100%;
  background: var(--bg-sidebar);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-right: 1px solid var(--border-color);
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  z-index: 10;
  box-shadow: 10px 0 30px rgba(0, 0, 0, 0.5);
  overflow-y: auto;
}

.brand h2 {
  font-size: 1.5rem;
  font-weight: 700;
  background: linear-gradient(135deg, #fff 0%, #a5b4fc 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: -0.5px;
}

.brand .subtitle {
  font-size: 0.775rem;
  color: var(--text-secondary);
  margin-top: 0.25rem;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.section h3 {
  font-size: 0.875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-secondary);
  border-left: 2px solid var(--color-accent);
  padding-left: 8px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.flex-grow {
  flex-grow: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* Boîtes de données */
.data-box {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.data-box.highlight {
  border-color: rgba(0, 255, 102, 0.2);
  background: rgba(0, 255, 102, 0.02);
}

.data-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
}

.data-row.separator {
  border-top: 1px solid var(--border-color);
  padding-top: 0.5rem;
  margin-top: 0.25rem;
}

.label {
  color: var(--text-secondary);
}

.value {
  color: #fff;
  font-weight: 500;
}

.font-mono {
  font-family: var(--font-mono);
}

.highlight-text {
  color: var(--color-accent);
  text-shadow: 0 0 10px rgba(0, 255, 102, 0.3);
  font-weight: 700;
}

/* Boutons */
.btn-group {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.btn {
  padding: 0.75rem;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  font-family: var(--font-sans);
}

.btn-primary {
  background: var(--color-pos);
  color: #fff;
  box-shadow: 0 4px 12px rgba(255, 62, 62, 0.2);
}

.btn-primary:hover {
  background: #ff5c5c;
  box-shadow: 0 4px 16px rgba(255, 62, 62, 0.4);
  transform: translateY(-1px);
}

.btn-secondary {
  background: var(--color-neg);
  color: #fff;
  box-shadow: 0 4px 12px rgba(62, 139, 255, 0.2);
}

.btn-secondary:hover {
  background: #5c9fff;
  box-shadow: 0 4px 16px rgba(62, 139, 255, 0.4);
  transform: translateY(-1px);
}

.btn-text {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 0.75rem;
  cursor: pointer;
  transition: color 0.2s;
}

.btn-text:hover {
  color: var(--color-pos);
}

/* Liste des charges */
.charges-list {
  border: 1px solid var(--border-color);
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  flex-grow: 1;
  overflow-y: auto;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.empty-message {
  font-size: 0.8125rem;
  color: var(--text-secondary);
  text-align: center;
  margin: auto;
  padding: 1rem;
  line-height: 1.4;
}

.charge-item {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.charge-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.charge-badge {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 9999px;
  color: #fff;
}

.charge-badge.pos {
  background: rgba(255, 62, 62, 0.15);
  color: var(--color-pos);
  border: 1px solid rgba(255, 62, 62, 0.3);
}

.charge-badge.neg {
  background: rgba(62, 139, 255, 0.15);
  color: var(--color-neg);
  border: 1px solid rgba(62, 139, 255, 0.3);
}

.btn-close {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 1.125rem;
  cursor: pointer;
  transition: color 0.15s;
}

.btn-close:hover {
  color: var(--color-pos);
}

.charge-controls {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.charge-pos {
  font-size: 0.75rem;
  color: var(--text-secondary);
  font-family: var(--font-mono);
}

/* Curseur (Slider) personnalisé */
.slider {
  -webkit-appearance: none;
  width: 100%;
  height: 4px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.1);
  outline: none;
  margin: 8px 0;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #fff;
  cursor: pointer;
  transition: transform 0.1s;
}

.slider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
}
```

### Étape 10 : Assembler l'Application [App.jsx](file:///c:/wamp64/www/electro-web/src/App.jsx)
- Assembler le container et charger les composants `Sidebar` et `PhysicsCanvas`.
- Code de `src/App.jsx` :
```jsx
import { Sidebar } from './components/Sidebar'
import { PhysicsCanvas } from './components/PhysicsCanvas'

function App() {
  return (
    <div className="app-container">
      {/* Sidebar 2D */}
      <Sidebar />

      {/* Rendu 3D */}
      <main className="canvas-container">
        <PhysicsCanvas />
      </main>
    </div>
  )
}

export default App
```

---

## Plan de vérification

### Tests Manuels
1. Démarrer le serveur de développement : `npm run dev`.
2. Vérifier que la sidebar s'affiche correctement avec un fond flouté transparent et que le Canvas 3D affiche les deux charges par défaut (rouge à droite, bleue à gauche), le point M jaune et le vecteur vert.
3. Glisser-déplacer la charge rouge et la charge bleue : vérifier que la position se met à jour dans la sidebar et que le vecteur $\vec{E}$ au point M change instantanément.
4. Glisser-déplacer le point M : vérifier que la position se met à jour et que la flèche se recalcule.
5. S'approcher très près d'une charge : vérifier que la longueur de la flèche de champ se stabilise à sa valeur maximale `eMax = 15` et ne cause aucun crash.
6. Cliquer sur les boutons "+ Charge" et "- Charge" : vérifier l'ajout d'une charge dans la scène 3D et dans la liste de la sidebar.
7. Modifier la charge d'un élément avec le slider de la liste : voir la couleur ou la polarité changer (si elle franchit 0) et le champ électrique se recalculer.
8. Supprimer des charges et effacer tout pour vérifier que le comportement correspond aux attentes.
