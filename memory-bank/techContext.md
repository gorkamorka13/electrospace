# Electrospace — Technical Context

## Technology Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Framework** | React | ^19.2.7 | UI component library |
| **Build Tool** | Vite | ^8.1.0 | Dev server, bundling, HMR |
| **3D Engine** | Three.js | ^0.185.0 | WebGL 3D rendering |
| **React-Three-Fiber** | @react-three/fiber | ^9.6.1 | Declarative Three.js for React |
| **Drei** | @react-three/drei | ^10.7.7 | R3F utilities (controls, helpers) |
| **State Management** | Zustand | ^5.0.14 | Global state with subscriptions |
| **Math Rendering** | KaTeX | CDN | LaTeX formula rendering in UI |
| **Testing** | Vitest | ^4.1.10 | Unit testing framework |
| **Linting** | ESLint | ^10.5.0 | Code quality |
| **Deployment** | Cloudflare Workers | — | Hosting via wrangler |
| **Cloudflare Plugin** | @cloudflare/vite-plugin | ^1.43.0 | Vite integration for CF |
| **Wrangler** | wrangler | ^4.107.0 | Cloudflare CLI |

## Development Setup

### Prerequisites
- Node.js (latest LTS)
- npm (comes with Node.js)
- Git
- Modern browser with WebGL support

### Commands
```bash
npm run dev        # Start Vite dev server with HMR
npm run build      # Production build
npm run preview    # Build + preview with wrangler
npm run test       # Vitest watch mode
npm run test:run   # Vitest single run
npm run lint       # ESLint check
npm run deploy     # Build + deploy to Cloudflare
```

### Project Structure
```
electrospace/
├── index.html                  # Entry HTML
├── vite.config.js              # Vite config (React + Cloudflare plugins)
├── wrangler.jsonc              # Cloudflare Workers config
├── package.json                # Dependencies & scripts
├── eslint.config.js            # ESLint flat config
├── public/                     # Static assets (icons, manifest)
│   ├── manifest.json
│   ├── favicon.ico
│   └── icon-*.png
├── src/
│   ├── main.jsx                # React entry point
│   ├── App.jsx                 # Root component (layout, keyboard)
│   ├── index.css               # Global styles (dark/light theme)
│   ├── assets/                 # Static images
│   ├── components/             # React components
│   │   ├── PhysicsCanvas.jsx   # R3F Canvas container
│   │   ├── Sidebar.jsx         # Main control panel (759 lines)
│   │   ├── GaussWizard.jsx     # 5-step Gauss companion
│   │   ├── ChargeSphere.jsx    # 3D charge sphere with drag
│   │   ├── ElectricFieldArrow.jsx  # Field vector at M
│   │   ├── TestPoint.jsx       # Movable measurement point
│   │   ├── FieldLines.jsx      # Field line tracing
│   │   ├── DistributionVis.jsx # Continuous distribution renderer
│   │   ├── GaussianSurfaceVis.jsx  # Gauss surface renderer
│   │   ├── Equipotentials.jsx  # 2D equipotential contours
│   │   ├── Equipotentials3D.jsx    # 3D isosurfaces
│   │   ├── FieldGraph.jsx      # 2D E(x) plot
│   │   ├── PotentialXGraph.jsx # 2D V(x) plot
│   │   ├── ForceArrows.jsx     # Coulomb force visualization
│   │   ├── ChargeMotion.jsx    # Dynamic charge animation
│   │   ├── ChargeTrajectory.jsx    # Trajectory trails
│   │   ├── DipoleMoment.jsx    # Dipole moment vector
│   │   ├── ThroughMLine.jsx    # Field line through M
│   │   ├── ContextMenu.jsx     # Right-click menu
│   │   ├── HelpModal.jsx       # Keyboard shortcuts
│   │   ├── Toast.jsx           # Notifications
│   │   └── ErrorBoundary.jsx   # Error boundary
│   ├── physics/                # Physics engine
│   │   ├── coulomb.js          # Coulomb's law (E, V, F) — 896 lines
│   │   ├── gauss.js            # Gauss theorem — 381 lines
│   │   ├── marchingCubes.js    # 3D isosurface generation
│   │   ├── constants.js        # World & physics constants
│   │   ├── utils.js            # Vector/math helpers
│   │   ├── gauss.test.js       # Gauss tests
│   │   └── utils.test.js       # Utils tests
│   ├── store/
│   │   └── useStore.js         # Zustand store — 577 lines
│   └── utils/
│       └── math.jsx            # KaTeX rendering helpers
├── docs/
│   ├── improvements-recommendations.md  # Improvement analysis
│   └── electro_project.md               # Original project spec
├── memory-bank/                # Cline's memory bank (this)
└── .clinerules/
    └── memory-bank.md          # Memory bank instructions
```

## Technical Constraints

### Browser Compatibility
- Requires WebGL 2.0 support (all modern browsers)
- No IE11 support
- Mobile: responsive layout, but 3D performance varies
- Recommended: Chrome/Firefox/Edge (latest), Safari 15+

### Performance Considerations
- **60 FPS target** for simple scenes (≤10 charges, no distributions)
- **Distribution calculations** are CPU-bound (numerical integration over samples)
- **Marching cubes** for 3D equipotentials is computationally expensive (MC_RESOLUTION = 30)
- **Field lines** require iterative tracing (step size, max steps)
- **Web Workers** not yet implemented for heavy computations (planned for Phase 6)
- Known issue: geometries recreated on every render in some components (GaussianSurfaceVis)

### Dependencies
- **No backend required** — fully client-side
- **KaTeX loaded from CDN** — requires internet connection for formula rendering
- **Three.js** is the only heavy dependency (~600KB minified)
- **Cloudflare plugin** only needed for deployment, not development

## Tool Usage Patterns

### State Access Pattern
```jsx
// Subscribe to specific slices (avoids unnecessary re-renders)
const charges = useStore((state) => state.charges)
const testPoint = useStore((state) => state.testPoint)

// Getter functions for computed values
const E = useStore.getState().getElectricField(testPoint)

// Actions
const addCharge = useStore((state) => state.addCharge)
```

### R3F Component Pattern
```jsx
function My3DComponent() {
  const meshRef = useRef()

  useFrame((state, delta) => {
    // Per-frame updates
    meshRef.current.rotation.y += delta
  })

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshStandardMaterial color="red" />
    </mesh>
  )
}
```

### Physics Calculation Pattern
```js
// Pure function — no side effects, testable
export function calculateTotalField(charges, targetPos, ke, rMin, distributions) {
  const totalField = new THREE.Vector3(0, 0, 0)
  charges.forEach(c => totalField.add(calculateFieldFromCharge(c, targetPos, ke, rMin)))
  distributions.forEach(d => totalField.add(calculateFieldFromDistribution(d, targetPos, ke, rMin)))
  return totalField
}
```

### Testing Pattern
```js
// Vitest with descriptive test names
import { describe, it, expect } from 'vitest'
describe('calculateGaussParameters', () => {
  it('should return zero enclosed charge for hollow sphere when r_g < R', () => {
    // ...
  })
})
```

## Known Technical Debt

1. **Sidebar monolith** (759 lines) — should be split into tabbed panels
2. **KaTeX helpers duplicated** in GaussWizard — should use shared `utils/math.jsx`
3. **Geometry re-creation** in GaussianSurfaceVis — missing `useMemo`
4. **History push during drag** — `updateChargePosition` calls `pushHistory()` at 60fps
5. **No Web Workers** — heavy calculations block the main thread
6. **Single distribution limit** — `addDistribution` replaces existing distributions
7. **Error handling** — `importScene` error messages improved but could be better
8. **No i18n** — UI is primarily French, no English toggle
