import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as THREE from 'three'
import './index.css'
import App from './App.jsx'

// World is Z-up (physics convention): must be set before any camera/controls are created
THREE.Object3D.DEFAULT_UP.set(0, 0, 1)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
