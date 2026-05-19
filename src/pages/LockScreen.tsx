import { useState, useRef, useEffect } from 'react'
import { useAppStore } from '@store/useAppStore'
import { Lock, Eye, EyeOff } from 'lucide-react'

export default function LockScreen() {
  const { unlock, settings } = useAppStore()
  const [pin,       setPin]       = useState(['', '', '', ''])
  const [error,     setError]     = useState('')
  const [showPin,   setShowPin]   = useState(false)
  const [shake,     setShake]     = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  const handlePinChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return
    const newPin = [...pin]
    newPin[index] = value.slice(-1)
    setPin(newPin)
    setError('')

    // Auto advance
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus()
    }

    // Auto submit when all filled
    if (value && index === 3) {
      const fullPin = [...newPin].join('')
      setTimeout(() => verifyPin(fullPin), 100)
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const verifyPin = (enteredPin: string) => {
    // Simple hash check — Phase 3 mein AES se replace karenge
    if (enteredPin === atob(settings.pinHash || '')) {
      unlock()
    } else {
      setError('Wrong PIN. Try again.')
      setShake(true)
      setPin(['', '', '', ''])
      setTimeout(() => {
        setShake(false)
        inputRefs.current[0]?.focus()
      }, 600)
    }
  }

  return (
    <div
      style={{
        width:           '100vw',
        height:          '100vh',
        background:      'var(--bg-primary)',
        display:         'flex',
        flexDirection:   'column',
        alignItems:      'center',
        justifyContent:  'center',
        gap:             '2rem',
      }}
    >
      {/* Lock icon */}
      <div
        style={{
          width:           '72px',
          height:          '72px',
          borderRadius:    '20px',
          background:      'linear-gradient(135deg, #6366f1, #a78bfa)',
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'center',
          boxShadow:       '0 0 30px rgba(99,102,241,0.4)',
          animation:       'float 3s ease-in-out infinite',
        }}
      >
        <Lock size={32} color="white" />
      </div>

      {/* Title */}
      <div style={{ textAlign: 'center' }}>
        <h1
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize:   '1.75rem',
            fontWeight: 700,
            color:      'var(--text-primary)',
          }}
        >
          Soul Diary
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
          Enter your PIN to continue
        </p>
      </div>

      {/* PIN inputs */}
      <div
        style={{
          display:   'flex',
          gap:       '0.75rem',
          animation: shake ? 'shake 0.5s ease' : 'none',
        }}
      >
        {pin.map((digit, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el }}
            type={showPin ? 'text' : 'password'}
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handlePinChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            className="selectable"
            style={{
              width:         '56px',
              height:        '64px',
              textAlign:     'center',
              fontSize:      '1.5rem',
              fontWeight:    700,
              borderRadius:  '12px',
              border:        `2px solid ${digit ? 'var(--accent)' : 'var(--border)'}`,
              background:    'var(--bg-card)',
              color:         'var(--text-primary)',
              outline:       'none',
              transition:    'border-color 0.2s',
              boxShadow:     digit ? '0 0 0 3px rgba(99,102,241,0.15)' : 'none',
            }}
          />
        ))}
      </div>

      {/* Show/hide PIN */}
      <button
        onClick={() => setShowPin(!showPin)}
        style={{
          display:    'flex',
          alignItems: 'center',
          gap:        '0.4rem',
          color:      'var(--text-muted)',
          fontSize:   '0.8rem',
          background: 'none',
          border:     'none',
          cursor:     'pointer',
          marginTop:  '-1rem',
        }}
      >
        {showPin ? <EyeOff size={14} /> : <Eye size={14} />}
        {showPin ? 'Hide PIN' : 'Show PIN'}
      </button>

      {/* Error */}
      {error && (
        <p
          style={{
            color:     '#ef4444',
            fontSize:  '0.875rem',
            marginTop: '-1rem',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          {error}
        </p>
      )}

      {/* Version */}
      <p
        style={{
          position:  'fixed',
          bottom:    '1.5rem',
          color:     'var(--text-muted)',
          fontSize:  '0.7rem',
          opacity:   0.5,
        }}
      >
        Soul Diary — Private & Encrypted
      </p>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%       { transform: translateX(-8px); }
          40%       { transform: translateX(8px); }
          60%       { transform: translateX(-6px); }
          80%       { transform: translateX(6px); }
        }
      `}</style>
    </div>
  )
}