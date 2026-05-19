import { useNavigate, useLocation } from 'react-router-dom'
import { useAppStore } from '@store/useAppStore'
import {
  BookOpen, FileText, Lightbulb, CheckSquare,
  Settings, Lock, ChevronLeft, ChevronRight,
  Search, Moon, Sun, ImageIcon, Flame, Calendar,
} from 'lucide-react'

const NAV_ITEMS = [
  { id: 'diary', label: 'Diary', icon: BookOpen, path: '/diary', color: '#f472b6' },
  { id: 'notes', label: 'Notes', icon: FileText, path: '/notes', color: '#60a5fa' },
  { id: 'ideas', label: 'Ideas', icon: Lightbulb, path: '/ideas', color: '#fbbf24' },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare, path: '/tasks', color: '#34d399' },
  { id: 'habits', label: 'Habits', icon:  Flame, path:  '/habits',  color: '#f97316',},
  { id: 'timeline', label: 'Timeline', icon:  Calendar, path:  '/timeline', color: '#6366f1',},
]

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r}, ${g}, ${b}`
}

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const {
    sidebarOpen, toggleSidebar,
    theme, setTheme,
    lock, settings,
    setActivePage,
  } = useAppStore()

  const isActive = (path: string) => location.pathname === path

  const handleNav = (path: string, id: string) => {
    navigate(path)
    setActivePage(id)
  }

  return (
    <div style={{ position: 'relative', display: 'flex', flexShrink: 0 }}>

      <aside
        style={{
          width: sidebarOpen ? '220px' : '64px',
          minWidth: sidebarOpen ? '220px' : '64px',
          background: 'var(--sidebar-bg)',
          borderRight: '1px solid var(--border)',
          transition: 'width 0.25s ease, min-width 0.25s ease',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* ── Logo ─────────────────────────────────────────────────────── */}
        <div style={{
          padding: '1rem 0.75rem 0.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          minHeight: '60px',
        }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #6366f1 0%, #a78bfa 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 2px 12px rgba(99,102,241,0.4)',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
          </div>

          {sidebarOpen && (
            <div style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
              <div style={{
                fontFamily: "'Playfair Display', serif",
                fontWeight: 700,
                fontSize: '1rem',
                color: 'var(--text-primary)',
                letterSpacing: '0.02em',
              }}>
                Soul Diary
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '1px' }}>
                Private & Encrypted
              </div>
            </div>
          )}
        </div>

        {/* ── Search ───────────────────────────────────────────────────── */}
        <div style={{ padding: '0.5rem 0.75rem' }}>
          <button
            onClick={() => {
              window.dispatchEvent(
                new KeyboardEvent('keydown', {
                  key: 'k',
                  ctrlKey: true,
                  bubbles: true,
                })
              )
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              width: '100%',
              padding: '0.5rem 0.75rem',
              borderRadius: '10px',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border)',
              cursor: 'pointer',
              transition: 'all 0.2s',
              justifyContent: sidebarOpen ? 'flex-start' : 'center',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'
            }}
          >
            <Search size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            {sidebarOpen && (
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                Search...{' '}
                <kbd style={{
                  fontSize: '0.65rem',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  padding: '1px 4px',
                  color: 'var(--text-muted)',
                }}>
                  Ctrl K
                </kbd>
              </span>
            )}
          </button>
        </div>

        {/* ── Section Label ─────────────────────────────────────────────── */}
        {sidebarOpen && (
          <div style={{
            padding: '0.75rem 1rem 0.25rem',
            fontSize: '0.65rem',
            fontWeight: 600,
            color: 'var(--text-muted)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}>
            Content
          </div>
        )}

        {/* ── Nav Items ─────────────────────────────────────────────────── */}
        <nav style={{
          padding: '0.25rem 0.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
          flex: 1,
        }}>
          {NAV_ITEMS.map(item => {
            const Icon = item.icon
            const active = isActive(item.path)
            return (
              <button
                key={item.id}
                onClick={() => handleNav(item.path, item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.6rem 0.75rem',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  border: 'none',
                  width: '100%',
                  justifyContent: sidebarOpen ? 'flex-start' : 'center',
                  background: active
                    ? `rgba(${hexToRgb(item.color)}, 0.12)`
                    : 'transparent',
                  color: active ? item.color : 'var(--text-secondary)',
                  fontFamily: 'inherit',
                  fontSize: '0.875rem',
                  fontWeight: active ? 600 : 400,
                }}
                onMouseEnter={e => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.background = 'var(--bg-tertiary)'
                    ;(e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.background = 'transparent'
                    ;(e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'
                  }
                }}
                title={!sidebarOpen ? item.label : undefined}
              >
                <Icon size={18} style={{ flexShrink: 0, color: active ? item.color : 'inherit' }} />
                {sidebarOpen && (
                  <>
                    <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>
                    {active && (
                      <div style={{
                        width: '5px',
                        height: '5px',
                        borderRadius: '50%',
                        background: item.color,
                        marginLeft: 'auto',
                        flexShrink: 0,
                      }} />
                    )}
                  </>
                )}
              </button>
            )
          })}
        </nav>

        {/* ── Bottom Actions ────────────────────────────────────────────── */}
        <div style={{
          padding: '0.5rem',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
        }}>

          {/* Theme toggle */}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.6rem 0.75rem',
              borderRadius: '10px',
              cursor: 'pointer',
              transition: 'all 0.15s',
              border: 'none',
              width: '100%',
              background: 'transparent',
              color: 'var(--text-secondary)',
              fontFamily: 'inherit',
              fontSize: '0.875rem',
              justifyContent: sidebarOpen ? 'flex-start' : 'center',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = 'var(--bg-tertiary)'
              ;(e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = 'transparent'
              ;(e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'
            }}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark'
              ? <Sun size={18} style={{ flexShrink: 0 }} />
              : <Moon size={18} style={{ flexShrink: 0 }} />
            }
            {sidebarOpen && (
              <span style={{ whiteSpace: 'nowrap' }}>
                {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </span>
            )}
          </button>

          {/* Settings */}
          <button
            onClick={() => handleNav('/settings', 'settings')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.6rem 0.75rem',
              borderRadius: '10px',
              cursor: 'pointer',
              transition: 'all 0.15s',
              border: 'none',
              width: '100%',
              background: isActive('/settings') ? 'var(--bg-tertiary)' : 'transparent',
              color: isActive('/settings') ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontFamily: 'inherit',
              fontSize: '0.875rem',
              justifyContent: sidebarOpen ? 'flex-start' : 'center',
            }}
            onMouseEnter={e => {
              if (!isActive('/settings')) {
                (e.currentTarget as HTMLElement).style.background = 'var(--bg-tertiary)'
                ;(e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'
              }
            }}
            onMouseLeave={e => {
              if (!isActive('/settings')) {
                (e.currentTarget as HTMLElement).style.background = 'transparent'
                ;(e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'
              }
            }}
            title={!sidebarOpen ? 'Settings' : undefined}
          >
            <Settings size={18} style={{ flexShrink: 0 }} />
            {sidebarOpen && <span style={{ whiteSpace: 'nowrap' }}>Settings</span>}
          </button>

          {/* Lock — only if PIN set */}
          {settings.hasPin && (
            <button
              onClick={lock}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.6rem 0.75rem',
                borderRadius: '10px',
                cursor: 'pointer',
                transition: 'all 0.15s',
                border: 'none',
                width: '100%',
                background: 'transparent',
                color: '#ef4444',
                fontFamily: 'inherit',
                fontSize: '0.875rem',
                justifyContent: sidebarOpen ? 'flex-start' : 'center',
              }}
              title="Lock App"
            >
              <Lock size={18} style={{ flexShrink: 0 }} />
              {sidebarOpen && <span style={{ whiteSpace: 'nowrap' }}>Lock App</span>}
            </button>
          )}
        </div>

      </aside>

      {/* ── Collapse Toggle ──────────────────────────────────────────────── */}
      <button
        onClick={toggleSidebar}
        style={{
          position: 'absolute',
          right: '-12px',
          top: '50%',
          transform: 'translateY(-50%)',
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 50,
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          color: 'var(--text-muted)',
          transition: 'all 0.2s',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.background = 'var(--accent)'
          ;(e.currentTarget as HTMLElement).style.color = 'white'
          ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.background = 'var(--bg-card)'
          ;(e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'
          ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'
        }}
        title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
      >
        {sidebarOpen
          ? <ChevronLeft size={13} />
          : <ChevronRight size={13} />
        }
      </button>
    </div>
  )
}