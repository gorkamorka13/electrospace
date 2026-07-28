import { useEffect, useRef } from 'react'
import { Sidebar } from './components/Sidebar'
import { PhysicsCanvas } from './components/PhysicsCanvas'
import { ContextMenu } from './components/ContextMenu'
import { HelpModal } from './components/HelpModal'
import { Toast } from './components/Toast'
import { ErrorBoundary } from './components/ErrorBoundary'
import { useStore } from './store/useStore'

function App() {
  const sidebarOpen = useStore((state) => state.sidebarOpen)
  const toggleSidebar = useStore((state) => state.toggleSidebar)
  const setSidebarOpen = useStore((state) => state.setSidebarOpen)
  const theme = useStore((state) => state.theme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // Ref on the root container — passed to R3F Canvas as eventSource
  // so it computes mouse coordinates from the true page origin, fixing
  // the drag offset that occurs when the sidebar shifts the canvas.
  const rootRef = useRef()

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (document.activeElement.tagName === 'INPUT') return

      const key = e.key

      if (key === 'z' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        if (e.shiftKey) {
          useStore.getState().redo()
        } else {
          useStore.getState().undo()
        }
        return
      }

      if (key === '?') {
        e.preventDefault()
        useStore.getState().setShowHelp(!useStore.getState().showHelp)
        return
      }

      if (key === 'Escape') {
        if (useStore.getState().showHelp) {
          useStore.getState().setShowHelp(false)
        } else {
          useStore.getState().closeContextMenu()
        }
        return
      }

      if (e.code === 'KeyH' || key === 'h' || key === 'H') {
        if (!e.shiftKey && !e.getModifierState('Shift')) return
        e.preventDefault()
        useStore.getState().setShowTestPoint(!useStore.getState().showTestPoint)
        return
      }

      let dx = 0
      let dy = 0
      let dz = 0
      let step = 0.1

      if (key === 'PageUp' || key === 'e') {
        if (key === 'PageUp') e.preventDefault()
        dy = step
      } else if (key === 'PageDown' || key === 'c') {
        if (key === 'PageDown') e.preventDefault()
        dy = -step
      } else {
        const k = key.toLowerCase()
        if (k === 'arrowleft' || k === 'q' || k === 'a') {
          dx = -step
        } else if (k === 'arrowright' || k === 'd') {
          dx = step
        } else if (k === 'arrowup' || k === 'z' || k === 'w') {
          dz = -step
        } else if (k === 'arrowdown' || k === 's') {
          dz = step
        }
      }

      if (key === 'Delete') {
        e.preventDefault()
        const id = useStore.getState().selectedObjectId
        if (id && id !== 'testPoint') useStore.getState().removeCharge(id)
      } else if (dx !== 0 || dz !== 0) {
        e.preventDefault()
        useStore.getState().nudgePosition(dx, dz)
      } else if (dy !== 0) {
        useStore.getState().nudgeY(dy)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <>
    <div ref={rootRef} className="app-container">
      {/* Floating Toggle Button */}
      <button
        className={`sidebar-toggle ${sidebarOpen ? 'shifted' : ''}`}
        onClick={toggleSidebar}
        title={sidebarOpen ? "Masquer le panneau" : "Afficher le panneau"}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {sidebarOpen ? (
            <>
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </>
          ) : (
            <>
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </>
          )}
        </svg>
      </button>

      {/* Mobile background overlay */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* 2D Dashboard & Controls */}
      <ErrorBoundary>
        <Sidebar />
      </ErrorBoundary>

      {/* 3D Scene Viewport */}
      <main className="canvas-container">
        <PhysicsCanvas rootRef={rootRef} />
      </main>
    </div>
    <ErrorBoundary>
      <ContextMenu />
    </ErrorBoundary>
    <Toast />
    <HelpModal />
    </>
  )
}

export default App
