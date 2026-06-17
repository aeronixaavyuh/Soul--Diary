import { useState, useRef, useEffect, useCallback } from 'react'
import { useAppStore } from '@store/useAppStore'
import {
  Lock, Eye, EyeOff, Shield,
  AlertTriangle, CheckCircle, Timer,
  Key, RefreshCw, Copy, Check,
} from 'lucide-react'

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_ATTEMPTS  = 5
const LOCKOUT_SECS  = 30

// ─── Recovery Key Generator ───────────────────────────────────────────────────

function generateRecoveryKey(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let key = ''
  for (let i = 0; i < 24; i++) {
    if (i > 0 && i % 6 === 0) key += '-'
    key += chars[Math.floor(Math.random() * chars.length)]
  }
  return key // Format: XXXXXX-XXXXXX-XXXXXX-XXXXXX
}

// ─── Simple hash (for storage) ────────────────────────────────────────────────

async function hashValue(value: string): Promise<string> {
  try {
    const encoder = new TextEncoder()
    const data    = encoder.encode(value + 'soul-diary-salt-v2')
    const hash    = await crypto.subtle.digest('SHA-256', data)
    const arr     = Array.from(new Uint8Array(hash))
    return arr.map(b => b.toString(16).padStart(2, '0')).join('')
  } catch {
    // Fallback
    return btoa(value + 'soul-diary-salt-v2')
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN LOCKSCREEN
// ═══════════════════════════════════════════════════════════════════════════

export default function LockScreen() {
  const { unlock, settings, updateSettings } = useAppStore()

  // Screen: 'lock' | 'setup' | 'recovery' | 'recovery_done'
  const [screen, setScreen] = useState<'lock' | 'setup' | 'recovery' | 'recovery_done'>(
    settings.hasPin ? 'lock' : 'setup'
  )

  return (
    <div style={{
      width:          '100vw',
      height:         '100vh',
      background:     'var(--bg-primary)',
      display:        'flex',
      flexDirection:  'column',
      alignItems:     'center',
      justifyContent: 'center',
      position:       'relative',
      overflow:       'hidden',
    }}>
      {/* Background glow */}
      <div style={{
        position:      'absolute',
        width:         '500px',
        height:        '500px',
        borderRadius:  '50%',
        background:    'radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {screen === 'lock'         && (
        <UnlockScreen
          settings={settings}
          unlock={unlock}
          onForgot={() => setScreen('recovery')}
        />
      )}
      {screen === 'setup'        && (
        <SetupScreen
          updateSettings={updateSettings}
          onDone={() => setScreen('lock')}
        />
      )}
      {screen === 'recovery'     && (
        <RecoveryScreen
          settings={settings}
          updateSettings={updateSettings}
          onBack={() => setScreen('lock')}
          onSuccess={() => setScreen('recovery_done')}
        />
      )}
      {screen === 'recovery_done' && (
        <RecoveryDoneScreen
          updateSettings={updateSettings}
          unlock={unlock}
          onSetNew={() => setScreen('setup')}
        />
      )}

      {/* Bottom badge */}
      <div style={{
        position:   'fixed',
        bottom:     '1.25rem',
        display:    'flex',
        alignItems: 'center',
        gap:        '0.4rem',
        color:      'var(--text-muted)',
        fontSize:   '0.68rem',
        opacity:    0.45,
      }}>
        <Shield size={11} />
        Soul Diary — AES-256 Encrypted
      </div>

      <style>{`
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20%     { transform: translateX(-8px); }
          40%     { transform: translateX(8px); }
          60%     { transform: translateX(-5px); }
          80%     { transform: translateX(5px); }
        }
        @keyframes float {
          0%,100% { transform: translateY(0px); }
          50%     { transform: translateY(-6px); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes scaleIn {
          from { transform: scale(0.94); opacity: 0; }
          to   { transform: scale(1);    opacity: 1; }
        }
      `}</style>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  UNLOCK SCREEN — Enter password or PIN
// ═══════════════════════════════════════════════════════════════════════════

function UnlockScreen({
  settings, unlock, onForgot,
}: {
  settings:  any
  unlock:    () => void
  onForgot:  () => void
}) {
  const [mode,        setMode]        = useState<'password' | 'pin'>('password')
  const [value,       setValue]       = useState('')
  const [showVal,     setShowVal]     = useState(false)
  const [error,       setError]       = useState('')
  const [shake,       setShake]       = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [success,     setSuccess]     = useState(false)
  const [attempts,    setAttempts]    = useState(0)
  const [lockedUntil, setLockedUntil] = useState<number | null>(null)
  const [countdown,   setCountdown]   = useState(0)

  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [mode])

  // Countdown timer
  useEffect(() => {
    if (!lockedUntil) return
    const iv = setInterval(() => {
      const rem = Math.ceil((lockedUntil - Date.now()) / 1000)
      if (rem <= 0) {
        setLockedUntil(null)
        setAttempts(0)
        setCountdown(0)
        setError('')
        setTimeout(() => inputRef.current?.focus(), 100)
      } else {
        setCountdown(rem)
      }
    }, 500)
    return () => clearInterval(iv)
  }, [lockedUntil])

  const isLockedOut = lockedUntil !== null && Date.now() < lockedUntil

  const triggerShake = () => {
    setShake(true)
    setTimeout(() => setShake(false), 600)
  }

  const handleFailed = useCallback((newAttempts: number) => {
    triggerShake()
    setValue('')
    const remaining = MAX_ATTEMPTS - newAttempts
    if (newAttempts >= MAX_ATTEMPTS) {
      const until = Date.now() + LOCKOUT_SECS * 1000
      setLockedUntil(until)
      setCountdown(LOCKOUT_SECS)
      setError(`Too many attempts. Locked for ${LOCKOUT_SECS}s.`)
    } else {
      setError(remaining === 1
        ? `Wrong! 1 attempt left before lockout.`
        : `Wrong! ${remaining} attempts remaining.`)
    }
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [])

  const verify = useCallback(async (input: string) => {
    if (!input.trim() || isVerifying || isLockedOut) return
    setIsVerifying(true)
    setError('')

    try {
      // Try electronAPI first
      let matched = false
      try {
        const res = await window.electronAPI.pin.verify(input)
        matched = res?.success === true
      } catch { /* ignore */ }

      // Fallback: hash compare
      if (!matched) {
        const hashed = await hashValue(input)
        matched = hashed === settings.securityHash
      }

      // Legacy fallback
      if (!matched && settings.pinHash) {
        try { matched = input === atob(settings.pinHash) } catch { /* ignore */ }
      }

      if (matched) {
        setSuccess(true)
        setTimeout(() => unlock(), 400)
      } else {
        const na = attempts + 1
        setAttempts(na)
        handleFailed(na)
      }
    } catch {
      const na = attempts + 1
      setAttempts(na)
      handleFailed(na)
    } finally {
      setIsVerifying(false)
    }
  }, [isVerifying, isLockedOut, attempts, settings, unlock, handleFailed])

  return (
    <div style={{
      display:       'flex',
      flexDirection: 'column',
      alignItems:    'center',
      gap:           '1.25rem',
      width:         '100%',
      animation:     'scaleIn 0.25s ease',
    }}>
      {/* Icon */}
      <div style={{
        width:          '74px',
        height:         '74px',
        borderRadius:   '22px',
        background:     success
          ? 'linear-gradient(135deg, #22c55e, #16a34a)'
          : 'linear-gradient(135deg, #6366f1, #a78bfa)',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        boxShadow:      success
          ? '0 0 30px rgba(34,197,94,0.5)'
          : '0 0 30px rgba(99,102,241,0.4)',
        transition:     'all 0.4s',
        animation:      'float 3s ease-in-out infinite',
      }}>
        {success
          ? <CheckCircle size={34} color="white" />
          : <Lock        size={34} color="white" />}
      </div>

      {/* Title */}
      <div style={{ textAlign: 'center' }}>
        <h1 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize:   '1.8rem',
          fontWeight: 700,
          color:      'var(--text-primary)',
          margin:     0,
        }}>
          Soul Diary
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.83rem', marginTop: '0.3rem' }}>
          {isLockedOut  ? 'Account temporarily locked'
          : success     ? 'Unlocking...'
          : mode === 'password' ? 'Enter your password to continue'
          : 'Enter your PIN to continue'}
        </p>
      </div>

      {/* Lockout */}
      {isLockedOut && (
        <div style={{
          display:      'flex',
          alignItems:   'center',
          gap:          '0.5rem',
          padding:      '0.75rem 1.5rem',
          borderRadius: '12px',
          background:   'rgba(239,68,68,0.1)',
          border:       '1px solid rgba(239,68,68,0.3)',
          color:        '#ef4444',
          fontSize:     '0.875rem',
          fontWeight:   500,
          animation:    'fadeIn 0.2s ease',
        }}>
          <Timer size={16} />
          Locked for {countdown} seconds
        </div>
      )}

      {/* Input area */}
      {!isLockedOut && !success && (
        <div style={{
          display:       'flex',
          flexDirection: 'column',
          alignItems:    'center',
          gap:           '0.875rem',
          width:         '100%',
          maxWidth:      '340px',
          animation:     shake ? 'shake 0.5s ease' : 'none',
          padding:       '0 1rem',
          boxSizing:     'border-box',
        }}>
          {/* Mode tabs */}
          <div style={{
            display:      'flex',
            background:   'var(--bg-tertiary)',
            borderRadius: '10px',
            padding:      '3px',
            gap:          '2px',
            width:        '100%',
          }}>
            {(['password', 'pin'] as const).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(''); setValue('') }}
                style={{
                  flex:         1,
                  padding:      '0.4rem 0.75rem',
                  borderRadius: '8px',
                  border:       'none',
                  background:   mode === m ? 'var(--bg-card)' : 'transparent',
                  color:        mode === m ? 'var(--accent)' : 'var(--text-muted)',
                  fontSize:     '0.78rem',
                  fontWeight:   mode === m ? 600 : 400,
                  cursor:       'pointer',
                  fontFamily:   'inherit',
                  transition:   'all 0.2s',
                  boxShadow:    mode === m ? '0 1px 4px rgba(0,0,0,0.12)' : 'none',
                }}
              >
                {m === 'password' ? '🔑 Password' : '🔢 PIN'}
              </button>
            ))}
          </div>

          {/* Input field */}
          <div style={{ position: 'relative', width: '100%' }}>
            <input
              ref={inputRef}
              type={showVal ? 'text' : 'password'}
              inputMode={mode === 'pin' ? 'numeric' : 'text'}
              value={value}
              onChange={e => {
                const v = e.target.value
                if (mode === 'pin' && !/^\d*$/.test(v)) return
                setValue(v)
                setError('')
              }}
              onKeyDown={e => e.key === 'Enter' && verify(value)}
              placeholder={
                mode === 'password'
                  ? 'Enter your password...'
                  : 'Enter your PIN (any length)...'
              }
              disabled={isVerifying}
              className="selectable"
              style={{
                width:        '100%',
                padding:      '0.85rem 2.75rem 0.85rem 1rem',
                borderRadius: '12px',
                border:       `2px solid ${
                  error   ? '#ef4444'
                  : value ? 'var(--accent)'
                  : 'var(--border)'}`,
                background:   'var(--bg-card)',
                color:        'var(--text-primary)',
                fontSize:     mode === 'pin' ? '1.2rem' : '1rem',
                letterSpacing:mode === 'pin' ? '0.2em' : 'normal',
                fontFamily:   mode === 'pin' ? 'monospace' : 'inherit',
                outline:      'none',
                boxSizing:    'border-box',
                boxShadow:    value ? '0 0 0 3px rgba(99,102,241,0.12)' : 'none',
                transition:   'all 0.2s',
              }}
            />
            <button
              onClick={() => setShowVal(v => !v)}
              style={{
                position:   'absolute',
                right:      '0.75rem',
                top:        '50%',
                transform:  'translateY(-50%)',
                background: 'none',
                border:     'none',
                cursor:     'pointer',
                color:      'var(--text-muted)',
                display:    'flex',
                padding:    '4px',
              }}
            >
              {showVal ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {/* Unlock button */}
          <button
            onClick={() => verify(value)}
            disabled={isVerifying || !value.trim()}
            style={{
              width:          '100%',
              padding:        '0.8rem',
              borderRadius:   '12px',
              border:         'none',
              background:     'linear-gradient(135deg, #6366f1, #a78bfa)',
              color:          'white',
              fontSize:       '0.95rem',
              fontWeight:     600,
              cursor:         isVerifying || !value.trim() ? 'not-allowed' : 'pointer',
              fontFamily:     'inherit',
              opacity:        isVerifying || !value.trim() ? 0.6 : 1,
              transition:     'all 0.2s',
              boxShadow:      '0 4px 16px rgba(99,102,241,0.35)',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              gap:            '0.4rem',
            }}
            onMouseEnter={e => {
              if (!isVerifying && value.trim()) {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'
                ;(e.currentTarget as HTMLElement).style.boxShadow = '0 6px 20px rgba(99,102,241,0.5)'
              }
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
              ;(e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(99,102,241,0.35)'
            }}
          >
            {isVerifying ? (
              <>
                <span style={{ animation: 'spin 0.8s linear infinite', display: 'inline-block' }}>⟳</span>
                Verifying...
              </>
            ) : (
              <><Shield size={15} /> Unlock</>
            )}
          </button>

          {/* Forgot */}
          <button
            onClick={onForgot}
            style={{
              background: 'none',
              border:     'none',
              cursor:     'pointer',
              color:      'var(--text-muted)',
              fontSize:   '0.78rem',
              fontFamily: 'inherit',
              display:    'flex',
              alignItems: 'center',
              gap:        '0.35rem',
              padding:    '0.25rem 0.5rem',
              borderRadius:'6px',
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--accent)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'}
          >
            <Key size={12} />
            Forgot password or PIN?
          </button>
        </div>
      )}

      {/* Error */}
      {error && !isLockedOut && (
        <div style={{
          display:      'flex',
          alignItems:   'center',
          gap:          '0.4rem',
          color:        '#ef4444',
          fontSize:     '0.82rem',
          padding:      '0.5rem 1rem',
          borderRadius: '8px',
          background:   'rgba(239,68,68,0.08)',
          border:       '1px solid rgba(239,68,68,0.2)',
          animation:    'fadeIn 0.2s ease',
          maxWidth:     '320px',
          textAlign:    'center',
        }}>
          <AlertTriangle size={14} />
          {error}
        </div>
      )}

      {/* Attempts dots */}
      {attempts > 0 && !isLockedOut && (
        <div style={{ display: 'flex', gap: '5px' }}>
          {Array.from({ length: MAX_ATTEMPTS }, (_, i) => (
            <div key={i} style={{
              width:        '8px',
              height:       '8px',
              borderRadius: '50%',
              background:   i < attempts ? '#ef4444' : 'var(--border)',
              transition:   'background 0.2s',
            }} />
          ))}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  SETUP SCREEN — First time / Change security
// ═══════════════════════════════════════════════════════════════════════════

function SetupScreen({
  updateSettings,
  onDone,
}: {
  updateSettings: (s: any) => void
  onDone:         () => void
}) {
  const [mode,         setMode]         = useState<'password' | 'pin'>('password')
  const [value,        setValue]        = useState('')
  const [confirm,      setConfirm]      = useState('')
  const [showVal,      setShowVal]      = useState(false)
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState('')
  const [recoveryKey,  setRecoveryKey]  = useState('')
  const [copied,       setCopied]       = useState(false)
  const [step,         setStep]         = useState<'form' | 'recovery'>(  'form')

  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 100) }, [mode])

  const getStrength = (v: string) => {
    if (!v)          return { label: '', color: 'transparent', w: 0 }
    if (v.length < 4) return { label: 'Too short', color: '#ef4444', w: 15 }
    if (v.length < 6) return { label: 'Weak',      color: '#f97316', w: 35 }
    if (v.length < 8) return { label: 'Fair',      color: '#eab308', w: 55 }
    if (v.length < 12)return { label: 'Good',      color: '#22c55e', w: 75 }
    return                   { label: 'Strong',    color: '#16a34a', w: 100 }
  }

  const strength = getStrength(value)

  const handleSetup = async () => {
    if (!value.trim())         return setError('Please enter a value.')
    if (value.length < 4)      return setError('Minimum 4 characters required.')
    if (value !== confirm)     return setError(
      mode === 'password' ? 'Passwords do not match.' : 'PINs do not match.'
    )
    if (mode === 'pin' && !/^\d+$/.test(value))
                               return setError('PIN must be digits only.')

    setLoading(true)
    setError('')

    try {
      // Hash the value
      const hashed = await hashValue(value)
      const rKey   = generateRecoveryKey()

      // Hash recovery key too
      const rKeyHashed = await hashValue(rKey)

      // Try to save via electronAPI
      try {
        await window.electronAPI.pin.set(value)
      } catch { /* continue with local storage */ }

      // Save to app store
      updateSettings({
        hasPin:          true,
        securityHash:    hashed,
        pinHash:         btoa(value), // legacy fallback
        recoveryKeyHash: rKeyHashed,
        securityMode:    mode,
      })

      setRecoveryKey(rKey)
      setStep('recovery')
    } catch {
      setError('Failed to set security. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(recoveryKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Step 2: Show recovery key ──────────────────────────────────────────────

  if (step === 'recovery') {
    return (
      <div style={{
        display:       'flex',
        flexDirection: 'column',
        alignItems:    'center',
        gap:           '1.25rem',
        width:         '100%',
        maxWidth:      '420px',
        padding:       '0 1.5rem',
        boxSizing:     'border-box',
        animation:     'scaleIn 0.25s ease',
      }}>
        <div style={{
          width:          '64px',
          height:         '64px',
          borderRadius:   '18px',
          background:     'linear-gradient(135deg, #22c55e, #16a34a)',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          boxShadow:      '0 0 24px rgba(34,197,94,0.4)',
          animation:      'float 3s ease-in-out infinite',
        }}>
          <Key size={30} color="white" />
        </div>

        <div style={{ textAlign: 'center' }}>
          <h2 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize:   '1.4rem',
            fontWeight: 700,
            color:      'var(--text-primary)',
            margin:     0,
          }}>
            Save Your Recovery Key
          </h2>
          <p style={{
            color:     'var(--text-secondary)',
            fontSize:  '0.82rem',
            marginTop: '0.4rem',
            lineHeight:1.5,
          }}>
            If you forget your password or PIN, this key is the ONLY way
            to recover your account. Save it somewhere safe.
          </p>
        </div>

        {/* Recovery key display */}
        <div style={{
          width:        '100%',
          padding:      '1.25rem',
          borderRadius: '14px',
          background:   'rgba(234,179,8,0.08)',
          border:       '1px solid rgba(234,179,8,0.35)',
          textAlign:    'center',
        }}>
          <div style={{
            fontSize:      '0.65rem',
            fontWeight:    600,
            color:         '#eab308',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginBottom:  '0.75rem',
          }}>
            Recovery Key — Save This Immediately
          </div>
          <div style={{
            fontFamily:   'monospace',
            fontSize:     '1.1rem',
            fontWeight:   700,
            color:        'var(--text-primary)',
            letterSpacing:'0.12em',
            padding:      '0.75rem',
            background:   'var(--bg-card)',
            borderRadius: '10px',
            border:       '1px solid var(--border)',
            userSelect:   'all',
            marginBottom: '0.75rem',
          }}>
            {recoveryKey}
          </div>
          <button
            onClick={handleCopy}
            style={{
              display:        'flex',
              alignItems:     'center',
              gap:            '0.4rem',
              padding:        '0.4rem 1rem',
              borderRadius:   '8px',
              border:         '1px solid rgba(234,179,8,0.4)',
              background:     copied ? 'rgba(34,197,94,0.1)' : 'transparent',
              color:          copied ? '#22c55e' : '#eab308',
              fontSize:       '0.78rem',
              fontWeight:     600,
              cursor:         'pointer',
              fontFamily:     'inherit',
              margin:         '0 auto',
              transition:     'all 0.2s',
            }}
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? 'Copied!' : 'Copy Key'}
          </button>
        </div>

        {/* Warning */}
        <div style={{
          display:      'flex',
          gap:          '0.5rem',
          padding:      '0.75rem',
          borderRadius: '10px',
          background:   'rgba(239,68,68,0.06)',
          border:       '1px solid rgba(239,68,68,0.2)',
          fontSize:     '0.78rem',
          color:        '#ef4444',
          lineHeight:   1.5,
          width:        '100%',
          boxSizing:    'border-box',
        }}>
          <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
          <span>
            This key is shown only once and cannot be recovered.
            Screenshot it, write it down, or store in a password manager.
          </span>
        </div>

        <button
          onClick={onDone}
          style={{
            width:          '100%',
            padding:        '0.8rem',
            borderRadius:   '12px',
            border:         'none',
            background:     'linear-gradient(135deg, #6366f1, #a78bfa)',
            color:          'white',
            fontSize:       '0.95rem',
            fontWeight:     600,
            cursor:         'pointer',
            fontFamily:     'inherit',
            boxShadow:      '0 4px 16px rgba(99,102,241,0.35)',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            gap:            '0.4rem',
          }}
        >
          <CheckCircle size={16} />
          I've Saved My Recovery Key
        </button>
      </div>
    )
  }

  // ── Step 1: Setup form ────────────────────────────────────────────────────

  return (
    <div style={{
      display:       'flex',
      flexDirection: 'column',
      alignItems:    'center',
      gap:           '1.25rem',
      width:         '100%',
      maxWidth:      '360px',
      padding:       '0 1.25rem',
      boxSizing:     'border-box',
      animation:     'scaleIn 0.25s ease',
    }}>
      {/* Icon */}
      <div style={{
        width:          '68px',
        height:         '68px',
        borderRadius:   '20px',
        background:     'linear-gradient(135deg, #6366f1, #a78bfa)',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        boxShadow:      '0 0 28px rgba(99,102,241,0.4)',
        animation:      'float 3s ease-in-out infinite',
      }}>
        <Lock size={32} color="white" />
      </div>

      <div style={{ textAlign: 'center' }}>
        <h1 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize:   '1.7rem',
          fontWeight: 700,
          color:      'var(--text-primary)',
          margin:     0,
        }}>
          Secure Your Diary
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '0.3rem' }}>
          Set a password or PIN to protect your entries
        </p>
      </div>

      {/* Mode tabs */}
      <div style={{
        display:      'flex',
        background:   'var(--bg-tertiary)',
        borderRadius: '10px',
        padding:      '3px',
        gap:          '2px',
        width:        '100%',
      }}>
        {(['password', 'pin'] as const).map(m => (
          <button
            key={m}
            onClick={() => { setMode(m); setValue(''); setConfirm(''); setError('') }}
            style={{
              flex:         1,
              padding:      '0.4rem',
              borderRadius: '8px',
              border:       'none',
              background:   mode === m ? 'var(--bg-card)' : 'transparent',
              color:        mode === m ? 'var(--accent)' : 'var(--text-muted)',
              fontSize:     '0.78rem',
              fontWeight:   mode === m ? 600 : 400,
              cursor:       'pointer',
              fontFamily:   'inherit',
              transition:   'all 0.2s',
            }}
          >
            {m === 'password' ? '🔑 Password' : '🔢 PIN'}
          </button>
        ))}
      </div>

      {/* Value input */}
      <div style={{ width: '100%' }}>
        <div style={{
          fontSize:     '0.7rem',
          color:        'var(--text-muted)',
          marginBottom: '0.3rem',
          fontWeight:   500,
        }}>
          {mode === 'password' ? 'Password (any length)' : 'PIN (digits only, any length)'}
        </div>
        <div style={{ position: 'relative' }}>
          <input
            ref={inputRef}
            type={showVal ? 'text' : 'password'}
            inputMode={mode === 'pin' ? 'numeric' : 'text'}
            value={value}
            onChange={e => {
              const v = e.target.value
              if (mode === 'pin' && !/^\d*$/.test(v)) return
              setValue(v)
              setError('')
            }}
            placeholder={mode === 'password' ? 'Enter password...' : 'Enter PIN digits...'}
            className="selectable"
            style={{
              width:        '100%',
              padding:      '0.65rem 2.5rem 0.65rem 0.85rem',
              borderRadius: '10px',
              border:       `1px solid ${value ? 'var(--accent)' : 'var(--border)'}`,
              background:   'var(--bg-card)',
              color:        'var(--text-primary)',
              fontSize:     mode === 'pin' ? '1.1rem' : '0.9rem',
              letterSpacing:mode === 'pin' ? '0.2em' : 'normal',
              fontFamily:   mode === 'pin' ? 'monospace' : 'inherit',
              outline:      'none',
              boxSizing:    'border-box',
              boxShadow:    value ? '0 0 0 3px rgba(99,102,241,0.1)' : 'none',
            }}
          />
          <button
            onClick={() => setShowVal(v => !v)}
            style={{
              position:   'absolute',
              right:      '0.6rem',
              top:        '50%',
              transform:  'translateY(-50%)',
              background: 'none',
              border:     'none',
              cursor:     'pointer',
              color:      'var(--text-muted)',
              display:    'flex',
            }}
          >
            {showVal ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>

        {/* Strength bar (password only) */}
        {mode === 'password' && value && (
          <div style={{ marginTop: '5px' }}>
            <div style={{
              height:       '3px',
              borderRadius: '2px',
              background:   'var(--bg-tertiary)',
              overflow:     'hidden',
            }}>
              <div style={{
                height:     '100%',
                width:      `${strength.w}%`,
                background: strength.color,
                transition: 'all 0.3s',
              }} />
            </div>
            <div style={{
              fontSize:  '0.63rem',
              color:     strength.color,
              marginTop: '3px',
              fontWeight:500,
            }}>
              {strength.label}
            </div>
          </div>
        )}

        {/* PIN progress dots */}
        {mode === 'pin' && value.length > 0 && (
          <div style={{
            display:   'flex',
            gap:       '3px',
            marginTop: '6px',
            flexWrap:  'wrap',
          }}>
            {Array.from({ length: Math.min(value.length, 20) }, (_, i) => (
              <div key={i} style={{
                width:        '7px',
                height:       '7px',
                borderRadius: '50%',
                background:   'var(--accent)',
              }} />
            ))}
            {value.length > 20 && (
              <span style={{ fontSize: '0.62rem', color: 'var(--accent)', alignSelf: 'center' }}>
                +{value.length - 20} more
              </span>
            )}
          </div>
        )}
      </div>

      {/* Confirm input */}
      <div style={{ width: '100%' }}>
        <div style={{
          fontSize:     '0.7rem',
          color:        'var(--text-muted)',
          marginBottom: '0.3rem',
          fontWeight:   500,
        }}>
          Confirm {mode === 'password' ? 'Password' : 'PIN'}
        </div>
        <input
          type={showVal ? 'text' : 'password'}
          inputMode={mode === 'pin' ? 'numeric' : 'text'}
          value={confirm}
          onChange={e => {
            const v = e.target.value
            if (mode === 'pin' && !/^\d*$/.test(v)) return
            setConfirm(v)
            setError('')
          }}
          onKeyDown={e => e.key === 'Enter' && handleSetup()}
          placeholder={mode === 'password' ? 'Re-enter password...' : 'Re-enter PIN...'}
          className="selectable"
          style={{
            width:        '100%',
            padding:      '0.65rem 0.85rem',
            borderRadius: '10px',
            border:       `1px solid ${
              confirm && confirm !== value ? '#ef4444'
              : confirm && confirm === value ? '#22c55e'
              : 'var(--border)'}`,
            background:   'var(--bg-card)',
            color:        'var(--text-primary)',
            fontSize:     mode === 'pin' ? '1.1rem' : '0.9rem',
            letterSpacing:mode === 'pin' ? '0.2em' : 'normal',
            fontFamily:   mode === 'pin' ? 'monospace' : 'inherit',
            outline:      'none',
            boxSizing:    'border-box',
          }}
        />
        {confirm && confirm !== value && (
          <div style={{ fontSize: '0.63rem', color: '#ef4444', marginTop: '3px' }}>
            {mode === 'password' ? 'Passwords' : 'PINs'} do not match
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div style={{
          display:      'flex',
          alignItems:   'center',
          gap:          '0.4rem',
          color:        '#ef4444',
          fontSize:     '0.8rem',
          padding:      '0.45rem 0.75rem',
          borderRadius: '8px',
          background:   'rgba(239,68,68,0.08)',
          border:       '1px solid rgba(239,68,68,0.2)',
          width:        '100%',
          boxSizing:    'border-box',
          animation:    'fadeIn 0.2s ease',
        }}>
          <AlertTriangle size={13} />
          {error}
        </div>
      )}

      {/* Submit */}
      <button
        onClick={handleSetup}
        disabled={loading || !value.trim() || !confirm.trim()}
        style={{
          width:          '100%',
          padding:        '0.8rem',
          borderRadius:   '12px',
          border:         'none',
          background:     'linear-gradient(135deg, #6366f1, #a78bfa)',
          color:          'white',
          fontSize:       '0.95rem',
          fontWeight:     600,
          cursor:         loading ? 'wait' : 'pointer',
          fontFamily:     'inherit',
          opacity:        loading || !value.trim() || !confirm.trim() ? 0.6 : 1,
          boxShadow:      '0 4px 16px rgba(99,102,241,0.35)',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          gap:            '0.4rem',
          transition:     'all 0.2s',
        }}
      >
        {loading ? (
          <><span style={{ animation: 'spin 0.8s linear infinite', display: 'inline-block' }}>⟳</span> Setting up...</>
        ) : (
          <><Shield size={15} /> Set {mode === 'password' ? 'Password' : 'PIN'}</>
        )}
      </button>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  RECOVERY SCREEN — Enter recovery key
// ═══════════════════════════════════════════════════════════════════════════

function RecoveryScreen({
  settings, updateSettings, onBack, onSuccess,
}: {
  settings:       any
  updateSettings: (s: any) => void
  onBack:         () => void
  onSuccess:      () => void
}) {
  const [key,     setKey]     = useState('')
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const handleRecover = async () => {
    if (!key.trim()) return setError('Enter your recovery key.')
    setLoading(true)
    setError('')

    try {
      // Normalize key (remove dashes, uppercase)
      const normalized    = key.replace(/-/g, '').toUpperCase().trim()
      const withDashes    = normalized.match(/.{1,6}/g)?.join('-') ?? normalized
      const hashed        = await hashValue(withDashes)
      const storedHash    = settings.recoveryKeyHash ?? ''

      // Also try without dashes
      const hashedNoDash  = await hashValue(normalized)

      if (hashed === storedHash || hashedNoDash === storedHash) {
        onSuccess()
      } else {
        setError('Invalid recovery key. Check and try again.')
      }
    } catch {
      setError('Recovery failed. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      display:       'flex',
      flexDirection: 'column',
      alignItems:    'center',
      gap:           '1.25rem',
      width:         '100%',
      maxWidth:      '380px',
      padding:       '0 1.25rem',
      boxSizing:     'border-box',
      animation:     'scaleIn 0.25s ease',
    }}>
      {/* Icon */}
      <div style={{
        width:          '68px',
        height:         '68px',
        borderRadius:   '20px',
        background:     'linear-gradient(135deg, #eab308, #d97706)',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        boxShadow:      '0 0 28px rgba(234,179,8,0.4)',
        animation:      'float 3s ease-in-out infinite',
      }}>
        <Key size={32} color="white" />
      </div>

      <div style={{ textAlign: 'center' }}>
        <h2 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize:   '1.5rem',
          fontWeight: 700,
          color:      'var(--text-primary)',
          margin:     0,
        }}>
          Account Recovery
        </h2>
        <p style={{
          color:     'var(--text-secondary)',
          fontSize:  '0.82rem',
          marginTop: '0.35rem',
          lineHeight:1.5,
        }}>
          Enter the 24-character recovery key you saved when you set up security.
        </p>
      </div>

      {/* Key input */}
      <div style={{ width: '100%' }}>
        <div style={{
          fontSize:     '0.7rem',
          color:        'var(--text-muted)',
          marginBottom: '0.3rem',
          fontWeight:   500,
        }}>
          Recovery Key (format: XXXXXX-XXXXXX-XXXXXX-XXXXXX)
        </div>
        <input
          type="text"
          value={key}
          onChange={e => { setKey(e.target.value.toUpperCase()); setError('') }}
          onKeyDown={e => e.key === 'Enter' && handleRecover()}
          placeholder="XXXXXX-XXXXXX-XXXXXX-XXXXXX"
          className="selectable"
          autoFocus
          style={{
            width:        '100%',
            padding:      '0.75rem',
            borderRadius: '10px',
            border:       `1px solid ${error ? '#ef4444' : key ? '#eab308' : 'var(--border)'}`,
            background:   'var(--bg-card)',
            color:        'var(--text-primary)',
            fontSize:     '0.9rem',
            letterSpacing:'0.1em',
            fontFamily:   'monospace',
            outline:      'none',
            boxSizing:    'border-box',
            textAlign:    'center',
            boxShadow:    key ? '0 0 0 3px rgba(234,179,8,0.1)' : 'none',
          }}
        />
      </div>

      {/* Error */}
      {error && (
        <div style={{
          display:      'flex',
          alignItems:   'center',
          gap:          '0.4rem',
          color:        '#ef4444',
          fontSize:     '0.8rem',
          padding:      '0.45rem 0.75rem',
          borderRadius: '8px',
          background:   'rgba(239,68,68,0.08)',
          border:       '1px solid rgba(239,68,68,0.2)',
          width:        '100%',
          boxSizing:    'border-box',
          animation:    'fadeIn 0.2s ease',
        }}>
          <AlertTriangle size={13} />
          {error}
        </div>
      )}

      {/* Warning */}
      <div style={{
        padding:      '0.75rem',
        borderRadius: '10px',
        background:   'rgba(234,179,8,0.06)',
        border:       '1px solid rgba(234,179,8,0.2)',
        fontSize:     '0.78rem',
        color:        'var(--text-secondary)',
        lineHeight:   1.5,
        width:        '100%',
        boxSizing:    'border-box',
      }}>
        💡 Recovery key was shown once when you set up your password/PIN.
        If you don't have it, your data cannot be recovered — this is by design for security.
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
        <button
          onClick={onBack}
          style={{
            padding:      '0.7rem',
            borderRadius: '10px',
            border:       '1px solid var(--border)',
            background:   'transparent',
            color:        'var(--text-muted)',
            fontSize:     '0.85rem',
            cursor:       'pointer',
            fontFamily:   'inherit',
            flexShrink:   0,
          }}
        >
          ← Back
        </button>

        <button
          onClick={handleRecover}
          disabled={loading || !key.trim()}
          style={{
            flex:           1,
            padding:        '0.7rem',
            borderRadius:   '10px',
            border:         'none',
            background:     'linear-gradient(135deg, #eab308, #d97706)',
            color:          'white',
            fontSize:       '0.9rem',
            fontWeight:     600,
            cursor:         loading || !key.trim() ? 'not-allowed' : 'pointer',
            fontFamily:     'inherit',
            opacity:        loading || !key.trim() ? 0.6 : 1,
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            gap:            '0.4rem',
            boxShadow:      '0 3px 12px rgba(234,179,8,0.3)',
          }}
        >
          {loading ? (
            <><span style={{ animation: 'spin 0.8s linear infinite', display: 'inline-block' }}>⟳</span> Verifying...</>
          ) : (
            <><Key size={14} /> Recover Account</>
          )}
        </button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  RECOVERY DONE — After successful recovery
// ═══════════════════════════════════════════════════════════════════════════

function RecoveryDoneScreen({
  updateSettings, unlock, onSetNew,
}: {
  updateSettings: (s: any) => void
  unlock:         () => void
  onSetNew:       () => void
}) {
  const handleUnlockOnce = () => {
    // Clear security so they can set new one, but let them in once
    updateSettings({ hasPin: false, securityHash: null, pinHash: null })
    unlock()
  }

  return (
    <div style={{
      display:       'flex',
      flexDirection: 'column',
      alignItems:    'center',
      gap:           '1.5rem',
      width:         '100%',
      maxWidth:      '380px',
      padding:       '0 1.25rem',
      boxSizing:     'border-box',
      textAlign:     'center',
      animation:     'scaleIn 0.25s ease',
    }}>
      {/* Icon */}
      <div style={{
        width:          '72px',
        height:         '72px',
        borderRadius:   '20px',
        background:     'linear-gradient(135deg, #22c55e, #16a34a)',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        boxShadow:      '0 0 28px rgba(34,197,94,0.4)',
        animation:      'float 3s ease-in-out infinite',
      }}>
        <CheckCircle size={34} color="white" />
      </div>

      <div>
        <h2 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize:   '1.5rem',
          fontWeight: 700,
          color:      'var(--text-primary)',
          margin:     0,
        }}>
          Recovery Successful!
        </h2>
        <p style={{
          color:     'var(--text-secondary)',
          fontSize:  '0.85rem',
          marginTop: '0.4rem',
          lineHeight:1.5,
        }}>
          Recovery key verified. What would you like to do?
        </p>
      </div>

      {/* Options */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
        {/* Set new security */}
        <button
          onClick={onSetNew}
          style={{
            width:          '100%',
            padding:        '0.875rem',
            borderRadius:   '12px',
            border:         'none',
            background:     'linear-gradient(135deg, #6366f1, #a78bfa)',
            color:          'white',
            fontSize:       '0.9rem',
            fontWeight:     600,
            cursor:         'pointer',
            fontFamily:     'inherit',
            boxShadow:      '0 4px 16px rgba(99,102,241,0.35)',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            gap:            '0.4rem',
          }}
        >
          <RefreshCw size={15} />
          Set New Password / PIN
        </button>

        {/* Unlock without new security */}
        <button
          onClick={handleUnlockOnce}
          style={{
            width:          '100%',
            padding:        '0.875rem',
            borderRadius:   '12px',
            border:         '1px solid var(--border)',
            background:     'var(--bg-secondary)',
            color:          'var(--text-secondary)',
            fontSize:       '0.9rem',
            fontWeight:     500,
            cursor:         'pointer',
            fontFamily:     'inherit',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            gap:            '0.4rem',
          }}
        >
          <Lock size={15} />
          Open Without Security (not recommended)
        </button>
      </div>

      <div style={{
        fontSize:  '0.75rem',
        color:     'var(--text-muted)',
        lineHeight:1.5,
      }}>
        Your old recovery key is now invalid.
        A new key will be generated when you set a new password.
      </div>
    </div>
  )
}