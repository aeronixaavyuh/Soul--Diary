import { useEffect, useRef, useState, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { useEntryStore, Entry }  from '@store/useEntryStore'
import { useAppStore }           from '@store/useAppStore'
import RichEditor, { RichEditorRef } from '@editor/RichEditor'
import Toolbar                   from '@editor/Toolbar'
import { Editor }                from '@tiptap/react'
import {
  Plus, FileText, Heart, Pin, Trash2,
  Wand2, Loader2, ChevronLeft, Clock,
  Tag, X, Check, RefreshCw, Search,
  Grid3X3, List, Sparkles,
} from 'lucide-react'

// ─── Note color presets ───────────────────────────────────────────────────────

const NOTE_COLORS = [
  { value: '#6366f1', label: 'Purple'  },
  { value: '#3b82f6', label: 'Blue'    },
  { value: '#14b8a6', label: 'Teal'    },
  { value: '#22c55e', label: 'Green'   },
  { value: '#eab308', label: 'Yellow'  },
  { value: '#f97316', label: 'Orange'  },
  { value: '#ef4444', label: 'Red'     },
  { value: '#ec4899', label: 'Pink'    },
  { value: '#8b5cf6', label: 'Violet'  },
  { value: '#06b6d4', label: 'Cyan'    },
]

// ─── NotesPage ────────────────────────────────────────────────────────────────

export default function NotesPage() {
  const {
    entries, currentEntry, isDirty, isSaving,
    tags,
    loadEntries, loadEntry, loadTags, createEntry,
    updateEntry, deleteEntry, toggleFavorite, togglePin,
    setCurrentEntry, scheduleAutoSave, saveNow, setDirty,
    createTag,
  } = useEntryStore()

  const { settings } = useAppStore()
  const location = useLocation()

  // ── Refs ───────────────────────────────────────────────────────────────────
  const editorRef  = useRef<RichEditorRef>(null)
  const titleRef   = useRef<HTMLInputElement>(null)

  // ── Local State ────────────────────────────────────────────────────────────
  const [title,           setTitle]           = useState('')
  const [showList,        setShowList]        = useState(true)
  const [viewMode,        setViewMode]        = useState<'list' | 'grid'>('list')
  const [editorInstance,  setEditorInstance]  = useState<Editor | null>(null)
  const [aiLoading,       setAiLoading]       = useState(false)
  const [aiSuggestions,   setAiSuggestions]   = useState<string[]>([])
  const [showAiPanel,     setShowAiPanel]     = useState(false)
  const [saveStatus,      setSaveStatus]      = useState<'saved' | 'saving' | 'unsaved'>('saved')
  const [searchQuery,     setSearchQuery]     = useState('')
  const [selectedColor,   setSelectedColor]   = useState('#6366f1')
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [wordCount,       setWordCount]       = useState(0)
  const [showTagInput,    setShowTagInput]    = useState(false)
  const [newTagName,      setNewTagName]      = useState('')
  const [currentTags,     setCurrentTags]     = useState<string[]>([])

  // ── Load on mount ──────────────────────────────────────────────────────────
  useEffect(() => {
    loadEntries('note')
    loadTags()
  }, [])

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
    setSelectedColor(currentEntry.color ?? '#6366f1')
    setCurrentTags(currentEntry.tags?.map(t => t.id) ?? [])
    setWordCount(currentEntry.word_count ?? 0)

    setTimeout(() => {
      if (editorRef.current && currentEntry.content) {
        editorRef.current.setContent(currentEntry.content)
      }
    }, 50)
  }, [currentEntry?.id])

  // ── Filtered notes ─────────────────────────────────────────────────────────
  const filteredNotes = entries
    .filter(e => e.type === 'note' && !e.is_deleted)
    .filter(e => {
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase()
      return (
        e.title.toLowerCase().includes(q) ||
        e.content_plain.toLowerCase().includes(q)
      )
    })

  // ── Create new note ────────────────────────────────────────────────────────
  const handleNewNote = useCallback(async () => {
    const id = await createEntry({
      type:    'note',
      title:   '',
      content: '{"type":"doc","content":[{"type":"paragraph"}]}',
      color:   '#6366f1',
    })
    if (id) {
      await loadEntry(id)
      setShowList(false)
      setTimeout(() => titleRef.current?.focus(), 100)
    }
  }, [createEntry, loadEntry])

  // ── Select note ────────────────────────────────────────────────────────────
  const handleSelectNote = useCallback(async (entry: Entry) => {
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
    setShowAiPanel(false)
    setAiSuggestions([])
  }, [isDirty, currentEntry, title, saveNow, loadEntry])

  // ── Editor onChange ────────────────────────────────────────────────────────
  const handleEditorChange = useCallback((json: string, text: string) => {
    if (!currentEntry) return
    scheduleAutoSave(currentEntry.id, {
      title,
      content:      json,
      contentPlain: text,
      color:        selectedColor,
    })
  }, [currentEntry, title, selectedColor, scheduleAutoSave])

  // ── Title change ───────────────────────────────────────────────────────────
  const handleTitleChange = useCallback((val: string) => {
    setTitle(val)
    if (!currentEntry) return
    setDirty(true)
    scheduleAutoSave(currentEntry.id, {
      title:        val,
      content:      editorRef.current?.getJSON()
        ? JSON.stringify(editorRef.current.getJSON()) : undefined,
      contentPlain: editorRef.current?.getText(),
    })
  }, [currentEntry, scheduleAutoSave, setDirty])

  // ── Color change ───────────────────────────────────────────────────────────
  const handleColorChange = useCallback(async (color: string) => {
    setSelectedColor(color)
    setShowColorPicker(false)
    if (!currentEntry) return
    await updateEntry(currentEntry.id, { color })
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
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault()
        handleManualSave()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleManualSave])

  // ── AI Suggestions ─────────────────────────────────────────────────────────
  const handleGetSuggestions = useCallback(async () => {
    const text = editorRef.current?.getText() ?? ''
    setAiLoading(true)
    setShowAiPanel(true)

    try {
      const res = await window.electronAPI.ai.suggestions(text, 'improvement')
      if (res?.success && res.data?.suggestions?.length) {
        setAiSuggestions(res.data.suggestions)
      } else {
        setAiSuggestions([
          'Add more detail to your key points.',
          'Consider adding an example or case study.',
          'Summarize the main takeaway at the end.',
        ])
      }
    } catch {
      setAiSuggestions([
        'Add more detail to your key points.',
        'Break this into smaller sections.',
        'Add a summary at the end.',
      ])
    } finally {
      setAiLoading(false)
    }
  }, [])

  // ── Apply suggestion ──────────────────────────────────────────────────────
  const handleApplySuggestion = useCallback((s: string) => {
    if (!editorRef.current) return
    const existingJSON = editorRef.current.getJSON() as any
    const newContent = JSON.stringify({
      type:    'doc',
      content: [
        ...(existingJSON.content ?? []),
        { type: 'paragraph', content: [{ type: 'text', text: s }] },
      ],
    })
    handleEditorChange(newContent, (editorRef.current.getText() ?? '') + '\n' + s)
    setShowAiPanel(false)
  }, [handleEditorChange])

  // ── Add tag ────────────────────────────────────────────────────────────────
  const handleAddTag = useCallback(async () => {
    if (!newTagName.trim() || !currentEntry) return
    const tagId = await createTag(newTagName.trim())
    if (tagId) {
      const updated = [...currentTags, tagId]
      setCurrentTags(updated)
      await updateEntry(currentEntry.id, { tags: updated })
    }
    setNewTagName('')
    setShowTagInput(false)
  }, [newTagName, currentEntry, currentTags, createTag, updateEntry])

  // ── Remove tag ────────────────────────────────────────────────────────────
  const handleRemoveTag = useCallback(async (tagId: string) => {
    if (!currentEntry) return
    const updated = currentTags.filter(t => t !== tagId)
    setCurrentTags(updated)
    await updateEntry(currentEntry.id, { tags: updated })
  }, [currentEntry, currentTags, updateEntry])

  // ── Insert image ──────────────────────────────────────────────────────────
  const handleInsertImage = useCallback(() => {
    const input = document.createElement('input')
    input.type   = 'file'
    input.accept = 'image/*'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => {
        editorRef.current?.insertImage(reader.result as string, file.name)
      }
      reader.readAsDataURL(file)
    }
    input.click()
  }, [])

  // ── Delete note ───────────────────────────────────────────────────────────
  const handleDelete = useCallback(async () => {
    if (!currentEntry) return
    if (!window.confirm('Move this note to trash?')) return
    await deleteEntry(currentEntry.id)
    setCurrentEntry(null)
    setShowList(true)
    await loadEntries('note')
  }, [currentEntry, deleteEntry, setCurrentEntry, loadEntries])

  // ── Format time ───────────────────────────────────────────────────────────
  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso)
      const now = new Date()
      const diff = now.getTime() - d.getTime()
      const mins  = Math.floor(diff / 60000)
      const hours = Math.floor(diff / 3600000)
      const days  = Math.floor(diff / 86400000)

      if (mins  < 1)   return 'Just now'
      if (mins  < 60)  return `${mins}m ago`
      if (hours < 24)  return `${hours}h ago`
      if (days  < 7)   return `${days}d ago`
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

      {/* ══════════════════════════════════════════════════════════════════
          LEFT PANEL — Notes List
      ══════════════════════════════════════════════════════════════════ */}
      <div style={{
        width:         showList ? '280px' : '0px',
        minWidth:      showList ? '280px' : '0px',
        borderRight:   '1px solid var(--border)',
        display:       'flex',
        flexDirection: 'column',
        overflow:      'hidden',
        transition:    'width 0.25s ease, min-width 0.25s ease',
        background:    'var(--bg-secondary)',
      }}>

        {/* List header */}
        <div style={{
          padding:        '1rem 1rem 0.75rem',
          borderBottom:   '1px solid var(--border)',
          flexShrink:     0,
        }}>
          <div style={{
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'space-between',
            marginBottom:   '0.6rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={16} style={{ color: '#60a5fa' }} />
              <span style={{
                fontFamily: "'Playfair Display', serif",
                fontWeight: 700,
                fontSize:   '1rem',
                color:      'var(--text-primary)',
              }}>
                Notes
              </span>
              <span style={{
                fontSize:     '0.7rem',
                color:        'var(--text-muted)',
                background:   'var(--bg-tertiary)',
                borderRadius: '999px',
                padding:      '1px 7px',
                border:       '1px solid var(--border)',
              }}>
                {filteredNotes.length}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {/* View toggle */}
              <button
                onClick={() => setViewMode(v => v === 'list' ? 'grid' : 'list')}
                title={viewMode === 'list' ? 'Grid view' : 'List view'}
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
                {viewMode === 'list' ? <Grid3X3 size={13} /> : <List size={13} />}
              </button>

              {/* New note */}
              <button
                onClick={handleNewNote}
                title="New note"
                style={{
                  width:          '26px',
                  height:         '26px',
                  borderRadius:   '7px',
                  border:         'none',
                  cursor:         'pointer',
                  background:     'linear-gradient(135deg, #3b82f6, #60a5fa)',
                  color:          'white',
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: 'center',
                  boxShadow:      '0 2px 8px rgba(59,130,246,0.35)',
                }}
              >
                <Plus size={14} />
              </button>
            </div>
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
              placeholder="Search notes..."
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
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Notes list */}
        <div style={{
          flex:      1,
          overflowY: 'auto',
          padding:   '0.5rem',
        }}>
          {filteredNotes.length === 0 ? (
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
              <div style={{ fontSize: '2.5rem' }}>📝</div>
              <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                {searchQuery ? 'No notes found' : 'No notes yet'}
              </div>
              {!searchQuery && (
                <button
                  onClick={handleNewNote}
                  style={{
                    marginTop:    '0.25rem',
                    padding:      '0.5rem 1.25rem',
                    borderRadius: '10px',
                    border:       'none',
                    cursor:       'pointer',
                    background:   'linear-gradient(135deg, #3b82f6, #60a5fa)',
                    color:        'white',
                    fontSize:     '0.8rem',
                    fontWeight:   600,
                    fontFamily:   'inherit',
                  }}
                >
                  Create First Note
                </button>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            // ── Grid View ────────────────────────────────────────────────────
            <div style={{
              display:             'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap:                 '6px',
              padding:             '4px',
            }}>
              {filteredNotes.map(note => {
                const isSelected = currentEntry?.id === note.id
                return (
                  <div
                    key={note.id}
                    onClick={() => handleSelectNote(note)}
                    style={{
                      padding:      '0.75rem',
                      borderRadius: '10px',
                      cursor:       'pointer',
                      background:   isSelected ? 'var(--bg-card)' : 'var(--bg-tertiary)',
                      border:       `1px solid ${isSelected ? note.color ?? '#3b82f6' : 'var(--border)'}`,
                      borderTop:    `3px solid ${note.color ?? '#3b82f6'}`,
                      transition:   'all 0.15s',
                      minHeight:    '100px',
                    }}
                    onMouseEnter={e => {
                      if (!isSelected)
                        (e.currentTarget as HTMLElement).style.background = 'var(--bg-card)'
                    }}
                    onMouseLeave={e => {
                      if (!isSelected)
                        (e.currentTarget as HTMLElement).style.background = 'var(--bg-tertiary)'
                    }}
                  >
                    <div style={{
                      fontWeight:   600,
                      fontSize:     '0.78rem',
                      color:        'var(--text-primary)',
                      marginBottom: '0.3rem',
                      overflow:     'hidden',
                      display:      '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    }}>
                      {note.title || 'Untitled'}
                    </div>
                    <div style={{
                      fontSize:       '0.7rem',
                      color:          'var(--text-muted)',
                      overflow:       'hidden',
                      display:        '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      lineHeight:     1.5,
                    }}>
                      {note.content_plain || 'Empty note'}
                    </div>
                    <div style={{
                      marginTop: '0.5rem',
                      fontSize:  '0.63rem',
                      color:     'var(--text-muted)',
                      display:   'flex',
                      alignItems:'center',
                      gap:       '3px',
                    }}>
                      <Clock size={9} />
                      {formatTime(note.updated_at)}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            // ── List View ────────────────────────────────────────────────────
            filteredNotes.map(note => {
              const isSelected = currentEntry?.id === note.id
              return (
                <div
                  key={note.id}
                  onClick={() => handleSelectNote(note)}
                  style={{
                    padding:      '0.7rem 0.75rem',
                    borderRadius: '10px',
                    cursor:       'pointer',
                    marginBottom: '3px',
                    background:   isSelected ? 'rgba(59,130,246,0.1)' : 'transparent',
                    border:       `1px solid ${isSelected ? 'rgba(59,130,246,0.25)' : 'transparent'}`,
                    borderLeft:   `3px solid ${note.color ?? '#3b82f6'}`,
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
                    display:        'flex',
                    justifyContent: 'space-between',
                    alignItems:     'flex-start',
                    gap:            '0.5rem',
                  }}>
                    <div style={{
                      fontWeight:   600,
                      fontSize:     '0.83rem',
                      color:        isSelected ? '#60a5fa' : 'var(--text-primary)',
                      whiteSpace:   'nowrap',
                      overflow:     'hidden',
                      textOverflow: 'ellipsis',
                      flex:         1,
                    }}>
                      {note.title || 'Untitled Note'}
                    </div>
                    <div style={{
                      fontSize:   '0.65rem',
                      color:      'var(--text-muted)',
                      flexShrink: 0,
                      display:    'flex',
                      alignItems: 'center',
                      gap:        '3px',
                    }}>
                      {note.is_pinned  ? <Pin   size={9} style={{ color: '#fbbf24' }} /> : null}
                      {note.is_favorite? <Heart size={9} style={{ color: '#f472b6', fill: '#f472b6' }} /> : null}
                      <Clock size={9} />
                      {formatTime(note.updated_at)}
                    </div>
                  </div>

                  <div style={{
                    fontSize:        '0.73rem',
                    color:           'var(--text-muted)',
                    marginTop:       '0.2rem',
                    overflow:        'hidden',
                    display:         '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    lineHeight:      1.5,
                  }}>
                    {note.content_plain?.slice(0, 80) || 'Empty note...'}
                  </div>

                  {note.word_count > 0 && (
                    <div style={{
                      marginTop: '0.3rem',
                      fontSize:  '0.63rem',
                      color:     'var(--text-muted)',
                    }}>
                      {note.word_count} words
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          RIGHT PANEL — Editor
      ══════════════════════════════════════════════════════════════════ */}
      <div style={{
        flex:          1,
        display:       'flex',
        flexDirection: 'column',
        overflow:      'hidden',
        minWidth:      0,
      }}>

        {currentEntry ? (
          <>
            {/* ── Top Bar ───────────────────────────────────────────────── */}
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

                {/* Color dot */}
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setShowColorPicker(v => !v)}
                    title="Note color"
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
                        {NOTE_COLORS.map(c => (
                          <button
                            key={c.value}
                            title={c.label}
                            onClick={() => handleColorChange(c.value)}
                            style={{
                              width:        '22px',
                              height:       '22px',
                              borderRadius: '50%',
                              background:   c.value,
                              border:       selectedColor === c.value
                                ? '2px solid white'
                                : '1px solid transparent',
                              cursor:       'pointer',
                              transition:   'transform 0.1s',
                              boxShadow:    selectedColor === c.value
                                ? `0 0 0 2px ${c.value}`
                                : 'none',
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

                <div style={{
                  fontSize:   '0.7rem',
                  color:      'var(--text-muted)',
                  display:    'flex',
                  alignItems: 'center',
                  gap:        '4px',
                }}>
                  <Clock size={10} />
                  {formatTime(currentEntry.updated_at)}
                  <span style={{ opacity: 0.4 }}>·</span>
                  {wordCount} words
                </div>
              </div>

              {/* Right actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>

                {/* AI improve */}
                <button
                  onClick={handleGetSuggestions}
                  disabled={aiLoading}
                  style={{
                    display:     'flex',
                    alignItems:  'center',
                    gap:         '4px',
                    padding:     '4px 10px',
                    borderRadius:'8px',
                    border:      '1px solid var(--border)',
                    background:  showAiPanel ? 'rgba(99,102,241,0.1)' : 'var(--bg-tertiary)',
                    color:       showAiPanel ? 'var(--accent)' : 'var(--text-secondary)',
                    fontSize:    '0.75rem',
                    cursor:      aiLoading ? 'wait' : 'pointer',
                    fontFamily:  'inherit',
                    transition:  'all 0.15s',
                  }}
                >
                  {aiLoading
                    ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                    : <Wand2 size={12} />
                  }
                  Improve
                </button>

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
                    color:          currentEntry.is_favorite ? '#f472b6' : 'var(--text-muted)',
                    transition:     'all 0.15s',
                  }}
                >
                  <Heart size={15} fill={currentEntry.is_favorite ? '#f472b6' : 'none'} />
                </button>

                {/* Pin */}
                <button
                  onClick={() => togglePin(currentEntry.id)}
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
                    color:          currentEntry.is_pinned ? '#fbbf24' : 'var(--text-muted)',
                    transition:     'all 0.15s',
                  }}
                >
                  <Pin size={14} fill={currentEntry.is_pinned ? '#fbbf24' : 'none'} />
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
                  {saveStatus === 'saving'  && <Loader2   size={11} style={{ animation: 'spin 1s linear infinite' }} />}
                  {saveStatus === 'saved'   && <Check     size={11} />}
                  {saveStatus === 'unsaved' && <RefreshCw size={11} />}
                  <span>
                    {saveStatus === 'saving' ? 'Saving...'
                     : saveStatus === 'saved' ? 'Saved' : 'Unsaved'}
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

            {/* ── Toolbar ───────────────────────────────────────────────── */}
            <Toolbar editor={editorInstance} onInsertImage={handleInsertImage} />

            {/* ── AI Panel ─────────────────────────────────────────────── */}
            {showAiPanel && (
              <div style={{
                padding:      '0.75rem 1.25rem',
                background:   'rgba(99,102,241,0.06)',
                borderBottom: '1px solid rgba(99,102,241,0.15)',
                flexShrink:   0,
              }}>
                <div style={{
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: 'space-between',
                  marginBottom:   '0.5rem',
                }}>
                  <div style={{
                    display:    'flex',
                    alignItems: 'center',
                    gap:        '0.4rem',
                    fontSize:   '0.75rem',
                    fontWeight: 600,
                    color:      'var(--accent)',
                  }}>
                    <Sparkles size={12} />
                    AI Improvement Suggestions
                  </div>
                  <button
                    onClick={() => setShowAiPanel(false)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}
                  >
                    <X size={13} />
                  </button>
                </div>

                {aiLoading ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                    Analyzing your note...
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {aiSuggestions.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => handleApplySuggestion(s)}
                        style={{
                          display:    'flex',
                          alignItems: 'center',
                          gap:        '0.5rem',
                          padding:    '0.4rem 0.6rem',
                          borderRadius:'8px',
                          border:     '1px solid rgba(99,102,241,0.2)',
                          background: 'var(--bg-card)',
                          cursor:     'pointer',
                          fontSize:   '0.8rem',
                          color:      'var(--text-primary)',
                          fontFamily: 'inherit',
                          textAlign:  'left',
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLElement).style.background  = 'rgba(99,102,241,0.1)'
                          ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.4)'
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLElement).style.background  = 'var(--bg-card)'
                          ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.2)'
                        }}
                      >
                        <Plus size={11} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Tags Bar ──────────────────────────────────────────────── */}
            <div style={{
              display:     'flex',
              alignItems:  'center',
              gap:         '0.4rem',
              padding:     '0.5rem 1.5rem',
              borderBottom:'1px solid var(--border)',
              flexShrink:  0,
              flexWrap:    'wrap',
              background:  'var(--bg-secondary)',
            }}>
              <Tag size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />

              {/* Current tags */}
              {currentEntry.tags?.map(tag => (
                <div key={tag.id} style={{
                  display:      'flex',
                  alignItems:   'center',
                  gap:          '3px',
                  padding:      '2px 8px',
                  borderRadius: '999px',
                  background:   `${tag.color}18`,
                  border:       `1px solid ${tag.color}40`,
                  fontSize:     '0.72rem',
                  color:        tag.color,
                  fontWeight:   500,
                }}>
                  {tag.name}
                  <button
                    onClick={() => handleRemoveTag(tag.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', display: 'flex', padding: 0 }}
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}

              {/* Add tag */}
              {showTagInput ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <input
                    autoFocus
                    type="text"
                    value={newTagName}
                    onChange={e => setNewTagName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleAddTag()
                      if (e.key === 'Escape') { setShowTagInput(false); setNewTagName('') }
                    }}
                    placeholder="Tag name..."
                    className="selectable"
                    style={{
                      padding:      '2px 8px',
                      borderRadius: '999px',
                      border:       '1px solid var(--accent)',
                      background:   'transparent',
                      fontSize:     '0.72rem',
                      color:        'var(--text-primary)',
                      outline:      'none',
                      fontFamily:   'inherit',
                      width:        '90px',
                    }}
                  />
                  <button onClick={handleAddTag} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', display: 'flex' }}>
                    <Check size={12} />
                  </button>
                  <button onClick={() => { setShowTagInput(false); setNewTagName('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowTagInput(true)}
                  style={{
                    display:      'flex',
                    alignItems:   'center',
                    gap:          '3px',
                    padding:      '2px 8px',
                    borderRadius: '999px',
                    border:       '1px dashed var(--border)',
                    background:   'transparent',
                    fontSize:     '0.72rem',
                    color:        'var(--text-muted)',
                    cursor:       'pointer',
                    fontFamily:   'inherit',
                  }}
                >
                  <Plus size={10} />
                  Add tag
                </button>
              )}
            </div>

            {/* ── Title Input ───────────────────────────────────────────── */}
            <div style={{ padding: '1.5rem 2rem 0.5rem', flexShrink: 0 }}>
              <input
                ref={titleRef}
                value={title}
                onChange={e => handleTitleChange(e.target.value)}
                placeholder="Note title..."
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

            {/* ── Editor ────────────────────────────────────────────────── */}
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
                placeholder="Start writing your note..."
                onChange={handleEditorChange}
                onWordCount={(w, c) => setWordCount(w)}
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
          // ── No note selected ──────────────────────────────────────────
          <div style={{
            flex:            1,
            display:         'flex',
            flexDirection:   'column',
            alignItems:      'center',
            justifyContent:  'center',
            gap:             '1rem',
            color:           'var(--text-muted)',
          }}>
            <div style={{
              width:          '80px',
              height:         '80px',
              borderRadius:   '24px',
              background:     'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(96,165,250,0.15))',
              border:         '1px solid rgba(59,130,246,0.2)',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              fontSize:       '2.5rem',
            }}>
              📝
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontFamily:   "'Playfair Display', serif",
                fontSize:     '1.25rem',
                fontWeight:   700,
                color:        'var(--text-primary)',
                marginBottom: '0.4rem',
              }}>
                {entries.filter(e => e.type === 'note').length === 0
                  ? 'Create Your First Note'
                  : 'Select a Note'}
              </div>
              <div style={{ fontSize: '0.875rem', maxWidth: '260px', lineHeight: 1.6 }}>
                Capture ideas, thoughts, and information in rich formatted notes.
              </div>
            </div>

            <button
              onClick={handleNewNote}
              style={{
                marginTop:    '0.5rem',
                padding:      '0.6rem 1.5rem',
                borderRadius: '12px',
                border:       'none',
                cursor:       'pointer',
                background:   'linear-gradient(135deg, #3b82f6, #60a5fa)',
                color:        'white',
                fontSize:     '0.875rem',
                fontWeight:   600,
                fontFamily:   'inherit',
                display:      'flex',
                alignItems:   'center',
                gap:          '0.4rem',
                boxShadow:    '0 4px 16px rgba(59,130,246,0.35)',
              }}
            >
              <Plus size={15} />
              New Note
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}