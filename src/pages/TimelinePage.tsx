import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BookOpen, FileText, Lightbulb, CheckSquare,
  Calendar, Search, Filter, ChevronDown,
  Heart, Pin, Flame, Star, Clock,
  TrendingUp, BarChart2, X, ChevronRight,
  Loader2, RefreshCw, Sparkles,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type EntryType = 'diary' | 'note' | 'idea' | 'task'
type ViewMode  = 'timeline' | 'grid' | 'compact'

interface TimelineEntry {
  id:            string
  type:          EntryType
  title:         string
  content_plain: string
  entry_date:    string
  created_at:    string
  updated_at:    string
  mood:          string | null
  mood_score:    number | null
  is_favorite:   number
  is_pinned:     number
  word_count:    number
  color:         string | null
  tags:          string | null
}

interface DayGroup {
  date:    string
  entries: TimelineEntry[]
}

interface MonthGroup {
  key:     string      // "2025-01"
  label:   string      // "January 2025"
  days:    DayGroup[]
  stats:   {
    total:    number
    diary:    number
    notes:    number
    ideas:    number
    tasks:    number
    words:    number
    moods:    string[]
  }
}

// ─── Config ───────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<EntryType, {
  icon:   React.ReactNode
  color:  string
  label:  string
  path:   string
  bg:     string
}> = {
  diary: {
    icon:  <BookOpen   size={13} />,
    color: '#f472b6',
    label: 'Diary',
    path:  '/diary',
    bg:    'rgba(244,114,182,0.1)',
  },
  note: {
    icon:  <FileText   size={13} />,
    color: '#60a5fa',
    label: 'Note',
    path:  '/notes',
    bg:    'rgba(96,165,250,0.1)',
  },
  idea: {
    icon:  <Lightbulb  size={13} />,
    color: '#fbbf24',
    label: 'Idea',
    path:  '/ideas',
    bg:    'rgba(251,191,36,0.1)',
  },
  task: {
    icon:  <CheckSquare size={13} />,
    color: '#34d399',
    label: 'Task',
    path:  '/tasks',
    bg:    'rgba(52,211,153,0.1)',
  },
}

const MOOD_CONFIG: Record<string, { emoji: string; color: string }> = {
  happy:      { emoji: '😊', color: '#22c55e' },
  sad:        { emoji: '😢', color: '#3b82f6' },
  angry:      { emoji: '😠', color: '#ef4444' },
  anxious:    { emoji: '😰', color: '#f97316' },
  excited:    { emoji: '🤩', color: '#a855f7' },
  calm:       { emoji: '😌', color: '#06b6d4' },
  neutral:    { emoji: '😐', color: '#6b7280' },
  grateful:   { emoji: '🙏', color: '#eab308' },
  frustrated: { emoji: '😤', color: '#f97316' },
  hopeful:    { emoji: '🌟', color: '#8b5cf6' },
  lonely:     { emoji: '🥺', color: '#6366f1' },
  confused:   { emoji: '😕', color: '#94a3b8' },
}

// ─── Utilities ────────────────────────────────────────────────────────────────

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    })
  } catch { return iso }
}

const formatShortDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric',
    })
  } catch { return iso }
}

const formatTime = (iso: string) => {
  try {
    return new Date(iso).toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit',
    })
  } catch { return '' }
}

const getMonthKey = (dateStr: string) => dateStr.slice(0, 7)

const getMonthLabel = (key: string) => {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1).toLocaleDateString('en-US', {
    month: 'long', year: 'numeric',
  })
}

const getRelativeTime = (iso: string) => {
  try {
    const diff = Date.now() - new Date(iso).getTime()
    const days = Math.floor(diff / 86400000)
    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 7)  return `${days} days ago`
    if (days < 30) return `${Math.floor(days / 7)}w ago`
    if (days < 365)return `${Math.floor(days / 30)}mo ago`
    return `${Math.floor(days / 365)}y ago`
  } catch { return '' }
}

// ─── TimelinePage ─────────────────────────────────────────────────────────────

export default function TimelinePage() {
  const navigate = useNavigate()

  const [entries,      setEntries]      = useState<TimelineEntry[]>([])
  const [isLoading,    setIsLoading]    = useState(true)
  const [searchQuery,  setSearchQuery]  = useState('')
  const [filterTypes,  setFilterTypes]  = useState<EntryType[]>(['diary','note','idea','task'])
  const [viewMode,     setViewMode]     = useState<ViewMode>('timeline')
  const [showFilters,  setShowFilters]  = useState(false)
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set())
  const [selectedEntry,  setSelectedEntry]  = useState<TimelineEntry | null>(null)
  const [showStats,    setShowStats]    = useState(false)

  const searchRef  = useRef<HTMLInputElement>(null)
  const loadedRef  = useRef(false)

  // ── Load all entries ───────────────────────────────────────────────────────
  const loadEntries = useCallback(async () => {
    setIsLoading(true)
    try {
      const rows = await window.electronAPI.db.all(`
        SELECT
          e.id, e.type, e.title, e.content_plain,
          e.entry_date, e.created_at, e.updated_at,
          e.mood, e.mood_score, e.is_favorite, e.is_pinned,
          e.word_count, e.color,
          GROUP_CONCAT(t.name, ',') AS tags
        FROM entries e
        LEFT JOIN entry_tags et ON et.entry_id = e.id
        LEFT JOIN tags t        ON t.id = et.tag_id
        WHERE e.is_deleted = 0
        GROUP BY e.id
        ORDER BY
          COALESCE(e.entry_date, e.created_at) DESC,
          e.created_at DESC
        LIMIT 500
      `) as TimelineEntry[]

      setEntries(rows ?? [])

      // Auto-expand latest 2 months
      const months = new Set<string>()
      for (const r of rows ?? []) {
        months.add(getMonthKey(r.entry_date ?? r.created_at))
        if (months.size >= 2) break
      }
      setExpandedMonths(months)
    } catch (err) {
      console.error('Load timeline:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!loadedRef.current) {
      loadedRef.current = true
      loadEntries()
    }
  }, [loadEntries])

  // ── Filter & Search ────────────────────────────────────────────────────────
  const filtered = entries.filter(e => {
    if (!filterTypes.includes(e.type)) return false
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      e.title?.toLowerCase().includes(q) ||
      e.content_plain?.toLowerCase().includes(q) ||
      e.tags?.toLowerCase().includes(q)
    )
  })

  // ── Group by month → day ───────────────────────────────────────────────────
  const monthGroups: MonthGroup[] = (() => {
    const monthMap = new Map<string, MonthGroup>()

    for (const entry of filtered) {
      const dateStr = entry.entry_date ?? entry.created_at?.split('T')[0] ?? ''
      const monthKey = getMonthKey(dateStr)

      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, {
          key:   monthKey,
          label: getMonthLabel(monthKey),
          days:  [],
          stats: { total: 0, diary: 0, notes: 0, ideas: 0, tasks: 0, words: 0, moods: [] },
        })
      }

      const month = monthMap.get(monthKey)!

      // Stats
      month.stats.total++
      month.stats.words += entry.word_count ?? 0
      if (entry.type === 'diary') month.stats.diary++
      if (entry.type === 'note')  month.stats.notes++
      if (entry.type === 'idea')  month.stats.ideas++
      if (entry.type === 'task')  month.stats.tasks++
      if (entry.mood)             month.stats.moods.push(entry.mood)

      // Day group
      let day = month.days.find(d => d.date === dateStr)
      if (!day) {
        day = { date: dateStr, entries: [] }
        month.days.push(day)
      }
      day.entries.push(entry)
    }

    return Array.from(monthMap.values())
  })()

  // ── Toggle month expand ────────────────────────────────────────────────────
  const toggleMonth = (key: string) => {
    setExpandedMonths(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else               next.add(key)
      return next
    })
  }

  // ── Navigate to entry ──────────────────────────────────────────────────────
  const openEntry = (entry: TimelineEntry) => {
    navigate(TYPE_CONFIG[entry.type].path)
  }

  // ── Overall stats ──────────────────────────────────────────────────────────
  const overallStats = {
    total:  entries.length,
    diary:  entries.filter(e => e.type === 'diary').length,
    notes:  entries.filter(e => e.type === 'note').length,
    ideas:  entries.filter(e => e.type === 'idea').length,
    tasks:  entries.filter(e => e.type === 'task').length,
    words:  entries.reduce((s, e) => s + (e.word_count ?? 0), 0),
    favs:   entries.filter(e => e.is_favorite).length,
    months: monthGroups.length,
  }

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
        padding:      '1rem 1.5rem 0.75rem',
        borderBottom: '1px solid var(--border)',
        background:   'var(--bg-secondary)',
        flexShrink:   0,
      }}>
        <div style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          marginBottom:   '0.75rem',
          flexWrap:       'wrap',
          gap:            '0.5rem',
        }}>
          {/* Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Calendar size={20} style={{ color: 'var(--accent)' }} />
            <span style={{
              fontFamily: "'Playfair Display', serif",
              fontWeight: 700,
              fontSize:   '1.15rem',
              color:      'var(--text-primary)',
            }}>
              Timeline
            </span>
            <span style={{
              fontSize:     '0.7rem',
              color:        'var(--text-muted)',
              background:   'var(--bg-tertiary)',
              border:       '1px solid var(--border)',
              borderRadius: '999px',
              padding:      '1px 8px',
            }}>
              {filtered.length} entries
            </span>
          </div>

          {/* View + Stats toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={() => setShowStats(v => !v)}
              style={{
                display:        'flex',
                alignItems:     'center',
                gap:            '4px',
                padding:        '0.35rem 0.7rem',
                borderRadius:   '8px',
                border:         `1px solid ${showStats ? 'var(--accent)' : 'var(--border)'}`,
                background:     showStats ? 'rgba(99,102,241,0.1)' : 'transparent',
                color:          showStats ? 'var(--accent)' : 'var(--text-secondary)',
                fontSize:       '0.75rem',
                cursor:         'pointer',
                fontFamily:     'inherit',
                transition:     'all 0.15s',
              }}
            >
              <BarChart2 size={13} />
              Stats
            </button>

            {/* View mode */}
            <div style={{ display: 'flex', gap: '2px', background: 'var(--bg-tertiary)', padding: '2px', borderRadius: '8px', border: '1px solid var(--border)' }}>
              {([
                { id: 'timeline', icon: '▬▬' },
                { id: 'grid',     icon: '⊞' },
                { id: 'compact',  icon: '☰' },
              ] as const).map(v => (
                <button
                  key={v.id}
                  onClick={() => setViewMode(v.id)}
                  style={{
                    padding:      '0.25rem 0.55rem',
                    borderRadius: '6px',
                    border:       'none',
                    cursor:       'pointer',
                    background:   viewMode === v.id ? 'var(--bg-card)' : 'transparent',
                    color:        viewMode === v.id ? 'var(--accent)' : 'var(--text-muted)',
                    fontSize:     '0.75rem',
                    fontFamily:   'inherit',
                    boxShadow:    viewMode === v.id ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                    transition:   'all 0.15s',
                  }}
                >
                  {v.icon}
                </button>
              ))}
            </div>

            <button
              onClick={loadEntries}
              style={{
                width:          '30px',
                height:         '30px',
                borderRadius:   '8px',
                border:         '1px solid var(--border)',
                background:     'transparent',
                color:          'var(--text-muted)',
                cursor:         'pointer',
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
              }}
            >
              <RefreshCw size={13} />
            </button>
          </div>
        </div>

        {/* Search + Filter row */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {/* Search */}
          <div style={{
            flex:         1,
            display:      'flex',
            alignItems:   'center',
            gap:          '0.5rem',
            padding:      '0.4rem 0.75rem',
            borderRadius: '10px',
            border:       '1px solid var(--border)',
            background:   'var(--bg-tertiary)',
            transition:   'border-color 0.15s',
          }}
            onFocusCapture={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'}
            onBlurCapture={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'}
          >
            <Search size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <input
              ref={searchRef}
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search all entries..."
              className="selectable"
              style={{
                flex:       1,
                background: 'transparent',
                border:     'none',
                outline:    'none',
                fontSize:   '0.85rem',
                color:      'var(--text-primary)',
                fontFamily: 'inherit',
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: '1px' }}
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Filter button */}
          <button
            onClick={() => setShowFilters(v => !v)}
            style={{
              display:      'flex',
              alignItems:   'center',
              gap:          '4px',
              padding:      '0.4rem 0.75rem',
              borderRadius: '10px',
              border:       `1px solid ${showFilters ? 'var(--accent)' : 'var(--border)'}`,
              background:   showFilters ? 'rgba(99,102,241,0.1)' : 'var(--bg-tertiary)',
              color:        showFilters ? 'var(--accent)' : 'var(--text-secondary)',
              fontSize:     '0.78rem',
              cursor:       'pointer',
              fontFamily:   'inherit',
              transition:   'all 0.15s',
              flexShrink:   0,
            }}
          >
            <Filter size={13} />
            Filter
            {filterTypes.length < 4 && (
              <span style={{
                background:   'var(--accent)',
                color:        'white',
                borderRadius: '999px',
                fontSize:     '0.6rem',
                padding:      '1px 5px',
                fontWeight:   700,
              }}>
                {filterTypes.length}
              </span>
            )}
          </button>
        </div>

        {/* Filter pills */}
        {showFilters && (
          <div style={{
            display:   'flex',
            gap:       '6px',
            marginTop: '0.6rem',
            flexWrap:  'wrap',
          }}>
            {(['diary','note','idea','task'] as EntryType[]).map(type => {
              const cfg    = TYPE_CONFIG[type]
              const active = filterTypes.includes(type)
              return (
                <button
                  key={type}
                  onClick={() => setFilterTypes(prev =>
                    active
                      ? prev.filter(t => t !== type)
                      : [...prev, type]
                  )}
                  style={{
                    display:      'flex',
                    alignItems:   'center',
                    gap:          '5px',
                    padding:      '0.3rem 0.75rem',
                    borderRadius: '999px',
                    border:       `1px solid ${active ? cfg.color : 'var(--border)'}`,
                    background:   active ? cfg.bg : 'transparent',
                    color:        active ? cfg.color : 'var(--text-muted)',
                    fontSize:     '0.78rem',
                    fontWeight:   active ? 600 : 400,
                    cursor:       'pointer',
                    fontFamily:   'inherit',
                    transition:   'all 0.15s',
                  }}
                >
                  <span style={{ color: cfg.color }}>{cfg.icon}</span>
                  {cfg.label}
                </button>
              )
            })}

            {filterTypes.length < 4 && (
              <button
                onClick={() => setFilterTypes(['diary','note','idea','task'])}
                style={{
                  padding:      '0.3rem 0.75rem',
                  borderRadius: '999px',
                  border:       '1px solid var(--border)',
                  background:   'transparent',
                  color:        'var(--text-muted)',
                  fontSize:     '0.78rem',
                  cursor:       'pointer',
                  fontFamily:   'inherit',
                }}
              >
                Show All
              </button>
            )}
          </div>
        )}

        {/* Stats bar */}
        {showStats && (
          <div style={{
            display:      'flex',
            gap:          '0.75rem',
            marginTop:    '0.75rem',
            padding:      '0.75rem',
            borderRadius: '12px',
            background:   'var(--bg-tertiary)',
            border:       '1px solid var(--border)',
            flexWrap:     'wrap',
          }}>
            {[
              { label: 'Total',   value: overallStats.total,                        icon: <Calendar size={13} />,    color: 'var(--accent)' },
              { label: 'Words',   value: overallStats.words.toLocaleString(),        icon: <TrendingUp size={13} />,  color: '#60a5fa' },
              { label: 'Diary',   value: overallStats.diary,                         icon: <BookOpen size={13} />,    color: '#f472b6' },
              { label: 'Notes',   value: overallStats.notes,                         icon: <FileText size={13} />,    color: '#60a5fa' },
              { label: 'Ideas',   value: overallStats.ideas,                         icon: <Lightbulb size={13} />,   color: '#fbbf24' },
              { label: 'Favs',    value: overallStats.favs,                          icon: <Heart size={13} />,       color: '#f472b6' },
              { label: 'Months',  value: overallStats.months,                        icon: <Sparkles size={13} />,    color: '#a78bfa' },
            ].map(s => (
              <div key={s.label} style={{
                display:    'flex',
                alignItems: 'center',
                gap:        '0.4rem',
                flex:       '1 1 80px',
              }}>
                <div style={{
                  width:          '28px',
                  height:         '28px',
                  borderRadius:   '8px',
                  background:     `${s.color}18`,
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: 'center',
                  color:          s.color,
                  flexShrink:     0,
                }}>
                  {s.icon}
                </div>
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                    {s.value}
                  </div>
                  <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>
                    {s.label}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Main Scrollable Area ────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem' }}>

        {isLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', gap: '0.5rem', color: 'var(--text-muted)' }}>
            <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
            Loading your timeline...
          </div>
        ) : monthGroups.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', gap: '1rem', color: 'var(--text-muted)', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem' }}>📅</div>
            <div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.3rem' }}>
                {searchQuery ? 'No results found' : 'Nothing here yet'}
              </div>
              <div style={{ fontSize: '0.82rem', maxWidth: '240px', lineHeight: 1.6 }}>
                {searchQuery
                  ? `No entries match "${searchQuery}"`
                  : 'Start writing diary entries, notes and ideas — they will appear here.'
                }
              </div>
            </div>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{ padding: '0.4rem 1rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Clear Search
              </button>
            )}
          </div>
        ) : (
          monthGroups.map(month => {
            const isExpanded = expandedMonths.has(month.key)
            return (
              <div key={month.key} style={{ marginBottom: '2rem' }}>

                {/* ── Month Header ──────────────────────────────────────── */}
                <div
                  onClick={() => toggleMonth(month.key)}
                  style={{
                    display:        'flex',
                    alignItems:     'center',
                    justifyContent: 'space-between',
                    padding:        '0.6rem 0.875rem',
                    borderRadius:   '12px',
                    background:     'var(--bg-secondary)',
                    border:         '1px solid var(--border)',
                    cursor:         'pointer',
                    marginBottom:   isExpanded ? '1rem' : 0,
                    transition:     'all 0.15s',
                    userSelect:     'none',
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-tertiary)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-secondary)'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      width:          '36px',
                      height:         '36px',
                      borderRadius:   '10px',
                      background:     'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(167,139,250,0.2))',
                      border:         '1px solid rgba(99,102,241,0.25)',
                      display:        'flex',
                      alignItems:     'center',
                      justifyContent: 'center',
                      fontSize:       '1rem',
                    }}>
                      📅
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', fontFamily: "'Playfair Display', serif" }}>
                        {month.label}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1px' }}>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                          {month.stats.total} entries
                        </span>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>·</span>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                          {month.stats.words.toLocaleString()} words
                        </span>
                        {/* Type breakdown dots */}
                        <div style={{ display: 'flex', gap: '3px' }}>
                          {[
                            { type: 'diary', count: month.stats.diary },
                            { type: 'note',  count: month.stats.notes },
                            { type: 'idea',  count: month.stats.ideas },
                            { type: 'task',  count: month.stats.tasks },
                          ].filter(t => t.count > 0).map(t => (
                            <div key={t.type} style={{
                              display:      'flex',
                              alignItems:   'center',
                              gap:          '2px',
                              padding:      '0px 5px',
                              borderRadius: '999px',
                              background:   TYPE_CONFIG[t.type as EntryType].bg,
                              fontSize:     '0.6rem',
                              color:        TYPE_CONFIG[t.type as EntryType].color,
                              fontWeight:   600,
                            }}>
                              {t.count}
                            </div>
                          ))}
                        </div>
                        {/* Mood emojis */}
                        {month.stats.moods.slice(0, 3).map((m, i) => (
                          <span key={i} title={m} style={{ fontSize: '0.75rem' }}>
                            {MOOD_CONFIG[m]?.emoji ?? ''}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <ChevronDown
                    size={16}
                    style={{
                      color:      'var(--text-muted)',
                      transform:  isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                      transition: 'transform 0.2s',
                    }}
                  />
                </div>

                {/* ── Days ─────────────────────────────────────────────── */}
                {isExpanded && month.days.map(day => (
                  <div key={day.date} style={{ marginBottom: '1.25rem' }}>

                    {/* Day header */}
                    <div style={{
                      display:    'flex',
                      alignItems: 'center',
                      gap:        '0.5rem',
                      marginBottom:'0.5rem',
                    }}>
                      {/* Date pill */}
                      <div style={{
                        display:      'flex',
                        flexDirection:'column',
                        alignItems:   'center',
                        justifyContent:'center',
                        width:        '38px',
                        height:       '44px',
                        borderRadius: '10px',
                        background:   'var(--bg-secondary)',
                        border:       '1px solid var(--border)',
                        flexShrink:   0,
                      }}>
                        <span style={{
                          fontSize:   '1rem',
                          fontWeight: 700,
                          color:      'var(--text-primary)',
                          lineHeight: 1,
                        }}>
                          {new Date(day.date).getDate()}
                        </span>
                        <span style={{
                          fontSize:   '0.55rem',
                          color:      'var(--text-muted)',
                          textTransform:'uppercase',
                          fontWeight: 600,
                        }}>
                          {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                        </span>
                      </div>

                      <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />

                      <span style={{
                        fontSize:   '0.68rem',
                        color:      'var(--text-muted)',
                        flexShrink: 0,
                      }}>
                        {getRelativeTime(day.date)}
                      </span>
                    </div>

                    {/* ── Entry Cards ─────────────────────────────────── */}
                    {viewMode === 'timeline' && (
                      <div style={{
                        display:       'flex',
                        flexDirection: 'column',
                        gap:           '6px',
                        paddingLeft:   '0.75rem',
                        borderLeft:    '2px solid var(--border)',
                        marginLeft:    '18px',
                      }}>
                        {day.entries.map(entry => (
                          <TimelineCard
                            key={entry.id}
                            entry={entry}
                            onClick={() => openEntry(entry)}
                          />
                        ))}
                      </div>
                    )}

                    {viewMode === 'compact' && (
                      <div style={{
                        display:       'flex',
                        flexDirection: 'column',
                        gap:           '3px',
                        paddingLeft:   '0.75rem',
                        borderLeft:    '2px solid var(--border)',
                        marginLeft:    '18px',
                      }}>
                        {day.entries.map(entry => (
                          <CompactCard
                            key={entry.id}
                            entry={entry}
                            onClick={() => openEntry(entry)}
                          />
                        ))}
                      </div>
                    )}

                    {viewMode === 'grid' && (
                      <div style={{
                        display:             'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                        gap:                 '8px',
                      }}>
                        {day.entries.map(entry => (
                          <GridCard
                            key={entry.id}
                            entry={entry}
                            onClick={() => openEntry(entry)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          })
        )}

        {/* Bottom padding */}
        <div style={{ height: '2rem' }} />
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
      `}</style>
    </div>
  )
}

// ─── Timeline Card ────────────────────────────────────────────────────────────

function TimelineCard({
  entry, onClick,
}: { entry: TimelineEntry; onClick: () => void }) {
  const cfg  = TYPE_CONFIG[entry.type]
  const mood = entry.mood ? MOOD_CONFIG[entry.mood] : null

  return (
    <div
      onClick={onClick}
      style={{
        display:      'flex',
        gap:          '0.875rem',
        padding:      '0.875rem',
        borderRadius: '12px',
        background:   'var(--bg-secondary)',
        border:       '1px solid var(--border)',
        cursor:       'pointer',
        transition:   'all 0.15s',
        marginBottom: '2px',
        position:     'relative',
        overflow:     'hidden',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement
        el.style.background   = 'var(--bg-tertiary)'
        el.style.borderColor  = `${cfg.color}40`
        el.style.transform    = 'translateX(4px)'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement
        el.style.background   = 'var(--bg-secondary)'
        el.style.borderColor  = 'var(--border)'
        el.style.transform    = 'translateX(0)'
      }}
    >
      {/* Left color accent */}
      <div style={{
        position:     'absolute',
        left:         0,
        top:          0,
        bottom:       0,
        width:        '3px',
        background:   cfg.color,
        borderRadius: '3px 0 0 3px',
      }} />

      {/* Type icon */}
      <div style={{
        width:          '34px',
        height:         '34px',
        borderRadius:   '9px',
        background:     cfg.bg,
        border:         `1px solid ${cfg.color}30`,
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        color:          cfg.color,
        flexShrink:     0,
        marginLeft:     '4px',
      }}>
        {cfg.icon}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {/* Title row */}
        <div style={{
          display:      'flex',
          alignItems:   'center',
          gap:          '0.4rem',
          marginBottom: '0.2rem',
          flexWrap:     'wrap',
        }}>
          {/* Type badge */}
          <span style={{
            fontSize:     '0.6rem',
            padding:      '1px 6px',
            borderRadius: '999px',
            background:   cfg.bg,
            color:        cfg.color,
            fontWeight:   600,
            flexShrink:   0,
          }}>
            {cfg.label}
          </span>

          <span style={{
            fontWeight:   600,
            fontSize:     '0.875rem',
            color:        'var(--text-primary)',
            overflow:     'hidden',
            textOverflow: 'ellipsis',
            whiteSpace:   'nowrap',
            flex:         1,
          }}>
            {entry.title?.trim() || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontWeight: 400 }}>Untitled</span>}
          </span>

          {/* Badges */}
          {entry.is_favorite ? <Heart size={11} style={{ color: '#f472b6', fill: '#f472b6', flexShrink: 0 }} /> : null}
          {entry.is_pinned   ? <Pin   size={11} style={{ color: '#fbbf24', flexShrink: 0 }} /> : null}
          {mood && <span title={entry.mood!} style={{ fontSize: '0.85rem', flexShrink: 0 }}>{mood.emoji}</span>}
        </div>

        {/* Snippet */}
        {entry.content_plain && (
          <div style={{
            fontSize:        '0.775rem',
            color:           'var(--text-muted)',
            lineHeight:      1.55,
            overflow:        'hidden',
            display:         '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            marginBottom:    '0.35rem',
          }}>
            {entry.content_plain.slice(0, 150)}
          </div>
        )}

        {/* Meta row */}
        <div style={{
          display:    'flex',
          alignItems: 'center',
          gap:        '0.5rem',
          flexWrap:   'wrap',
        }}>
          <span style={{
            display:    'flex',
            alignItems: 'center',
            gap:        '2px',
            fontSize:   '0.65rem',
            color:      'var(--text-muted)',
          }}>
            <Clock size={9} />
            {formatTime(entry.updated_at ?? entry.created_at)}
          </span>

          {entry.word_count > 0 && (
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
              · {entry.word_count} words
            </span>
          )}

          {/* Tags */}
          {entry.tags && (
            <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
              {entry.tags.split(',').slice(0, 3).map(tag => (
                <span key={tag} style={{
                  fontSize:     '0.58rem',
                  padding:      '1px 5px',
                  borderRadius: '999px',
                  background:   'var(--bg-tertiary)',
                  color:        'var(--text-muted)',
                  border:       '1px solid var(--border)',
                }}>
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <ChevronRight size={14} style={{ color: 'var(--text-muted)', flexShrink: 0, alignSelf: 'center' }} />
    </div>
  )
}

// ─── Compact Card ─────────────────────────────────────────────────────────────

function CompactCard({
  entry, onClick,
}: { entry: TimelineEntry; onClick: () => void }) {
  const cfg  = TYPE_CONFIG[entry.type]
  const mood = entry.mood ? MOOD_CONFIG[entry.mood] : null

  return (
    <div
      onClick={onClick}
      style={{
        display:     'flex',
        alignItems:  'center',
        gap:         '0.6rem',
        padding:     '0.4rem 0.75rem',
        borderRadius:'8px',
        background:  'transparent',
        cursor:      'pointer',
        transition:  'all 0.12s',
      }}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-secondary)'}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
    >
      <div style={{ color: cfg.color, flexShrink: 0 }}>{cfg.icon}</div>

      <span style={{
        flex:         1,
        fontSize:     '0.82rem',
        color:        'var(--text-primary)',
        overflow:     'hidden',
        textOverflow: 'ellipsis',
        whiteSpace:   'nowrap',
        fontWeight:   500,
      }}>
        {entry.title?.trim() || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Untitled</span>}
      </span>

      {mood && <span style={{ fontSize: '0.75rem', flexShrink: 0 }}>{mood.emoji}</span>}
      {entry.is_favorite ? <Heart size={10} style={{ color: '#f472b6', fill: '#f472b6', flexShrink: 0 }} /> : null}

      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', flexShrink: 0 }}>
        {formatTime(entry.updated_at)}
      </span>
    </div>
  )
}

// ─── Grid Card ────────────────────────────────────────────────────────────────

function GridCard({
  entry, onClick,
}: { entry: TimelineEntry; onClick: () => void }) {
  const cfg  = TYPE_CONFIG[entry.type]
  const mood = entry.mood ? MOOD_CONFIG[entry.mood] : null

  return (
    <div
      onClick={onClick}
      style={{
        padding:      '1rem',
        borderRadius: '14px',
        background:   entry.color ? `${entry.color}10` : 'var(--bg-secondary)',
        border:       `1px solid ${entry.color ? entry.color + '30' : 'var(--border)'}`,
        cursor:       'pointer',
        transition:   'all 0.15s',
        display:      'flex',
        flexDirection:'column',
        gap:          '0.4rem',
        minHeight:    '100px',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement
        el.style.transform   = 'translateY(-2px)'
        el.style.boxShadow   = '0 8px 24px rgba(0,0,0,0.12)'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement
        el.style.transform   = 'translateY(0)'
        el.style.boxShadow   = 'none'
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{
          display:        'flex',
          alignItems:     'center',
          gap:            '4px',
          padding:        '2px 7px',
          borderRadius:   '999px',
          background:     cfg.bg,
          color:          cfg.color,
          fontSize:       '0.65rem',
          fontWeight:     600,
        }}>
          {cfg.icon}
          {cfg.label}
        </div>
        <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
          {mood && <span style={{ fontSize: '0.78rem' }}>{mood.emoji}</span>}
          {entry.is_favorite ? <Heart size={10} style={{ color: '#f472b6', fill: '#f472b6' }} /> : null}
        </div>
      </div>

      {/* Title */}
      <div style={{
        fontWeight:   600,
        fontSize:     '0.875rem',
        color:        'var(--text-primary)',
        overflow:     'hidden',
        textOverflow: 'ellipsis',
        whiteSpace:   'nowrap',
        fontFamily:   "'Playfair Display', serif",
      }}>
        {entry.title?.trim() || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontWeight: 400 }}>Untitled</span>}
      </div>

      {/* Snippet */}
      {entry.content_plain && (
        <div style={{
          fontSize:        '0.75rem',
          color:           'var(--text-muted)',
          lineHeight:      1.5,
          flex:            1,
          overflow:        'hidden',
          display:         '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
        }}>
          {entry.content_plain.slice(0, 120)}
        </div>
      )}

      {/* Footer */}
      <div style={{
        display:    'flex',
        alignItems: 'center',
        justifyContent:'space-between',
        marginTop:  '0.25rem',
      }}>
        <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '2px' }}>
          <Clock size={8} />
          {formatTime(entry.updated_at ?? entry.created_at)}
        </span>
        {entry.word_count > 0 && (
          <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>
            {entry.word_count}w
          </span>
        )}
      </div>
    </div>
  )
}