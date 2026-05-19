import { ReactNode, useEffect } from 'react'
import TitleBar from './TitleBar'
import Sidebar from './Sidebar'
import { useAppStore } from '@store/useAppStore'
import AnimatedBackground from '@themes/AnimatedBackground'


interface AppShellProps {
  children: ReactNode
}

export default function AppShell({ children }: AppShellProps) {
  const { theme } = useAppStore()

  return (
    <>
      <div
        style={{
          width: '100vw',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          // ✅ Uses CSS variable — updates with theme
          background: 'var(--bg-primary)',
          color: 'var(--text-primary)',
          transition: 'background-color 0.3s ease, color 0.3s ease',
        }}
      >
        {/* Custom title bar */}
        <TitleBar />

        <AnimatedBackground />

        {/* Main layout */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <Sidebar />

          {/* Page content */}
          <main
            className="selectable"
            style={{
              flex: 1,
              overflow: 'auto',
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              transition: 'background-color 0.3s ease',
            }}
          >
            {children}
          </main>
        </div>
      </div>
    </>
  )
}