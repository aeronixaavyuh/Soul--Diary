import { useEffect, useState, useCallback } from 'react'
import { useAppStore } from '@store/useAppStore'
import PDFExport from '@components/ui/PDFExport'
import {
  Settings, Moon, Sun, Monitor,
  Lock, Unlock, Eye, EyeOff,
  Type, Palette, Brain, Database,
  Download, Upload, Trash2, FolderOpen,
  Check, X, Loader2, AlertCircle,
  ChevronRight, Shield, Zap, Info,
  RefreshCw, HardDrive, Cpu,
} from 'lucide-react'

// ─── Section IDs ──────────────────────────────────────────────────────────────

type SectionId =
  | 'appearance'
  | 'security'
  | 'editor'
  | 'ai'
  | 'storage'
  | 'backup'
  | 'about'

const SECTIONS: { id: SectionId; label: string; icon: React.ReactNode; desc: string }[] = [
  { id: 'appearance', label: 'Appearance', icon: <Palette size={16} />, desc: 'Theme, colors, animations' },
  { id: 'security', label: 'Security', icon: <Shield size={16} />, desc: 'PIN lock, encryption' },
  { id: 'editor', label: 'Editor', icon: <Type size={16} />, desc: 'Font, size, writing preferences' },
  { id: 'ai', label: 'AI Settings', icon: <Brain size={16} />, desc: 'Ollama model, AI features' },
  { id: 'storage', label: 'Storage', icon: <Database size={16} />, desc: 'Database location, data path' },
  { id: 'backup', label: 'Backup', icon: <Download size={16} />, desc: 'Export, import, restore data' },
  { id: 'about', label: 'About', icon: <Info size={16} />, desc: 'App version, credits' },
]

// ─── SettingsPage ─────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const {
    theme, setTheme,
    animationsEnabled, toggleAnimations,
    settings, updateSettings,
  } = useAppStore()

  const [activeSection, setActiveSection] = useState<SectionId>('appearance')

  return (
    <div style={{
      display: 'flex',
      height: '100%',
      overflow: 'hidden',
      background: 'var(--bg-primary)',
    }}>

      {/* ── Sidebar nav ───────────────────────────────────────────────── */}
      <div style={{
        width: '220px',
        minWidth: '220px',
        borderRight: '1px solid var(--border)',
        background: 'var(--bg-secondary)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1rem 0.75rem',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Settings size={16} style={{ color: 'var(--accent)' }} />
            <span style={{
              fontFamily: "'Playfair Display', serif",
              fontWeight: 700,
              fontSize: '1rem',
              color: 'var(--text-primary)',
            }}>
              Settings
            </span>
          </div>
        </div>

        {/* Nav items */}
        <nav style={{ padding: '0.5rem', flex: 1, overflowY: 'auto' }}>
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                width: '100%',
                padding: '0.55rem 0.75rem',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                background: activeSection === s.id
                  ? 'rgba(99,102,241,0.12)' : 'transparent',
                color: activeSection === s.id
                  ? 'var(--accent)' : 'var(--text-secondary)',
                fontFamily: 'inherit',
                fontSize: '0.85rem',
                fontWeight: activeSection === s.id ? 600 : 400,
                transition: 'all 0.15s',
                textAlign: 'left',
                marginBottom: '2px',
              }}
              onMouseEnter={e => {
                if (activeSection !== s.id)
                  (e.currentTarget as HTMLElement).style.background = 'var(--bg-tertiary)'
              }}
              onMouseLeave={e => {
                if (activeSection !== s.id)
                  (e.currentTarget as HTMLElement).style.background = 'transparent'
              }}
            >
              <span style={{
                color: activeSection === s.id ? 'var(--accent)' : 'var(--text-muted)',
                display: 'flex',
              }}>
                {s.icon}
              </span>
              <div>
                <div>{s.label}</div>
                <div style={{
                  fontSize: '0.65rem',
                  color: 'var(--text-muted)',
                  fontWeight: 400,
                  lineHeight: 1.3,
                }}>
                  {s.desc}
                </div>
              </div>
            </button>
          ))}
        </nav>
      </div>

      {/* ── Content panel ─────────────────────────────────────────────── */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '1.5rem 2rem',
        minWidth: 0,
      }}>
        {activeSection === 'appearance' && (
          <AppearanceSection
            theme={theme}
            setTheme={setTheme}
            animationsEnabled={animationsEnabled}
            toggleAnimations={toggleAnimations}
            settings={settings}
            updateSettings={updateSettings}
          />
        )}
        {activeSection === 'security' && <SecuritySection settings={settings} updateSettings={updateSettings} />}
        {activeSection === 'editor' && <EditorSection settings={settings} updateSettings={updateSettings} />}
        {activeSection === 'ai' && <AISection />}
        {activeSection === 'storage' && <StorageSection />}
        {activeSection === 'backup' && <BackupSection />}
        {activeSection === 'about' && <AboutSection />}
      </div>
    </div>
  )
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

function SectionHeader({ title, desc }: { title: string; desc: string }) {
  return (
    <div style={{ marginBottom: '1.75rem' }}>
      <h2 style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: '1.35rem',
        fontWeight: 700,
        color: 'var(--text-primary)',
        marginBottom: '0.3rem',
      }}>
        {title}
      </h2>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
        {desc}
      </p>
    </div>
  )
}

function SettingRow({
  label, desc, children
}: {
  label: string; desc?: string; children: React.ReactNode
}) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0.875rem 1rem',
      borderRadius: '12px',
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border)',
      marginBottom: '0.6rem',
      gap: '1rem',
    }}>
      <div>
        <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>
          {label}
        </div>
        {desc && (
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px', lineHeight: 1.4 }}>
            {desc}
          </div>
        )}
      </div>
      <div style={{ flexShrink: 0 }}>
        {children}
      </div>
    </div>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      style={{
        width: '44px',
        height: '24px',
        borderRadius: '12px',
        border: 'none',
        cursor: 'pointer',
        background: checked
          ? 'linear-gradient(135deg, #6366f1, #a78bfa)'
          : 'var(--bg-tertiary)',
        position: 'relative',
        transition: 'background 0.2s',
        flexShrink: 0,
        boxShadow: checked ? '0 0 8px rgba(99,102,241,0.4)' : 'none',
      }}
    >
      <div style={{
        position: 'absolute',
        top: '3px',
        left: checked ? '23px' : '3px',
        width: '18px',
        height: '18px',
        borderRadius: '50%',
        background: 'white',
        transition: 'left 0.2s',
        boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
      }} />
    </button>
  )
}

function GroupLabel({ label }: { label: string }) {
  return (
    <div style={{
      fontSize: '0.68rem',
      fontWeight: 600,
      color: 'var(--text-muted)',
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      marginBottom: '0.5rem',
      marginTop: '1rem',
    }}>
      {label}
    </div>
  )
}

// ─── Appearance Section ───────────────────────────────────────────────────────

function AppearanceSection({ theme, setTheme, animationsEnabled, toggleAnimations, settings, updateSettings }: any) {
  return (
    <div>
      <SectionHeader
        title="Appearance"
        desc="Customize the look and feel of Soul Diary."
      />

      <GroupLabel label="Theme" />

      {/* Theme options */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
        {([
          { value: 'dark', label: 'Dark', icon: <Moon size={18} />, desc: 'Easy on the eyes at night' },
          { value: 'light', label: 'Light', icon: <Sun size={18} />, desc: 'Clean and bright feel' },
          { value: 'system', label: 'System', icon: <Monitor size={18} />, desc: 'Follows your OS setting' },
        ] as const).map(t => (
          <button
            key={t.value}
            onClick={() => setTheme(t.value)}
            style={{
              flex: 1,
              padding: '1rem 0.75rem',
              borderRadius: '12px',
              border: `2px solid ${theme === t.value ? 'var(--accent)' : 'var(--border)'}`,
              background: theme === t.value
                ? 'rgba(99,102,241,0.08)' : 'var(--bg-secondary)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'all 0.15s',
              color: theme === t.value ? 'var(--accent)' : 'var(--text-secondary)',
            }}
          >
            {t.icon}
            <span style={{ fontSize: '0.8rem', fontWeight: 600, fontFamily: 'inherit' }}>
              {t.label}
            </span>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'center' }}>
              {t.desc}
            </span>
            {theme === t.value && (
              <div style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: 'var(--accent)',
              }} />
            )}
          </button>
        ))}
      </div>

      <GroupLabel label="Animations & Performance" />

      <SettingRow
        label="Enable Animations"
        desc="Smooth transitions and micro-interactions. Disable to save battery."
      >
        <Toggle checked={animationsEnabled} onChange={toggleAnimations} />
      </SettingRow>

      <SettingRow
        label="Animated Background Theme"
        desc="Decorative background animations (only if animations are enabled)."
      >
        <select
          value={settings.animationTheme}
          onChange={e => updateSettings({ animationTheme: e.target.value })}
          disabled={!animationsEnabled}
          style={{
            padding: '0.35rem 0.6rem',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            background: 'var(--bg-tertiary)',
            color: animationsEnabled ? 'var(--text-primary)' : 'var(--text-muted)',
            fontSize: '0.8rem',
            fontFamily: 'inherit',
            cursor: animationsEnabled ? 'pointer' : 'not-allowed',
            outline: 'none',
          }}
        >
          <option value="none">None (Best performance)</option>
          <option value="particles">✨ Particles</option>
          <option value="bubbles">🫧 Bubbles</option>
          <option value="butterflies">🦋 Butterflies</option>
          <option value="ocean">🌊 Ocean</option>
          {/* ── Night Sky ── */}
          <option disabled>── Night Sky ──</option>
          <option value="stars">☄️Shooting Stars &amp;🌌 Milky Way</option>
          <option value="aurora">🌠 Aurora Borealis</option>
          <option value="fireflies">🪲 Fireflies</option>
          {/* ── Weather ── */}
          <option disabled>── Weather ──</option>
          <option value="rain_light">🌧️ Rain — Light</option>
          <option value="rain_storm">⛈️ Rain — Thunderstorm</option>
          <option value="rain_fog">🌫️ Rain — Fog</option>
          <option value="snow">❄️ Snow</option>
          <option value="fog">🌁 Fog / Mist</option>
          <option value="lightning">⚡ Lightning</option>
          <option value="sandstorm">🏜️ Sandstorm</option>
        </select>
      </SettingRow>

      <GroupLabel label="Language" />

      <SettingRow label="App Language" desc="Language for the user interface.">
        <select
          value={settings.language}
          onChange={e => updateSettings({ language: e.target.value })}
          style={{
            padding: '0.35rem 0.6rem',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            background: 'var(--bg-tertiary)',
            color: 'var(--text-primary)',
            fontSize: '0.8rem',
            fontFamily: 'inherit',
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          <option value="en">🇺🇸 English</option>
          <option value="hi">🇮🇳 Hindi (coming soon)</option>
          <option value="es">🇪🇸 Spanish (coming soon)</option>
          <option value="fr">🇫🇷 French (coming soon)</option>
          <option value="de">🇩🇪 German (coming soon)</option>
          <option value="ja">🇯🇵 Japanese (coming soon)</option>
        </select>
      </SettingRow>
    </div>
  )
}

// ─── Security Section ─────────────────────────────────────────────────────────

function SecuritySection({ settings, updateSettings }: any) {
  const [showSetPin, setShowSetPin] = useState(false)
  const [showRemovePin, setShowRemovePin] = useState(false)
  const [pin, setPin] = useState(['', '', '', ''])
  const [confirmPin, setConfirmPin] = useState(['', '', '', ''])
  const [currentPin, setCurrentPin] = useState(['', '', '', ''])
  const [showPin, setShowPin] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  const showMsg = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 3000)
  }

  const handleSetPin = async () => {
    const pinStr = pin.join('')
    const confirmStr = confirmPin.join('')

    if (pinStr.length !== 4) return showMsg('PIN must be exactly 4 digits', 'error')
    if (pinStr !== confirmStr) return showMsg('PINs do not match', 'error')

    setLoading(true)
    try {
      const res = await window.electronAPI.db.run(
        `INSERT INTO app_settings (key, value, updated_at) VALUES ('hasPin','true',datetime('now'))
         ON CONFLICT(key) DO UPDATE SET value='true', updated_at=datetime('now')`
      )
      await (window.electronAPI as any).invokeIpc?.('pin:set', pinStr)

      updateSettings({ hasPin: true, pinHash: btoa(pinStr) })
      setPin(['', '', '', ''])
      setConfirmPin(['', '', '', ''])
      setShowSetPin(false)
      showMsg('PIN set successfully! App will lock on next launch.', 'success')
    } catch (err) {
      showMsg('Failed to set PIN. Please try again.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleRemovePin = async () => {
    const current = currentPin.join('')
    if (current.length !== 4) return showMsg('Enter your current PIN', 'error')

    setLoading(true)
    try {
      if (btoa(current) !== settings.pinHash) {
        return showMsg('Wrong PIN', 'error')
      }
      updateSettings({ hasPin: false, pinHash: null })
      setCurrentPin(['', '', '', ''])
      setShowRemovePin(false)
      showMsg('PIN removed. App is now unlocked.', 'success')
    } catch {
      showMsg('Failed to remove PIN.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const PinInput = ({
    value, onChange
  }: {
    value: string[]; onChange: (v: string[]) => void
  }) => (
    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
      {value.map((digit, i) => (
        <input
          key={i}
          type={showPin ? 'text' : 'password'}
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={e => {
            if (!/^\d*$/.test(e.target.value)) return
            const next = [...value]
            next[i] = e.target.value.slice(-1)
            onChange(next)
            if (e.target.value && i < 3) {
              const inputs = document.querySelectorAll<HTMLInputElement>('.pin-input-' + (i + 1))
              inputs[0]?.focus()
            }
          }}
          onKeyDown={e => {
            if (e.key === 'Backspace' && !value[i] && i > 0) {
              const inputs = document.querySelectorAll<HTMLInputElement>('.pin-input-' + (i - 1))
              inputs[0]?.focus()
            }
          }}
          className={`selectable pin-input-${i}`}
          style={{
            width: '44px',
            height: '48px',
            textAlign: 'center',
            fontSize: '1.25rem',
            fontWeight: 700,
            borderRadius: '10px',
            border: `2px solid ${digit ? 'var(--accent)' : 'var(--border)'}`,
            background: 'var(--bg-tertiary)',
            color: 'var(--text-primary)',
            outline: 'none',
            transition: 'border-color 0.15s',
          }}
        />
      ))}
    </div>
  )

  return (
    <div>
      <SectionHeader
        title="Security"
        desc="Protect your diary with PIN lock and encryption."
      />

      {/* Message */}
      {message && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.6rem 1rem',
          borderRadius: '10px',
          background: message.type === 'success'
            ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
          border: `1px solid ${message.type === 'success'
            ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
          color: message.type === 'success' ? '#22c55e' : '#ef4444',
          fontSize: '0.82rem',
          marginBottom: '1rem',
        }}>
          {message.type === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
          {message.text}
        </div>
      )}

      <GroupLabel label="PIN Lock" />

      <SettingRow
        label="PIN Protection"
        desc={settings.hasPin
          ? 'App is protected with a 4-digit PIN'
          : 'No PIN set — app opens without a password'}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {settings.hasPin
            ? <Lock size={14} style={{ color: '#22c55e' }} />
            : <Unlock size={14} style={{ color: 'var(--text-muted)' }} />
          }
          <span style={{
            fontSize: '0.78rem',
            color: settings.hasPin ? '#22c55e' : 'var(--text-muted)',
            fontWeight: 500,
          }}>
            {settings.hasPin ? 'Protected' : 'Unprotected'}
          </span>
        </div>
      </SettingRow>

      {/* Set PIN */}
      {!settings.hasPin && (
        <div style={{ marginBottom: '0.6rem' }}>
          <button
            onClick={() => setShowSetPin(v => !v)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.6rem 1.25rem',
              borderRadius: '10px',
              border: '1px solid var(--accent)',
              background: 'rgba(99,102,241,0.08)',
              color: 'var(--accent)',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.15s',
            }}
          >
            <Lock size={14} />
            Set PIN Lock
            <ChevronRight
              size={14}
              style={{
                transform: showSetPin ? 'rotate(90deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s',
              }}
            />
          </button>

          {showSetPin && (
            <div style={{
              marginTop: '0.75rem',
              padding: '1rem',
              borderRadius: '12px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
            }}>
              {/* Show/hide toggle */}
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                marginBottom: '0.5rem',
              }}>
                <button
                  onClick={() => setShowPin(v => !v)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    fontSize: '0.75rem',
                    fontFamily: 'inherit',
                  }}
                >
                  {showPin ? <EyeOff size={13} /> : <Eye size={13} />}
                  {showPin ? 'Hide' : 'Show'} PIN
                </button>
              </div>

              <div style={{ marginBottom: '0.75rem' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                  Enter new 4-digit PIN:
                </div>
                <PinInput value={pin} onChange={setPin} />
              </div>

              <div style={{ marginBottom: '0.75rem' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                  Confirm PIN:
                </div>
                <PinInput value={confirmPin} onChange={setConfirmPin} />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={handleSetPin}
                  disabled={loading || pin.join('').length !== 4 || confirmPin.join('').length !== 4}
                  style={{
                    padding: '0.45rem 1.25rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'var(--accent)',
                    color: 'white',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  {loading && <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />}
                  Set PIN
                </button>
                <button
                  onClick={() => { setShowSetPin(false); setPin(['', '', '', '']); setConfirmPin(['', '', '', '']) }}
                  style={{
                    padding: '0.45rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'transparent',
                    color: 'var(--text-muted)',
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Remove PIN */}
      {settings.hasPin && (
        <div style={{ marginBottom: '0.6rem' }}>
          <button
            onClick={() => setShowRemovePin(v => !v)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.6rem 1.25rem',
              borderRadius: '10px',
              border: '1px solid rgba(239,68,68,0.35)',
              background: 'rgba(239,68,68,0.06)',
              color: '#ef4444',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            <Unlock size={14} />
            Remove PIN Lock
          </button>

          {showRemovePin && (
            <div style={{
              marginTop: '0.75rem',
              padding: '1rem',
              borderRadius: '12px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
            }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                Enter current PIN to confirm:
              </div>
              <PinInput value={currentPin} onChange={setCurrentPin} />

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                <button
                  onClick={handleRemovePin}
                  disabled={loading || currentPin.join('').length !== 4}
                  style={{
                    padding: '0.45rem 1.25rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#ef4444',
                    color: 'white',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                >
                  {loading && <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />}
                  Remove PIN
                </button>
                <button
                  onClick={() => { setShowRemovePin(false); setCurrentPin(['', '', '', '']) }}
                  style={{
                    padding: '0.45rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'transparent',
                    color: 'var(--text-muted)',
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <GroupLabel label="Auto-Lock" />

      <SettingRow
        label="Auto-Lock"
        desc="Automatically lock the app after inactivity."
      >
        <Toggle
          checked={settings.autoLock}
          onChange={() => updateSettings({ autoLock: !settings.autoLock })}
        />
      </SettingRow>

      {settings.autoLock && (
        <SettingRow label="Lock after" desc="Minutes of inactivity before locking.">
          <select
            value={settings.autoLockMinutes}
            onChange={e => updateSettings({ autoLockMinutes: Number(e.target.value) })}
            style={{
              padding: '0.35rem 0.6rem',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
              fontSize: '0.8rem',
              fontFamily: 'inherit',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value={1}>1 minute</option>
            <option value={2}>2 minutes</option>
            <option value={5}>5 minutes</option>
            <option value={10}>10 minutes</option>
            <option value={15}>15 minutes</option>
            <option value={30}>30 minutes</option>
          </select>
        </SettingRow>
      )}

      <GroupLabel label="Encryption" />

      <div style={{
        padding: '0.875rem 1rem',
        borderRadius: '12px',
        background: 'rgba(34,197,94,0.06)',
        border: '1px solid rgba(34,197,94,0.2)',
        marginBottom: '0.6rem',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem',
      }}>
        <Shield size={18} style={{ color: '#22c55e', flexShrink: 0, marginTop: '1px' }} />
        <div>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#22c55e', marginBottom: '0.25rem' }}>
            AES-256 Encryption Active
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            All your diary entries, notes, ideas, and tasks are encrypted with AES-256-GCM.
            Your data can only be read inside Soul Diary. Even if the database file is stolen,
            it cannot be read without your encryption key.
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Editor Section ───────────────────────────────────────────────────────────

function EditorSection({ settings, updateSettings }: any) {
  const FONT_PREVIEW = {
    sans: "'Outfit', system-ui, sans-serif",
    serif: "'Lora', Georgia, serif",
  }

  return (
    <div>
      <SectionHeader
        title="Editor"
        desc="Customize your writing experience."
      />

      <GroupLabel label="Typography" />

      <SettingRow label="Font Family" desc="The font used in the writing editor.">
        <select
          value={settings.fontFamily}
          onChange={e => updateSettings({ fontFamily: e.target.value })}
          style={{
            padding: '0.35rem 0.6rem',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            background: 'var(--bg-tertiary)',
            color: 'var(--text-primary)',
            fontSize: '0.8rem',
            fontFamily: 'inherit',
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          <option value="serif">Lora (Serif) — Classic diary feel</option>
          <option value="sans">Outfit (Sans) — Modern and clean</option>
        </select>
      </SettingRow>

      {/* Font preview */}
      <div style={{
        padding: '1rem 1.25rem',
        borderRadius: '12px',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        marginBottom: '0.6rem',
      }}>
        <div style={{
          fontSize: '0.65rem',
          color: 'var(--text-muted)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          marginBottom: '0.5rem',
        }}>
          Font Preview
        </div>
        <p style={{
          fontFamily: (FONT_PREVIEW as any)[settings.fontFamily] ?? FONT_PREVIEW.serif,
          fontSize: '1rem',
          color: 'var(--text-primary)',
          lineHeight: 1.7,
          margin: 0,
        }}>
          Dear Diary, today was a beautiful day. I walked in the park and felt the sun
          on my face. The world feels full of possibility when I take a moment to notice
          the little things around me.
        </p>
      </div>

      <SettingRow label="Font Size" desc="Base font size in the editor.">
        <div style={{ display: 'flex', gap: '4px' }}>
          {(['sm', 'md', 'lg', 'xl'] as const).map(s => (
            <button
              key={s}
              onClick={() => updateSettings({ fontSize: s })}
              style={{
                padding: '0.3rem 0.6rem',
                borderRadius: '7px',
                border: `1px solid ${settings.fontSize === s ? 'var(--accent)' : 'var(--border)'}`,
                background: settings.fontSize === s ? 'rgba(99,102,241,0.1)' : 'transparent',
                color: settings.fontSize === s ? 'var(--accent)' : 'var(--text-secondary)',
                fontSize: '0.75rem',
                fontWeight: settings.fontSize === s ? 600 : 400,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.15s',
              }}
            >
              {s.toUpperCase()}
            </button>
          ))}
        </div>
      </SettingRow>
    </div>
  )
}

// ─── AI Section ───────────────────────────────────────────────────────────────

function AISection() {
  const [checking, setChecking] = useState(false)
  const [aiStatus, setAiStatus] = useState<'unknown' | 'online' | 'offline'>('unknown')
  const [models, setModels] = useState<{ name: string; size: number }[]>([])
  const [activeModel, setActiveModel] = useState('')
  const [pulling, setPulling] = useState(false)
  const [pullModel, setPullModel] = useState('llama3')
  const [pullStatus, setPullStatus] = useState('')
  const [pullPct, setPullPct] = useState<number | null>(null)

  const checkOllama = useCallback(async () => {
    setChecking(true)
    try {
      const res = await window.electronAPI.ai.isAvailable()
      setAiStatus(res?.available ? 'online' : 'offline')

      if (res?.available) {
        const modelRes = await window.electronAPI.ai.models()
        if (modelRes?.success) {
          setModels(modelRes.data ?? [])
        }
        const activeRes = await window.electronAPI.ai.getModel()
        if (activeRes?.success) setActiveModel(activeRes.model)
      }
    } catch {
      setAiStatus('offline')
    } finally {
      setChecking(false)
    }
  }, [])

  useEffect(() => { checkOllama() }, [])

  const handleSetModel = async (model: string) => {
    await window.electronAPI.ai.setModel(model)
    setActiveModel(model)
  }

  const handlePullModel = async () => {
    if (!pullModel.trim()) return
    setPulling(true)
    setPullStatus('Starting download...')
    setPullPct(null)

    window.electronAPI.on('ai:pullProgress', (data: { status: string; percent?: number }) => {
      setPullStatus(data.status)
      if (data.percent !== undefined) setPullPct(data.percent)
    })

    try {
      const res = await window.electronAPI.ai.pullModel(pullModel.trim())
      if (res?.success) {
        setPullStatus('✅ Download complete!')
        await checkOllama()
      } else {
        setPullStatus('❌ Download failed: ' + (res?.error ?? 'Unknown error'))
      }
    } catch (err: any) {
      setPullStatus('❌ Error: ' + err.message)
    } finally {
      setPulling(false)
      setPullPct(null)
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes > 1e9) return `${(bytes / 1e9).toFixed(1)} GB`
    if (bytes > 1e6) return `${(bytes / 1e6).toFixed(0)} MB`
    return `${bytes} B`
  }

  return (
    <div>
      <SectionHeader
        title="AI Settings"
        desc="Configure offline AI powered by Ollama. All processing happens locally — no internet required."
      />

      {/* Status card */}
      <div style={{
        padding: '1rem 1.25rem',
        borderRadius: '12px',
        background: aiStatus === 'online'
          ? 'rgba(34,197,94,0.06)' : aiStatus === 'offline'
            ? 'rgba(239,68,68,0.06)' : 'var(--bg-secondary)',
        border: `1px solid ${aiStatus === 'online'
          ? 'rgba(34,197,94,0.25)' : aiStatus === 'offline'
            ? 'rgba(239,68,68,0.25)' : 'var(--border)'}`,
        marginBottom: '1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: aiStatus === 'online' ? '#22c55e'
              : aiStatus === 'offline' ? '#ef4444' : '#6b7280',
            boxShadow: aiStatus === 'online'
              ? '0 0 8px rgba(34,197,94,0.5)' : 'none',
          }} />
          <div>
            <div style={{
              fontSize: '0.875rem',
              fontWeight: 600,
              color: aiStatus === 'online' ? '#22c55e'
                : aiStatus === 'offline' ? '#ef4444' : 'var(--text-primary)',
            }}>
              Ollama {aiStatus === 'online' ? 'Running'
                : aiStatus === 'offline' ? 'Not Found' : 'Checking...'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1px' }}>
              {aiStatus === 'online'
                ? `${models.length} model${models.length !== 1 ? 's' : ''} installed`
                : aiStatus === 'offline'
                  ? 'Start Ollama on your computer to enable AI features'
                  : 'Detecting local AI...'}
            </div>
          </div>
        </div>
        <button
          onClick={checkOllama}
          disabled={checking}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '0.4rem 0.75rem',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            background: 'var(--bg-card)',
            color: 'var(--text-secondary)',
            fontSize: '0.78rem',
            cursor: checking ? 'wait' : 'pointer',
            fontFamily: 'inherit',
          }}
        >
          <RefreshCw size={12} style={{ animation: checking ? 'spin 1s linear infinite' : 'none' }} />
          Refresh
        </button>
      </div>

      {aiStatus === 'offline' && (
        <div style={{
          padding: '0.875rem 1rem',
          borderRadius: '12px',
          background: 'rgba(234,179,8,0.06)',
          border: '1px solid rgba(234,179,8,0.25)',
          marginBottom: '1rem',
          fontSize: '0.82rem',
          color: 'var(--text-secondary)',
          lineHeight: 1.6,
        }}>
          <strong style={{ color: '#d97706' }}>How to start Ollama:</strong><br />
          1. Download from <strong>ollama.com</strong> if not installed<br />
          2. Run <code style={{ background: 'var(--bg-tertiary)', padding: '1px 6px', borderRadius: '4px', fontFamily: 'monospace' }}>ollama serve</code> in terminal<br />
          3. Click Refresh above to detect it
        </div>
      )}

      {aiStatus === 'online' && models.length > 0 && (
        <>
          <GroupLabel label="Active Model" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '1rem' }}>
            {models.map(m => (
              <button
                key={m.name}
                onClick={() => handleSetModel(m.name)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.7rem 1rem',
                  borderRadius: '10px',
                  border: `1px solid ${activeModel === m.name ? 'var(--accent)' : 'var(--border)'}`,
                  background: activeModel === m.name ? 'rgba(99,102,241,0.08)' : 'var(--bg-secondary)',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  textAlign: 'left',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <Cpu size={15} style={{ color: activeModel === m.name ? 'var(--accent)' : 'var(--text-muted)', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                      {m.name}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {formatSize(m.size)}
                    </div>
                  </div>
                </div>
                {activeModel === m.name && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.72rem',
                    color: 'var(--accent)',
                    fontWeight: 600,
                  }}>
                    <Check size={12} />
                    Active
                  </div>
                )}
              </button>
            ))}
          </div>
        </>
      )}

      <GroupLabel label="Download New Model" />
      <div style={{
        padding: '1rem',
        borderRadius: '12px',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        marginBottom: '0.6rem',
      }}>
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '0.5rem',
        }}>
          <input
            type="text"
            value={pullModel}
            onChange={e => setPullModel(e.target.value)}
            placeholder="Model name (e.g. llama3, mistral, phi3)"
            className="selectable"
            style={{
              flex: 1,
              padding: '0.45rem 0.75rem',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
              fontSize: '0.82rem',
              fontFamily: 'inherit',
              outline: 'none',
            }}
          />
          <button
            onClick={handlePullModel}
            disabled={pulling || !pullModel.trim() || aiStatus !== 'online'}
            style={{
              padding: '0.45rem 1rem',
              borderRadius: '8px',
              border: 'none',
              background: aiStatus === 'online' ? 'var(--accent)' : 'var(--bg-tertiary)',
              color: aiStatus === 'online' ? 'white' : 'var(--text-muted)',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: pulling || aiStatus !== 'online' ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            {pulling
              ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
              : <Download size={13} />
            }
            Download
          </button>
        </div>

        {/* Pull progress */}
        {pullStatus && (
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
            {pullStatus}
          </div>
        )}
        {pullPct !== null && (
          <div style={{
            marginTop: '0.4rem',
            height: '4px',
            borderRadius: '2px',
            background: 'var(--bg-tertiary)',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${pullPct}%`,
              background: 'linear-gradient(90deg, #6366f1, #a78bfa)',
              transition: 'width 0.3s ease',
            }} />
          </div>
        )}

        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
          Recommended: <code style={{ background: 'var(--bg-tertiary)', padding: '1px 5px', borderRadius: '4px', fontFamily: 'monospace' }}>llama3</code> (4.7GB) · <code style={{ background: 'var(--bg-tertiary)', padding: '1px 5px', borderRadius: '4px', fontFamily: 'monospace' }}>mistral</code> (4.1GB) · <code style={{ background: 'var(--bg-tertiary)', padding: '1px 5px', borderRadius: '4px', fontFamily: 'monospace' }}>phi3</code> (2.3GB — lightweight)
        </div>
      </div>
    </div>
  )
}

// ─── Storage Section ──────────────────────────────────────────────────────────

function StorageSection() {
  const [dbPath, setDbPath] = useState('')
  const [dataPath, setDataPath] = useState('')
  const [loading, setLoading] = useState(true)


  useEffect(() => {
    const load = async () => {
      try {
        const p1 = await window.electronAPI.app.dataPath()
        const p2 = await (window.electronAPI as any).app?.dbPath?.()
        setDataPath(p1 ?? '')
        setDbPath(p2 ?? p1 ?? '')
      } catch {
        setDataPath('Unknown')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div>
      <SectionHeader
        title="Storage"
        desc="Manage where your data is stored. All data is stored locally on your computer."
      />

      <GroupLabel label="Database Location" />

      <div style={{
        padding: '0.875rem 1rem',
        borderRadius: '12px',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        marginBottom: '0.6rem',
      }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
          App Data Folder
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          <code style={{
            flex: 1,
            fontSize: '0.78rem',
            color: 'var(--text-secondary)',
            background: 'var(--bg-tertiary)',
            padding: '0.35rem 0.6rem',
            borderRadius: '6px',
            fontFamily: 'monospace',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {loading ? 'Loading...' : dataPath}
          </code>
          <button
            onClick={async () => {
              const folder = await window.electronAPI.dialog.openFolder()
              if (folder) alert('Storage location change requires app restart.')
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '0.35rem 0.7rem',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--bg-tertiary)',
              color: 'var(--text-secondary)',
              fontSize: '0.75rem',
              cursor: 'pointer',
              fontFamily: 'inherit',
              flexShrink: 0,
              whiteSpace: 'nowrap',
            }}
          >
            <FolderOpen size={13} />
            Change
          </button>
        </div>
      </div>

      <div style={{
        padding: '0.875rem 1rem',
        borderRadius: '12px',
        background: 'rgba(99,102,241,0.05)',
        border: '1px solid rgba(99,102,241,0.15)',
        fontSize: '0.8rem',
        color: 'var(--text-secondary)',
        lineHeight: 1.6,
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.6rem',
      }}>
        <HardDrive size={15} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: '1px' }} />
        <div>
          <strong style={{ color: 'var(--text-primary)' }}>Your data stays on your computer.</strong>{' '}
          Soul Diary never uploads anything to the internet. The encrypted SQLite database
          lives entirely in your local app data folder.
        </div>
      </div>
    </div>
  )
}

// ─── Backup Section ───────────────────────────────────────────────────────────

function BackupSection() {
  const [backupPwd, setBackupPwd] = useState('')
  const [restorePwd, setRestorePwd] = useState('')
  const [loading, setLoading] = useState<'export' | 'import' | null>(null)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [showPwd, setShowPwd] = useState(false)
  const [showPDF, setShowPDF] = useState(false)

  const showMsg = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 4000)
  }

  const handleExport = async () => {
    if (!backupPwd.trim()) return showMsg('Enter a backup password', 'error')
    if (backupPwd.length < 6) return showMsg('Password must be at least 6 characters', 'error')

    setLoading('export')
    try {
      const res = await (window.electronAPI as any).backup?.export(backupPwd)
      if (res?.success) {
        showMsg(`✅ Backup saved to: ${res.path}`, 'success')
        setBackupPwd('')
      } else {
        showMsg('Export failed: ' + (res?.error ?? 'Unknown error'), 'error')
      }
    } catch (err: any) {
      showMsg('Export failed: ' + err.message, 'error')
    } finally {
      setLoading(null)
    }
  }

  const handleImport = async () => {
    if (!restorePwd.trim()) return showMsg('Enter the backup password', 'error')

    setLoading('import')
    try {
      const res = await (window.electronAPI as any).backup?.import(restorePwd)
      if (res?.success) {
        showMsg('✅ Backup restored successfully! Please restart the app.', 'success')
        setRestorePwd('')
      } else {
        showMsg('Import failed: ' + (res?.error ?? 'Wrong password or corrupted file'), 'error')
      }
    } catch (err: any) {
      showMsg('Import failed: ' + err.message, 'error')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div>
      <SectionHeader
        title="Backup & Restore"
        desc="Export your encrypted data or restore from a previous backup."
      />

      {message && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.6rem 1rem',
          borderRadius: '10px',
          background: message.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
          border: `1px solid ${message.type === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
          color: message.type === 'success' ? '#22c55e' : '#ef4444',
          fontSize: '0.82rem',
          marginBottom: '1rem',
        }}>
          {message.type === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
          {message.text}
        </div>
      )}

      <GroupLabel label="Export Backup" />
      
      {/* ── Export PDF ─────────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1rem',
        borderRadius: '12px',
        background: 'var(--bg-tertiary)',
        border: '1px solid var(--border)',
        margin: '0.75rem 0rem 0.75rem 0rem',
      }}>
        <div>
          <div style={{
            fontWeight: 600,
            fontSize: '0.875rem',
            color: 'var(--text-primary)',
            marginBottom: '0.2rem',
          }}>
            Export to PDF
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Export your diary entries, notes and ideas as a PDF document
          </div>
        </div>

        <button
          onClick={() => setShowPDF(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.5rem 1rem',
            borderRadius: '10px',
            border: 'none',
            background: 'linear-gradient(135deg, #6366f1, #7c3aed)',
            color: 'white',
            fontSize: '0.82rem',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
            flexShrink: 0,
            boxShadow: '0 2px 8px rgba(99,102,241,0.35)',
          }}
        >
          📄 Export PDF
        </button>
      </div>
      <PDFExport
        open={showPDF}
        onClose={() => setShowPDF(false)}
      />

      <div style={{
        padding: '1rem',
        borderRadius: '12px',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        marginBottom: '1rem',
      }}>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', lineHeight: 1.5 }}>
          Create an encrypted backup of all your entries, notes, ideas, and tasks.
          The backup is protected with a separate password you choose.
        </p>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              type={showPwd ? 'text' : 'password'}
              value={backupPwd}
              onChange={e => setBackupPwd(e.target.value)}
              placeholder="Backup password (min 6 chars)"
              className="selectable"
              style={{
                width: '100%',
                padding: '0.45rem 2.5rem 0.45rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                fontSize: '0.82rem',
                fontFamily: 'inherit',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <button
              onClick={() => setShowPwd(v => !v)}
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                display: 'flex',
              }}
            >
              {showPwd ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
          </div>
          <button
            onClick={handleExport}
            disabled={loading === 'export'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '0.45rem 1rem',
              borderRadius: '8px',
              border: 'none',
              background: 'linear-gradient(135deg, #6366f1, #a78bfa)',
              color: 'white',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: loading === 'export' ? 'wait' : 'pointer',
              fontFamily: 'inherit',
              flexShrink: 0,
            }}
          >
            {loading === 'export'
              ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
              : <Download size={13} />
            }
            Export
          </button>
        </div>
      </div>

      <GroupLabel label="Restore Backup" />

      <div style={{
        padding: '1rem',
        borderRadius: '12px',
        background: 'rgba(239,68,68,0.04)',
        border: '1px solid rgba(239,68,68,0.15)',
        marginBottom: '0.6rem',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          marginBottom: '0.6rem',
        }}>
          <AlertCircle size={14} style={{ color: '#f97316', flexShrink: 0 }} />
          <p style={{ fontSize: '0.78rem', color: '#f97316', margin: 0 }}>
            Restoring a backup will replace ALL current data. This cannot be undone.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="password"
            value={restorePwd}
            onChange={e => setRestorePwd(e.target.value)}
            placeholder="Backup file password"
            className="selectable"
            style={{
              flex: 1,
              padding: '0.45rem 0.75rem',
              borderRadius: '8px',
              border: '1px solid rgba(239,68,68,0.3)',
              background: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
              fontSize: '0.82rem',
              fontFamily: 'inherit',
              outline: 'none',
            }}
          />
          <button
            onClick={handleImport}
            disabled={loading === 'import'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '0.45rem 1rem',
              borderRadius: '8px',
              border: '1px solid rgba(239,68,68,0.35)',
              background: 'rgba(239,68,68,0.08)',
              color: '#ef4444',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: loading === 'import' ? 'wait' : 'pointer',
              fontFamily: 'inherit',
              flexShrink: 0,
            }}
          >
            {loading === 'import'
              ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
              : <Upload size={13} />
            }
            Restore
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── About Section ────────────────────────────────────────────────────────────

function AboutSection() {
  const [version, setVersion] = useState('')

  useEffect(() => {
    window.electronAPI.app.version().then(setVersion).catch(() => setVersion('1.0.0'))
  }, [])

  return (
    <div>
      <SectionHeader title="About Soul Diary" desc="App information and credits." />

      {/* Logo card */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '2rem',
        borderRadius: '16px',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        marginBottom: '1rem',
        gap: '0.75rem',
        textAlign: 'center',
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '18px',
          background: 'linear-gradient(135deg, #6366f1, #a78bfa)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '2rem',
          boxShadow: '0 0 30px rgba(99,102,241,0.4)',
        }}>
          📔
        </div>

        <div>
          <h2 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '1.5rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
            margin: 0,
          }}>
            Soul Diary
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>
            Version {version || '1.0.0'}
          </p>
        </div>

        <p style={{
          fontSize: '0.82rem',
          color: 'var(--text-secondary)',
          lineHeight: 1.6,
          maxWidth: '380px',
        }}>
          Your private, encrypted, offline-first diary and productivity app.
          Write freely. Your thoughts stay yours — always.
        </p>
      </div>

      {/* Tech stack */}
      <GroupLabel label="Built With" />
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
        gap: '0.5rem',
        marginBottom: '1rem',
      }}>
        {[
          { name: 'Electron', desc: 'Desktop shell' },
          { name: 'React', desc: 'UI framework' },
          { name: 'TypeScript', desc: 'Type safety' },
          { name: 'SQLite', desc: 'Local database' },
          { name: 'AES-256', desc: 'Encryption' },
          { name: 'TipTap', desc: 'Rich editor' },
          { name: 'Ollama', desc: 'Local AI' },
          { name: 'Zustand', desc: 'State management' },
        ].map(t => (
          <div
            key={t.name}
            style={{
              padding: '0.6rem 0.75rem',
              borderRadius: '10px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
            }}
          >
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {t.name}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              {t.desc}
            </div>
          </div>
        ))}
      </div>

      {/* Privacy note */}
      <div style={{
        padding: '0.875rem 1rem',
        borderRadius: '12px',
        background: 'rgba(34,197,94,0.06)',
        border: '1px solid rgba(34,197,94,0.2)',
        display: 'flex',
        gap: '0.75rem',
        alignItems: 'flex-start',
      }}>
        <Shield size={16} style={{ color: '#22c55e', flexShrink: 0, marginTop: '1px' }} />
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          <strong style={{ color: '#22c55e' }}>100% Private & Offline.</strong>{' '}
          Soul Diary never connects to any server, never sends telemetry, and never stores
          your data anywhere except your own computer. What you write is yours alone.
        </div>
      </div>
    </div>
  )
}