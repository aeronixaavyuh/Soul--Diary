import {
  useEffect, useState, useRef,
  useCallback, useMemo,
} from 'react'
import { useNavigate }    from 'react-router-dom'
import { useEntryStore }  from '@store/useEntryStore'
import {
  Search, BookOpen, FileText, Lightbulb,
  X, Clock, Hash, Filter, Heart,
  Pin, ChevronRight, Loader2,
  Calendar, AlignLeft,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type FilterType = 'all' | 'diary' | 'note' | 'idea'

interface SearchResult {
  id:            string
  type:          'diary' | 'note' | 'idea'
  title:         string
  content_plain: string
  entry_date:    string
  updated_at:    string
  is_favorite:   number
  is_pinned:     number
  color:         string
  word_count:    number
}

interface SearchModalProps {
  open:    boolean
  onClose: () => void
}

// ─── Config ───────────────────────────────────────────────────────────────────

const TYPE_CONFIG = {
  diary: { icon: <BookOpen   size={14} />, color: '#f472b6', label: 'Diary'  },
  note:  { icon: <FileText   size={14} />, color: '#60a5fa', label: 'Note'   },
  idea:  { icon: <Lightbulb  size={14} />, color: '#fbbf24', label: 'Idea'   },
}

// ─── SearchModal ──────────────────────────────────────────────────────────────

export default function SearchModal({ open, onClose }: SearchModalProps) {
  const navigate = useNavigate()
  const { entries, loadEntries } = useEntryStore()

  // ── State ──────────────────────────────────────────────────────────────────
  const [query,        setQuery]        = useState('')
  const [filter,       setFilter]       = useState<FilterType>('all')
  const [results,      setResults]      = useState<SearchResult[]>([])
  const [isSearching,  setIsSearching]  = useState(false)
  const [activeIndex,  setActiveIndex]  = useState(0)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [showFilter,   setShowFilter]   = useState(false)

  const inputRef   = useRef<HTMLInputElement>(null)
  const listRef    = useRef<HTMLDivElement>(null)
  const debounceRef= useRef<ReturnType<typeof setTimeout>>()

  // ── Load entries once ──────────────────────────────────────────────────────
  useEffect(() => {
    if (open && entries.length === 0) {
      loadEntries()
    }
  }, [open])

  // ── Focus on open ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      setQuery('')
      setResults([])
      setActiveIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)

      // Load recent searches from localStorage equivalent
      try {
        const stored = sessionStorage.getItem('soul-recent-searches')
        if (stored) setRecentSearches(JSON.parse(stored))
      } catch { /* ignore */ }
    }
  }, [open])

  // ── Scroll active into view ────────────────────────────────────────────────
  useEffect(() => {
    const el = listRef.current?.querySelector('[data-active="true"]')
    el?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  // ── Search logic ───────────────────────────────────────────────────────────
  const doSearch = useCallback((q: string, f: FilterType) => {
    if (!q.trim()) {
      setResults([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)

    // Search in memory (fast, no IPC needed)
    const queryLower = q.toLowerCase().trim()
    const words      = queryLower.split(/\s+/).filter(Boolean)

    const matched = entries
      .filter(e => {
        if (e.is_deleted) return false
        if (f !== 'all' && e.type !== f) return false

        const searchable = [
          e.title,
          e.content_plain,
        ].join(' ').toLowerCase()

        // All words must match (AND search)
        return words.every(word => searchable.includes(word))
      })
      .sort((a, b) => {
        // Title match scores higher
        const aTitle = a.title.toLowerCase().includes(queryLower) ? 2 : 0
        const bTitle = b.title.toLowerCase().includes(queryLower) ? 2 : 0
        // Recency as tiebreaker
        const aTime  = new Date(a.updated_at).getTime()
        const bTime  = new Date(b.updated_at).getTime()
        return (bTitle - aTitle) || (bTime - aTime)
      })
      .slice(0, 20)
      .map(e => ({
        id:            e.id,
        type:          e.type as 'diary' | 'note' | 'idea',
        title:         e.title,
        content_plain: e.content_plain,
        entry_date:    e.entry_date,
        updated_at:    e.updated_at,
        is_favorite:   e.is_favorite,
        is_pinned:     e.is_pinned,
        color:         e.color,
        word_count:    e.word_count,
      }))

    setResults(matched)
    setIsSearching(false)
    setActiveIndex(0)
  }, [entries])

  // ── Debounced search on query/filter change ────────────────────────────────
  useEffect(() => {
    clearTimeout(debounceRef.current)
    if (!query.trim()) {
      setResults([])
      setIsSearching(false)
      return
    }
    setIsSearching(true)
    debounceRef.current = setTimeout(() => {
      doSearch(query, filter)
    }, 200)
    return () => clearTimeout(debounceRef.current)
  }, [query, filter, doSearch])

  // ── Highlight matching text ────────────────────────────────────────────────
  const highlight = useCallback((text: string, q: string): React.ReactNode => {
    if (!q.trim() || !text) return text
    const escaped = q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex   = new RegExp(`(${escaped})`, 'gi')
    const parts   = text.split(regex)

    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} style={{
          background:   'rgba(99,102,241,0.25)',
          color:        'var(--accent)',
          borderRadius: '3px',
          padding:      '0 2px',
        }}>
          {part}
        </mark>
      ) : part
    )
  }, [])

  // ── Extract snippet around match ───────────────────────────────────────────
  const getSnippet = useCallback((text: string, q: string, len = 120): string => {
    if (!text || !q.trim()) return text?.slice(0, len) ?? ''
    const idx = text.toLowerCase().indexOf(q.toLowerCase().trim())
    if (idx === -1) return text.slice(0, len)
    const start = Math.max(0, idx - 40)
    const end   = Math.min(text.length, idx + len - 40)
    const snip  = text.slice(start, end)
    return (start > 0 ? '...' : '') + snip + (end < text.length ? '...' : '')
  }, [])

  // ── Navigate to result ─────────────────────────────────────────────────────
  const handleSelect = useCallback((result: SearchResult) => {
    // Save to recent searches
    if (query.trim()) {
      const updated = [
        query.trim(),
        ...recentSearches.filter(s => s !== query.trim()),
      ].slice(0, 6)
      setRecentSearches(updated)
      try {
        sessionStorage.setItem('soul-recent-searches', JSON.stringify(updated))
      } catch { /* ignore */ }
    }

    const pathMap = { diary: '/diary', note: '/notes', idea: '/ideas' }
    navigate(pathMap[result.type])
    onClose()
  }, [query, recentSearches, navigate, onClose])

  // ── Keyboard navigation ────────────────────────────────────────────────────
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActiveIndex(i => Math.min(i + 1, results.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setActiveIndex(i => Math.max(i - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (results[activeIndex]) handleSelect(results[activeIndex])
        break
      case 'Escape':
        e.preventDefault()
        onClose()
        break
      case 'Tab':
        e.preventDefault()
        // Cycle through filters
        const filters: FilterType[] = ['all','diary','note','idea']
        const idx = filters.indexOf(filter)
        setFilter(filters[(idx + 1) % filters.length])
        break
    }
  }, [results, activeIndex, filter, handleSelect, onClose])

  // ── Format date ────────────────────────────────────────────────────────────
  const formatDate = (iso: string) => {
    try {
      const d    = new Date(iso)
      const diff = Date.now() - d.getTime()
      const days = Math.floor(diff / 86400000)
      if (days === 0) return 'Today'
      if (days === 1) return 'Yesterday'
      if (days < 7)  return `${days}d ago`
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    } catch { return '' }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (!open) return null

  const showRecent  = !query.trim() && recentSearches.length > 0
  const showResults = !isSearching && query.trim() && results.length > 0
  const showEmpty   = !isSearching && query.trim() && results.length === 0

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position:       'fixed',
          inset:          0,
          background:     'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(6px)',
          zIndex:         1000,
          animation:      'fadeIn 0.15s ease',
        }}
      />

      {/* Modal */}
      <div style={{
        position:      'fixed',
        top:           '12%',
        left:          '50%',
        transform:     'translateX(-50%)',
        width:         'min(680px, 92vw)',
        maxHeight:     '75vh',
        background:    'var(--bg-card)',
        borderRadius:  '18px',
        border:        '1px solid var(--border)',
        boxShadow:     '0 28px 90px rgba(0,0,0,0.45)',
        zIndex:        1001,
        overflow:      'hidden',
        display:       'flex',
        flexDirection: 'column',
        animation:     'slideUp 0.18s ease',
      }}>

        {/* ── Search Input Row ──────────────────────────────────────────── */}
        <div style={{
          display:      'flex',
          alignItems:   'center',
          gap:          '0.75rem',
          padding:      '1rem 1.25rem',
          borderBottom: '1px solid var(--border)',
          flexShrink:   0,
        }}>
          {isSearching ? (
            <Loader2 size={18} style={{
              color:     'var(--accent)',
              flexShrink:0,
              animation: 'spin 0.8s linear infinite',
            }} />
          ) : (
            <Search size={18} style={{ color: 'var(--accent)', flexShrink: 0 }} />
          )}

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search all entries, notes, ideas..."
            className="selectable"
            style={{
              flex:       1,
              background: 'transparent',
              border:     'none',
              outline:    'none',
              fontSize:   '1rem',
              color:      'var(--text-primary)',
              fontFamily: 'inherit',
            }}
          />

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilter(v => !v)}
            style={{
              display:        'flex',
              alignItems:     'center',
              gap:            '4px',
              padding:        '0.3rem 0.6rem',
              borderRadius:   '8px',
              border:         `1px solid ${filter !== 'all' ? 'var(--accent)' : 'var(--border)'}`,
              background:     filter !== 'all' ? 'rgba(99,102,241,0.1)' : 'transparent',
              color:          filter !== 'all' ? 'var(--accent)' : 'var(--text-muted)',
              fontSize:       '0.72rem',
              cursor:         'pointer',
              fontFamily:     'inherit',
              flexShrink:     0,
            }}
          >
            <Filter size={11} />
            {filter === 'all' ? 'All' : TYPE_CONFIG[filter as Exclude<FilterType,'all'>].label}
          </button>

          {/* Clear */}
          {query && (
            <button
              onClick={() => setQuery('')}
              style={{
                width:          '24px',
                height:         '24px',
                borderRadius:   '6px',
                border:         'none',
                background:     'var(--bg-tertiary)',
                color:          'var(--text-muted)',
                cursor:         'pointer',
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                flexShrink:     0,
              }}
            >
              <X size={13} />
            </button>
          )}

          <button
            onClick={onClose}
            style={{
              display:        'flex',
              alignItems:     'center',
              gap:            '3px',
              padding:        '3px 8px',
              borderRadius:   '6px',
              border:         '1px solid var(--border)',
              background:     'transparent',
              color:          'var(--text-muted)',
              fontSize:       '0.65rem',
              cursor:         'pointer',
              fontFamily:     'inherit',
              flexShrink:     0,
            }}
          >
            ESC
          </button>
        </div>

        {/* ── Filter pills (when showFilter) ────────────────────────────── */}
        {showFilter && (
          <div style={{
            display:      'flex',
            gap:          '6px',
            padding:      '0.6rem 1.25rem',
            borderBottom: '1px solid var(--border)',
            flexShrink:   0,
            background:   'var(--bg-secondary)',
          }}>
            {(['all', 'diary', 'note', 'idea'] as FilterType[]).map(f => {
              const isActive = filter === f
              const cfg      = f !== 'all' ? TYPE_CONFIG[f] : null
              return (
                <button
                  key={f}
                  onClick={() => { setFilter(f); setShowFilter(false) }}
                  style={{
                    display:      'flex',
                    alignItems:   'center',
                    gap:          '5px',
                    padding:      '0.35rem 0.75rem',
                    borderRadius: '999px',
                    border:       `1px solid ${isActive
                      ? (cfg?.color ?? 'var(--accent)')
                      : 'var(--border)'}`,
                    background:   isActive
                      ? `${cfg?.color ?? 'var(--accent)'}18`
                      : 'transparent',
                    color:        isActive
                      ? (cfg?.color ?? 'var(--accent)')
                      : 'var(--text-secondary)',
                    fontSize:     '0.78rem',
                    fontWeight:   isActive ? 600 : 400,
                    cursor:       'pointer',
                    fontFamily:   'inherit',
                    transition:   'all 0.15s',
                  }}
                >
                  {cfg && <span style={{ display: 'flex', color: cfg.color }}>{cfg.icon}</span>}
                  {f === 'all' ? 'All Types' : cfg?.label}
                </button>
              )
            })}

            <div style={{ marginLeft: 'auto', fontSize: '0.68rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
              Tab to cycle
            </div>
          </div>
        )}

        {/* ── Body ─────────────────────────────────────────────────────── */}
        <div
          ref={listRef}
          style={{
            flex:      1,
            overflowY: 'auto',
            padding:   '0.5rem',
          }}
        >

          {/* ── Recent Searches (no query) ──────────────────────────────── */}
          {showRecent && (
            <div>
              <div style={{
                fontSize:      '0.65rem',
                fontWeight:    600,
                color:         'var(--text-muted)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                padding:       '0.5rem 0.75rem 0.25rem',
                display:       'flex',
                alignItems:    'center',
                justifyContent:'space-between',
              }}>
                <span>Recent Searches</span>
                <button
                  onClick={() => {
                    setRecentSearches([])
                    sessionStorage.removeItem('soul-recent-searches')
                  }}
                  style={{
                    background: 'none',
                    border:     'none',
                    cursor:     'pointer',
                    color:      'var(--text-muted)',
                    fontSize:   '0.65rem',
                    fontFamily: 'inherit',
                    textTransform: 'none',
                    letterSpacing: 0,
                  }}
                >
                  Clear
                </button>
              </div>

              {recentSearches.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setQuery(s)}
                  style={{
                    display:     'flex',
                    alignItems:  'center',
                    gap:         '0.6rem',
                    width:       '100%',
                    padding:     '0.5rem 0.75rem',
                    borderRadius:'10px',
                    border:      'none',
                    background:  'transparent',
                    cursor:      'pointer',
                    fontFamily:  'inherit',
                    textAlign:   'left',
                    color:       'var(--text-secondary)',
                    fontSize:    '0.875rem',
                    transition:  'background 0.1s',
                  }}
                  onMouseEnter={e =>
                    (e.currentTarget as HTMLElement).style.background = 'var(--bg-tertiary)'
                  }
                  onMouseLeave={e =>
                    (e.currentTarget as HTMLElement).style.background = 'transparent'
                  }
                >
                  <Clock size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  {s}
                  <ChevronRight size={12} style={{ color: 'var(--text-muted)', marginLeft: 'auto' }} />
                </button>
              ))}
            </div>
          )}

          {/* ── Empty prompt ────────────────────────────────────────────── */}
          {!query.trim() && recentSearches.length === 0 && (
            <div style={{
              display:        'flex',
              flexDirection:  'column',
              alignItems:     'center',
              justifyContent: 'center',
              padding:        '3rem 2rem',
              gap:            '0.75rem',
              color:          'var(--text-muted)',
            }}>
              <div style={{
                width:          '56px',
                height:         '56px',
                borderRadius:   '16px',
                background:     'var(--bg-tertiary)',
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
              }}>
                <Search size={24} style={{ color: 'var(--accent)' }} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.3rem' }}>
                  Search Everything
                </div>
                <div style={{ fontSize: '0.78rem', lineHeight: 1.6, maxWidth: '280px' }}>
                  Search across all your diary entries, notes, and ideas. Results appear as you type.
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center', marginTop: '0.25rem' }}>
                {['today', 'happy', 'ideas', 'goals', 'work'].map(tag => (
                  <button
                    key={tag}
                    onClick={() => setQuery(tag)}
                    style={{
                      display:      'flex',
                      alignItems:   'center',
                      gap:          '3px',
                      padding:      '0.3rem 0.65rem',
                      borderRadius: '999px',
                      border:       '1px solid var(--border)',
                      background:   'var(--bg-tertiary)',
                      color:        'var(--text-secondary)',
                      fontSize:     '0.75rem',
                      cursor:       'pointer',
                      fontFamily:   'inherit',
                    }}
                  >
                    <Hash size={10} />
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Searching indicator ─────────────────────────────────────── */}
          {isSearching && query.trim() && (
            <div style={{
              display:     'flex',
              alignItems:  'center',
              gap:         '0.5rem',
              padding:     '1.5rem',
              color:       'var(--text-muted)',
              fontSize:    '0.85rem',
              justifyContent:'center',
            }}>
              <Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} />
              Searching...
            </div>
          )}

          {/* ── No results ──────────────────────────────────────────────── */}
          {showEmpty && (
            <div style={{
              display:        'flex',
              flexDirection:  'column',
              alignItems:     'center',
              padding:        '3rem 2rem',
              gap:            '0.6rem',
              color:          'var(--text-muted)',
              textAlign:      'center',
            }}>
              <div style={{ fontSize: '2rem' }}>🔍</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                No results for "{query}"
              </div>
              <div style={{ fontSize: '0.78rem' }}>
                Try different keywords or check spelling
              </div>
              {filter !== 'all' && (
                <button
                  onClick={() => setFilter('all')}
                  style={{
                    marginTop:    '0.5rem',
                    padding:      '0.4rem 1rem',
                    borderRadius: '8px',
                    border:       '1px solid var(--accent)',
                    background:   'rgba(99,102,241,0.08)',
                    color:        'var(--accent)',
                    fontSize:     '0.78rem',
                    cursor:       'pointer',
                    fontFamily:   'inherit',
                  }}
                >
                  Search all types
                </button>
              )}
            </div>
          )}

          {/* ── Results ─────────────────────────────────────────────────── */}
          {showResults && (
            <div>
              {/* Result count */}
              <div style={{
                fontSize:      '0.65rem',
                fontWeight:    600,
                color:         'var(--text-muted)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                padding:       '0.5rem 0.75rem 0.25rem',
              }}>
                {results.length} result{results.length !== 1 ? 's' : ''}
                {filter !== 'all' && ` in ${TYPE_CONFIG[filter as Exclude<FilterType,'all'>].label}`}
              </div>

              {results.map((result, i) => {
                const isActive = activeIndex === i
                const cfg      = TYPE_CONFIG[result.type]
                const snippet  = getSnippet(result.content_plain, query)

                return (
                  <button
                    key={result.id}
                    data-active={isActive}
                    onClick={() => handleSelect(result)}
                    onMouseEnter={() => setActiveIndex(i)}
                    style={{
                      display:      'flex',
                      gap:          '0.875rem',
                      width:        '100%',
                      padding:      '0.75rem',
                      borderRadius: '12px',
                      border:       `1px solid ${isActive ? 'rgba(99,102,241,0.25)' : 'transparent'}`,
                      background:   isActive ? 'rgba(99,102,241,0.07)' : 'transparent',
                      cursor:       'pointer',
                      textAlign:    'left',
                      fontFamily:   'inherit',
                      marginBottom: '2px',
                      transition:   'all 0.1s',
                    }}
                  >
                    {/* Type icon + color bar */}
                    <div style={{
                      display:        'flex',
                      flexDirection:  'column',
                      alignItems:     'center',
                      gap:            '4px',
                      flexShrink:     0,
                    }}>
                      <div style={{
                        width:          '36px',
                        height:         '36px',
                        borderRadius:   '10px',
                        background:     `${cfg.color}15`,
                        border:         `1px solid ${cfg.color}30`,
                        display:        'flex',
                        alignItems:     'center',
                        justifyContent: 'center',
                        color:          cfg.color,
                      }}>
                        {cfg.icon}
                      </div>
                      {/* Color indicator (for colored notes/ideas) */}
                      {result.color && result.color !== '#6366f1' && (
                        <div style={{
                          width:        '4px',
                          height:       '20px',
                          borderRadius: '2px',
                          background:   result.color,
                          opacity:      0.6,
                        }} />
                      )}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, overflow: 'hidden', minWidth: 0 }}>
                      {/* Title + badges */}
                      <div style={{
                        display:      'flex',
                        alignItems:   'center',
                        gap:          '0.4rem',
                        marginBottom: '0.3rem',
                        flexWrap:     'wrap',
                      }}>
                        {/* Type badge */}
                        <span style={{
                          fontSize:     '0.62rem',
                          padding:      '1px 6px',
                          borderRadius: '999px',
                          background:   `${cfg.color}18`,
                          color:        cfg.color,
                          fontWeight:   600,
                          flexShrink:   0,
                        }}>
                          {cfg.label}
                        </span>

                        {/* Title */}
                        <span style={{
                          fontSize:    '0.9rem',
                          fontWeight:  600,
                          color:       isActive ? 'var(--accent)' : 'var(--text-primary)',
                          overflow:    'hidden',
                          textOverflow:'ellipsis',
                          whiteSpace:  'nowrap',
                          flex:        1,
                        }}>
                          {result.title
                            ? highlight(result.title, query)
                            : <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Untitled</span>
                          }
                        </span>

                        {/* Favorite / pin badges */}
                        {result.is_favorite ? (
                          <Heart size={11} style={{ color: '#f472b6', fill: '#f472b6', flexShrink: 0 }} />
                        ) : null}
                        {result.is_pinned ? (
                          <Pin size={11} style={{ color: '#fbbf24', flexShrink: 0 }} />
                        ) : null}
                      </div>

                      {/* Snippet */}
                      {snippet && (
                        <div style={{
                          fontSize:        '0.78rem',
                          color:           'var(--text-muted)',
                          lineHeight:      1.55,
                          display:         '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow:        'hidden',
                          marginBottom:    '0.35rem',
                        }}>
                          {highlight(snippet, query)}
                        </div>
                      )}

                      {/* Meta row */}
                      <div style={{
                        display:    'flex',
                        alignItems: 'center',
                        gap:        '0.75rem',
                        flexWrap:   'wrap',
                      }}>
                        {/* Date */}
                        <span style={{
                          display:    'flex',
                          alignItems: 'center',
                          gap:        '3px',
                          fontSize:   '0.65rem',
                          color:      'var(--text-muted)',
                        }}>
                          <Calendar size={9} />
                          {formatDate(result.updated_at)}
                        </span>

                        {/* Word count */}
                        {result.word_count > 0 && (
                          <span style={{
                            display:    'flex',
                            alignItems: 'center',
                            gap:        '3px',
                            fontSize:   '0.65rem',
                            color:      'var(--text-muted)',
                          }}>
                            <AlignLeft size={9} />
                            {result.word_count} words
                          </span>
                        )}

                        {/* Entry date for diary */}
                        {result.type === 'diary' && result.entry_date && (
                          <span style={{
                            fontSize: '0.65rem',
                            color:    'var(--text-muted)',
                          }}>
                            📅 {result.entry_date}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Arrow */}
                    {isActive && (
                      <ChevronRight
                        size={15}
                        style={{
                          color:      'var(--accent)',
                          flexShrink: 0,
                          alignSelf:  'center',
                        }}
                      />
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Footer ───────────────────────────────────────────────────── */}
        <div style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          padding:        '0.5rem 1rem',
          borderTop:      '1px solid var(--border)',
          background:     'var(--bg-secondary)',
          flexShrink:     0,
        }}>
          {/* Keyboard hints */}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {[
              { key: '↑↓',  desc: 'Navigate' },
              { key: '↵',   desc: 'Open'     },
              { key: 'Tab', desc: 'Filter'   },
            ].map(k => (
              <div key={k.key} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <kbd style={{
                  fontSize:     '0.62rem',
                  padding:      '2px 5px',
                  borderRadius: '4px',
                  border:       '1px solid var(--border)',
                  background:   'var(--bg-tertiary)',
                  color:        'var(--text-muted)',
                }}>
                  {k.key}
                </kbd>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                  {k.desc}
                </span>
              </div>
            ))}
          </div>

          {/* Results summary */}
          {query.trim() && (
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
              {isSearching ? 'Searching...' : `${results.length} found`}
            </span>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn  { from { opacity: 0 }                         to { opacity: 1 }                          }
        @keyframes slideUp { from { transform: translateX(-50%) translateY(16px); opacity: 0 }
                             to   { transform: translateX(-50%) translateY(0);    opacity: 1 } }
        @keyframes spin    { from { transform: rotate(0deg) }            to { transform: rotate(360deg) }           }
      `}</style>
    </>
  )
}