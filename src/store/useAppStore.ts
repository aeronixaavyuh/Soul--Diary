import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Theme = 'dark' | 'light' | 'system'

interface AppState {
  // Theme
  theme: Theme
  setTheme: (theme: Theme) => void

  // Lock
  isLocked: boolean
  lock: () => void
  unlock: () => void

  // Loading
  isLoading: boolean
  setLoading: (v: boolean) => void

  // Sidebar
  sidebarOpen: boolean
  toggleSidebar: () => void
  setSidebar: (v: boolean) => void

  // Active page
  activePage: string
  setActivePage: (page: string) => void

  // Animations enabled
  animationsEnabled: boolean
  toggleAnimations: () => void

  // App initialization
  statusMessage: string
  setStatusMessage: (message: string) => void
  initApp: () => Promise<void>

  // Settings
  settings: {
    hasPin: boolean
    pinHash: string | null
    autoLock: boolean
    autoLockMinutes: number
    language: string
    fontSize: 'sm' | 'md' | 'lg' | 'xl'
    fontFamily: 'sans' | 'serif'
    animationTheme: 'none' | 'particles' | 'bubbles' | 'butterflies' | 'ocean' | 'stars' | 'aurora' | 'fireflies' | 'rain_light' | 'rain_storm' | 'rain_fog' | 'snow' | 'fog' | 'lightning' | 'sandstorm'
    storageLocation: string | null
  }
  updateSettings: (partial: Partial<AppState['settings']>) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // ── Theme ────────────────────────────────────────────────────────────
      theme: 'dark',
      setTheme: (theme) => {
        set({ theme })
        window.electronAPI?.theme.set(theme)
      },

      // ── Lock ─────────────────────────────────────────────────────────────
      isLocked: false,
      lock: () => set({ isLocked: true }),
      unlock: () => set({ isLocked: false }),

      // ── Loading ──────────────────────────────────────────────────────────
      isLoading: true,
      statusMessage: 'Starting app...',
      setLoading: (v) => set({ isLoading: v }),
      setStatusMessage: (message) => set({ statusMessage: message }),

      // ── Sidebar ──────────────────────────────────────────────────────────
      sidebarOpen: true,
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebar: (v) => set({ sidebarOpen: v }),

      // ── Active Page ──────────────────────────────────────────────────────
      activePage: 'diary',
      setActivePage: (page) => set({ activePage: page }),

      // ── Animations ───────────────────────────────────────────────────────
      animationsEnabled: true,
      toggleAnimations: () =>
        set((s) => ({ animationsEnabled: !s.animationsEnabled })),

      // ── Settings ─────────────────────────────────────────────────────────
      settings: {
        hasPin: false,
        pinHash: null,
        autoLock: false,
        autoLockMinutes: 5,
        language: 'en',
        fontSize: 'md',
        fontFamily: 'serif',
        animationTheme: 'none',
        storageLocation: null,
      },
      updateSettings: (partial) =>
        set((s) => ({
          settings: { ...s.settings, ...partial }
        })),

      // ── App Init ─────────────────────────────────────────────────────────
      initApp: async () => {
        set({ isLoading: true, statusMessage: 'Initializing application...' })
        try {
          set({ statusMessage: 'Connecting to database...' })
          await window.electronAPI?.db.get('SELECT 1')

          set({ statusMessage: 'Verifying encryption...' })
          const initResult = await window.electronAPI?.app.init()
          if (initResult?.success !== true) {
            console.error('App init failed:', initResult?.error)
          }

          set({ statusMessage: 'Loading interface...' })

          // Small delay so splash screen is visible during startup
          await new Promise((r) => setTimeout(r, 800))

          // Check if app has PIN lock
          const { settings } = get()
          if (settings.hasPin) {
            set({ isLocked: true })
          }
        } catch (err) {
          console.error('App init failed:', err)
        } finally {
          set({ isLoading: false })
        }
      },
    }),

    {
      name: 'soul-diary-app-store',
      // Only persist these keys
      partialize: (state) => ({
        theme: state.theme,
        sidebarOpen: state.sidebarOpen,
        animationsEnabled: state.animationsEnabled,
        settings: state.settings,
      }),
    }
  )
) 