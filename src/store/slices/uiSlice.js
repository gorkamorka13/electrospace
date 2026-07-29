export const createUISlice = (set, get) => ({
  isDragging: false,
  sidebarOpen: typeof window !== 'undefined' ? window.innerWidth > 768 : true,
  theme: typeof window !== 'undefined' ? (localStorage.getItem('theme') || 'dark') : 'dark',
  snapEnabled: false,
  snapSize: 0.5,
  lockedAxes: { x: false, y: false, z: false },
  activeView: 'isometric',
  cameraMode: 'perspective',
  selectedObjectId: 'testPoint',
  contextMenu: null,
  showHelp: false,
  toast: null,
  showTestPoint: true,

  setDragging: (isDragging) => set({ isDragging }),
  setSelectedObjectId: (id) => set({ selectedObjectId: id }),
  openContextMenu: (x, y, id, type = 'charge') => set({ contextMenu: { x, y, id, type } }),
  closeContextMenu: () => set({ contextMenu: null }),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  toggleTheme: () => set((state) => {
    const newTheme = state.theme === 'dark' ? 'light' : 'dark'
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', newTheme)
    }
    return { theme: newTheme }
  }),
  setSnapEnabled: (snapEnabled) => set({ snapEnabled }),
  setSnapSize: (snapSize) => set({ snapSize }),
  toggleLockedAxis: (axis) => set((state) => ({ lockedAxes: { ...state.lockedAxes, [axis]: !state.lockedAxes[axis] } })),
  setActiveView: (activeView) => set({ activeView }),
  setCameraMode: (cameraMode) => set({ cameraMode }),
  setShowHelp: (v) => set({ showHelp: v }),
  setShowTestPoint: (v) => set((state) => ({
    showTestPoint: v,
    selectedObjectId: (!v && state.selectedObjectId === 'testPoint') ? null : state.selectedObjectId,
  })),
  setToast: ({ message, type = 'error', duration = 4000 }) => {
    set({ toast: { message, type } })
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        const current = get().toast
        if (current && current.message === message) set({ toast: null })
      }, duration)
    }
  },
})
