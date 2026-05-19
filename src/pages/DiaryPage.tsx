import { useEffect, useRef, useState, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { useEntryStore, Entry } from '@store/useEntryStore'
import { useAppStore } from '@store/useAppStore'
import RichEditor, { RichEditorRef } from '@editor/RichEditor'
import { Editor } from '@tiptap/react'
import { toast } from '@components/ui/ToastNotification'
import Toolbar from '@editor/Toolbar'
import {
  Plus, BookOpen, Heart, Pin, Trash2,
  Smile, Wand2, Loader2, ChevronLeft,
  Calendar, Clock,
  RefreshCw, X, Check, Sparkles,
} from 'lucide-react'

// ─── Mood config ──────────────────────────────────────────────────────────────

const MOOD_CONFIG: Record<string, { emoji: string; color: string; label: string }> = {
  happy: { emoji: '😊', color: '#22c55e', label: 'Happy' },
  sad: { emoji: '😢', color: '#3b82f6', label: 'Sad' },
  angry: { emoji: '😠', color: '#ef4444', label: 'Angry' },
  anxious: { emoji: '😰', color: '#f97316', label: 'Anxious' },
  excited: { emoji: '🤩', color: '#a855f7', label: 'Excited' },
  calm: { emoji: '😌', color: '#06b6d4', label: 'Calm' },
  neutral: { emoji: '😐', color: '#6b7280', label: 'Neutral' },
  grateful: { emoji: '🙏', color: '#eab308', label: 'Grateful' },
  frustrated: { emoji: '😤', color: '#f97316', label: 'Frustrated' },
  hopeful: { emoji: '🌟', color: '#8b5cf6', label: 'Hopeful' },
  lonely: { emoji: '🥺', color: '#6366f1', label: 'Lonely' },
  confused: { emoji: '😕', color: '#94a3b8', label: 'Confused' },
}

// ─── DiaryPage ────────────────────────────────────────────────────────────────

export default function DiaryPage() {
  const {
    entries, currentEntry, isDirty, isSaving,
    loadEntries, loadEntry, createEntry,
    updateEntry, deleteEntry, toggleFavorite, togglePin,
    setCurrentEntry, scheduleAutoSave, saveNow, setDirty,
  } = useEntryStore()

  const { settings } = useAppStore()
  const location = useLocation()

  // ── Refs ───────────────────────────────────────────────────────────────────
  const editorRef = useRef<RichEditorRef>(null)
  const titleRef = useRef<HTMLInputElement>(null)

  // ── Local UI State ─────────────────────────────────────────────────────────
  const [title, setTitle] = useState('')
  const [showList, setShowList] = useState(true)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([])
  const [showAiPanel, setShowAiPanel] = useState(false)
  const [detectedMood, setDetectedMood] = useState<string | null>(null)
  const [moodLoading, setMoodLoading] = useState(false)
  const [wordCount, setWordCount] = useState(0)
  const [charCount, setCharCount] = useState(0)
  const [editorInstance, setEditorInstance] = useState<Editor | null>(null)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved')
  const [dailyPrompts, setDailyPrompts] = useState<string[]>([])
  const [showPrompts, setShowPrompts] = useState(false)

  // ── Load entries on mount ──────────────────────────────────────────────────
  useEffect(() => {
    loadEntries('diary')
  }, [])

  // ✅ Template se aane par auto-select
  useEffect(() => {
    const openId = (location.state as any)?.openEntryId
    if (!openId || entries.length === 0) return

    const entry = entries.find(e => e.id === openId)
    if (!entry) return

    // ✅ Pehle load karo, phir state clear karo
    loadEntry(entry.id).then(() => {
      setShowList(false)
      window.history.replaceState({}, '')
    })
  }, [entries, location.state])

  // ── Sync save status ───────────────────────────────────────────────────────
  useEffect(() => {
    if (isSaving) setSaveStatus('saving')
    else if (isDirty) setSaveStatus('unsaved')
    else setSaveStatus('saved')
  }, [isSaving, isDirty])

  // ── Load entry into editor when currentEntry changes ──────────────────────
  useEffect(() => {
    if (!currentEntry) return
    setTitle(currentEntry.title ?? '')
    setDetectedMood(currentEntry.mood ?? null)
    setWordCount(currentEntry.word_count ?? 0)
    setCharCount(currentEntry.char_count ?? 0)

    // Set editor content
    setTimeout(() => {
      if (editorRef.current && currentEntry.content) {
        editorRef.current.setContent(currentEntry.content)
      }
    }, 50)
  }, [currentEntry?.id])

  // ── Create new entry ───────────────────────────────────────────────────────
  const handleNewEntry = useCallback(async () => {
    const id = await createEntry({
      type: 'diary',
      title: '',
      content: '{"type":"doc","content":[{"type":"paragraph"}]}',
      entryDate: new Date().toISOString().split('T')[0],
    })
    if (id) {
      await loadEntry(id)
      setShowList(false)
      setTimeout(() => titleRef.current?.focus(), 100)
    }
  }, [createEntry, loadEntry])

  // ── Select entry ──────────────────────────────────────────────────────────
  const handleSelectEntry = useCallback(async (entry: Entry) => {
    // Save current if dirty
    if (isDirty && currentEntry) {
      await saveNow(currentEntry.id, {
        title,
        content: editorRef.current?.getJSON()
          ? JSON.stringify(editorRef.current.getJSON()) : undefined,
        contentPlain: editorRef.current?.getText(),
      })
    }
    await loadEntry(entry.id)
    setShowList(false)
    setAiSuggestions([])
    setShowAiPanel(false)
  }, [isDirty, currentEntry, title, saveNow, loadEntry])

  // ── Editor onChange ────────────────────────────────────────────────────────
  const handleEditorChange = useCallback((json: string, text: string) => {
    if (!currentEntry) return
    scheduleAutoSave(currentEntry.id, {
      title,
      content: json,
      contentPlain: text,
    })
  }, [currentEntry, title, scheduleAutoSave])

  // ── Title change ───────────────────────────────────────────────────────────
  const handleTitleChange = useCallback((val: string) => {
    setTitle(val)
    if (!currentEntry) return
    setDirty(true)
    scheduleAutoSave(currentEntry.id, {
      title: val,
      content: editorRef.current?.getJSON()
        ? JSON.stringify(editorRef.current.getJSON()) : undefined,
      contentPlain: editorRef.current?.getText(),
    })
  }, [currentEntry, scheduleAutoSave, setDirty])

  // ── Word count update ──────────────────────────────────────────────────────
  const handleWordCount = useCallback((words: number, chars: number) => {
    setWordCount(words)
    setCharCount(chars)
  }, [])

  // ── Manual save ───────────────────────────────────────────────────────────
  const handleManualSave = useCallback(async () => {
    if (!currentEntry) return
    try {
      await saveNow(currentEntry.id, {
        title,
        content: editorRef.current?.getJSON()
          ? JSON.stringify(editorRef.current.getJSON()) : undefined,
        contentPlain: editorRef.current?.getText(),
      })
      toast.success('Saved!', 'Entry saved successfully.')
    } catch {
      toast.error('Save failed', 'Could not save. Try again.')
    }
  }, [currentEntry, title, saveNow])

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



  // ── Detect mood ───────────────────────────────────────────────────────────
  const handleDetectMood = useCallback(async () => {
    const text = editorRef.current?.getText() ?? ''
    if (!text.trim() || text.length < 20) return

    setMoodLoading(true)
    try {
      const res = await window.electronAPI.ai.detectMood(text)
      if (res?.success && res.data) {
        const mood = res.data.mood
        setDetectedMood(mood)
        if (currentEntry) {
          await updateEntry(currentEntry.id, {
            mood,
            moodScore: res.data.score,
          })
        }
      }
    } catch (err) {
      console.error('Mood detection failed:', err)
    } finally {
      setMoodLoading(false)
    }
  }, [currentEntry, updateEntry])

  // ── AI Suggestions ────────────────────────────────────────────────────────
  const handleGetSuggestions = useCallback(async () => {
    const text = editorRef.current?.getText() ?? ''
    setAiLoading(true)
    setShowAiPanel(true)

    try {
      const res = await window.electronAPI.ai.suggestions(text, 'continuation')
      if (res?.success && res.data?.suggestions) {
        setAiSuggestions(res.data.suggestions)
      } else {
        setAiSuggestions([
          'What emotions did you experience today?',
          'What was the highlight of your day?',
          'Is there anything you wish had gone differently?',
        ])
      }
    } catch {
      setAiSuggestions([
        'What are you grateful for today?',
        'What challenged you and what did you learn?',
        'How are you feeling right now, and why?',
      ])
    } finally {
      setAiLoading(false)
    }
  }, [])

  // ── Apply suggestion ──────────────────────────────────────────────────────
  const handleApplySuggestion = useCallback((suggestion: string) => {
    if (!editorRef.current) return
    editorRef.current.focus()
    // Insert as new paragraph
    const editor = (editorRef.current as any)
    setShowAiPanel(false)
    // Append text to current content
    handleEditorChange(
      JSON.stringify({
        type: 'doc',
        content: [
          ...(editorRef.current.getJSON() as any).content ?? [],
          { type: 'paragraph', content: [{ type: 'text', text: suggestion }] },
        ],
      }),
      (editorRef.current.getText() ?? '') + '\n' + suggestion
    )
  }, [handleEditorChange])

  // ── Get daily prompts ─────────────────────────────────────────────────────
  const handleGetPrompts = useCallback(async () => {
    setShowPrompts(true)
    if (dailyPrompts.length > 0) return

    try {
      const res = await window.electronAPI.ai.dailyPrompts({
        mood: detectedMood ?? undefined,
        date: new Date().toLocaleDateString('en-US', {
          weekday: 'long', month: 'long', day: 'numeric',
        }),
      })
      if (res?.success && res.data) {
        setDailyPrompts(res.data)
      }
    } catch {
      setDailyPrompts([
        'What made you smile today?',
        'What are you looking forward to?',
        'Describe your mood in three words.',
        'What is one thing you learned today?',
        'What would make tomorrow even better?',
      ])
    }
  }, [detectedMood, dailyPrompts])

  // ── Insert image ──────────────────────────────────────────────────────────
  const handleInsertImage = useCallback(async () => {
    // Open file dialog
    const input = document.createElement('input')
    input.type = 'file'
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

  // ── Delete entry ──────────────────────────────────────────────────────────
  const handleDelete = useCallback(async () => {
    if (!currentEntry) return
    if (!window.confirm('Move this entry to trash?')) return
    await deleteEntry(currentEntry.id)
    setCurrentEntry(null)
    setShowList(true)
    await loadEntries('diary')
  }, [currentEntry, deleteEntry, setCurrentEntry, loadEntries])

  // ── Format date ───────────────────────────────────────────────────────────
  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
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

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{
      display: 'flex',
      height: '100%',
      overflow: 'hidden',
      background: 'var(--bg-primary)',
    }}>

      {/* ══════════════════════════════════════════════════════════════════
          LEFT PANEL — Entry List
      ══════════════════════════════════════════════════════════════════ */}
      <div style={{
        width: showList ? '280px' : '0px',
        minWidth: showList ? '280px' : '0px',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transition: 'width 0.25s ease, min-width 0.25s ease',
        background: 'var(--bg-secondary)',
      }}>

        {/* List header */}
        <div style={{
          padding: '1rem 1rem 0.75rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BookOpen size={16} style={{ color: '#f472b6' }} />
            <span style={{
              fontFamily: "'Playfair Display', serif",
              fontWeight: 700,
              fontSize: '1rem',
              color: 'var(--text-primary)',
            }}>
              Diary
            </span>
            <span style={{
              fontSize: '0.7rem',
              color: 'var(--text-muted)',
              background: 'var(--bg-tertiary)',
              borderRadius: '999px',
              padding: '1px 7px',
              border: '1px solid var(--border)',
            }}>
              {entries.filter(e => !e.is_deleted).length}
            </span>
          </div>

          {/* New entry button */}
          <button
            onClick={handleNewEntry}
            title="New diary entry"
            style={{
              width: '30px',
              height: '30px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              background: 'linear-gradient(135deg, #6366f1, #a78bfa)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(99,102,241,0.35)',
              transition: 'transform 0.15s, box-shadow 0.15s',
              flexShrink: 0,
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.transform = 'scale(1.08)'
                ; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(99,102,241,0.5)'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.transform = 'scale(1)'
                ; (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(99,102,241,0.35)'
            }}
          >
            <Plus size={15} />
          </button>
        </div>

        {/* Entry list */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '0.5rem',
        }}>
          {entries.length === 0 ? (
            // Empty state
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '3rem 1rem',
              gap: '0.75rem',
              color: 'var(--text-muted)',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '2.5rem' }}>📔</div>
              <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                No entries yet
              </div>
              <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                Click + to write your first diary entry
              </div>
              <button
                onClick={handleNewEntry}
                style={{
                  marginTop: '0.5rem',
                  padding: '0.5rem 1.25rem',
                  borderRadius: '10px',
                  border: 'none',
                  cursor: 'pointer',
                  background: 'linear-gradient(135deg, #6366f1, #a78bfa)',
                  color: 'white',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  fontFamily: 'inherit',
                }}
              >
                Start Writing
              </button>
            </div>
          ) : (
            entries
              .filter(e => !e.is_deleted)
              .map(entry => {
                const isSelected = currentEntry?.id === entry.id
                const mood = entry.mood ? MOOD_CONFIG[entry.mood] : null

                return (
                  <div
                    key={entry.id}
                    onClick={() => handleSelectEntry(entry)}
                    style={{
                      padding: '0.75rem',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      marginBottom: '3px',
                      background: isSelected
                        ? 'rgba(99,102,241,0.12)'
                        : 'transparent',
                      border: `1px solid ${isSelected ? 'rgba(99,102,241,0.25)' : 'transparent'}`,
                      transition: 'all 0.15s',
                      position: 'relative',
                    }}
                    onMouseEnter={e => {
                      if (!isSelected) {
                        (e.currentTarget as HTMLElement).style.background = 'var(--bg-tertiary)'
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isSelected) {
                        (e.currentTarget as HTMLElement).style.background = 'transparent'
                      }
                    }}
                  >
                    {/* Entry date + mood */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '0.3rem',
                    }}>
                      <span style={{
                        fontSize: '0.68rem',
                        color: 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                      }}>
                        <Calendar size={10} />
                        {entry.entry_date}
                      </span>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {entry.is_pinned ? <Pin size={10} style={{ color: '#fbbf24' }} /> : null}
                        {entry.is_favorite ? <Heart size={10} style={{ color: '#f472b6', fill: '#f472b6' }} /> : null}
                        {mood ? (
                          <span
                            title={mood.label}
                            style={{ fontSize: '0.75rem' }}
                          >
                            {mood.emoji}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {/* Title */}
                    <div style={{
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      color: isSelected ? 'var(--accent)' : 'var(--text-primary)',
                      marginBottom: '0.25rem',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {entry.title?.trim() || 'Untitled Entry'}
                    </div>

                    {/* Preview */}
                    <div style={{
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                      overflow: 'hidden',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      lineHeight: 1.5,
                    }}>
                      {entry.content_plain?.slice(0, 80) || 'No content yet...'}
                    </div>

                    {/* Word count */}
                    {entry.word_count > 0 && (
                      <div style={{
                        marginTop: '0.4rem',
                        fontSize: '0.65rem',
                        color: 'var(--text-muted)',
                        display: 'flex',
                        gap: '0.5rem',
                      }}>
                        <span>{entry.word_count} words</span>
                        <span>·</span>
                        <span>{entry.read_time ?? 1} min read</span>
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
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
        minWidth: 0,
      }}>

        {currentEntry ? (
          <>
            {/* ── Editor Top Bar ────────────────────────────────────────── */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.5rem 1rem',
              borderBottom: '1px solid var(--border)',
              background: 'var(--bg-secondary)',
              flexShrink: 0,
              gap: '0.5rem',
              flexWrap: 'wrap',
            }}>
              {/* Left: toggle list + date */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button
                  onClick={() => setShowList(v => !v)}
                  title={showList ? 'Hide list' : 'Show list'}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '7px',
                    border: 'none',
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <ChevronLeft
                    size={14}
                    style={{
                      transform: showList ? 'rotate(0deg)' : 'rotate(180deg)',
                      transition: 'transform 0.2s',
                    }}
                  />
                </button>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{
                    fontSize: '0.72rem',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}>
                    <Calendar size={10} />
                    {formatDate(currentEntry.entry_date)}
                    <span style={{ opacity: 0.5 }}>·</span>
                    <Clock size={10} />
                    {formatTime(currentEntry.updated_at)}
                  </div>
                </div>
              </div>

              {/* Right: mood + actions */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                flexWrap: 'wrap',
              }}>

                {/* Detected mood badge */}
                {detectedMood && MOOD_CONFIG[detectedMood] && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 10px',
                    borderRadius: '999px',
                    background: `${MOOD_CONFIG[detectedMood].color}18`,
                    border: `1px solid ${MOOD_CONFIG[detectedMood].color}40`,
                    fontSize: '0.75rem',
                    color: MOOD_CONFIG[detectedMood].color,
                    fontWeight: 500,
                  }}>
                    <span>{MOOD_CONFIG[detectedMood].emoji}</span>
                    <span>{MOOD_CONFIG[detectedMood].label}</span>
                  </div>
                )}

                {/* Detect mood */}
                <button
                  onClick={handleDetectMood}
                  disabled={moodLoading}
                  title="Detect mood with AI"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 10px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-secondary)',
                    fontSize: '0.75rem',
                    cursor: moodLoading ? 'wait' : 'pointer',
                    fontFamily: 'inherit',
                    transition: 'all 0.15s',
                    flexShrink: 0,
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'
                      ; (e.currentTarget as HTMLElement).style.color = 'var(--accent)'
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'
                      ; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'
                  }}
                >
                  {moodLoading
                    ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                    : <Smile size={12} />
                  }
                  Mood
                </button>

                {/* AI Suggestions */}
                <button
                  onClick={handleGetSuggestions}
                  disabled={aiLoading}
                  title="Get AI writing suggestions"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 10px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: showAiPanel ? 'rgba(99,102,241,0.12)' : 'var(--bg-tertiary)',
                    color: showAiPanel ? 'var(--accent)' : 'var(--text-secondary)',
                    borderColor: showAiPanel ? 'rgba(99,102,241,0.35)' : 'var(--border)',
                    fontSize: '0.75rem',
                    cursor: aiLoading ? 'wait' : 'pointer',
                    fontFamily: 'inherit',
                    transition: 'all 0.15s',
                    flexShrink: 0,
                  }}
                >
                  {aiLoading
                    ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                    : <Wand2 size={12} />
                  }
                  AI
                </button>

                {/* Daily prompts */}
                <button
                  onClick={handleGetPrompts}
                  title="Daily writing prompts"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 10px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: showPrompts ? 'rgba(99,102,241,0.12)' : 'var(--bg-tertiary)',
                    color: showPrompts ? 'var(--accent)' : 'var(--text-secondary)',
                    borderColor: showPrompts ? 'rgba(99,102,241,0.35)' : 'var(--border)',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    transition: 'all 0.15s',
                    flexShrink: 0,
                  }}
                >
                  <Sparkles size={12} />
                  Prompts
                </button>

                {/* Favorite */}
                <button
                  onClick={() => toggleFavorite(currentEntry.id)}
                  title={currentEntry.is_favorite ? 'Unfavorite' : 'Add to favorites'}
                  style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: currentEntry.is_favorite ? '#f472b6' : 'var(--text-muted)',
                    flexShrink: 0,
                    transition: 'all 0.15s',
                  }}
                >
                  <Heart
                    size={15}
                    fill={currentEntry.is_favorite ? '#f472b6' : 'none'}
                  />
                </button>

                {/* Save status */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.7rem',
                  color: saveStatus === 'unsaved'
                    ? '#f97316'
                    : saveStatus === 'saving'
                      ? 'var(--accent)'
                      : 'var(--text-muted)',
                  flexShrink: 0,
                  minWidth: '52px',
                }}>
                  {saveStatus === 'saving' && (
                    <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} />
                  )}
                  {saveStatus === 'saved' && <Check size={11} />}
                  {saveStatus === 'unsaved' && <RefreshCw size={11} />}
                  <span>
                    {saveStatus === 'saving' ? 'Saving...'
                      : saveStatus === 'saved' ? 'Saved'
                        : 'Unsaved'}
                  </span>
                </div>

                {/* Delete */}
                <button
                  onClick={handleDelete}
                  title="Move to trash"
                  style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-muted)',
                    flexShrink: 0,
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.color = '#ef4444'
                      ; (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.1)'
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'
                      ; (e.currentTarget as HTMLElement).style.background = 'transparent'
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {/* ── Toolbar ───────────────────────────────────────────────── */}
            <Toolbar
              editor={editorInstance}
              onInsertImage={handleInsertImage}
            />

            {/* ── AI Suggestions Panel ──────────────────────────────────── */}
            {showAiPanel && (
              <div style={{
                padding: '0.75rem 1.25rem',
                background: 'rgba(99,102,241,0.06)',
                borderBottom: '1px solid rgba(99,102,241,0.15)',
                flexShrink: 0,
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '0.5rem',
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: 'var(--accent)',
                  }}>
                    <Wand2 size={12} />
                    AI Suggestions
                  </div>
                  <button
                    onClick={() => setShowAiPanel(false)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      padding: '2px',
                    }}
                  >
                    <X size={13} />
                  </button>
                </div>

                {aiLoading ? (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    color: 'var(--text-muted)',
                    fontSize: '0.8rem',
                  }}>
                    <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                    Generating suggestions...
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {aiSuggestions.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => handleApplySuggestion(s)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.4rem 0.6rem',
                          borderRadius: '8px',
                          border: '1px solid rgba(99,102,241,0.2)',
                          background: 'var(--bg-card)',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          color: 'var(--text-primary)',
                          fontFamily: 'inherit',
                          textAlign: 'left',
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.1)'
                            ; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.4)'
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLElement).style.background = 'var(--bg-card)'
                            ; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.2)'
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

            {/* ── Daily Prompts Panel ───────────────────────────────────── */}
            {showPrompts && (
              <div style={{
                padding: '0.75rem 1.25rem',
                background: 'rgba(251,191,36,0.05)',
                borderBottom: '1px solid rgba(251,191,36,0.15)',
                flexShrink: 0,
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '0.5rem',
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: '#d97706',
                  }}>
                    <Sparkles size={12} />
                    Daily Writing Prompts
                  </div>
                  <button
                    onClick={() => setShowPrompts(false)}
                    style={{
                      background: 'none', border: 'none',
                      cursor: 'pointer', color: 'var(--text-muted)',
                      display: 'flex', padding: '2px',
                    }}
                  >
                    <X size={13} />
                  </button>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: '5px',
                }}>
                  {(dailyPrompts.length ? dailyPrompts : [
                    'What made you smile today?',
                    'What are you looking forward to?',
                    'Describe your mood in three words.',
                  ]).map((p, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        editorRef.current?.focus()
                        handleApplySuggestion(p)
                        setShowPrompts(false)
                      }}
                      style={{
                        padding: '0.4rem 0.6rem',
                        borderRadius: '8px',
                        border: '1px solid rgba(251,191,36,0.2)',
                        background: 'var(--bg-card)',
                        cursor: 'pointer',
                        fontSize: '0.78rem',
                        color: 'var(--text-primary)',
                        fontFamily: 'inherit',
                        textAlign: 'left',
                        transition: 'all 0.15s',
                        lineHeight: 1.4,
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.background = 'rgba(251,191,36,0.08)'
                          ; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(251,191,36,0.4)'
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.background = 'var(--bg-card)'
                          ; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(251,191,36,0.2)'
                      }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Title Input ───────────────────────────────────────────── */}
            <div style={{
              padding: '1.5rem 2rem 0.5rem',
              flexShrink: 0,
            }}>
              <input
                ref={titleRef}
                value={title}
                onChange={e => handleTitleChange(e.target.value)}
                placeholder="Entry title..."
                className="selectable"
                style={{
                  width: '100%',
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  fontFamily: "'Playfair Display', serif",
                  fontSize: '1.75rem',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  lineHeight: 1.3,
                }}
              />
            </div>

            {/* ── Main Editor ───────────────────────────────────────────── */}
            <div style={{
              flex: 1,
              overflow: 'hidden',
              padding: '0.5rem 2rem 1rem',
              display: 'flex',
              flexDirection: 'column',
            }}>
              <RichEditor
                ref={editorRef}
                initialContent={currentEntry.content}
                placeholder="What's on your mind today? Write freely..."
                onChange={handleEditorChange}
                onWordCount={handleWordCount}
                onEditorReady={(ed) => setEditorInstance(ed)}
                autoFocus={false}
                minHeight="100%"
                fontSize={settings.fontSize ?? 'md'}
                fontFamily={settings.fontFamily ?? 'serif'}
                showWordCount={true}
              />
            </div>
          </>
        ) : (
          // ── No entry selected ─────────────────────────────────────────
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            color: 'var(--text-muted)',
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '24px',
              background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(167,139,250,0.15))',
              border: '1px solid rgba(99,102,241,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2.5rem',
            }}>
              📔
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: '1.25rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                marginBottom: '0.4rem',
              }}>
                {entries.length === 0
                  ? 'Begin Your Journey'
                  : 'Select an Entry'}
              </div>
              <div style={{ fontSize: '0.875rem', maxWidth: '260px', lineHeight: 1.6 }}>
                {entries.length === 0
                  ? 'Your diary is empty. Write your first entry and start your story.'
                  : 'Choose an entry from the list, or create a new one.'}
              </div>
            </div>

            <button
              onClick={handleNewEntry}
              style={{
                marginTop: '0.5rem',
                padding: '0.6rem 1.5rem',
                borderRadius: '12px',
                border: 'none',
                cursor: 'pointer',
                background: 'linear-gradient(135deg, #6366f1, #a78bfa)',
                color: 'white',
                fontSize: '0.875rem',
                fontWeight: 600,
                fontFamily: 'inherit',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: '0 4px 16px rgba(99,102,241,0.35)',
                transition: 'transform 0.15s, box-shadow 0.15s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'
                  ; (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 20px rgba(99,102,241,0.5)'
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
                  ; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(99,102,241,0.35)'
              }}
            >
              <Plus size={15} />
              New Diary Entry
            </button>
          </div>
        )}
      </div>

      {/* Spin keyframe */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg);   }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}