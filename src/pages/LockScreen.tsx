import { useState, useEffect, useCallback, useRef } from 'react'
import { useAppStore } from '@store/useAppStore'
import {
  Lock, Eye, EyeOff, Key, Shield,
  AlertTriangle, CheckCircle, Copy,
  Download, RefreshCw, Unlock,
} from 'lucide-react'

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_ATTEMPTS = 5
const LOCKOUT_SECS = 30
const RECOVERY_KEY_LEN = 32

// ─── Utility: Simple hash (for display — real hash in electron service) ───────

const hashPin = async (pin: string): Promise<string> => {
  const data = new TextEncoder().encode(pin + 'soul-diary-salt-2024')
  const buffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

const generateRecoveryKey = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const arr = crypto.getRandomValues(new Uint8Array(RECOVERY_KEY_LEN))
  const key = Array.from(arr)
    .map(b => chars[b % chars.length])
    .join('')
  // Format: XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX
  return key.match(/.{1,4}/g)!.join('-')
}

// ─── LockScreen ───────────────────────────────────────────────────────────────

export default function LockScreen() {
  const { unlock, settings } = useAppStore()

  // ── Modes ──────────────────────────────────────────────────────────────────
  type Mode =
    | 'locked'          // normal lock screen
    | 'setup'           // first time — set password
    | 'forgot'          // forgot password flow
    | 'recovery'        // enter recovery key
    | 'reset'           // set new password after recovery
    | 'showRecovery'    // show recovery key after setup

  const [mode, setMode] = useState<Mode>('locked')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [recoveryInput, setRecoveryInput] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // ── Attempt limiting ───────────────────────────────────────────────────────
  const [attempts, setAttempts] = useState(0)
  const [lockoutLeft, setLockoutLeft] = useState(0)
  const [isLockedOut, setIsLockedOut] = useState(false)
  const lockoutRef = useRef<ReturnType<typeof setInterval>>()

  // ── Generated recovery key (shown once after setup) ────────────────────────
  const [generatedKey, setGeneratedKey] = useState('')
  const [keyCopied, setKeyCopied] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)

  // ── Check if first time (no password set) ─────────────────────────────────
  useEffect(() => {
    const checkSetup = async () => {
      const hasPass = await window.electronAPI.pin.hasPin()
      if (!hasPass) setMode('setup')
    }
    checkSetup()
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [])

  // ── Lockout timer ──────────────────────────────────────────────────────────
  const startLockout = useCallback(() => {
    setIsLockedOut(true)
    setLockoutLeft(LOCKOUT_SECS)
    lockoutRef.current = setInterval(() => {
      setLockoutLeft(prev => {
        if (prev <= 1) {
          clearInterval(lockoutRef.current)
          setIsLockedOut(false)
          setAttempts(0)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [])

  useEffect(() => () => clearInterval(lockoutRef.current), [])

  const clearMessages = () => { setError(''); setSuccess('') }

  // ══════════════════════════════════════════════════════════════════════════
  //  HANDLERS
  // ══════════════════════════════════════════════════════════════════════════

  // ── Verify password to unlock ──────────────────────────────────────────────
  const handleUnlock = useCallback(async () => {
    if (!password.trim() || isLockedOut) return
    clearMessages()
    setIsLoading(true)

    try {
      let isValid = false

      // ── Step 1: electronAPI se verify (primary) ────────────────────
      try {
        const res = await window.electronAPI.pin.verify(password)
        if (res.success) isValid = true
      } catch { /* ignore — fallback aayega */ }

      // ── Step 2: Stored password hash check karo ────────────────────
      if (!isValid) {
        const inputHash = await hashPin(password)

        // Password hash check
        try {
          const storedPwd = await window.electronAPI.settings.get('passwordHash')
          if (storedPwd?.value && storedPwd.value === inputHash) {
            isValid = true
          }
        } catch { /* ignore */ }

        // PIN hash check (SettingsPage se set kiya ho to)
        if (!isValid) {
          try {
            const storedPin = await window.electronAPI.settings.get('pinHash')
            if (storedPin?.value && storedPin.value === inputHash) {
              isValid = true
            }
          } catch { /* ignore */ }
        }
      }

      // ── Result ─────────────────────────────────────────────────────
      if (isValid) {
        setAttempts(0)
        unlock()
      } else {
        const newAttempts = attempts + 1
        setAttempts(newAttempts)

        if (newAttempts >= MAX_ATTEMPTS) {
          setError(`Too many attempts! Wait ${LOCKOUT_SECS} seconds.`)
          startLockout()
        } else {
          setError(`Wrong password or PIN. ${MAX_ATTEMPTS - newAttempts} attempts remaining.`)
        }
        setPassword('')
        inputRef.current?.focus()
      }
    } catch {
      setError('Something went wrong. Try again.')
    } finally {
      setIsLoading(false)
    }
  }, [password, attempts, isLockedOut, unlock, startLockout])
  // ── Setup new password ─────────────────────────────────────────────────────
  const handleSetup = useCallback(async () => {
    clearMessages()

    if (newPassword.length < 4) {
      setError('Password must be at least 4 characters.')
      return
    }
    if (newPassword !== confirmPass) {
      setError('Passwords do not match.')
      return
    }

    setIsLoading(true)
    try {
      // Generate recovery key
      const rKey = generateRecoveryKey()
      setGeneratedKey(rKey)

      // Hash recovery key and store alongside PIN
      const rKeyHash = await hashPin(rKey)

      // Set PIN
      const res = await window.electronAPI.pin.set(newPassword)
      if (res.success) {
        // ── Password hash alag store karo ──────────────────────────────
        const pwdHash = await hashPin(newPassword)
        await window.electronAPI.settings.set('passwordHash', pwdHash)
        await window.electronAPI.settings.set('recoveryKeyHash', rKeyHash)
        await window.electronAPI.settings.set('hasPassword', 'true')

        setMode('showRecovery')
        setNewPassword('')
        setConfirmPass('')
      } else {
        setError(res.error ?? 'Failed to set password.')
      }
    } catch {
      setError('Failed to set up password.')
    } finally {
      setIsLoading(false)
    }
  }, [newPassword, confirmPass])

  // ── Verify recovery key ────────────────────────────────────────────────────
  const handleRecovery = useCallback(async () => {
    clearMessages()
    if (!recoveryInput.trim()) {
      setError('Please enter your recovery key.')
      return
    }

    setIsLoading(true)
    try {
      // Get stored hash
      const stored = await window.electronAPI.settings.get('recoveryKeyHash')
      if (!stored.value) {
        setError('No recovery key found. Contact support.')
        setIsLoading(false)
        return
      }

      // Hash entered key and compare
      const normalized = recoveryInput.trim().toUpperCase().replace(/\s/g, '')
      const enteredHash = await hashPin(normalized)

      // Also try with dashes removed for flexibility
      const normalizedDash = recoveryInput.trim().toUpperCase().replace(/[-\s]/g, '')
      const stored2 = await hashPin(normalizedDash)

      if (stored.value === enteredHash || stored.value === stored2) {
        setSuccess('Recovery key verified! Set your new password.')
        setRecoveryInput('')
        setMode('reset')
      } else {
        setError('Invalid recovery key. Check and try again.')
      }
    } catch {
      setError('Verification failed. Try again.')
    } finally {
      setIsLoading(false)
    }
  }, [recoveryInput])

  // ── Reset password after recovery ─────────────────────────────────────────
  const handleReset = useCallback(async () => {
    clearMessages()

    if (newPassword.length < 4) {
      setError('Password must be at least 4 characters.')
      return
    }
    if (newPassword !== confirmPass) {
      setError('Passwords do not match.')
      return
    }

    setIsLoading(true)
    try {
      // Generate new recovery key
      const rKey = generateRecoveryKey()
      setGeneratedKey(rKey)
      const rKeyHash = await hashPin(rKey)

      const res = await window.electronAPI.pin.set(newPassword)
      if (res.success) {
        const pwdHash = await hashPin(newPassword)
        await window.electronAPI.settings.set('passwordHash', pwdHash)
        await window.electronAPI.settings.set('recoveryKeyHash', rKeyHash)
        setMode('showRecovery')
        setNewPassword('')
        setConfirmPass('')
        setSuccess('Password reset successful!')
      } else {
        setError(res.error ?? 'Reset failed.')
      }
    } catch {
      setError('Reset failed. Try again.')
    } finally {
      setIsLoading(false)
    }
  }, [newPassword, confirmPass])

  // ── Copy recovery key ──────────────────────────────────────────────────────
  const handleCopyKey = useCallback(async () => {
    await navigator.clipboard.writeText(generatedKey)
    setKeyCopied(true)
    setTimeout(() => setKeyCopied(false), 2500)
  }, [generatedKey])

  // ── Download recovery key as text file ────────────────────────────────────
  const handleDownloadKey = useCallback(() => {
    const content = [
      'Soul Diary — Recovery Key',
      '='.repeat(40),
      '',
      'RECOVERY KEY:',
      generatedKey,
      '',
      '='.repeat(40),
      'IMPORTANT:',
      '• Store this key in a safe place',
      '• Without this key, forgotten passwords CANNOT be recovered',
      '• This key will NOT be shown again',
      '',
      `Generated: ${new Date().toLocaleString()}`,
    ].join('\n')

    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `soul-diary-recovery-key-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }, [generatedKey])

  // ══════════════════════════════════════════════════════════════════════════
  //  RENDER HELPERS
  // ══════════════════════════════════════════════════════════════════════════

  const InputField = ({
    value, onChange, placeholder, show, onToggleShow, onEnter, autoFocus,
  }: {
    value: string
    onChange: (v: string) => void
    placeholder: string
    show: boolean
    onToggleShow: () => void
    onEnter?: () => void
    autoFocus?: boolean
  }) => (
    <div style={{ position: 'relative' }}>
      <input
        ref={autoFocus ? inputRef : undefined}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && onEnter) onEnter() }}
        placeholder={placeholder}
        disabled={isLockedOut || isLoading}
        autoFocus={autoFocus}
        className="selectable"
        style={{
          width: '100%',
          padding: '0.75rem 3rem 0.75rem 1rem',
          borderRadius: '12px',
          border: `1.5px solid ${error ? '#ef4444' : 'var(--border)'}`,
          background: 'var(--bg-tertiary)',
          color: 'var(--text-primary)',
          fontSize: '1rem',
          fontFamily: 'inherit',
          outline: 'none',
          boxSizing: 'border-box',
          letterSpacing: show ? 'normal' : '0.2em',
          transition: 'border-color 0.15s',
        }}
        onFocus={e => {
          e.currentTarget.style.borderColor = 'var(--accent)'
          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)'
        }}
        onBlur={e => {
          e.currentTarget.style.borderColor = error ? '#ef4444' : 'var(--border)'
          e.currentTarget.style.boxShadow = 'none'
        }}
      />
      <button
        onClick={onToggleShow}
        type="button"
        style={{
          position: 'absolute',
          right: '0.75rem',
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '4px',
        }}
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  )

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'var(--bg-primary)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      fontFamily: 'inherit',
    }}>

      {/* Background decoration */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse at 30% 20%, rgba(99,102,241,0.08) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(167,139,250,0.06) 0%, transparent 60%)',
        pointerEvents: 'none',
      }} />

      {/* Card */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '24px',
        padding: '2.5rem 2rem',
        width: 'min(420px, 90vw)',
        boxShadow: '0 24px 80px rgba(0,0,0,0.2)',
        position: 'relative',
        animation: 'lockIn 0.3s cubic-bezier(0.34,1.56,0.64,1)',
      }}>

        {/* ══ LOCKED MODE ══════════════════════════════════════════════ */}
        {mode === 'locked' && (
          <>
            {/* Icon */}
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '20px',
                background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(167,139,250,0.15))',
                border: '1px solid rgba(99,102,241,0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem',
              }}>
                {isLockedOut
                  ? <AlertTriangle size={28} style={{ color: '#f97316' }} />
                  : <Lock size={28} style={{ color: 'var(--accent)' }} />
                }
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.3rem' }}>
                Soul Diary
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {isLockedOut
                  ? `Too many attempts. Wait ${lockoutLeft}s`
                  : 'Enter your password to continue'}
              </div>
            </div>

            {/* Password input */}
            <div style={{ marginBottom: '1rem' }}>
              <InputField
                value={password}
                onChange={setPassword}
                placeholder="Enter password"
                show={showPass}
                onToggleShow={() => setShowPass(v => !v)}
                onEnter={handleUnlock}
                autoFocus
              />
            </div>

            {/* Error */}
            {error && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.6rem 0.75rem',
                borderRadius: '10px',
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.2)',
                color: '#ef4444',
                fontSize: '0.8rem',
                marginBottom: '1rem',
              }}>
                <AlertTriangle size={14} />
                {error}
              </div>
            )}

            {/* Attempt dots */}
            {attempts > 0 && !isLockedOut && (
              <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginBottom: '1rem' }}>
                {Array.from({ length: MAX_ATTEMPTS }, (_, i) => (
                  <div
                    key={i}
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: i < attempts ? '#ef4444' : 'var(--border)',
                      transition: 'background 0.2s',
                    }}
                  />
                ))}
              </div>
            )}

            {/* Unlock button */}
            <button
              onClick={handleUnlock}
              disabled={isLockedOut || isLoading || !password.trim()}
              style={{
                width: '100%',
                padding: '0.85rem',
                borderRadius: '12px',
                border: 'none',
                background: isLockedOut || !password.trim()
                  ? 'var(--bg-tertiary)'
                  : 'linear-gradient(135deg, #6366f1, #a78bfa)',
                color: isLockedOut || !password.trim()
                  ? 'var(--text-muted)'
                  : 'white',
                fontSize: '0.95rem',
                fontWeight: 600,
                cursor: isLockedOut || !password.trim() ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s',
                marginBottom: '1rem',
                boxShadow: !isLockedOut && password.trim()
                  ? '0 4px 20px rgba(99,102,241,0.35)'
                  : 'none',
              }}
            >
              {isLoading
                ? <RefreshCw size={16} style={{ animation: 'spin 0.8s linear infinite' }} />
                : <Unlock size={16} />
              }
              {isLoading ? 'Verifying...' : 'Unlock'}
            </button>

            {/* Forgot password */}
            <button
              onClick={() => { clearMessages(); setMode('forgot') }}
              style={{
                width: '100%',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                fontSize: '0.8rem',
                fontFamily: 'inherit',
                padding: '0.4rem',
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--accent)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'}
            >
              Forgot password? Use recovery key
            </button>
          </>
        )}

        {/* ══ SETUP MODE ════════════════════════════════════════════════ */}
        {mode === 'setup' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '20px',
                background: 'linear-gradient(135deg, rgba(34,197,94,0.15), rgba(16,185,129,0.15))',
                border: '1px solid rgba(34,197,94,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 1rem',
              }}>
                <Shield size={28} style={{ color: '#22c55e' }} />
              </div>
              <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.3rem' }}>
                Set Up Password
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Create a password to protect your diary. A recovery key will be generated — save it safely!
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
              <InputField
                value={newPassword}
                onChange={v => { setNewPassword(v); clearMessages() }}
                placeholder="New password (min 4 characters)"
                show={showNew}
                onToggleShow={() => setShowNew(v => !v)}
                autoFocus
              />
              <InputField
                value={confirmPass}
                onChange={v => { setConfirmPass(v); clearMessages() }}
                placeholder="Confirm password"
                show={showNew}
                onToggleShow={() => setShowNew(v => !v)}
                onEnter={handleSetup}
              />
            </div>

            {/* Password strength */}
            {newPassword.length > 0 && (
              <div style={{ marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                  {[1, 2, 3, 4].map(i => {
                    const strength =
                      newPassword.length >= 4 ? 1 :
                        newPassword.length >= 6 ? 2 :
                          newPassword.length >= 8 ? 3 :
                            newPassword.length >= 12 ? 4 : 0
                    const active = i <= Math.max(1, Math.min(4,
                      newPassword.length >= 12 ? 4 :
                        newPassword.length >= 8 ? 3 :
                          newPassword.length >= 6 ? 2 : 1
                    ))
                    return (
                      <div key={i} style={{
                        flex: 1, height: '4px', borderRadius: '2px',
                        background: active
                          ? newPassword.length >= 8 ? '#22c55e'
                            : newPassword.length >= 6 ? '#eab308'
                              : '#f97316'
                          : 'var(--border)',
                        transition: 'background 0.2s',
                      }} />
                    )
                  })}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                  {newPassword.length < 6 ? 'Weak — use 6+ characters' :
                    newPassword.length < 8 ? 'Fair — use 8+ characters' :
                      newPassword.length < 12 ? 'Good password' :
                        'Strong password ✓'}
                </div>
              </div>
            )}

            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 0.75rem', borderRadius: '10px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: '0.8rem', marginBottom: '1rem' }}>
                <AlertTriangle size={14} />{error}
              </div>
            )}

            <button
              onClick={handleSetup}
              disabled={isLoading || newPassword.length < 4 || newPassword !== confirmPass}
              style={{
                width: '100%', padding: '0.85rem', borderRadius: '12px', border: 'none',
                background: newPassword.length >= 4 && newPassword === confirmPass
                  ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                  : 'var(--bg-tertiary)',
                color: newPassword.length >= 4 && newPassword === confirmPass
                  ? 'white' : 'var(--text-muted)',
                fontSize: '0.95rem', fontWeight: 600,
                cursor: newPassword.length >= 4 && newPassword === confirmPass
                  ? 'pointer' : 'not-allowed',
                fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                boxShadow: newPassword.length >= 4 && newPassword === confirmPass
                  ? '0 4px 20px rgba(34,197,94,0.35)' : 'none',
              }}
            >
              {isLoading
                ? <RefreshCw size={16} style={{ animation: 'spin 0.8s linear infinite' }} />
                : <Shield size={16} />
              }
              {isLoading ? 'Setting up...' : 'Set Password & Generate Recovery Key'}
            </button>
          </>
        )}

        {/* ══ SHOW RECOVERY KEY ═════════════════════════════════════════ */}
        {mode === 'showRecovery' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '20px',
                background: 'linear-gradient(135deg, rgba(251,191,36,0.2), rgba(245,158,11,0.15))',
                border: '1px solid rgba(251,191,36,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 1rem',
              }}>
                <Key size={28} style={{ color: '#f59e0b' }} />
              </div>
              <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.3rem' }}>
                Save Your Recovery Key
              </div>
              <div style={{ fontSize: '0.82rem', color: '#f97316', fontWeight: 500, lineHeight: 1.5 }}>
                ⚠️ This key is shown ONLY ONCE. Save it now — you'll need it if you forget your password!
              </div>
            </div>

            {/* Recovery key display */}
            <div style={{
              background: 'var(--bg-tertiary)',
              border: '1.5px dashed #f59e0b',
              borderRadius: '12px',
              padding: '1rem',
              marginBottom: '1rem',
              textAlign: 'center',
            }}>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.78rem',
                color: '#f59e0b',
                letterSpacing: '0.08em',
                lineHeight: '1.8',
                wordBreak: 'break-all',
                fontWeight: 600,
              }}>
                {generatedKey}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <button
                onClick={handleCopyKey}
                style={{
                  flex: 1, padding: '0.65rem', borderRadius: '10px',
                  border: '1px solid var(--border)', background: keyCopied ? 'rgba(34,197,94,0.1)' : 'var(--bg-tertiary)',
                  color: keyCopied ? '#22c55e' : 'var(--text-secondary)',
                  fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                }}
              >
                {keyCopied ? <CheckCircle size={14} /> : <Copy size={14} />}
                {keyCopied ? 'Copied!' : 'Copy Key'}
              </button>

              <button
                onClick={handleDownloadKey}
                style={{
                  flex: 1, padding: '0.65rem', borderRadius: '10px',
                  border: '1px solid var(--border)', background: 'var(--bg-tertiary)',
                  color: 'var(--text-secondary)', fontSize: '0.82rem',
                  cursor: 'pointer', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                }}
              >
                <Download size={14} />
                Save as File
              </button>
            </div>

            <div style={{
              padding: '0.6rem 0.75rem', borderRadius: '10px',
              background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)',
              fontSize: '0.75rem', color: '#d97706', marginBottom: '1rem', lineHeight: 1.5,
            }}>
              💡 Store this key in: a USB drive, Google Drive, email to yourself, or printed paper. <strong>Do not store it only in this computer.</strong>
            </div>

            <button
              onClick={() => {
                if (!keyCopied) {
                  if (!window.confirm('Are you sure? This key cannot be shown again!')) return
                }
                setGeneratedKey('')
                unlock()
              }}
              style={{
                width: '100%', padding: '0.85rem', borderRadius: '12px', border: 'none',
                background: 'linear-gradient(135deg, #6366f1, #a78bfa)',
                color: 'white', fontSize: '0.95rem', fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                boxShadow: '0 4px 20px rgba(99,102,241,0.35)',
              }}
            >
              <CheckCircle size={16} />
              I've saved the key — Open Soul Diary
            </button>
          </>
        )}

        {/* ══ FORGOT PASSWORD ════════════════════════════════════════════ */}
        {mode === 'forgot' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '20px',
                background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 1rem',
              }}>
                <Key size={28} style={{ color: 'var(--accent)' }} />
              </div>
              <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.3rem' }}>
                Forgot Password?
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Use your recovery key to reset your password. This was generated when you first set up your password.
              </div>
            </div>

            <div style={{
              padding: '1rem', borderRadius: '12px',
              background: 'var(--bg-tertiary)', border: '1px solid var(--border)',
              marginBottom: '1.25rem',
            }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Recovery key format:
              </div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '0.75rem', color: 'var(--text-secondary)', letterSpacing: '0.06em' }}>
                XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => { clearMessages(); setMode('locked') }}
                style={{
                  flex: 1, padding: '0.75rem', borderRadius: '10px',
                  border: '1px solid var(--border)', background: 'transparent',
                  color: 'var(--text-muted)', fontSize: '0.85rem',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                ← Back
              </button>
              <button
                onClick={() => { clearMessages(); setMode('recovery') }}
                style={{
                  flex: 2, padding: '0.75rem', borderRadius: '10px',
                  border: 'none', background: 'linear-gradient(135deg, #6366f1, #a78bfa)',
                  color: 'white', fontSize: '0.85rem', fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                }}
              >
                <Key size={14} />
                Enter Recovery Key
              </button>
            </div>
          </>
        )}

        {/* ══ RECOVERY KEY ENTRY ════════════════════════════════════════ */}
        {mode === 'recovery' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.3rem' }}>
                Enter Recovery Key
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Paste or type your recovery key below
              </div>
            </div>

            <textarea
              value={recoveryInput}
              onChange={e => { setRecoveryInput(e.target.value); clearMessages() }}
              placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"
              rows={3}
              className="selectable"
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '12px',
                border: `1.5px solid ${error ? '#ef4444' : 'var(--border)'}`,
                background: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                fontSize: '0.82rem',
                fontFamily: "'JetBrains Mono', monospace",
                outline: 'none',
                resize: 'none',
                letterSpacing: '0.05em',
                marginBottom: '0.75rem',
                boxSizing: 'border-box',
              }}
            />

            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 0.75rem', borderRadius: '10px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: '0.8rem', marginBottom: '1rem' }}>
                <AlertTriangle size={14} />{error}
              </div>
            )}

            {success && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 0.75rem', borderRadius: '10px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#22c55e', fontSize: '0.8rem', marginBottom: '1rem' }}>
                <CheckCircle size={14} />{success}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => { clearMessages(); setMode('forgot') }}
                style={{ flex: 1, padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                ← Back
              </button>
              <button
                onClick={handleRecovery}
                disabled={isLoading || !recoveryInput.trim()}
                style={{
                  flex: 2, padding: '0.75rem', borderRadius: '10px', border: 'none',
                  background: recoveryInput.trim() ? 'linear-gradient(135deg, #6366f1, #a78bfa)' : 'var(--bg-tertiary)',
                  color: recoveryInput.trim() ? 'white' : 'var(--text-muted)',
                  fontSize: '0.85rem', fontWeight: 600,
                  cursor: recoveryInput.trim() ? 'pointer' : 'not-allowed',
                  fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                }}
              >
                {isLoading
                  ? <RefreshCw size={14} style={{ animation: 'spin 0.8s linear infinite' }} />
                  : <Shield size={14} />
                }
                {isLoading ? 'Verifying...' : 'Verify Key'}
              </button>
            </div>
          </>
        )}

        {/* ══ RESET PASSWORD ════════════════════════════════════════════ */}
        {mode === 'reset' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '20px',
                background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 1rem',
              }}>
                <RefreshCw size={28} style={{ color: 'var(--accent)' }} />
              </div>
              <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.3rem' }}>
                Set New Password
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                A new recovery key will also be generated. Save it!
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
              <InputField
                value={newPassword}
                onChange={v => { setNewPassword(v); clearMessages() }}
                placeholder="New password (min 4 characters)"
                show={showNew}
                onToggleShow={() => setShowNew(v => !v)}
                autoFocus
              />
              <InputField
                value={confirmPass}
                onChange={v => { setConfirmPass(v); clearMessages() }}
                placeholder="Confirm new password"
                show={showNew}
                onToggleShow={() => setShowNew(v => !v)}
                onEnter={handleReset}
              />
            </div>

            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 0.75rem', borderRadius: '10px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: '0.8rem', marginBottom: '1rem' }}>
                <AlertTriangle size={14} />{error}
              </div>
            )}

            <button
              onClick={handleReset}
              disabled={isLoading || newPassword.length < 4 || newPassword !== confirmPass}
              style={{
                width: '100%', padding: '0.85rem', borderRadius: '12px', border: 'none',
                background: newPassword.length >= 4 && newPassword === confirmPass
                  ? 'linear-gradient(135deg, #6366f1, #a78bfa)' : 'var(--bg-tertiary)',
                color: newPassword.length >= 4 && newPassword === confirmPass
                  ? 'white' : 'var(--text-muted)',
                fontSize: '0.95rem', fontWeight: 600,
                cursor: newPassword.length >= 4 && newPassword === confirmPass
                  ? 'pointer' : 'not-allowed',
                fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              }}
            >
              {isLoading
                ? <RefreshCw size={16} style={{ animation: 'spin 0.8s linear infinite' }} />
                : <Shield size={16} />
              }
              {isLoading ? 'Saving...' : 'Reset Password'}
            </button>
          </>
        )}
      </div>

      <style>{`
        @keyframes lockIn {
          from { transform: scale(0.92) translateY(20px); opacity: 0 }
          to   { transform: scale(1)    translateY(0);    opacity: 1 }
        }
        @keyframes spin {
          from { transform: rotate(0deg)   }
          to   { transform: rotate(360deg) }
        }
      `}</style>
    </div>
  )
}