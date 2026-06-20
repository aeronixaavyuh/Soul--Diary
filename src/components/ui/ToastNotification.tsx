import { useEffect, useRef, useState, useCallback } from 'react'
import { create } from 'zustand'
import {
  CheckCircle, XCircle, AlertTriangle,
  Info, X, Loader2,
} from 'lucide-react'

// ─── Toast Types ──────────────────────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading'

export interface Toast {
  id:         string
  type:       ToastType
  title:      string
  message?:   string
  duration?:  number           // ms — 0 = persistent
  action?:    { label: string; onClick: () => void }
  onDismiss?: () => void
}

// ─── Toast Store ──────────────────────────────────────────────────────────────

interface ToastState {
  toasts:  Toast[]
  add:     (toast: Omit<Toast, 'id'>) => string
  remove:  (id: string) => void
  update:  (id: string, partial: Partial<Omit<Toast, 'id'>>) => void
  clear:   () => void
}

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  add: (toast) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`
    set(s => ({ toasts: [...s.toasts, { ...toast, id }] }))
    return id
  },

  remove: (id) => {
    const toast = get().toasts.find(t => t.id === id)
    toast?.onDismiss?.()
    set(s => ({ toasts: s.toasts.filter(t => t.id !== id) }))
  },

  update: (id, partial) => {
    set(s => ({
      toasts: s.toasts.map(t => t.id === id ? { ...t, ...partial } : t),
    }))
  },

  clear: () => set({ toasts: [] }),
}))

// ─── Convenience API ──────────────────────────────────────────────────────────
// Use these anywhere in the app: toast.success('Saved!')

export const toast = {
  success: (title: string, message?: string, opts?: Partial<Toast>) =>
    useToastStore.getState().add({
      type: 'success', title, message,
      duration: 3000, ...opts,
    }),

  error: (title: string, message?: string, opts?: Partial<Toast>) =>
    useToastStore.getState().add({
      type: 'error', title, message,
      duration: 5000, ...opts,
    }),

  warning: (title: string, message?: string, opts?: Partial<Toast>) =>
    useToastStore.getState().add({
      type: 'warning', title, message,
      duration: 4000, ...opts,
    }),

  info: (title: string, message?: string, opts?: Partial<Toast>) =>
    useToastStore.getState().add({
      type: 'info', title, message,
      duration: 3500, ...opts,
    }),

  loading: (title: string, message?: string) =>
    useToastStore.getState().add({
      type:     'loading',
      title,
      message,
      duration: 0,          // persistent until manually removed
    }),

  dismiss: (id: string) =>
    useToastStore.getState().remove(id),

  update: (id: string, partial: Partial<Omit<Toast, 'id'>>) =>
    useToastStore.getState().update(id, partial),

  promise: async <T,>(
    promise:  Promise<T>,
    messages: { loading: string; success: string; error: string }
  ): Promise<T> => {
    const id = toast.loading(messages.loading)
    try {
      const result = await promise
      useToastStore.getState().update(id, {
        type:     'success',
        title:    messages.success,
        duration: 3000,
      })
      setTimeout(() => useToastStore.getState().remove(id), 3000)
      return result
    } catch (err: any) {
      useToastStore.getState().update(id, {
        type:     'error',
        title:    messages.error,
        message:  err?.message,
        duration: 5000,
      })
      setTimeout(() => useToastStore.getState().remove(id), 5000)
      throw err
    }
  },
}

// ─── Toast config ─────────────────────────────────────────────────────────────

const TOAST_CONFIG: Record<ToastType, {
  icon:    React.ReactNode
  accent:  string
  bg:      string
  border:  string
}> = {
  success: {
    icon:   <CheckCircle   size={16} />,
    accent: '#22c55e',
    bg:     'rgba(34,197,94,0.08)',
    border: 'rgba(34,197,94,0.25)',
  },
  error: {
    icon:   <XCircle       size={16} />,
    accent: '#ef4444',
    bg:     'rgba(239,68,68,0.08)',
    border: 'rgba(239,68,68,0.25)',
  },
  warning: {
    icon:   <AlertTriangle size={16} />,
    accent: '#f97316',
    bg:     'rgba(249,115,22,0.08)',
    border: 'rgba(249,115,22,0.25)',
  },
  info: {
    icon:   <Info          size={16} />,
    accent: '#6366f1',
    bg:     'rgba(99,102,241,0.08)',
    border: 'rgba(99,102,241,0.25)',
  },
  loading: {
    icon:   <Loader2       size={16} style={{ animation: 'toastSpin 0.8s linear infinite' }} />,
    accent: '#6366f1',
    bg:     'rgba(99,102,241,0.06)',
    border: 'rgba(99,102,241,0.2)',
  },
}

// ─── Single Toast Item ────────────────────────────────────────────────────────

interface ToastItemProps {
  toast:    Toast
  onRemove: (id: string) => void
}

function ToastItem({ toast: t, onRemove }: ToastItemProps) {
  const [visible,  setVisible]  = useState(false)
  const [leaving,  setLeaving]  = useState(false)
  const [progress, setProgress] = useState(100)
  const timerRef   = useRef<ReturnType<typeof setTimeout>>()
  const progressRef= useRef<ReturnType<typeof setInterval>>()
  const cfg = TOAST_CONFIG[t.type]

  // ── Entry animation ────────────────────────────────────────────────────────
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  // ── Auto dismiss ───────────────────────────────────────────────────────────
  const startDismiss = useCallback(() => {
    setLeaving(true)
    setTimeout(() => onRemove(t.id), 300)
  }, [t.id, onRemove])

  useEffect(() => {
    if (!t.duration || t.duration === 0) return

    // Progress bar
    const step     = 100 / (t.duration / 50)
    let   current  = 100

    progressRef.current = setInterval(() => {
      current -= step
      setProgress(Math.max(0, current))
    }, 50)

    timerRef.current = setTimeout(startDismiss, t.duration)

    return () => {
      clearTimeout(timerRef.current)
      clearInterval(progressRef.current)
    }
  }, [t.duration, startDismiss])

  // ── Pause on hover ─────────────────────────────────────────────────────────
  const handleMouseEnter = () => {
    clearTimeout(timerRef.current)
    clearInterval(progressRef.current)
  }

  const handleMouseLeave = () => {
    if (!t.duration || t.duration === 0) return
    const remaining = (progress / 100) * t.duration

    progressRef.current = setInterval(() => {
      setProgress(p => {
        const next = p - (100 / (t.duration! / 50))
        return Math.max(0, next)
      })
    }, 50)

    timerRef.current = setTimeout(startDismiss, remaining)
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        position:      'relative',
        display:       'flex',
        flexDirection: 'column',
        background:    'var(--bg-card)',
        border:        `1px solid ${cfg.border}`,
        borderRadius:  '14px',
        boxShadow:     `0 8px 32px rgba(0,0,0,0.2), 0 0 0 1px ${cfg.border}`,
        overflow:      'hidden',
        minWidth:      '300px',
        maxWidth:      '400px',
        transform:     visible && !leaving
          ? 'translateX(0) scale(1)'
          : leaving
          ? 'translateX(110%) scale(0.95)'
          : 'translateX(110%) scale(0.95)',
        opacity:       visible && !leaving ? 1 : 0,
        transition:    leaving
          ? 'transform 0.28s ease-in, opacity 0.28s ease-in'
          : 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease',
        backdropFilter:'blur(8px)',
      }}
    >
      {/* Left accent bar */}
      <div style={{
        position:     'absolute',
        top:          0,
        left:         0,
        bottom:       0,
        width:        '3px',
        background:   cfg.accent,
        borderRadius: '14px 0 0 14px',
      }} />

      {/* Main content */}
      <div style={{
        display:    'flex',
        alignItems: 'flex-start',
        gap:        '0.6rem',
        padding:    '0.75rem 0.875rem 0.75rem 1rem',
      }}>
        {/* Icon */}
        <div style={{
          color:      cfg.accent,
          flexShrink: 0,
          marginTop:  '1px',
          display:    'flex',
        }}>
          {cfg.icon}
        </div>

        {/* Text */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div style={{
            fontSize:   '0.85rem',
            fontWeight: 600,
            color:      'var(--text-primary)',
            lineHeight: 1.3,
          }}>
            {t.title}
          </div>
          {t.message && (
            <div style={{
              fontSize:   '0.75rem',
              color:      'var(--text-secondary)',
              marginTop:  '0.2rem',
              lineHeight: 1.5,
            }}>
              {t.message}
            </div>
          )}

          {/* Action button */}
          {t.action && (
            <button
              onClick={() => {
                t.action!.onClick()
                onRemove(t.id)
              }}
              style={{
                marginTop:    '0.4rem',
                padding:      '0.25rem 0.6rem',
                borderRadius: '6px',
                border:       `1px solid ${cfg.accent}50`,
                background:   `${cfg.accent}12`,
                color:        cfg.accent,
                fontSize:     '0.72rem',
                fontWeight:   600,
                cursor:       'pointer',
                fontFamily:   'inherit',
                transition:   'all 0.15s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = `${cfg.accent}22`
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = `${cfg.accent}12`
              }}
            >
              {t.action.label}
            </button>
          )}
        </div>

        {/* Close button */}
        {t.type !== 'loading' && (
          <button
            onClick={() => startDismiss()}
            style={{
              width:          '20px',
              height:         '20px',
              borderRadius:   '6px',
              border:         'none',
              background:     'transparent',
              color:          'var(--text-muted)',
              cursor:         'pointer',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              flexShrink:     0,
              transition:     'all 0.15s',
              padding:        0,
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = 'var(--bg-tertiary)'
              ;(e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = 'transparent'
              ;(e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'
            }}
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* Progress bar */}
      {t.duration && t.duration > 0 && (
        <div style={{
          height:     '2px',
          background: 'var(--border)',
          marginTop:  '-2px',
        }}>
          <div style={{
            height:     '100%',
            width:      `${progress}%`,
            background: cfg.accent,
            transition: 'width 0.05s linear',
            borderRadius:'0 0 14px 14px',
          }} />
        </div>
      )}
    </div>
  )
}

// ─── Toast Container ──────────────────────────────────────────────────────────

export default function ToastContainer() {
  const { toasts, remove } = useToastStore()

  return (
    <>
      {/* Fixed container — bottom right */}
      <div
        style={{
          position:      'fixed',
          bottom:        '1.25rem',
          right:         '1.25rem',
          display:       'flex',
          flexDirection: 'column',
          gap:           '0.5rem',
          zIndex:        9999,
          pointerEvents: 'none',
          alignItems:    'flex-end',
        }}
      >
        {toasts.map(t => (
          <div key={t.id} style={{ pointerEvents: 'auto' }}>
            <ToastItem toast={t} onRemove={remove} />
          </div>
        ))}
      </div>

      <style>{`
        @keyframes toastSpin {
          from { transform: rotate(0deg);   }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </>
  )
}