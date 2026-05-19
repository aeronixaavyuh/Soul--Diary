import { useEffect, useState, useCallback } from 'react'
import {
  Plus, Flame, Trophy, Check, X,
  Calendar, ChevronLeft, ChevronRight,
  Trash2, Edit2, Target, TrendingUp,
  Star, Zap, RefreshCw, MoreVertical,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Habit {
  id:          string
  name:        string
  description: string
  icon:        string
  color:       string
  frequency:   'daily' | 'weekly'
  target_days: string    // JSON array e.g. [1,2,3,4,5]
  is_active:   number
  streak:      number
  best_streak: number
  created_at:  string
}

interface HabitLog {
  id:        string
  habit_id:  string
  log_date:  string
  completed: number
  note:      string
  created_at:string
}

// ─── Emoji options ────────────────────────────────────────────────────────────

const HABIT_EMOJIS = [
  '💪','🏃','📚','💧','🧘','😴','🥗','✍️',
  '🎯','🎨','🎵','🌱','❤️','🧠','☀️','🌙',
  '🏋️','🚴','🤸','🧘','🍎','💊','📝','🎤',
]

const HABIT_COLORS = [
  '#6366f1','#8b5cf6','#ec4899','#ef4444',
  '#f97316','#eab308','#22c55e','#14b8a6',
  '#3b82f6','#06b6d4','#a855f7','#f43f5e',
]

const WEEKDAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

// ─── Utilities ────────────────────────────────────────────────────────────────

const generateId = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })

const todayStr = () => new Date().toISOString().split('T')[0]

const formatDate = (date: Date) => date.toISOString().split('T')[0]

const getLast30Days = (): string[] => {
  const days: string[] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(formatDate(d))
  }
  return days
}

const getLast7Days = (): string[] => {
  const days: string[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(formatDate(d))
  }
  return days
}

const getMonthDays = (year: number, month: number): string[] => {
  const days: string[] = []
  const date = new Date(year, month, 1)
  while (date.getMonth() === month) {
    days.push(formatDate(date))
    date.setDate(date.getDate() + 1)
  }
  return days
}

// ─── HabitsPage ───────────────────────────────────────────────────────────────

export default function HabitsPage() {
  const [habits,       setHabits]       = useState<Habit[]>([])
  const [logs,         setLogs]         = useState<HabitLog[]>([])
  const [isLoading,    setIsLoading]    = useState(true)
  const [showForm,     setShowForm]     = useState(false)
  const [editHabit,    setEditHabit]    = useState<Habit | null>(null)
  const [activeView,   setActiveView]   = useState<'today' | 'week' | 'calendar'>('today')
  const [calMonth,     setCalMonth]     = useState(new Date().getMonth())
  const [calYear,      setCalYear]      = useState(new Date().getFullYear())
  const [selectedHabit,setSelectedHabit]= useState<Habit | null>(null)

  // ── Form state ─────────────────────────────────────────────────────────────
  const [formName,    setFormName]    = useState('')
  const [formDesc,    setFormDesc]    = useState('')
  const [formIcon,    setFormIcon]    = useState('💪')
  const [formColor,   setFormColor]   = useState('#6366f1')
  const [formFreq,    setFormFreq]    = useState<'daily' | 'weekly'>('daily')
  const [formDays,    setFormDays]    = useState<number[]>([0,1,2,3,4,5,6])
  const [formShowEmoji, setFormShowEmoji] = useState(false)

  // ── Load ───────────────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setIsLoading(true)
    try {
      const [h, l] = await Promise.all([
        window.electronAPI.db.all(
          `SELECT * FROM habits WHERE is_active = 1 ORDER BY created_at ASC`
        ) as Promise<Habit[]>,
        window.electronAPI.db.all(
          `SELECT * FROM habit_logs
           WHERE log_date >= date('now', '-31 days')
           ORDER BY log_date DESC`
        ) as Promise<HabitLog[]>,
      ])
      setHabits(h ?? [])
      setLogs(l ?? [])
    } catch (err) {
      console.error('Load habits:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { loadAll() }, [])

  // ── Check if logged today ──────────────────────────────────────────────────
  const isLoggedOn = useCallback((habitId: string, date: string) =>
    logs.some(l => l.habit_id === habitId && l.log_date === date && l.completed),
  [logs])

  const isToday = (date: string) => date === todayStr()

  // ── Toggle habit completion ────────────────────────────────────────────────
  const toggleHabit = useCallback(async (habit: Habit, date: string) => {
    const existing = logs.find(l => l.habit_id === habit.id && l.log_date === date)

    try {
      if (existing) {
        // Remove log
        await window.electronAPI.db.run(
          `DELETE FROM habit_logs WHERE id = ?`, [existing.id]
        )
        setLogs(prev => prev.filter(l => l.id !== existing.id))
      } else {
        // Add log
        const id        = generateId()
        const now       = new Date().toISOString()
        await window.electronAPI.db.run(
          `INSERT INTO habit_logs (id, habit_id, log_date, completed, note, created_at)
           VALUES (?, ?, ?, 1, '', ?)`,
          [id, habit.id, date, now]
        )
        setLogs(prev => [{
          id, habit_id: habit.id, log_date: date,
          completed: 1, note: '', created_at: now,
        }, ...prev])

        // Update streak
        await updateStreak(habit.id)
      }
      await loadAll()
    } catch (err) {
      console.error('Toggle habit:', err)
    }
  }, [logs, loadAll])

  // ── Update streak ──────────────────────────────────────────────────────────
  const updateStreak = async (habitId: string) => {
    const habitLogs = await window.electronAPI.db.all(
      `SELECT log_date FROM habit_logs
       WHERE habit_id = ? AND completed = 1
       ORDER BY log_date DESC`,
      [habitId]
    ) as { log_date: string }[]

    let streak      = 0
    let check       = new Date()
    check.setHours(0,0,0,0)

    for (const log of habitLogs) {
      const d = new Date(log.log_date)
      d.setHours(0,0,0,0)
      const diff = Math.round((check.getTime() - d.getTime()) / 86400000)
      if (diff === 0 || diff === 1) {
        streak++
        check = d
      } else break
    }

    const habit = await window.electronAPI.db.get(
      `SELECT best_streak FROM habits WHERE id = ?`, [habitId]
    ) as { best_streak: number } | undefined

    const best = Math.max(streak, habit?.best_streak ?? 0)
    await window.electronAPI.db.run(
      `UPDATE habits SET streak = ?, best_streak = ? WHERE id = ?`,
      [streak, best, habitId]
    )
  }

  // ── Create / Edit habit ────────────────────────────────────────────────────
  const handleSubmitForm = async () => {
    if (!formName.trim()) return
    const now = new Date().toISOString()

    try {
      if (editHabit) {
        await window.electronAPI.db.run(
          `UPDATE habits
           SET name=?, description=?, icon=?, color=?,
               frequency=?, target_days=?
           WHERE id=?`,
          [
            formName, formDesc, formIcon, formColor,
            formFreq, JSON.stringify(formDays),
            editHabit.id,
          ]
        )
      } else {
        await window.electronAPI.db.run(
          `INSERT INTO habits
            (id, name, description, icon, color, frequency,
             target_days, is_active, streak, best_streak, created_at)
           VALUES (?,?,?,?,?,?,?,1,0,0,?)`,
          [
            generateId(), formName, formDesc, formIcon, formColor,
            formFreq, JSON.stringify(formDays), now,
          ]
        )
      }
      resetForm()
      await loadAll()
    } catch (err) {
      console.error('Save habit:', err)
    }
  }

  const resetForm = () => {
    setFormName('')
    setFormDesc('')
    setFormIcon('💪')
    setFormColor('#6366f1')
    setFormFreq('daily')
    setFormDays([0,1,2,3,4,5,6])
    setShowForm(false)
    setEditHabit(null)
    setFormShowEmoji(false)
  }

  const startEdit = (habit: Habit) => {
    setEditHabit(habit)
    setFormName(habit.name)
    setFormDesc(habit.description)
    setFormIcon(habit.icon)
    setFormColor(habit.color)
    setFormFreq(habit.frequency)
    setFormDays(JSON.parse(habit.target_days ?? '[0,1,2,3,4,5,6]'))
    setShowForm(true)
  }

  const deleteHabit = async (id: string) => {
    if (!window.confirm('Delete this habit?')) return
    try {
      await window.electronAPI.db.run(
        `UPDATE habits SET is_active = 0 WHERE id = ?`, [id]
      )
      await loadAll()
    } catch (err) {
      console.error('Delete habit:', err)
    }
  }

  // ── Stats ──────────────────────────────────────────────────────────────────
  const getTodayStats = () => {
    const today     = todayStr()
    const total     = habits.length
    const completed = habits.filter(h => isLoggedOn(h.id, today)).length
    return { total, completed, pct: total ? Math.round((completed / total) * 100) : 0 }
  }

  const getHabitStats = (habit: Habit) => {
    const last30  = getLast30Days()
    const done    = last30.filter(d => isLoggedOn(habit.id, d)).length
    const pct     = Math.round((done / 30) * 100)
    return { done, pct }
  }

  const stats = getTodayStats()

  // ── Calendar helpers ───────────────────────────────────────────────────────
  const getCalendarDays = () => {
    const days       = getMonthDays(calYear, calMonth)
    const firstDay   = new Date(calYear, calMonth, 1).getDay()
    const padded: (string | null)[] = Array(firstDay).fill(null)
    return [...padded, ...days]
  }

  const getMonthName = () =>
    new Date(calYear, calMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{
      display:       'flex',
      flexDirection: 'column',
      height:        '100%',
      overflow:      'hidden',
      background:    'var(--bg-primary)',
    }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={{
        padding:        '1rem 1.5rem 0.75rem',
        borderBottom:   '1px solid var(--border)',
        background:     'var(--bg-secondary)',
        flexShrink:     0,
      }}>
        <div style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          marginBottom:   '0.75rem',
          flexWrap:       'wrap',
          gap:            '0.5rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Flame size={20} style={{ color: '#f97316' }} />
            <span style={{
              fontFamily: "'Playfair Display', serif",
              fontWeight: 700,
              fontSize:   '1.15rem',
              color:      'var(--text-primary)',
            }}>
              Habits
            </span>
          </div>

          {/* View tabs */}
          <div style={{ display: 'flex', gap: '3px', background: 'var(--bg-tertiary)', padding: '3px', borderRadius: '10px', border: '1px solid var(--border)' }}>
            {(['today','week','calendar'] as const).map(v => (
              <button
                key={v}
                onClick={() => setActiveView(v)}
                style={{
                  padding:      '0.3rem 0.75rem',
                  borderRadius: '7px',
                  border:       'none',
                  cursor:       'pointer',
                  background:   activeView === v ? 'var(--accent)' : 'transparent',
                  color:        activeView === v ? 'white' : 'var(--text-secondary)',
                  fontSize:     '0.78rem',
                  fontWeight:   activeView === v ? 600 : 400,
                  fontFamily:   'inherit',
                  transition:   'all 0.15s',
                  textTransform:'capitalize',
                }}
              >
                {v}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowForm(true)}
            style={{
              display:        'flex',
              alignItems:     'center',
              gap:            '4px',
              padding:        '0.4rem 0.875rem',
              borderRadius:   '10px',
              border:         'none',
              cursor:         'pointer',
              background:     'linear-gradient(135deg, #f97316, #fbbf24)',
              color:          'white',
              fontSize:       '0.82rem',
              fontWeight:     600,
              fontFamily:     'inherit',
              boxShadow:      '0 2px 8px rgba(249,115,22,0.35)',
            }}
          >
            <Plus size={14} />
            New Habit
          </button>
        </div>

        {/* Stats bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
          {/* Today progress ring */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <svg width="40" height="40" viewBox="0 0 40 40">
              <circle cx="20" cy="20" r="16" fill="none" stroke="var(--border)" strokeWidth="3" />
              <circle
                cx="20" cy="20" r="16"
                fill="none"
                stroke={stats.pct === 100 ? '#22c55e' : '#f97316'}
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${(stats.pct / 100) * 100.5} 100.5`}
                strokeDashoffset="25"
                transform="rotate(-90 20 20)"
                style={{ transition: 'stroke-dasharray 0.4s ease' }}
              />
              <text x="20" y="24" textAnchor="middle" fontSize="9" fontWeight="700"
                fill={stats.pct === 100 ? '#22c55e' : '#f97316'}>
                {stats.pct}%
              </text>
            </svg>
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Today
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {stats.completed}/{stats.total} done
              </div>
            </div>
          </div>

          {/* Best streaks */}
          {habits.slice(0, 3).map(h => (
            <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ fontSize: '1rem' }}>{h.icon}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                <Flame size={12} style={{ color: h.streak > 0 ? '#f97316' : 'var(--text-muted)' }} />
                <span style={{
                  fontSize:  '0.78rem',
                  fontWeight:600,
                  color:     h.streak > 0 ? '#f97316' : 'var(--text-muted)',
                }}>
                  {h.streak}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Main Content ────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: 'auto', padding: '1rem 1.5rem' }}>

        {isLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: 'var(--text-muted)', gap: '0.5rem' }}>
            <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
            Loading habits...
          </div>
        ) : habits.length === 0 ? (
          // Empty state
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', gap: '1rem', color: 'var(--text-muted)', textAlign: 'center' }}>
            <div style={{ fontSize: '3.5rem' }}>🌱</div>
            <div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                Start Your Journey
              </div>
              <div style={{ fontSize: '0.875rem', maxWidth: '280px', lineHeight: 1.6 }}>
                Build positive habits one day at a time. Small steps lead to big changes.
              </div>
            </div>
            <button
              onClick={() => setShowForm(true)}
              style={{ padding: '0.6rem 1.5rem', borderRadius: '12px', border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #f97316, #fbbf24)', color: 'white', fontSize: '0.875rem', fontWeight: 600, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '0.4rem', boxShadow: '0 4px 16px rgba(249,115,22,0.35)' }}
            >
              <Plus size={15} />
              Create First Habit
            </button>
          </div>
        ) : (
          <>
            {/* ── TODAY VIEW ──────────────────────────────────────────── */}
            {activeView === 'today' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </div>

                {habits.map(habit => {
                  const done  = isLoggedOn(habit.id, todayStr())
                  const hstat = getHabitStats(habit)

                  return (
                    <div
                      key={habit.id}
                      style={{
                        display:        'flex',
                        alignItems:     'center',
                        gap:            '0.875rem',
                        padding:        '0.875rem 1rem',
                        borderRadius:   '14px',
                        background:     done
                          ? `${habit.color}10`
                          : 'var(--bg-secondary)',
                        border:         `1px solid ${done ? habit.color + '35' : 'var(--border)'}`,
                        transition:     'all 0.2s',
                        cursor:         'default',
                      }}
                    >
                      {/* Check button */}
                      <button
                        onClick={() => toggleHabit(habit, todayStr())}
                        style={{
                          width:          '44px',
                          height:         '44px',
                          borderRadius:   '50%',
                          border:         `2.5px solid ${done ? habit.color : 'var(--border)'}`,
                          background:     done ? habit.color : 'transparent',
                          cursor:         'pointer',
                          display:        'flex',
                          alignItems:     'center',
                          justifyContent: 'center',
                          flexShrink:     0,
                          transition:     'all 0.2s',
                          boxShadow:      done ? `0 0 16px ${habit.color}40` : 'none',
                          fontSize:       '1.25rem',
                        }}
                        onMouseEnter={e => {
                          if (!done) {
                            (e.currentTarget as HTMLElement).style.borderColor = habit.color
                            ;(e.currentTarget as HTMLElement).style.background = habit.color + '20'
                          }
                        }}
                        onMouseLeave={e => {
                          if (!done) {
                            (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'
                            ;(e.currentTarget as HTMLElement).style.background = 'transparent'
                          }
                        }}
                      >
                        {done
                          ? <Check size={20} color="white" strokeWidth={3} />
                          : <span style={{ opacity: 0.7 }}>{habit.icon}</span>
                        }
                      </button>

                      {/* Info */}
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div style={{
                          display:     'flex',
                          alignItems:  'center',
                          gap:         '0.4rem',
                          marginBottom:'0.15rem',
                        }}>
                          <span style={{
                            fontWeight:  600,
                            fontSize:    '0.92rem',
                            color:       done ? habit.color : 'var(--text-primary)',
                            textDecoration: done ? 'line-through' : 'none',
                            opacity:     done ? 0.8 : 1,
                          }}>
                            {habit.icon} {habit.name}
                          </span>
                          {habit.streak > 0 && (
                            <div style={{
                              display:      'flex',
                              alignItems:   'center',
                              gap:          '2px',
                              padding:      '1px 6px',
                              borderRadius: '999px',
                              background:   'rgba(249,115,22,0.12)',
                              border:       '1px solid rgba(249,115,22,0.25)',
                            }}>
                              <Flame size={10} style={{ color: '#f97316' }} />
                              <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#f97316' }}>
                                {habit.streak}
                              </span>
                            </div>
                          )}
                          {habit.best_streak > 0 && habit.best_streak === habit.streak && (
                            <Trophy size={13} style={{ color: '#fbbf24' }} />
                          )}
                        </div>

                        {/* Progress bar — last 30 days */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{
                            flex:         1,
                            height:       '4px',
                            borderRadius: '2px',
                            background:   'var(--bg-tertiary)',
                            overflow:     'hidden',
                            maxWidth:     '120px',
                          }}>
                            <div style={{
                              height:     '100%',
                              width:      `${hstat.pct}%`,
                              background: habit.color,
                              borderRadius:'2px',
                              transition: 'width 0.4s ease',
                            }} />
                          </div>
                          <span style={{ fontSize: '0.67rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                            {hstat.pct}% (30d)
                          </span>
                        </div>
                      </div>

                      {/* Last 7 days mini dots */}
                      <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
                        {getLast7Days().map(day => {
                          const logged = isLoggedOn(habit.id, day)
                          const dayLabel = new Date(day).toLocaleDateString('en-US', { weekday: 'narrow' })
                          return (
                            <div key={day} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                              <div style={{
                                width:        '10px',
                                height:       '10px',
                                borderRadius: '50%',
                                background:   logged ? habit.color : 'var(--bg-tertiary)',
                                border:       `1px solid ${logged ? habit.color : 'var(--border)'}`,
                                boxShadow:    logged ? `0 0 6px ${habit.color}60` : 'none',
                                transition:   'all 0.15s',
                              }} />
                              <span style={{ fontSize: '0.52rem', color: 'var(--text-muted)' }}>
                                {dayLabel}
                              </span>
                            </div>
                          )
                        })}
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: '2px' }}>
                        <button
                          onClick={() => startEdit(habit)}
                          style={{ width: '28px', height: '28px', borderRadius: '7px', border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-tertiary)'}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          onClick={() => deleteHabit(habit.id)}
                          style={{ width: '28px', height: '28px', borderRadius: '7px', border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          onMouseEnter={e => {
                            (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.1)'
                            ;(e.currentTarget as HTMLElement).style.color = '#ef4444'
                          }}
                          onMouseLeave={e => {
                            (e.currentTarget as HTMLElement).style.background = 'transparent'
                            ;(e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'
                          }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* ── WEEK VIEW ───────────────────────────────────────────── */}
            {activeView === 'week' && (
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                  Last 7 Days
                </div>

                {/* Header row */}
                <div style={{
                  display:             'grid',
                  gridTemplateColumns: `200px repeat(7, 1fr)`,
                  gap:                 '4px',
                  marginBottom:        '4px',
                  paddingRight:        '0.5rem',
                }}>
                  <div />
                  {getLast7Days().map(day => (
                    <div key={day} style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                      <div>{new Date(day).toLocaleDateString('en-US', { weekday: 'short' })}</div>
                      <div style={{ color: isToday(day) ? 'var(--accent)' : 'var(--text-muted)', fontWeight: isToday(day) ? 700 : 400 }}>
                        {new Date(day).getDate()}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Habit rows */}
                {habits.map(habit => (
                  <div
                    key={habit.id}
                    style={{
                      display:             'grid',
                      gridTemplateColumns: `200px repeat(7, 1fr)`,
                      gap:                 '4px',
                      marginBottom:        '6px',
                      alignItems:          'center',
                    }}
                  >
                    {/* Name */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', overflow: 'hidden' }}>
                      <span style={{ fontSize: '1rem' }}>{habit.icon}</span>
                      <span style={{
                        fontSize:    '0.82rem',
                        fontWeight:  500,
                        color:       'var(--text-primary)',
                        whiteSpace:  'nowrap',
                        overflow:    'hidden',
                        textOverflow:'ellipsis',
                      }}>
                        {habit.name}
                      </span>
                    </div>

                    {/* Day cells */}
                    {getLast7Days().map(day => {
                      const done = isLoggedOn(habit.id, day)
                      const future = new Date(day) > new Date()
                      return (
                        <div
                          key={day}
                          onClick={() => !future && toggleHabit(habit, day)}
                          style={{
                            height:         '36px',
                            borderRadius:   '8px',
                            background:     done
                              ? habit.color
                              : isToday(day)
                              ? 'var(--bg-tertiary)'
                              : 'var(--bg-secondary)',
                            border:         `1px solid ${done ? habit.color : 'var(--border)'}`,
                            cursor:         future ? 'default' : 'pointer',
                            display:        'flex',
                            alignItems:     'center',
                            justifyContent: 'center',
                            transition:     'all 0.15s',
                            boxShadow:      done ? `0 0 8px ${habit.color}40` : 'none',
                            opacity:        future ? 0.3 : 1,
                          }}
                          onMouseEnter={e => {
                            if (!done && !future)
                              (e.currentTarget as HTMLElement).style.borderColor = habit.color
                          }}
                          onMouseLeave={e => {
                            if (!done && !future)
                              (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'
                          }}
                        >
                          {done && <Check size={14} color="white" strokeWidth={3} />}
                        </div>
                      )
                    })}
                  </div>
                ))}

                {/* Streak summary */}
                <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  {habits.map(h => (
                    <div key={h.id} style={{
                      display:      'flex',
                      alignItems:   'center',
                      gap:          '0.5rem',
                      padding:      '0.6rem 0.875rem',
                      borderRadius: '12px',
                      background:   'var(--bg-secondary)',
                      border:       '1px solid var(--border)',
                    }}>
                      <span style={{ fontSize: '1.1rem' }}>{h.icon}</span>
                      <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {h.name}
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1px' }}>
                          <span style={{ fontSize: '0.65rem', color: '#f97316', display: 'flex', alignItems: 'center', gap: '2px' }}>
                            <Flame size={9} /> {h.streak} streak
                          </span>
                          <span style={{ fontSize: '0.65rem', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '2px' }}>
                            <Trophy size={9} /> {h.best_streak} best
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── CALENDAR VIEW ────────────────────────────────────────── */}
            {activeView === 'calendar' && (
              <div>
                {/* Habit selector */}
                <div style={{ display: 'flex', gap: '6px', marginBottom: '1rem', flexWrap: 'wrap' }}>
                  {habits.map(h => (
                    <button
                      key={h.id}
                      onClick={() => setSelectedHabit(selectedHabit?.id === h.id ? null : h)}
                      style={{
                        display:      'flex',
                        alignItems:   'center',
                        gap:          '4px',
                        padding:      '0.3rem 0.75rem',
                        borderRadius: '999px',
                        border:       `1px solid ${selectedHabit?.id === h.id ? h.color : 'var(--border)'}`,
                        background:   selectedHabit?.id === h.id ? `${h.color}15` : 'transparent',
                        color:        selectedHabit?.id === h.id ? h.color : 'var(--text-secondary)',
                        fontSize:     '0.78rem',
                        fontWeight:   selectedHabit?.id === h.id ? 600 : 400,
                        cursor:       'pointer',
                        fontFamily:   'inherit',
                        transition:   'all 0.15s',
                      }}
                    >
                      {h.icon} {h.name}
                    </button>
                  ))}
                </div>

                {/* Month nav */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <button
                    onClick={() => {
                      if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1) }
                      else setCalMonth(m => m - 1)
                    }}
                    style={{ width: '30px', height: '30px', borderRadius: '8px', border: 'none', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                    {getMonthName()}
                  </span>
                  <button
                    onClick={() => {
                      if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1) }
                      else setCalMonth(m => m + 1)
                    }}
                    style={{ width: '30px', height: '30px', borderRadius: '8px', border: 'none', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>

                {/* Weekday headers */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px', marginBottom: '4px' }}>
                  {WEEKDAYS.map(d => (
                    <div key={d} style={{ textAlign: 'center', fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-muted)', padding: '0.2rem' }}>
                      {d}
                    </div>
                  ))}
                </div>

                {/* Calendar grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px' }}>
                  {getCalendarDays().map((day, idx) => {
                    if (!day) return <div key={idx} />

                    // Count habits done on this day
                    const donCount   = selectedHabit
                      ? (isLoggedOn(selectedHabit.id, day) ? 1 : 0)
                      : habits.filter(h => isLoggedOn(h.id, day)).length
                    const total      = selectedHabit ? 1 : habits.length
                    const intensity  = total > 0 ? donCount / total : 0
                    const isCurrentDay = isToday(day)
                    const isFuture   = new Date(day) > new Date()

                    const color = selectedHabit?.color ?? '#6366f1'

                    return (
                      <div
                        key={day}
                        title={`${day}: ${donCount}/${total}`}
                        style={{
                          aspectRatio:    '1',
                          borderRadius:   '6px',
                          background:     intensity > 0
                            ? `${color}${Math.round(intensity * 0.9 * 255).toString(16).padStart(2,'0')}`
                            : 'var(--bg-secondary)',
                          border:         isCurrentDay
                            ? '2px solid var(--accent)'
                            : '1px solid var(--border)',
                          display:        'flex',
                          flexDirection:  'column',
                          alignItems:     'center',
                          justifyContent: 'center',
                          cursor:         isFuture ? 'default' : 'pointer',
                          opacity:        isFuture ? 0.3 : 1,
                          transition:     'all 0.15s',
                          position:       'relative',
                          overflow:       'hidden',
                        }}
                        onMouseEnter={e => {
                          if (!isFuture)
                            (e.currentTarget as HTMLElement).style.outline = `2px solid ${color}60`
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLElement).style.outline = 'none'
                        }}
                      >
                        <span style={{
                          fontSize:  '0.65rem',
                          color:     intensity > 0.5 ? 'white' : 'var(--text-secondary)',
                          fontWeight:isCurrentDay ? 700 : 400,
                        }}>
                          {new Date(day).getDate()}
                        </span>
                        {donCount > 0 && !selectedHabit && total > 1 && (
                          <span style={{ fontSize: '0.5rem', color: intensity > 0.5 ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)' }}>
                            {donCount}/{total}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Legend */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.75rem', justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Less</span>
                  {[0, 0.25, 0.5, 0.75, 1].map(i => (
                    <div
                      key={i}
                      style={{
                        width:        '12px',
                        height:       '12px',
                        borderRadius: '3px',
                        background:   i === 0
                          ? 'var(--bg-secondary)'
                          : `${selectedHabit?.color ?? '#6366f1'}${Math.round(i * 0.9 * 255).toString(16).padStart(2,'0')}`,
                        border:       '1px solid var(--border)',
                      }}
                    />
                  ))}
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>More</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Create/Edit Form Modal ───────────────────────────────────────── */}
      {showForm && (
        <>
          {/* Backdrop */}
          <div
            onClick={resetForm}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', zIndex: 998 }}
          />

          {/* Modal */}
          <div style={{
            position:      'fixed',
            top:           '50%',
            left:          '50%',
            transform:     'translate(-50%,-50%)',
            width:         'min(480px, 90vw)',
            background:    'var(--bg-card)',
            border:        '1px solid var(--border)',
            borderRadius:  '18px',
            padding:       '1.5rem',
            zIndex:        999,
            boxShadow:     '0 24px 80px rgba(0,0,0,0.4)',
            animation:     'scaleIn 0.2s ease',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                {editHabit ? 'Edit Habit' : 'New Habit'}
              </h3>
              <button onClick={resetForm} style={{ width: '28px', height: '28px', borderRadius: '8px', border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={15} />
              </button>
            </div>

            {/* Icon + Name row */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setFormShowEmoji(v => !v)}
                  style={{
                    width:          '52px',
                    height:         '52px',
                    borderRadius:   '12px',
                    border:         `2px solid ${formColor}`,
                    background:     `${formColor}18`,
                    fontSize:       '1.5rem',
                    cursor:         'pointer',
                    display:        'flex',
                    alignItems:     'center',
                    justifyContent: 'center',
                    flexShrink:     0,
                  }}
                >
                  {formIcon}
                </button>

                {formShowEmoji && (
                  <>
                    <div style={{ position: 'fixed', inset: 0, zIndex: 1000 }} onClick={() => setFormShowEmoji(false)} />
                    <div style={{
                      position:    'absolute',
                      top:         '56px',
                      left:        0,
                      background:  'var(--bg-card)',
                      border:      '1px solid var(--border)',
                      borderRadius:'14px',
                      padding:     '0.6rem',
                      zIndex:      1001,
                      boxShadow:   '0 8px 32px rgba(0,0,0,0.25)',
                      display:     'grid',
                      gridTemplateColumns:'repeat(8, 1fr)',
                      gap:         '4px',
                    }}>
                      {HABIT_EMOJIS.map(e => (
                        <button
                          key={e}
                          onClick={() => { setFormIcon(e); setFormShowEmoji(false) }}
                          style={{
                            width:          '30px',
                            height:         '30px',
                            borderRadius:   '7px',
                            border:         'none',
                            background:     formIcon === e ? 'var(--bg-tertiary)' : 'transparent',
                            cursor:         'pointer',
                            fontSize:       '1rem',
                            display:        'flex',
                            alignItems:     'center',
                            justifyContent: 'center',
                          }}
                          onMouseEnter={e2 => (e2.currentTarget as HTMLElement).style.background = 'var(--bg-tertiary)'}
                          onMouseLeave={e2 => (e2.currentTarget as HTMLElement).style.background = formIcon === e ? 'var(--bg-tertiary)' : 'transparent'}
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <input
                autoFocus
                type="text"
                value={formName}
                onChange={e => setFormName(e.target.value)}
                placeholder="Habit name..."
                className="selectable"
                style={{ flex: 1, padding: '0.55rem 0.875rem', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: '0.925rem', fontFamily: 'inherit', outline: 'none', fontWeight: 500 }}
                onFocus={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'}
                onBlur={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'}
              />
            </div>

            {/* Description */}
            <input
              type="text"
              value={formDesc}
              onChange={e => setFormDesc(e.target.value)}
              placeholder="Description (optional)"
              className="selectable"
              style={{ width: '100%', padding: '0.45rem 0.75rem', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: '0.82rem', fontFamily: 'inherit', outline: 'none', marginBottom: '0.75rem', boxSizing: 'border-box' }}
            />

            {/* Color picker */}
            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500, marginBottom: '0.35rem' }}>Color</div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {HABIT_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setFormColor(c)}
                    style={{
                      width:        '24px',
                      height:       '24px',
                      borderRadius: '50%',
                      background:   c,
                      border:       formColor === c ? '3px solid var(--text-primary)' : '2px solid transparent',
                      cursor:       'pointer',
                      outline:      formColor === c ? `2px solid ${c}` : 'none',
                      outlineOffset:'2px',
                      transition:   'transform 0.1s',
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = 'scale(1.2)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = 'scale(1)'}
                  />
                ))}
              </div>
            </div>

            {/* Frequency */}
            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500, marginBottom: '0.35rem' }}>Frequency</div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {(['daily','weekly'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setFormFreq(f)}
                    style={{
                      flex:         1,
                      padding:      '0.4rem',
                      borderRadius: '9px',
                      border:       `1px solid ${formFreq === f ? formColor : 'var(--border)'}`,
                      background:   formFreq === f ? `${formColor}15` : 'transparent',
                      color:        formFreq === f ? formColor : 'var(--text-secondary)',
                      fontSize:     '0.8rem',
                      fontWeight:   formFreq === f ? 600 : 400,
                      cursor:       'pointer',
                      fontFamily:   'inherit',
                      textTransform:'capitalize',
                      transition:   'all 0.15s',
                    }}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Target days (weekly) */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500, marginBottom: '0.35rem' }}>
                Target Days
              </div>
              <div style={{ display: 'flex', gap: '5px' }}>
                {WEEKDAYS.map((d, i) => {
                  const active = formDays.includes(i)
                  return (
                    <button
                      key={d}
                      onClick={() => setFormDays(prev =>
                        active ? prev.filter(x => x !== i) : [...prev, i]
                      )}
                      style={{
                        flex:         1,
                        padding:      '0.4rem 0',
                        borderRadius: '8px',
                        border:       `1px solid ${active ? formColor : 'var(--border)'}`,
                        background:   active ? formColor : 'transparent',
                        color:        active ? 'white' : 'var(--text-muted)',
                        fontSize:     '0.62rem',
                        fontWeight:   active ? 700 : 400,
                        cursor:       'pointer',
                        fontFamily:   'inherit',
                        transition:   'all 0.15s',
                      }}
                    >
                      {d}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button onClick={resetForm} style={{ padding: '0.5rem 1rem', borderRadius: '10px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'inherit' }}>
                Cancel
              </button>
              <button
                onClick={handleSubmitForm}
                disabled={!formName.trim()}
                style={{
                  padding:      '0.5rem 1.25rem',
                  borderRadius: '10px',
                  border:       'none',
                  background:   formName.trim() ? `linear-gradient(135deg, ${formColor}, ${formColor}cc)` : 'var(--bg-tertiary)',
                  color:        formName.trim() ? 'white' : 'var(--text-muted)',
                  fontSize:     '0.82rem',
                  fontWeight:   600,
                  cursor:       formName.trim() ? 'pointer' : 'not-allowed',
                  fontFamily:   'inherit',
                  boxShadow:    formName.trim() ? `0 4px 12px ${formColor}40` : 'none',
                }}
              >
                {editHabit ? 'Save Changes' : 'Create Habit'}
              </button>
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes spin    { from { transform: rotate(0deg)  } to { transform: rotate(360deg) } }
        @keyframes scaleIn { from { transform: translate(-50%,-50%) scale(0.92); opacity: 0 }
                             to   { transform: translate(-50%,-50%) scale(1);    opacity: 1 } }
      `}</style>
    </div>
  )
}