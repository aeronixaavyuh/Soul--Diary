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
  RefreshCw, HardDrive, Cpu,Copy, KeyRound,
} from 'lucide-react'

// ─── Section IDs ──────────────────────────────────────────────────────────────

type SectionId =
  | 'appearance'
  | 'security'
  | 'editor'
  | 'storage'
  | 'backup'
  | 'about'

const SECTIONS: { id: SectionId; label: string; icon: React.ReactNode; desc: string }[] = [
  { id: 'appearance', label: 'Appearance', icon: <Palette size={16} />, desc: 'Theme, colors, animations' },
  { id: 'security', label: 'Security', icon: <Shield size={16} />, desc: 'PIN lock, encryption' },
  { id: 'editor', label: 'Editor', icon: <Type size={16} />, desc: 'Font, size, writing preferences' },
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

// ─── Shared hash function (same as LockScreen) ────────────────────────────────

async function hashValue(value: string): Promise<string> {
  try {
    const encoder = new TextEncoder()
    const data = encoder.encode(value + 'soul-diary-salt-v2')
    const hash = await crypto.subtle.digest('SHA-256', data)
    const arr = Array.from(new Uint8Array(hash))
    return arr.map(b => b.toString(16).padStart(2, '0')).join('')
  } catch {
    return btoa(value + 'soul-diary-salt-v2')
  }
}

function generateRecoveryKey(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let key = ''
  for (let i = 0; i < 24; i++) {
    if (i > 0 && i % 6 === 0) key += '-'
    key += chars[Math.floor(Math.random() * chars.length)]
  }
  return key
}

// ─── Security Section ─────────────────────────────────────────────────────────

function SecuritySection({ settings, updateSettings }: any) {

  const [secMode, setSecMode] = useState<'password' | 'pin'>('password')
  const [showSetup, setShowSetup] = useState(false)
  const [showRemove, setShowRemove] = useState(false)
  const [newValue, setNewValue] = useState('')
  const [confirmValue, setConfirmValue] = useState('')
  const [currentValue, setCurrentValue] = useState('')
  const [showVal, setShowVal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [recoveryKey, setRecoveryKey] = useState('')
  const [showRecovery, setShowRecovery] = useState(false)
  const [copied, setCopied] = useState(false)
  const [message, setMessage] = useState<{
    text: string; type: 'success' | 'error'
  } | null>(null)

  const showMsg = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 5000)
  }

  const resetForm = () => {
    setNewValue(''); setConfirmValue(''); setCurrentValue('')
    setShowSetup(false); setShowRemove(false)
    setShowRecovery(false); setRecoveryKey('')
  }

  // ── Password strength ──────────────────────────────────────────────────────
  const getStrength = (v: string) => {
    if (!v) return { label: '', color: 'transparent', w: 0 }
    if (v.length < 4) return { label: 'Too short', color: '#ef4444', w: 15 }
    if (v.length < 6) return { label: 'Weak', color: '#f97316', w: 35 }
    if (v.length < 8) return { label: 'Fair', color: '#eab308', w: 55 }
    if (v.length < 12) return { label: 'Good', color: '#22c55e', w: 75 }
    return { label: 'Strong', color: '#16a34a', w: 100 }
  }
  const strength = getStrength(newValue)

  // ── Set / Change security ──────────────────────────────────────────────────
  const handleSet = async () => {
    if (!newValue.trim()) return showMsg('Value cannot be empty.', 'error')
    if (newValue.length < 4) return showMsg('Minimum 4 characters required.', 'error')
    if (newValue !== confirmValue) return showMsg(
      secMode === 'password' ? 'Passwords do not match.' : 'PINs do not match.', 'error'
    )
    if (secMode === 'pin' && !/^\d+$/.test(newValue))
      return showMsg('PIN must be digits only.', 'error')

    setLoading(true)
    try {
      const hashed = await hashValue(newValue)
      const rKey = generateRecoveryKey()
      const rHashed = await hashValue(rKey)

      // Try electronAPI
      try { await window.electronAPI.pin.set(newValue) } catch { /* ignore */ }

      updateSettings({
        hasPin: true,
        securityHash: hashed,
        pinHash: btoa(newValue),   // legacy fallback
        recoveryKeyHash: rHashed,
        securityMode: secMode,
      })

      setRecoveryKey(rKey)
      setShowSetup(false)
      setShowRecovery(true)
      setNewValue('')
      setConfirmValue('')
      showMsg(
        settings.hasPin ? 'Security updated successfully!' : 'Security set successfully!',
        'success'
      )
    } catch {
      showMsg('Failed to set security. Try again.', 'error')
    } finally {
      setLoading(false)
    }
  }

  // ── Remove security ────────────────────────────────────────────────────────
  const handleRemove = async () => {
    if (!currentValue.trim()) return showMsg('Enter your current password or PIN.', 'error')

    setLoading(true)
    try {
      const hashed = await hashValue(currentValue)
      const stored = settings.securityHash ?? ''
      let matched = hashed === stored

      // Legacy fallback
      if (!matched && settings.pinHash) {
        try { matched = currentValue === atob(settings.pinHash) } catch { /* ignore */ }
      }

      // electronAPI fallback
      if (!matched) {
        try {
          const res = await window.electronAPI.pin.verify(currentValue)
          matched = res?.success === true
        } catch { /* ignore */ }
      }

      if (matched) {
        try { await window.electronAPI.pin.remove() } catch { /* ignore */ }
        updateSettings({
          hasPin: false,
          securityHash: null,
          pinHash: null,
          recoveryKeyHash: null,
          securityMode: 'password',
        })
        showMsg('Security removed. App is now unlocked.', 'success')
        resetForm()
      } else {
        showMsg('Wrong password/PIN. Try again.', 'error')
      }
    } catch {
      showMsg('Error removing security. Try again.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(recoveryKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div>
      <SectionHeader
        title="Security"
        desc="Protect your diary with a password or PIN."
      />

      {/* ── Message ────────────────────────────────────────────────────── */}
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
          animation: 'fadeIn 0.2s ease',
        }}>
          {message.type === 'success'
            ? <Check size={14} /> : <AlertCircle size={14} />}
          {message.text}
        </div>
      )}

      {/* ── Status Card ────────────────────────────────────────────────── */}
      <div style={{
        padding: '1.25rem',
        borderRadius: '14px',
        background: settings.hasPin
          ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.04)',
        border: `1px solid ${settings.hasPin
          ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.15)'}`,
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        marginBottom: '1rem',
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '14px',
          background: settings.hasPin
            ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          {settings.hasPin
            ? <Lock size={22} style={{ color: '#22c55e' }} />
            : <Unlock size={22} style={{ color: '#ef4444' }} />}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: '0.9rem',
            fontWeight: 600,
            color: settings.hasPin ? '#22c55e' : '#ef4444',
            marginBottom: '2px',
          }}>
            {settings.hasPin ? '🔒 App is Protected' : '🔓 No Protection Set'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
            {settings.hasPin
              ? `${settings.securityMode === 'pin' ? 'PIN' : 'Password'} lock active. App locks on close.`
              : 'Anyone can open your diary without a password.'}
          </div>
        </div>
      </div>

      {/* ── Recovery Key Panel (shown after setting security) ──────────── */}
      {showRecovery && recoveryKey && (
        <div style={{
          padding: '1.25rem',
          borderRadius: '14px',
          background: 'rgba(234,179,8,0.08)',
          border: '1px solid rgba(234,179,8,0.35)',
          marginBottom: '1rem',
          animation: 'fadeIn 0.3s ease',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '0.75rem',
          }}>
            <KeyRound size={16} style={{ color: '#eab308' }} />
            <span style={{
              fontSize: '0.85rem',
              fontWeight: 600,
              color: '#eab308',
            }}>
              Save Your Recovery Key — Shown Only Once!
            </span>
          </div>

          <div style={{
            fontFamily: 'monospace',
            fontSize: '1rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
            letterSpacing: '0.1em',
            padding: '0.75rem',
            background: 'var(--bg-card)',
            borderRadius: '10px',
            border: '1px solid var(--border)',
            textAlign: 'center',
            marginBottom: '0.75rem',
            userSelect: 'all',
          }}>
            {recoveryKey}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              onClick={handleCopy}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.4rem 0.875rem',
                borderRadius: '8px',
                border: '1px solid rgba(234,179,8,0.4)',
                background: copied ? 'rgba(34,197,94,0.1)' : 'transparent',
                color: copied ? '#22c55e' : '#eab308',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.2s',
              }}
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? 'Copied!' : 'Copy Key'}
            </button>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
              ⚠️ If you lose this key and forget your password, your data cannot be recovered.
            </span>
          </div>

          <button
            onClick={() => { setShowRecovery(false); setRecoveryKey('') }}
            style={{
              marginTop: '0.75rem',
              width: '100%',
              padding: '0.45rem',
              borderRadius: '8px',
              border: '1px solid rgba(234,179,8,0.3)',
              background: 'transparent',
              color: '#d97706',
              fontSize: '0.78rem',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            ✓ I've saved my recovery key
          </button>
        </div>
      )}

      {/* ── Mode Selector ─────────────────────────────────────────────── */}
      <GroupLabel label="Security Type" />

      <div style={{
        display: 'flex',
        background: 'var(--bg-tertiary)',
        borderRadius: '12px',
        padding: '4px',
        gap: '4px',
        marginBottom: '0.75rem',
      }}>
        {([
          { mode: 'password', icon: '🔑', label: 'Password', desc: 'Any text/symbols' },
          { mode: 'pin', icon: '🔢', label: 'PIN', desc: 'Digits only' },
        ] as const).map(m => (
          <button
            key={m.mode}
            onClick={() => { setSecMode(m.mode); setNewValue(''); setConfirmValue('') }}
            style={{
              flex: 1,
              padding: '0.6rem 0.75rem',
              borderRadius: '9px',
              border: 'none',
              background: secMode === m.mode ? 'var(--bg-card)' : 'transparent',
              color: secMode === m.mode ? 'var(--accent)' : 'var(--text-muted)',
              cursor: 'pointer',
              fontFamily: 'inherit',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px',
              boxShadow: secMode === m.mode
                ? '0 1px 6px rgba(0,0,0,0.12)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            <span style={{ fontSize: '1.1rem' }}>{m.icon}</span>
            <span style={{
              fontSize: '0.78rem',
              fontWeight: secMode === m.mode ? 700 : 400,
            }}>
              {m.label}
            </span>
            <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>
              {m.desc}
            </span>
          </button>
        ))}
      </div>

      {/* ── Set / Change Button ───────────────────────────────────────── */}
      {!showRemove && (
        <button
          onClick={() => { setShowSetup(v => !v); setShowRecovery(false) }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.65rem 1.25rem',
            borderRadius: '10px',
            border: '1px solid var(--accent)',
            background: showSetup
              ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.08)',
            color: 'var(--accent)',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'all 0.15s',
            marginBottom: '0.5rem',
            width: '100%',
          }}
        >
          {settings.hasPin ? <RefreshCw size={14} /> : <Lock size={14} />}
          {settings.hasPin
            ? `Change ${secMode === 'password' ? 'Password' : 'PIN'}`
            : `Set ${secMode === 'password' ? 'Password' : 'PIN'}`}
          <ChevronRight
            size={14}
            style={{
              marginLeft: 'auto',
              transform: showSetup ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s',
            }}
          />
        </button>
      )}

      {/* ── Setup Form ────────────────────────────────────────────────── */}
      {showSetup && (
        <div style={{
          padding: '1.25rem',
          borderRadius: '12px',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          marginBottom: '0.75rem',
          animation: 'slideDown 0.2s ease',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

            {/* New value */}
            <div>
              <div style={{
                fontSize: '0.72rem',
                color: 'var(--text-muted)',
                marginBottom: '0.3rem',
                fontWeight: 500,
              }}>
                {secMode === 'password'
                  ? 'New Password (any length)'
                  : 'New PIN (digits only, any length)'}
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  autoFocus
                  type={showVal ? 'text' : 'password'}
                  inputMode={secMode === 'pin' ? 'numeric' : 'text'}
                  value={newValue}
                  onChange={e => {
                    const v = e.target.value
                    if (secMode === 'pin' && !/^\d*$/.test(v)) return
                    setNewValue(v)
                  }}
                  placeholder={secMode === 'password' ? 'Enter password...' : 'Enter PIN digits...'}
                  className="selectable"
                  style={{
                    width: '100%',
                    padding: '0.55rem 2.5rem 0.55rem 0.85rem',
                    borderRadius: '9px',
                    border: `1px solid ${newValue ? 'var(--accent)' : 'var(--border)'}`,
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    fontSize: secMode === 'pin' ? '1.1rem' : '0.875rem',
                    letterSpacing: secMode === 'pin' ? '0.2em' : 'normal',
                    fontFamily: secMode === 'pin' ? 'monospace' : 'inherit',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <button
                  onClick={() => setShowVal(v => !v)}
                  style={{
                    position: 'absolute', right: '8px', top: '50%',
                    transform: 'translateY(-50%)', background: 'none',
                    border: 'none', cursor: 'pointer',
                    color: 'var(--text-muted)', display: 'flex',
                  }}
                >
                  {showVal ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>

              {/* Strength bar (password only) */}
              {secMode === 'password' && newValue && (
                <div style={{ marginTop: '5px' }}>
                  <div style={{
                    height: '3px', borderRadius: '2px',
                    background: 'var(--bg-tertiary)', overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%', width: `${strength.w}%`,
                      background: strength.color, transition: 'all 0.3s',
                    }} />
                  </div>
                  <div style={{
                    fontSize: '0.63rem', color: strength.color,
                    marginTop: '3px', fontWeight: 500,
                  }}>
                    {strength.label}
                  </div>
                </div>
              )}

              {/* PIN progress dots */}
              {secMode === 'pin' && newValue.length > 0 && (
                <div style={{ display: 'flex', gap: '3px', marginTop: '6px', flexWrap: 'wrap' }}>
                  {Array.from({ length: Math.min(newValue.length, 20) }, (_, i) => (
                    <div key={i} style={{
                      width: '7px', height: '7px',
                      borderRadius: '50%', background: 'var(--accent)',
                    }} />
                  ))}
                  {newValue.length > 20 && (
                    <span style={{ fontSize: '0.6rem', color: 'var(--accent)', alignSelf: 'center' }}>
                      +{newValue.length - 20} more
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Confirm */}
            <div>
              <div style={{
                fontSize: '0.72rem', color: 'var(--text-muted)',
                marginBottom: '0.3rem', fontWeight: 500,
              }}>
                Confirm {secMode === 'password' ? 'Password' : 'PIN'}
              </div>
              <input
                type={showVal ? 'text' : 'password'}
                inputMode={secMode === 'pin' ? 'numeric' : 'text'}
                value={confirmValue}
                onChange={e => {
                  const v = e.target.value
                  if (secMode === 'pin' && !/^\d*$/.test(v)) return
                  setConfirmValue(v)
                }}
                onKeyDown={e => e.key === 'Enter' && handleSet()}
                placeholder={
                  secMode === 'password' ? 'Re-enter password...' : 'Re-enter PIN...'
                }
                className="selectable"
                style={{
                  width: '100%',
                  padding: '0.55rem 0.85rem',
                  borderRadius: '9px',
                  border: `1px solid ${confirmValue && confirmValue !== newValue ? '#ef4444'
                      : confirmValue && confirmValue === newValue ? '#22c55e'
                        : 'var(--border)'}`,
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  fontSize: secMode === 'pin' ? '1.1rem' : '0.875rem',
                  letterSpacing: secMode === 'pin' ? '0.2em' : 'normal',
                  fontFamily: secMode === 'pin' ? 'monospace' : 'inherit',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              {confirmValue && confirmValue !== newValue && (
                <div style={{ fontSize: '0.63rem', color: '#ef4444', marginTop: '3px' }}>
                  {secMode === 'password' ? 'Passwords' : 'PINs'} do not match
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
            <button
              onClick={handleSet}
              disabled={loading}
              style={{
                flex: 1,
                padding: '0.55rem',
                borderRadius: '9px',
                border: 'none',
                background: 'linear-gradient(135deg, #6366f1, #a78bfa)',
                color: 'white',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: loading ? 'wait' : 'pointer',
                fontFamily: 'inherit',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                opacity: loading ? 0.7 : 1,
                boxShadow: '0 2px 10px rgba(99,102,241,0.3)',
              }}
            >
              {loading
                ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                : <Shield size={14} />}
              {settings.hasPin ? 'Update' : 'Set'}{' '}
              {secMode === 'password' ? 'Password' : 'PIN'}
            </button>
            <button
              onClick={resetForm}
              style={{
                padding: '0.55rem 0.85rem',
                borderRadius: '9px',
                border: '1px solid var(--border)',
                background: 'transparent',
                color: 'var(--text-muted)',
                fontSize: '0.85rem',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Remove Security ──────────────────────────────────────────── */}
      {settings.hasPin && !showSetup && (
        <div>
          <button
            onClick={() => setShowRemove(v => !v)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.65rem 1.25rem',
              borderRadius: '10px',
              border: '1px solid rgba(239,68,68,0.35)',
              background: showRemove
                ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.05)',
              color: '#ef4444',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
              width: '100%',
              transition: 'all 0.15s',
            }}
          >
            <Unlock size={14} />
            Remove Security Lock
            <ChevronRight
              size={14}
              style={{
                marginLeft: 'auto',
                transform: showRemove ? 'rotate(90deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s',
              }}
            />
          </button>

          {showRemove && (
            <div style={{
              marginTop: '0.5rem',
              padding: '1rem',
              borderRadius: '12px',
              background: 'rgba(239,68,68,0.04)',
              border: '1px solid rgba(239,68,68,0.2)',
              animation: 'slideDown 0.2s ease',
            }}>
              <div style={{
                fontSize: '0.72rem',
                color: 'var(--text-muted)',
                marginBottom: '0.4rem',
              }}>
                Enter your current password or PIN to confirm:
              </div>

              <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
                <input
                  autoFocus
                  type={showVal ? 'text' : 'password'}
                  inputMode={secMode === 'pin' ? 'numeric' : 'text'}
                  value={currentValue}
                  onChange={e => {
                    const v = e.target.value
                    if (secMode === 'pin' && !/^\d*$/.test(v)) return
                    setCurrentValue(v)
                  }}
                  onKeyDown={e => e.key === 'Enter' && handleRemove()}
                  placeholder="Enter current password or PIN..."
                  className="selectable"
                  style={{
                    width: '100%',
                    padding: '0.55rem 2.5rem 0.55rem 0.85rem',
                    borderRadius: '9px',
                    border: '1px solid rgba(239,68,68,0.35)',
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem',
                    fontFamily: 'inherit',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <button
                  onClick={() => setShowVal(v => !v)}
                  style={{
                    position: 'absolute', right: '8px', top: '50%',
                    transform: 'translateY(-50%)', background: 'none',
                    border: 'none', cursor: 'pointer',
                    color: 'var(--text-muted)', display: 'flex',
                  }}
                >
                  {showVal ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={handleRemove}
                  disabled={loading}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '9px',
                    border: 'none',
                    background: '#ef4444',
                    color: 'white',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: loading ? 'wait' : 'pointer',
                    fontFamily: 'inherit',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  {loading
                    ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                    : <Unlock size={13} />}
                  Remove Lock
                </button>
                <button
                  onClick={resetForm}
                  style={{
                    padding: '0.5rem 0.85rem',
                    borderRadius: '9px',
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

      {/* ── Auto Lock ─────────────────────────────────────────────────── */}
      <GroupLabel label="Auto-Lock" />

      <SettingRow label="Auto-Lock" desc="Automatically lock after inactivity.">
        <Toggle
          checked={settings.autoLock ?? false}
          onChange={() => updateSettings({ autoLock: !settings.autoLock })}
        />
      </SettingRow>

      {settings.autoLock && (
        <SettingRow label="Lock After" desc="Minutes of inactivity.">
          <select
            value={settings.autoLockMinutes ?? 5}
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

      {/* ── Encryption badge ──────────────────────────────────────────── */}
      <GroupLabel label="Encryption" />

      <div style={{
        padding: '1rem',
        borderRadius: '12px',
        background: 'rgba(34,197,94,0.06)',
        border: '1px solid rgba(34,197,94,0.2)',
        display: 'flex',
        gap: '0.75rem',
        alignItems: 'flex-start',
      }}>
        <Shield size={18} style={{ color: '#22c55e', flexShrink: 0, marginTop: '1px' }} />
        <div>
          <div style={{
            fontSize: '0.875rem',
            fontWeight: 600,
            color: '#22c55e',
            marginBottom: '0.25rem',
          }}>
            AES-256 Encryption Active
          </div>
          <div style={{
            fontSize: '0.78rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.5,
          }}>
            All entries are encrypted with AES-256-GCM.
            Data cannot be read without your key, even if the file is stolen.
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes spin {
          from { transform: rotate(0deg);   }
          to   { transform: rotate(360deg); }
        }
      `}</style>
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