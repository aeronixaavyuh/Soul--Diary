import { useEffect, useState } from 'react'

interface LoadingScreenProps {
  status?: string
}

export default function LoadingScreen({ status }: LoadingScreenProps) {
  const [dots, setDots]       = useState('')
  const [opacity, setOpacity] = useState(0)

  useEffect(() => {
    // Fade in
    setTimeout(() => setOpacity(1), 50)

    // Animated dots
    const interval = setInterval(() => {
      setDots((d) => (d.length >= 3 ? '' : d + '.'))
    }, 400)

    return () => clearInterval(interval)
  }, [])

  return (
    <div
      className="loading-screen"
      style={{ opacity, transition: 'opacity 0.5s ease' }}
    >
      {/* Logo / Brand */}
      <div className="flex flex-col items-center gap-6">
        {/* Animated logo */}
        <div className="relative">
          <div
            className="w-20 h-20 rounded-3xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #6366f1, #a78bfa)',
              boxShadow:  '0 0 40px rgba(99,102,241,0.5)',
              animation:  'float 3s ease-in-out infinite',
            }}
          >
            <span style={{ fontSize: '2.5rem' }}>📔</span>
          </div>

          {/* Glow ring */}
          <div
            className="absolute inset-0 rounded-3xl"
            style={{
              background: 'transparent',
              border:     '1px solid rgba(99,102,241,0.4)',
              animation:  'pulseGlow 2s ease-in-out infinite',
              transform:  'scale(1.15)',
            }}
          />
        </div>

        {/* App name */}
        <div className="text-center">
          <h1
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize:   '2rem',
              fontWeight: 700,
              color:      '#e2e8f0',
              letterSpacing: '0.02em',
            }}
          >
            Soul Diary
          </h1>
          <p
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize:   '0.875rem',
              color:      '#475569',
              marginTop:  '0.25rem',
            }}
          >
            Your private space{dots}
          </p>
        </div>

        {/* Loading bar */}
        <div
          style={{
            width:        '240px',
            height:       '2px',
            background:   'rgba(255,255,255,0.08)',
            borderRadius: '999px',
            overflow:     'hidden',
            marginTop:    '0.5rem',
          }}
        >
          <div
            style={{
              height:     '100%',
              background: 'linear-gradient(90deg, #6366f1, #a78bfa, #6366f1)',
              backgroundSize: '200% 100%',
              animation:  'shimmer 1.5s linear infinite',
              borderRadius: '999px',
              width:      '65%',
            }}
          />
        </div>

        {status && (
          <div
            style={{
              marginTop: '1.25rem',
              color: '#c7d2fe',
              fontSize: '0.9rem',
              opacity: 0.85,
            }}
          >
            {status}
          </div>
        )}
      </div>
    </div>
  )
}