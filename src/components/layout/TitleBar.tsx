import { useEffect, useState } from 'react'
import { Minus, Square, X, Maximize2 } from 'lucide-react'
import { useAppStore } from '@store/useAppStore'

export default function TitleBar() {
  const { theme } = useAppStore()
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    // Check initial state
    window.electronAPI?.window.isMaximized().then(setIsMaximized)

    // Listen for maximize/unmaximize
    window.electronAPI?.on('window:maximized',   () => setIsMaximized(true))
    window.electronAPI?.on('window:unmaximized', () => setIsMaximized(false))
  }, [])

  return (
    <div
      className="drag-region flex items-center justify-between h-10 px-4 shrink-0"
      style={{
        background:  'var(--bg-secondary)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      {/* Left — App name + logo */}
      <div className="no-drag flex items-center gap-2">
        <span style={{ fontSize: '1rem' }}>📔</span>
        <span
          style={{
            fontFamily:    "'Playfair Display', serif",
            fontSize:      '0.875rem',
            fontWeight:    600,
            color:         'var(--text-secondary)',
            letterSpacing: '0.03em',
          }}
        >
          Soul Diary
        </span>
      </div>

      {/* Center — drag region (empty, just for dragging) */}
      <div className="flex-1" />

      {/* Right — Window controls */}
      <div className="no-drag flex items-center gap-1">
        {/* Minimize */}
        <button
          onClick={() => window.electronAPI?.window.minimize()}
          className="w-8 h-8 rounded-lg flex items-center justify-center
                     transition-colors duration-150"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--bg-tertiary)'
            e.currentTarget.style.color      = 'var(--text-primary)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color      = 'var(--text-muted)'
          }}
          title="Minimize"
        >
          <Minus size={14} />
        </button>

        {/* Maximize / Restore */}
        <button
          onClick={() => window.electronAPI?.window.maximize()}
          className="w-8 h-8 rounded-lg flex items-center justify-center
                     transition-colors duration-150"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--bg-tertiary)'
            e.currentTarget.style.color      = 'var(--text-primary)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color      = 'var(--text-muted)'
          }}
          title={isMaximized ? 'Restore' : 'Maximize'}
        >
          {isMaximized
            ? <Square size={12} />
            : <Maximize2 size={13} />
          }
        </button>

        {/* Close */}
        <button
          onClick={() => window.electronAPI?.window.close()}
          className="w-8 h-8 rounded-lg flex items-center justify-center
                     transition-colors duration-150"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#ef4444'
            e.currentTarget.style.color      = 'white'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color      = 'var(--text-muted)'
          }}
          title="Close"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}