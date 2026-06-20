import { useEffect, useRef, useState, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { useEntryStore, Entry } from '@store/useEntryStore'
import { useAppStore } from '@store/useAppStore'
import RichEditor, { RichEditorRef } from '@editor/RichEditor'
import Toolbar from '@editor/Toolbar'
import { Editor } from '@tiptap/react'
import {
  Plus, Trash2, ChevronLeft, RefreshCw,
  X, Check, Star, Lightbulb, Zap,
  Search, LayoutGrid, List,
} from 'lucide-react'

// ─── Idea color themes ────────────────────────────────────────────────────────

const IDEA_THEMES = [
  { color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)',  label: 'Purple' },
  { color: '#3b82f6', bg: 'rgba(59,130,246,0.08)',  label: 'Blue'   },
  { color: '#06b6d4', bg: 'rgba(6,182,212,0.08)',   label: 'Cyan'   },
  { color: '#22c55e', bg: 'rgba(34,197,94,0.08)',   label: 'Green'  },
  { color: '#eab308', bg: 'rgba(234,179,8,0.08)',   label: 'Yellow' },
  { color: '#f97316', bg: 'rgba(249,115,22,0.08)',  label: 'Orange' },
  { color: '#ef4444', bg: 'rgba(239,68,68,0.08)',   label: 'Red'    },
  { color: '#ec4899', bg: 'rgba(236,72,153,0.08)',  label: 'Pink'   },
  { color: '#14b8a6', bg: 'rgba(20,184,166,0.08)',  label: 'Teal'   },
  { color: '#6366f1', bg: 'rgba(99,102,241,0.08)',  label: 'Indigo' },
]

// ─── Categories ───────────────────────────────────────────────────────────────

const IDEA_CATEGORIES = [
  { id: 'all',     label: 'All Ideas', icon: '💡' },
  { id: 'starred', label: 'Starred',   icon: '⭐' },
  { id: 'recent',  label: 'Recent',    icon: '🕐' },
]

// ─── IdeasPage ────────────────────────────────────────────────────────────────

export default function IdeasPage() {
  const {
    entries, currentEntry, isDirty, isSaving,
    loadEntries, loadEntry, createEntry,
    updateEntry, deleteEntry, toggleFavorite,
    setCurrentEntry, scheduleAutoSave, saveNow, setDirty,
  } = useEntryStore()

  const { settings } = useAppStore()
  const location     = useLocation()

  const editorRef = useRef<RichEditorRef>(null)
  const titleRef  = useRef<HTMLInputElement>(null)

  // ── State ──────────────────────────────────────────────────────────────────
  const [title,            setTitle]            = useState('')
  const [showList,         setShowList]         = useState(true)
  const [viewMode,         setViewMode]         = useState<'grid' | 'list'>('grid')
  const [editorInstance,   setEditorInstance]   = useState<Editor | null>(null)
  const [saveStatus,       setSaveStatus]       = useState<'saved' | 'saving' | 'unsaved'>('saved')
  const [searchQuery,      setSearchQuery]      = useState('')
  const [selectedColor,    setSelectedColor]    = useState('#8b5cf6')
  const [showColorPicker,  setShowColorPicker]  = useState(false)
  const [activeCategory,   setActiveCategory]   = useState('all')
  const [quickCaptureText, setQuickCaptureText] = useState('')
  const [showQuickCapture, setShowQuickCapture] = useState(false)
  const [wordCount,        setWordCount]        = useState(0)

  // ── Load on mount ──────────────────────────────────────────────────────────
  useEffect(() => { loadEntries('idea') }, [])

  useEffect(() => {
    const openId = (location.state as any)?.openEntryId
    if (!openId || entries.length === 0) return
    const entry = entries.find(e => e.id === openId)
    if (!entry) return
    loadEntry(entry.id).then(() => {
      setShowList(false)
      window.history.replaceState({}, '')
    })
  }, [entries, location.state])

  // ── Save status sync ───────────────────────────────────────────────────────
  useEffect(() => {
    if (isSaving)     setSaveStatus('saving')
    else if (isDirty) setSaveStatus('unsaved')
    else              setSaveStatus('saved')
  }, [isSaving, isDirty])

  // ── Load entry into editor ─────────────────────────────────────────────────
  useEffect(() => {
    if (!currentEntry) return
    setTitle(currentEntry.title ?? '')
    setSelectedColor(currentEntry.color ?? '#8b5cf6')
    setWordCount(currentEntry.word_count ?? 0)
    setTimeout(() => {
      if (editorRef.current && currentEntry.content) {
        editorRef.current.setContent(currentEntry.content)
      }
    }, 50)
  }, [currentEntry?.id])

  // ── Filtered ideas ─────────────────────────────────────────────────────────
  const allIdeas = entries.filter(e => e.type === 'idea' && !e.is_deleted)

  const filteredIdeas = allIdeas.filter(e => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      if (!e.title.toLowerCase().includes(q) &&
          !e.content_plain.toLowerCase().includes(q)) return false
    }
    if (activeCategory === 'starred') return e.is_favorite
    if (activeCategory === 'recent') {
      const diff = Date.now() - new Date(e.updated_at).getTime()
      return diff < 7 * 24 * 60 * 60 * 1000
    }
    return true
  })

  // ── Quick capture ──────────────────────────────────────────────────────────
  const handleQuickCapture = useCallback(async () => {
    if (!quickCaptureText.trim()) return
    const id = await createEntry({
      type:         'idea',
      title:        quickCaptureText.slice(0, 60),
      content:      JSON.stringify({
        type: 'doc',
        content: [{
          type:    'paragraph',
          content: [{ type: 'text', text: quickCaptureText }],
        }],
      }),
      contentPlain: quickCaptureText,
      color:        selectedColor,
    })
    setQuickCaptureText('')
    setShowQuickCapture(false)
    if (id) { await loadEntry(id); setShowList(false) }
  }, [quickCaptureText, selectedColor, createEntry, loadEntry])

  // ── New idea ───────────────────────────────────────────────────────────────
  const handleNewIdea = useCallback(async () => {
    const id = await createEntry({ type: 'idea', title: '', color: selectedColor })
    if (id) {
      await loadEntry(id)
      setShowList(false)
      setTimeout(() => titleRef.current?.focus(), 100)
    }
  }, [selectedColor, createEntry, loadEntry])

  // ── Select idea ────────────────────────────────────────────────────────────
  const handleSelectIdea = useCallback(async (entry: Entry) => {
    if (isDirty && currentEntry) {
      await saveNow(currentEntry.id, {
        title,
        content:      editorRef.current?.getJSON()
          ? JSON.stringify(editorRef.current.getJSON()) : undefined,
        contentPlain: editorRef.current?.getText(),
      })
    }
    await loadEntry(entry.id)
    setShowList(false)
  }, [isDirty, currentEntry, title, saveNow, loadEntry])

  // ── Editor onChange ────────────────────────────────────────────────────────
  const handleEditorChange = useCallback((json: string, text: string) => {
    if (!currentEntry) return
    scheduleAutoSave(currentEntry.id, {
      title, content: json, contentPlain: text, color: selectedColor,
    })
  }, [currentEntry, title, selectedColor, scheduleAutoSave])

  // ── Title change ───────────────────────────────────────────────────────────
  const handleTitleChange = useCallback((val: string) => {
    setTitle(val)
    if (!currentEntry) return
    setDirty(true)
    scheduleAutoSave(currentEntry.id, {
      title: val,
      content:      editorRef.current?.getJSON()
        ? JSON.stringify(editorRef.current.getJSON()) : undefined,
      contentPlain: editorRef.current?.getText(),
    })
  }, [currentEntry, scheduleAutoSave, setDirty])

  // ── Color change ───────────────────────────────────────────────────────────
  const handleColorChange = useCallback(async (color: string) => {
    setSelectedColor(color)
    setShowColorPicker(false)
    if (currentEntry) await updateEntry(currentEntry.id, { color })
  }, [currentEntry, updateEntry])

  // ── Manual save ───────────────────────────────────────────────────────────
  const handleManualSave = useCallback(async () => {
    if (!currentEntry) return
    await saveNow(currentEntry.id, {
      title,
      content:      editorRef.current?.getJSON()
        ? JSON.stringify(editorRef.current.getJSON()) : undefined,
      contentPlain: editorRef.current?.getText(),
      color:        selectedColor,
    })
  }, [currentEntry, title, selectedColor, saveNow])

  // ── Ctrl+S ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 's') { e.preventDefault(); handleManualSave() }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [handleManualSave])

  // ── Insert image ──────────────────────────────────────────────────────────
  const handleInsertImage = useCallback(() => {
    const input = document.createElement('input')
    input.type  = 'file'; input.accept = 'image/*'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = () =>
        editorRef.current?.insertImage(reader.result as string, file.name)
      reader.readAsDataURL(file)
    }
    input.click()
  }, [])

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = useCallback(async () => {
    if (!currentEntry) return
    if (!window.confirm('Move this idea to trash?')) return
    await deleteEntry(currentEntry.id)
    setCurrentEntry(null)
    setShowList(true)
    await loadEntries('idea')
  }, [currentEntry, deleteEntry, setCurrentEntry, loadEntries])

  // ── Format time ───────────────────────────────────────────────────────────
  const formatTime = (iso: string) => {
    try {
      const d    = new Date(iso)
      const diff = Date.now() - d.getTime()
      const mins = Math.floor(diff / 60000)
      const hrs  = Math.floor(diff / 3600000)
      const days = Math.floor(diff / 86400000)
      if (mins  < 1)  return 'Just now'
      if (mins  < 60) return `${mins}m ago`
      if (hrs   < 24) return `${hrs}h ago`
      if (days  < 7)  return `${days}d ago`
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    } catch { return '' }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{
      display:    'flex',
      height:     '100%',
      overflow:   'hidden',
      background: 'var(--bg-primary)',
    }}>

      {/* ══ LEFT PANEL ════════════════════════════════════════════════════ */}
      <div style={{
        width:      showList ? '290px' : '0px',
        minWidth:   showList ? '290px' : '0px',
        borderRight:'1px solid var(--border)',
        display:    'flex',
        flexDirection:'column',
        overflow:   'hidden',
        transition: 'width 0.25s ease, min-width 0.25s ease',
        background: 'var(--bg-secondary)',
      }}>

        {/* Header */}
        <div style={{
          padding:      '1rem 1rem 0.75rem',
          borderBottom: '1px solid var(--border)',
          flexShrink:   0,
        }}>
          {/* Title row */}
          <div style={{
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'space-between',
            marginBottom:   '0.6rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Lightbulb size={16} style={{ color: '#fbbf24' }} />
              <span style={{
                fontFamily: "'Playfair Display', serif",
                fontWeight: 700,
                fontSize:   '1rem',
                color:      'var(--text-primary)',
              }}>
                Ideas
              </span>
              <span style={{
                fontSize:     '0.7rem',
                color:        'var(--text-muted)',
                background:   'var(--bg-tertiary)',
                borderRadius: '999px',
                padding:      '1px 7px',
                border:       '1px solid var(--border)',
              }}>
                {allIdeas.length}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                onClick={() => setViewMode(v => v === 'grid' ? 'list' : 'grid')}
                title={viewMode === 'grid' ? 'List view' : 'Grid view'}
                style={{
                  width:          '26px',
                  height:         '26px',
                  borderRadius:   '7px',
                  border:         'none',
                  background:     'var(--bg-tertiary)',
                  color:          'var(--text-muted)',
                  cursor:         'pointer',
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: 'center',
                }}
              >
                {viewMode === 'grid'
                  ? <List       size={13} />
                  : <LayoutGrid size={13} />}
              </button>

              <button
                onClick={handleNewIdea}
                title="New idea"
                style={{
                  width:          '26px',
                  height:         '26px',
                  borderRadius:   '7px',
                  border:         'none',
                  cursor:         'pointer',
                  background:     'linear-gradient(135deg, #f59e0b, #fbbf24)',
                  color:          'white',
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: 'center',
                  boxShadow:      '0 2px 8px rgba(251,191,36,0.4)',
                }}
              >
                <Plus size={14} />
              </button>
            </div>
          </div>

          {/* Quick capture */}
          <div style={{ marginBottom: '0.6rem' }}>
            {showQuickCapture ? (
              <div style={{
                display:     'flex',
                flexDirection:'column',
                gap:         '6px',
                padding:     '0.5rem',
                borderRadius:'10px',
                background:  'var(--bg-tertiary)',
                border:      '1px solid var(--accent)',
                boxShadow:   '0 0 0 3px rgba(99,102,241,0.1)',
              }}>
                <textarea
                  autoFocus
                  value={quickCaptureText}
                  onChange={e => setQuickCaptureText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault(); handleQuickCapture()
                    }
                    if (e.key === 'Escape') {
                      setShowQuickCapture(false); setQuickCaptureText('')
                    }
                  }}
                  placeholder="Capture your idea... (Enter to save)"
                  className="selectable"
                  rows={3}
                  style={{
                    width:      '100%',
                    background: 'transparent',
                    border:     'none',
                    outline:    'none',
                    resize:     'none',
                    fontSize:   '0.8rem',
                    color:      'var(--text-primary)',
                    fontFamily: 'inherit',
                    lineHeight: 1.5,
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '4px' }}>
                  <button
                    onClick={() => { setShowQuickCapture(false); setQuickCaptureText('') }}
                    style={{
                      padding:      '3px 10px',
                      borderRadius: '6px',
                      border:       '1px solid var(--border)',
                      background:   'transparent',
                      color:        'var(--text-muted)',
                      fontSize:     '0.72rem',
                      cursor:       'pointer',
                      fontFamily:   'inherit',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleQuickCapture}
                    style={{
                      padding:      '3px 10px',
                      borderRadius: '6px',
                      border:       'none',
                      background:   'var(--accent)',
                      color:        'white',
                      fontSize:     '0.72rem',
                      cursor:       'pointer',
                      fontFamily:   'inherit',
                      fontWeight:   600,
                    }}
                  >
                    Capture
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowQuickCapture(true)}
                style={{
                  display:     'flex',
                  alignItems:  'center',
                  gap:         '0.5rem',
                  width:       '100%',
                  padding:     '0.45rem 0.75rem',
                  borderRadius:'8px',
                  border:      '1px dashed var(--border)',
                  background:  'transparent',
                  color:       'var(--text-muted)',
                  fontSize:    '0.78rem',
                  cursor:      'pointer',
                  fontFamily:  'inherit',
                  transition:  'all 0.15s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'
                  ;(e.currentTarget as HTMLElement).style.color = 'var(--accent)'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'
                  ;(e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'
                }}
              >
                <Zap size={13} />
                Quick capture an idea...
              </button>
            )}
          </div>

          {/* Search */}
          <div style={{
            display:     'flex',
            alignItems:  'center',
            gap:         '0.5rem',
            padding:     '0.4rem 0.6rem',
            borderRadius:'8px',
            background:  'var(--bg-tertiary)',
            border:      '1px solid var(--border)',
          }}>
            <Search size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Search ideas..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="selectable"
              style={{
                flex:       1,
                background: 'transparent',
                border:     'none',
                outline:    'none',
                fontSize:   '0.78rem',
                color:      'var(--text-primary)',
                fontFamily: 'inherit',
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  background: 'none',
                  border:     'none',
                  cursor:     'pointer',
                  color:      'var(--text-muted)',
                  display:    'flex',
                }}
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Category tabs */}
        <div style={{
          display:      'flex',
          padding:      '0.5rem 0.75rem',
          gap:          '3px',
          borderBottom: '1px solid var(--border)',
          flexShrink:   0,
        }}>
          {IDEA_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              style={{
                flex:        1,
                padding:     '0.3rem 0.25rem',
                borderRadius:'7px',
                border:      'none',
                cursor:      'pointer',
                background:  activeCategory === cat.id
                  ? 'rgba(251,191,36,0.15)' : 'transparent',
                color:       activeCategory === cat.id
                  ? '#d97706' : 'var(--text-muted)',
                fontSize:    '0.68rem',
                fontWeight:  activeCategory === cat.id ? 600 : 400,
                fontFamily:  'inherit',
                transition:  'all 0.15s',
                display:     'flex',
                alignItems:  'center',
                justifyContent:'center',
                gap:         '3px',
              }}
            >
              <span style={{ fontSize: '0.75rem' }}>{cat.icon}</span>
              {cat.label}
            </button>
          ))}
        </div>

        {/* Ideas list/grid */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
          {filteredIdeas.length === 0 ? (
            <div style={{
              display:        'flex',
              flexDirection:  'column',
              alignItems:     'center',
              justifyContent: 'center',
              padding:        '3rem 1rem',
              gap:            '0.75rem',
              color:          'var(--text-muted)',
              textAlign:      'center',
            }}>
              <div style={{ fontSize: '2.5rem' }}>💡</div>
              <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                {searchQuery ? 'No ideas found' : 'No ideas yet'}
              </div>
              {!searchQuery && (
                <button
                  onClick={() => setShowQuickCapture(true)}
                  style={{
                    marginTop:    '0.25rem',
                    padding:      '0.5rem 1.25rem',
                    borderRadius: '10px',
                    border:       'none',
                    cursor:       'pointer',
                    background:   'linear-gradient(135deg, #f59e0b, #fbbf24)',
                    color:        'white',
                    fontSize:     '0.8rem',
                    fontWeight:   600,
                    fontFamily:   'inherit',
                  }}
                >
                  Capture First Idea
                </button>
              )}
            </div>

          ) : viewMode === 'grid' ? (
            // Grid view
            <div style={{
              display:             'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap:                 '6px',
            }}>
              {filteredIdeas.map(idea => {
                const isSelected = currentEntry?.id === idea.id
                const theme      = IDEA_THEMES.find(t => t.color === idea.color)
                  ?? IDEA_THEMES[0]

                return (
                  <div
                    key={idea.id}
                    onClick={() => handleSelectIdea(idea)}
                    style={{
                      padding:      '0.75rem',
                      borderRadius: '12px',
                      cursor:       'pointer',
                      background:   isSelected ? theme.bg : 'var(--bg-tertiary)',
                      border:       `1px solid ${isSelected
                        ? (idea.color ?? '#8b5cf6') + '50'
                        : 'var(--border)'}`,
                      transition:   'all 0.15s',
                      position:     'relative',
                      overflow:     'hidden',
                    }}
                    onMouseEnter={e => {
                      if (!isSelected) {
                        (e.currentTarget as HTMLElement).style.background   = theme.bg
                        ;(e.currentTarget as HTMLElement).style.borderColor =
                          (idea.color ?? '#8b5cf6') + '40'
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isSelected) {
                        (e.currentTarget as HTMLElement).style.background   = 'var(--bg-tertiary)'
                        ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'
                      }
                    }}
                  >
                    {/* Color bar */}
                    <div style={{
                      position:     'absolute',
                      top:          0,
                      left:         0,
                      right:        0,
                      height:       '3px',
                      background:   idea.color ?? '#8b5cf6',
                      borderRadius: '12px 12px 0 0',
                    }} />

                    <div style={{
                      fontWeight:         600,
                      fontSize:           '0.78rem',
                      color:              isSelected ? idea.color : 'var(--text-primary)',
                      marginBottom:       '0.3rem',
                      marginTop:          '0.2rem',
                      overflow:           'hidden',
                      display:            '-webkit-box',
                      WebkitLineClamp:    2,
                      WebkitBoxOrient:    'vertical',
                      lineHeight:         1.4,
                    }}>
                      {idea.title || 'Untitled Idea'}
                    </div>

                    <div style={{
                      fontSize:        '0.7rem',
                      color:           'var(--text-muted)',
                      overflow:        'hidden',
                      display:         '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      lineHeight:      1.5,
                      marginBottom:    '0.5rem',
                    }}>
                      {idea.content_plain || 'Tap to expand...'}
                    </div>

                    <div style={{
                      display:        'flex',
                      alignItems:     'center',
                      justifyContent: 'space-between',
                    }}>
                      <span style={{ fontSize: '0.63rem', color: 'var(--text-muted)' }}>
                        {formatTime(idea.updated_at)}
                      </span>
                      {idea.is_favorite
                        ? <Star size={10} style={{ color: '#fbbf24', fill: '#fbbf24' }} />
                        : null}
                    </div>
                  </div>
                )
              })}
            </div>

          ) : (
            // List view
            filteredIdeas.map(idea => {
              const isSelected = currentEntry?.id === idea.id
              return (
                <div
                  key={idea.id}
                  onClick={() => handleSelectIdea(idea)}
                  style={{
                    display:      'flex',
                    alignItems:   'center',
                    gap:          '0.6rem',
                    padding:      '0.6rem 0.75rem',
                    borderRadius: '10px',
                    cursor:       'pointer',
                    marginBottom: '3px',
                    background:   isSelected
                      ? `rgba(${hexToRgb(idea.color ?? '#8b5cf6')}, 0.1)`
                      : 'transparent',
                    border:       `1px solid ${isSelected
                      ? (idea.color ?? '#8b5cf6') + '40'
                      : 'transparent'}`,
                    transition:   'all 0.15s',
                  }}
                  onMouseEnter={e => {
                    if (!isSelected)
                      (e.currentTarget as HTMLElement).style.background = 'var(--bg-tertiary)'
                  }}
                  onMouseLeave={e => {
                    if (!isSelected)
                      (e.currentTarget as HTMLElement).style.background = 'transparent'
                  }}
                >
                  <div style={{
                    width:        '8px',
                    height:       '8px',
                    borderRadius: '50%',
                    background:   idea.color ?? '#8b5cf6',
                    flexShrink:   0,
                  }} />

                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{
                      fontWeight:    600,
                      fontSize:      '0.82rem',
                      color:         isSelected ? idea.color : 'var(--text-primary)',
                      whiteSpace:    'nowrap',
                      overflow:      'hidden',
                      textOverflow:  'ellipsis',
                    }}>
                      {idea.title || 'Untitled Idea'}
                    </div>
                    <div style={{
                      fontSize:     '0.7rem',
                      color:        'var(--text-muted)',
                      whiteSpace:   'nowrap',
                      overflow:     'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {idea.content_plain?.slice(0, 50) || 'Empty...'}
                    </div>
                  </div>

                  <div style={{
                    fontSize:   '0.63rem',
                    color:      'var(--text-muted)',
                    flexShrink: 0,
                    display:    'flex',
                    alignItems: 'center',
                    gap:        '3px',
                  }}>
                    {idea.is_favorite
                      ? <Star size={9} style={{ color: '#fbbf24', fill: '#fbbf24' }} />
                      : null}
                    {formatTime(idea.updated_at)}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* ══ RIGHT PANEL ═══════════════════════════════════════════════════ */}
      <div style={{
        flex:          1,
        display:       'flex',
        flexDirection: 'column',
        overflow:      'hidden',
        minWidth:      0,
      }}>
        {currentEntry ? (
          <>
            {/* Top Bar */}
            <div style={{
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'space-between',
              padding:        '0.5rem 1rem',
              borderBottom:   '1px solid var(--border)',
              background:     'var(--bg-secondary)',
              flexShrink:     0,
              gap:            '0.5rem',
              flexWrap:       'wrap',
            }}>
              {/* Left */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button
                  onClick={() => setShowList(v => !v)}
                  style={{
                    width:          '28px',
                    height:         '28px',
                    borderRadius:   '7px',
                    border:         'none',
                    background:     'var(--bg-tertiary)',
                    color:          'var(--text-muted)',
                    cursor:         'pointer',
                    display:        'flex',
                    alignItems:     'center',
                    justifyContent: 'center',
                  }}
                >
                  <ChevronLeft size={14} style={{
                    transform:  showList ? 'rotate(0deg)' : 'rotate(180deg)',
                    transition: 'transform 0.2s',
                  }} />
                </button>

                {/* Color picker */}
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setShowColorPicker(v => !v)}
                    title="Idea color"
                    style={{
                      width:        '18px',
                      height:       '18px',
                      borderRadius: '50%',
                      background:   selectedColor,
                      border:       '2px solid var(--border)',
                      cursor:       'pointer',
                      flexShrink:   0,
                      boxShadow:    `0 0 8px ${selectedColor}60`,
                    }}
                  />
                  {showColorPicker && (
                    <>
                      <div
                        style={{ position: 'fixed', inset: 0, zIndex: 99 }}
                        onClick={() => setShowColorPicker(false)}
                      />
                      <div style={{
                        position:     'absolute',
                        top:          '100%',
                        left:         0,
                        marginTop:    '6px',
                        background:   'var(--bg-card)',
                        border:       '1px solid var(--border)',
                        borderRadius: '12px',
                        padding:      '0.6rem',
                        zIndex:       100,
                        boxShadow:    '0 8px 32px rgba(0,0,0,0.2)',
                        display:      'flex',
                        flexWrap:     'wrap',
                        gap:          '5px',
                        width:        '140px',
                      }}>
                        {IDEA_THEMES.map(t => (
                          <button
                            key={t.color}
                            title={t.label}
                            onClick={() => handleColorChange(t.color)}
                            style={{
                              width:        '22px',
                              height:       '22px',
                              borderRadius: '50%',
                              background:   t.color,
                              border:       selectedColor === t.color
                                ? '2px solid white' : '1px solid transparent',
                              cursor:       'pointer',
                              transition:   'transform 0.1s',
                              boxShadow:    selectedColor === t.color
                                ? `0 0 0 2px ${t.color}` : 'none',
                            }}
                            onMouseEnter={e =>
                              (e.currentTarget as HTMLElement).style.transform = 'scale(1.2)'
                            }
                            onMouseLeave={e =>
                              (e.currentTarget as HTMLElement).style.transform = 'scale(1)'
                            }
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>

                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  {wordCount} words · {formatTime(currentEntry.updated_at)}
                </span>
              </div>

              {/* Right actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>

                {/* Favorite */}
                <button
                  onClick={() => toggleFavorite(currentEntry.id)}
                  style={{
                    width:          '30px',
                    height:         '30px',
                    borderRadius:   '8px',
                    border:         'none',
                    background:     'transparent',
                    cursor:         'pointer',
                    display:        'flex',
                    alignItems:     'center',
                    justifyContent: 'center',
                    color:          currentEntry.is_favorite ? '#fbbf24' : 'var(--text-muted)',
                    transition:     'all 0.15s',
                  }}
                >
                  <Star
                    size={15}
                    fill={currentEntry.is_favorite ? '#fbbf24' : 'none'}
                  />
                </button>

                {/* Save status */}
                <div style={{
                  display:    'flex',
                  alignItems: 'center',
                  gap:        '4px',
                  fontSize:   '0.7rem',
                  color:      saveStatus === 'unsaved' ? '#f97316'
                    : saveStatus === 'saving' ? 'var(--accent)'
                    : 'var(--text-muted)',
                  minWidth:   '52px',
                }}>
                  {saveStatus === 'saving'  && <RefreshCw size={11} style={{ animation: 'spin 1s linear infinite' }} />}
                  {saveStatus === 'saved'   && <Check     size={11} />}
                  {saveStatus === 'unsaved' && <RefreshCw size={11} />}
                  <span>
                    {saveStatus === 'saving'  ? 'Saving...'
                      : saveStatus === 'saved' ? 'Saved'
                      : 'Unsaved'}
                  </span>
                </div>

                {/* Delete */}
                <button
                  onClick={handleDelete}
                  style={{
                    width:          '30px',
                    height:         '30px',
                    borderRadius:   '8px',
                    border:         'none',
                    background:     'transparent',
                    cursor:         'pointer',
                    display:        'flex',
                    alignItems:     'center',
                    justifyContent: 'center',
                    color:          'var(--text-muted)',
                    transition:     'all 0.15s',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.color      = '#ef4444'
                    ;(e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.1)'
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.color      = 'var(--text-muted)'
                    ;(e.currentTarget as HTMLElement).style.background = 'transparent'
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {/* Toolbar */}
            <Toolbar editor={editorInstance} onInsertImage={handleInsertImage} />

            {/* Title */}
            <div style={{
              padding:    '1.5rem 2rem 0.5rem',
              flexShrink: 0,
              borderLeft: `3px solid ${selectedColor}`,
            }}>
              <input
                ref={titleRef}
                value={title}
                onChange={e => handleTitleChange(e.target.value)}
                placeholder="Idea title..."
                className="selectable"
                style={{
                  width:      '100%',
                  border:     'none',
                  outline:    'none',
                  background: 'transparent',
                  fontFamily: "'Playfair Display', serif",
                  fontSize:   '1.75rem',
                  fontWeight: 700,
                  color:      'var(--text-primary)',
                  lineHeight: 1.3,
                }}
              />
            </div>

            {/* Editor */}
            <div style={{
              flex:          1,
              overflow:      'hidden',
              padding:       '0.5rem 2rem 1rem',
              display:       'flex',
              flexDirection: 'column',
            }}>
              <RichEditor
                ref={editorRef}
                initialContent={currentEntry.content}
                placeholder="Describe your idea in detail..."
                onChange={handleEditorChange}
                onWordCount={(w) => setWordCount(w)}
                onEditorReady={(ed) => setEditorInstance(ed)}
                autoFocus={false}
                minHeight="100%"
                fontSize={settings.fontSize ?? 'md'}
                fontFamily={settings.fontFamily ?? 'sans'}
                showWordCount={true}
              />
            </div>
          </>
        ) : (
          // Empty state
          <div style={{
            flex:           1,
            display:        'flex',
            flexDirection:  'column',
            alignItems:     'center',
            justifyContent: 'center',
            gap:            '1rem',
            color:          'var(--text-muted)',
          }}>
            <div style={{
              width:          '80px',
              height:         '80px',
              borderRadius:   '24px',
              background:     'linear-gradient(135deg, rgba(251,191,36,0.15), rgba(245,158,11,0.15))',
              border:         '1px solid rgba(251,191,36,0.25)',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              fontSize:       '2.5rem',
              animation:      'float 3s ease-in-out infinite',
            }}>
              💡
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontFamily:    "'Playfair Display', serif",
                fontSize:      '1.25rem',
                fontWeight:    700,
                color:         'var(--text-primary)',
                marginBottom:  '0.4rem',
              }}>
                {allIdeas.length === 0 ? 'Capture Your First Idea' : 'Select an Idea'}
              </div>
              <div style={{ fontSize: '0.875rem', maxWidth: '280px', lineHeight: 1.6 }}>
                {allIdeas.length === 0
                  ? 'Got a thought? Capture it before it slips away.'
                  : 'Choose an idea from the left, or quickly capture a new one.'}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                onClick={() => setShowQuickCapture(true)}
                style={{
                  padding:      '0.6rem 1.25rem',
                  borderRadius: '12px',
                  border:       '1px solid rgba(251,191,36,0.4)',
                  cursor:       'pointer',
                  background:   'rgba(251,191,36,0.1)',
                  color:        '#d97706',
                  fontSize:     '0.875rem',
                  fontWeight:   600,
                  fontFamily:   'inherit',
                  display:      'flex',
                  alignItems:   'center',
                  gap:          '0.4rem',
                }}
              >
                <Zap size={15} />
                Quick Capture
              </button>

              <button
                onClick={handleNewIdea}
                style={{
                  padding:      '0.6rem 1.25rem',
                  borderRadius: '12px',
                  border:       'none',
                  cursor:       'pointer',
                  background:   'linear-gradient(135deg, #f59e0b, #fbbf24)',
                  color:        'white',
                  fontSize:     '0.875rem',
                  fontWeight:   600,
                  fontFamily:   'inherit',
                  display:      'flex',
                  alignItems:   'center',
                  gap:          '0.4rem',
                  boxShadow:    '0 4px 16px rgba(251,191,36,0.35)',
                }}
              >
                <Plus size={15} />
                Full Idea
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin  { from { transform: rotate(0deg);   } to { transform: rotate(360deg); } }
        @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
      `}</style>
    </div>
  )
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function hexToRgb(hex: string): string {
  try {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `${r}, ${g}, ${b}`
  } catch { return '139, 92, 246' }
}