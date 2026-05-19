import { useEffect, useState } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'

import { useAppStore } from '@store/useAppStore'

import AppShell from '@components/layout/AppShell'
import LockScreen from '@pages/LockScreen'
import DiaryPage from '@pages/DiaryPage'
import NotesPage from '@pages/NotesPage'
import IdeasPage from '@pages/IdeasPage'
import TasksPage from '@pages/TasksPage'
import SettingsPage from '@pages/SettingsPage'

import LoadingScreen from '@components/ui/LoadingScreen'
import CommandPalette from '@components/ui/CommandPalette'
import SearchModal from '@components/ui/SearchModal'
import ToastContainer from '@components/ui/ToastNotification'
import HabitsPage from '@pages/HabitsPage'
import TimelinePage from '@pages/TimelinePage'


export default function App() {

  const { theme, isLocked, isLoading, initApp } = useAppStore()

  const [appReady, setAppReady] = useState(false)
  const [cmdOpen, setCmdOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  // ─────────────────────────────────────────────────────────────
  // App Initialize
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      await initApp()
      setAppReady(true)
    }

    init()
  }, [])

  // ─────────────────────────────────────────────────────────────
  // Theme Apply
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {

    const root = document.documentElement

    const applyTheme = (dark: boolean) => {

      if (dark) {
        root.classList.add('dark')
        root.classList.remove('light')

        // document.body.style.backgroundColor = '#0f0f1a'
        document.body.style.color = '#e2e8f0'

      } else {

        root.classList.remove('dark')
        root.classList.add('light')

        // document.body.style.backgroundColor = '#f8f9fc'
        document.body.style.color = '#0f0f1a'
      }
    }

    if (theme === 'dark') {

      applyTheme(true)

    } else if (theme === 'light') {

      applyTheme(false)

    } else {

      const prefersDark = window
        .matchMedia('(prefers-color-scheme: dark)')
        .matches

      applyTheme(prefersDark)

      const mq = window.matchMedia('(prefers-color-scheme: dark)')

      const handler = (e: MediaQueryListEvent) => {
        applyTheme(e.matches)
      }

      mq.addEventListener('change', handler)

      return () => {
        mq.removeEventListener('change', handler)
      }
    }

  }, [theme])

  // ─────────────────────────────────────────────────────────────
  // Global Shortcuts
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {

    const handler = async (e: KeyboardEvent) => {

      // ── Ctrl + K → Command Palette ──────────────────────────
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault()
        e.stopPropagation()

        setCmdOpen(v => !v)
        return
      }

      // ── Ctrl + F → Search Modal ────────────────────────────
      if (e.ctrlKey && e.key === 'f') {
        e.preventDefault()
        e.stopPropagation()

        setSearchOpen(v => !v)
        return
      }

      // ── Escape → Close Modals ──────────────────────────────
      if (e.key === 'Escape') {

        if (cmdOpen) {
          e.preventDefault()
          setCmdOpen(false)
        }

        if (searchOpen) {
          e.preventDefault()
          setSearchOpen(false)
        }

        return
      }

      // ── Modal Open → Ignore Remaining Shortcuts ────────────
      if (cmdOpen || searchOpen) return

      // ── Ctrl + L → Lock App ────────────────────────────────
      if (e.ctrlKey && e.key === 'l') {

        e.preventDefault()

        const { settings, lock } = useAppStore.getState()

        if (settings.hasPin) {
          lock()
        }

        return
      }

      // ── Ctrl + S → Prevent Browser Save ───────────────────
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault()
        return
      }

      // ── Alt + 1 → Diary ────────────────────────────────────
      if (e.altKey && e.key === '1') {
        e.preventDefault()
        window.location.hash = '#/diary'
        return
      }

      // ── Alt + 2 → Notes ────────────────────────────────────
      if (e.altKey && e.key === '2') {
        e.preventDefault()
        window.location.hash = '#/notes'
        return
      }

      // ── Alt + 3 → Ideas ────────────────────────────────────
      if (e.altKey && e.key === '3') {
        e.preventDefault()
        window.location.hash = '#/ideas'
        return
      }

      // ── Alt + 4 → Tasks ────────────────────────────────────
      if (e.altKey && e.key === '4') {
        e.preventDefault()
        window.location.hash = '#/tasks'
        return
      }

      // ── Alt + , → Settings ─────────────────────────────────
      if (e.altKey && e.key === ',') {
        e.preventDefault()
        window.location.hash = '#/settings'
        return
      }
    }

    // capture: true
    window.addEventListener('keydown', handler, true)

    return () => {
      window.removeEventListener('keydown', handler, true)
    }

  }, [cmdOpen, searchOpen])

  // ─────────────────────────────────────────────────────────────
  // Loading / Lock Screen
  // ─────────────────────────────────────────────────────────────
  if (!appReady || isLoading) {
    return <LoadingScreen />
  }

  if (isLocked) {
    return <LockScreen />
  }

  // ─────────────────────────────────────────────────────────────
  // App Render
  // ─────────────────────────────────────────────────────────────
  return (

    <HashRouter>

      <AppShell>

        <Routes>
          <Route path="/" element={<Navigate to="/diary" replace />} />
          <Route path="/diary" element={<DiaryPage />} />
          <Route path="/notes" element={<NotesPage />} />
          <Route path="/ideas" element={<IdeasPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/habits" element={<HabitsPage />} />\
          <Route path="/timeline" element={<TimelinePage />} />
        </Routes>

      </AppShell>

      {/* Command Palette */}
      <CommandPalette
        open={cmdOpen}
        onClose={() => setCmdOpen(false)}
      />

      {/* Search Modal */}
      <SearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
      />
      <ToastContainer />

    </HashRouter>
  )
}