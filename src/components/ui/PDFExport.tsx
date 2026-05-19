import { useState, useCallback, useRef } from 'react'
import {
    FileText, Download, X, Check,
    BookOpen, FileTextIcon, Lightbulb,
    CheckSquare, Calendar, Filter,
    Loader2, Eye, Palette, ChevronDown,
    Settings2, FileDown, AlertCircle,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type ExportType = 'single' | 'multiple' | 'dateRange'
type EntryType = 'diary' | 'note' | 'idea' | 'task'
type PDFTheme = 'light' | 'dark' | 'sepia' | 'minimal'
type PDFFontSize = 'small' | 'medium' | 'large'
type PDFLayout = 'single' | 'compact'

interface Entry {
    id: string
    type: EntryType
    title: string
    content_plain: string
    content: string
    entry_date: string
    created_at: string
    updated_at: string
    mood: string | null
    word_count: number
    is_favorite: number
}

interface PDFOptions {
    theme: PDFTheme
    fontSize: PDFFontSize
    layout: PDFLayout
    includeDate: boolean
    includeType: boolean
    includeMood: boolean
    includeWords: boolean
    includePageNum: boolean
    coverPage: boolean
    title: string
    author: string
}

interface PDFExportProps {
    open: boolean
    onClose: () => void
    singleEntry?: Entry   // if exporting just one
}

// ─── Configs ──────────────────────────────────────────────────────────────────

const THEME_CONFIG: Record<PDFTheme, {
    bg: string
    text: string
    muted: string
    border: string
    accent: string
    heading: string
}> = {
    light: {
        bg: '#ffffff',
        text: '#1a1a2e',
        muted: '#64748b',
        border: '#e2e8f0',
        accent: '#6366f1',
        heading: '#0f0f1a',
    },
    dark: {
        bg: '#0f0f1a',
        text: '#e2e8f0',
        muted: '#94a3b8',
        border: '#1e1e35',
        accent: '#818cf8',
        heading: '#f8fafc',
    },
    sepia: {
        bg: '#fdf6e3',
        text: '#4a3728',
        muted: '#7c6249',
        border: '#d4c4a0',
        accent: '#8b6914',
        heading: '#2c1810',
    },
    minimal: {
        bg: '#fafafa',
        text: '#111111',
        muted: '#555555',
        border: '#dddddd',
        accent: '#111111',
        heading: '#000000',
    },
}

const TYPE_CONFIG: Record<EntryType, { icon: string; color: string; label: string }> = {
    diary: { icon: '📔', color: '#f472b6', label: 'Diary' },
    note: { icon: '📝', color: '#60a5fa', label: 'Note' },
    idea: { icon: '💡', color: '#fbbf24', label: 'Idea' },
    task: { icon: '✅', color: '#34d399', label: 'Task' },
}

const MOOD_EMOJI: Record<string, string> = {
    happy: '😊', sad: '😢', angry: '😠', anxious: '😰',
    excited: '🤩', calm: '😌', neutral: '😐', grateful: '🙏',
    frustrated: '😤', hopeful: '🌟', lonely: '🥺', confused: '😕',
}

// ─── PDFExport Component ──────────────────────────────────────────────────────

export default function PDFExport({ open, onClose, singleEntry }: PDFExportProps) {

    // ── State ──────────────────────────────────────────────────────────────────
    const [exportType, setExportType] = useState<ExportType>(singleEntry ? 'single' : 'multiple')
    const [selectedTypes, setSelectedTypes] = useState<EntryType[]>(['diary', 'note', 'idea', 'task'])
    const [dateFrom, setDateFrom] = useState(() => {
        const d = new Date()
        d.setMonth(d.getMonth() - 1)
        return d.toISOString().split('T')[0]
    })
    const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0])
    const [options, setOptions] = useState<PDFOptions>({
        theme: 'light',
        fontSize: 'medium',
        layout: 'single',
        includeDate: true,
        includeType: true,
        includeMood: true,
        includeWords: true,
        includePageNum: true,
        coverPage: true,
        title: 'Soul Diary — My Journal',
        author: 'Soul Diary',
    })
    const [isGenerating, setIsGenerating] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [previewEntries, setPreviewEntries] = useState<Entry[]>([])
    const [loadingPreview, setLoadingPreview] = useState(false)
    const [showOptions, setShowOptions] = useState(false)

    // ── Update option ──────────────────────────────────────────────────────────
    const setOpt = <K extends keyof PDFOptions>(key: K, val: PDFOptions[K]) =>
        setOptions(prev => ({ ...prev, [key]: val }))

    // ── Load preview entries ───────────────────────────────────────────────────
    const loadPreview = useCallback(async () => {
        if (singleEntry) {
            setPreviewEntries([singleEntry])
            return
        }
        setLoadingPreview(true)
        try {
            let sql = `
        SELECT id, type, title, content_plain, content,
               entry_date, created_at, updated_at,
               mood, word_count, is_favorite
        FROM entries
        WHERE is_deleted = 0
      `
            const params: unknown[] = []

            if (exportType === 'multiple') {
                const placeholders = selectedTypes.map(() => '?').join(',')
                sql += ` AND type IN (${placeholders})`
                params.push(...selectedTypes)
            } else if (exportType === 'dateRange') {
                sql += ` AND COALESCE(entry_date, date(created_at)) BETWEEN ? AND ?`
                params.push(dateFrom, dateTo)
                const placeholders = selectedTypes.map(() => '?').join(',')
                sql += ` AND type IN (${placeholders})`
                params.push(...selectedTypes)
            }

            sql += ` ORDER BY COALESCE(entry_date, created_at) DESC LIMIT 200`

            const rows = await window.electronAPI.db.all(sql, params) as Entry[]
            setPreviewEntries(rows ?? [])
        } catch (err) {
            console.error('Preview load error:', err)
        } finally {
            setLoadingPreview(false)
        }
    }, [singleEntry, exportType, selectedTypes, dateFrom, dateTo])

    // ── Generate PDF ───────────────────────────────────────────────────────────
    const generatePDF = useCallback(async () => {
        setIsGenerating(true)
        setError(null)

        try {
            const entries = singleEntry ? [singleEntry] : previewEntries
            if (entries.length === 0) {
                setError('No entries to export.')
                setIsGenerating(false)
                return
            }

            // Build HTML
            const html = buildPDFHTML(entries, options)

            // ✅ Electron PDF export
            const result = await window.electronAPI.pdf.export(html, {
                title: options.title,
            })

            if (!result.success) {
                if (result.canceled) {
                    setIsGenerating(false)
                    return
                }
                throw new Error(result.error ?? 'Export failed')
            }

            if (result.filePath) {
                await window.electronAPI.pdf.open(result.filePath)
            }

            setIsSuccess(true)
            setTimeout(() => setIsSuccess(false), 3000)

        } catch (err: any) {
            setError(err?.message ?? 'Export failed. Try again.')
        } finally {
            setIsGenerating(false)
        }
    }, [singleEntry, previewEntries, options])

    if (!open) return null

    // ── Render ─────────────────────────────────────────────────────────────────

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={onClose}
                style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.5)',
                    backdropFilter: 'blur(6px)',
                    zIndex: 1000,
                    animation: 'fadeIn 0.2s ease',
                }}
            />

            {/* Modal */}
            <div style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%,-50%)',
                width: 'min(640px, 92vw)',
                maxHeight: '88vh',
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '18px',
                zIndex: 1001,
                boxShadow: '0 24px 80px rgba(0,0,0,0.4)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                animation: 'scaleIn 0.2s ease',
            }}>

                {/* Header */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '1.25rem 1.5rem',
                    borderBottom: '1px solid var(--border)',
                    flexShrink: 0,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '10px',
                            background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(167,139,250,0.2))',
                            border: '1px solid rgba(99,102,241,0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            <FileDown size={17} style={{ color: 'var(--accent)' }} />
                        </div>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
                                Export to PDF
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                {singleEntry
                                    ? `Exporting: "${singleEntry.title || 'Untitled'}"`
                                    : 'Choose entries to export'
                                }
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        style={{
                            width: '30px',
                            height: '30px',
                            borderRadius: '8px',
                            border: 'none',
                            background: 'transparent',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Body */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem' }}>

                    {/* ── Export scope ────────────────────────────────────────────── */}
                    {!singleEntry && (
                        <div style={{ marginBottom: '1.25rem' }}>
                            <div style={{
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                color: 'var(--text-muted)',
                                letterSpacing: '0.08em',
                                textTransform: 'uppercase',
                                marginBottom: '0.5rem',
                            }}>
                                What to Export
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {([
                                    { id: 'multiple', label: 'All selected types', icon: <FileText size={14} /> },
                                    { id: 'dateRange', label: 'Date range', icon: <Calendar size={14} /> },
                                ] as const).map(opt => (
                                    <label
                                        key={opt.id}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.75rem',
                                            padding: '0.75rem',
                                            borderRadius: '10px',
                                            border: `1px solid ${exportType === opt.id ? 'var(--accent)' : 'var(--border)'}`,
                                            background: exportType === opt.id ? 'rgba(99,102,241,0.07)' : 'transparent',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s',
                                        }}
                                    >
                                        <input
                                            type="radio"
                                            name="exportType"
                                            value={opt.id}
                                            checked={exportType === opt.id}
                                            onChange={() => setExportType(opt.id)}
                                            style={{ accentColor: 'var(--accent)' }}
                                        />
                                        <span style={{ color: 'var(--accent)' }}>{opt.icon}</span>
                                        <span style={{
                                            fontSize: '0.875rem',
                                            fontWeight: exportType === opt.id ? 600 : 400,
                                            color: 'var(--text-primary)',
                                        }}>
                                            {opt.label}
                                        </span>
                                    </label>
                                ))}
                            </div>

                            {/* Date range inputs */}
                            {exportType === 'dateRange' && (
                                <div style={{
                                    display: 'flex',
                                    gap: '0.75rem',
                                    marginTop: '0.75rem',
                                    alignItems: 'center',
                                }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 500, marginBottom: '0.25rem' }}>From</div>
                                        <input
                                            type="date"
                                            value={dateFrom}
                                            onChange={e => setDateFrom(e.target.value)}
                                            style={{
                                                width: '100%',
                                                padding: '0.45rem 0.6rem',
                                                borderRadius: '8px',
                                                border: '1px solid var(--border)',
                                                background: 'var(--bg-tertiary)',
                                                color: 'var(--text-primary)',
                                                fontSize: '0.82rem',
                                                fontFamily: 'inherit',
                                                outline: 'none',
                                                boxSizing: 'border-box',
                                            }}
                                        />
                                    </div>
                                    <div style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>→</div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 500, marginBottom: '0.25rem' }}>To</div>
                                        <input
                                            type="date"
                                            value={dateTo}
                                            onChange={e => setDateTo(e.target.value)}
                                            style={{
                                                width: '100%',
                                                padding: '0.45rem 0.6rem',
                                                borderRadius: '8px',
                                                border: '1px solid var(--border)',
                                                background: 'var(--bg-tertiary)',
                                                color: 'var(--text-primary)',
                                                fontSize: '0.82rem',
                                                fontFamily: 'inherit',
                                                outline: 'none',
                                                boxSizing: 'border-box',
                                            }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Type filter */}
                            <div style={{ marginTop: '0.875rem' }}>
                                <div style={{
                                    fontSize: '0.72rem',
                                    fontWeight: 600,
                                    color: 'var(--text-muted)',
                                    letterSpacing: '0.08em',
                                    textTransform: 'uppercase',
                                    marginBottom: '0.4rem',
                                }}>
                                    Entry Types
                                </div>
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                    {(['diary', 'note', 'idea', 'task'] as EntryType[]).map(type => {
                                        const cfg = TYPE_CONFIG[type]
                                        const active = selectedTypes.includes(type)
                                        return (
                                            <button
                                                key={type}
                                                onClick={() => setSelectedTypes(prev =>
                                                    active ? prev.filter(t => t !== type) : [...prev, type]
                                                )}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    padding: '0.3rem 0.75rem',
                                                    borderRadius: '999px',
                                                    border: `1px solid ${active ? cfg.color : 'var(--border)'}`,
                                                    background: active ? `${cfg.color}15` : 'transparent',
                                                    color: active ? cfg.color : 'var(--text-muted)',
                                                    fontSize: '0.78rem',
                                                    fontWeight: active ? 600 : 400,
                                                    cursor: 'pointer',
                                                    fontFamily: 'inherit',
                                                    transition: 'all 0.15s',
                                                }}
                                            >
                                                {cfg.icon} {cfg.label}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Document Options ─────────────────────────────────────────── */}
                    <div style={{ marginBottom: '1.25rem' }}>
                        <button
                            onClick={() => setShowOptions(v => !v)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                width: '100%',
                                padding: '0.6rem 0.875rem',
                                borderRadius: '10px',
                                border: '1px solid var(--border)',
                                background: showOptions ? 'var(--bg-secondary)' : 'transparent',
                                color: 'var(--text-primary)',
                                cursor: 'pointer',
                                fontFamily: 'inherit',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Settings2 size={14} style={{ color: 'var(--accent)' }} />
                                Document Options
                            </div>
                            <ChevronDown
                                size={14}
                                style={{
                                    transform: showOptions ? 'rotate(0deg)' : 'rotate(-90deg)',
                                    transition: 'transform 0.2s',
                                    color: 'var(--text-muted)',
                                }}
                            />
                        </button>

                        {showOptions && (
                            <div style={{
                                padding: '1rem',
                                borderRadius: '10px',
                                border: '1px solid var(--border)',
                                background: 'var(--bg-secondary)',
                                marginTop: '4px',
                            }}>
                                {/* Title + Author */}
                                <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '0.875rem' }}>
                                    <div style={{ flex: 2 }}>
                                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 500, marginBottom: '0.25rem' }}>
                                            Document Title
                                        </div>
                                        <input
                                            type="text"
                                            value={options.title}
                                            onChange={e => setOpt('title', e.target.value)}
                                            className="selectable"
                                            style={{
                                                width: '100%',
                                                padding: '0.4rem 0.6rem',
                                                borderRadius: '8px',
                                                border: '1px solid var(--border)',
                                                background: 'var(--bg-tertiary)',
                                                color: 'var(--text-primary)',
                                                fontSize: '0.8rem',
                                                fontFamily: 'inherit',
                                                outline: 'none',
                                                boxSizing: 'border-box',
                                            }}
                                        />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 500, marginBottom: '0.25rem' }}>
                                            Author
                                        </div>
                                        <input
                                            type="text"
                                            value={options.author}
                                            onChange={e => setOpt('author', e.target.value)}
                                            className="selectable"
                                            style={{
                                                width: '100%',
                                                padding: '0.4rem 0.6rem',
                                                borderRadius: '8px',
                                                border: '1px solid var(--border)',
                                                background: 'var(--bg-tertiary)',
                                                color: 'var(--text-primary)',
                                                fontSize: '0.8rem',
                                                fontFamily: 'inherit',
                                                outline: 'none',
                                                boxSizing: 'border-box',
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* Theme */}
                                <div style={{ marginBottom: '0.875rem' }}>
                                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 500, marginBottom: '0.35rem' }}>
                                        PDF Theme
                                    </div>
                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                        {([
                                            { id: 'light', label: '☀️ Light', preview: '#ffffff' },
                                            { id: 'dark', label: '🌙 Dark', preview: '#0f0f1a' },
                                            { id: 'sepia', label: '📜 Sepia', preview: '#fdf6e3' },
                                            { id: 'minimal', label: '⬜ Minimal', preview: '#fafafa' },
                                        ] as const).map(t => (
                                            <button
                                                key={t.id}
                                                onClick={() => setOpt('theme', t.id)}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '5px',
                                                    padding: '0.3rem 0.65rem',
                                                    borderRadius: '8px',
                                                    border: `1px solid ${options.theme === t.id ? 'var(--accent)' : 'var(--border)'}`,
                                                    background: options.theme === t.id ? 'rgba(99,102,241,0.1)' : 'transparent',
                                                    color: options.theme === t.id ? 'var(--accent)' : 'var(--text-secondary)',
                                                    fontSize: '0.75rem',
                                                    fontWeight: options.theme === t.id ? 600 : 400,
                                                    cursor: 'pointer',
                                                    fontFamily: 'inherit',
                                                    transition: 'all 0.15s',
                                                }}
                                            >
                                                <div style={{
                                                    width: '14px',
                                                    height: '14px',
                                                    borderRadius: '3px',
                                                    background: t.preview,
                                                    border: '1px solid rgba(0,0,0,0.15)',
                                                    flexShrink: 0,
                                                }} />
                                                {t.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Font size */}
                                <div style={{ marginBottom: '0.875rem' }}>
                                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 500, marginBottom: '0.35rem' }}>
                                        Font Size
                                    </div>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        {(['small', 'medium', 'large'] as const).map(s => (
                                            <button
                                                key={s}
                                                onClick={() => setOpt('fontSize', s)}
                                                style={{
                                                    flex: 1,
                                                    padding: '0.3rem',
                                                    borderRadius: '8px',
                                                    border: `1px solid ${options.fontSize === s ? 'var(--accent)' : 'var(--border)'}`,
                                                    background: options.fontSize === s ? 'rgba(99,102,241,0.1)' : 'transparent',
                                                    color: options.fontSize === s ? 'var(--accent)' : 'var(--text-secondary)',
                                                    fontSize: '0.75rem',
                                                    fontWeight: options.fontSize === s ? 600 : 400,
                                                    cursor: 'pointer',
                                                    fontFamily: 'inherit',
                                                    textTransform: 'capitalize',
                                                    transition: 'all 0.15s',
                                                }}
                                            >
                                                {s === 'small' ? 'Aa' : s === 'medium' ? 'AA' : 'A A'}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Toggles */}
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr',
                                    gap: '6px',
                                }}>
                                    {[
                                        { key: 'coverPage', label: 'Cover page' },
                                        { key: 'includeDate', label: 'Show dates' },
                                        { key: 'includeType', label: 'Show type badge' },
                                        { key: 'includeMood', label: 'Show mood' },
                                        { key: 'includeWords', label: 'Word count' },
                                        { key: 'includePageNum', label: 'Page numbers' },
                                    ].map(item => {
                                        const val = options[item.key as keyof PDFOptions] as boolean
                                        return (
                                            <label
                                                key={item.key}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.5rem',
                                                    padding: '0.35rem 0.6rem',
                                                    borderRadius: '7px',
                                                    cursor: 'pointer',
                                                    fontSize: '0.78rem',
                                                    color: 'var(--text-secondary)',
                                                    userSelect: 'none',
                                                }}
                                                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-tertiary)'}
                                                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                                            >
                                                <div
                                                    onClick={() => setOpt(item.key as keyof PDFOptions, !val as any)}
                                                    style={{
                                                        width: '32px',
                                                        height: '18px',
                                                        borderRadius: '9px',
                                                        background: val ? 'var(--accent)' : 'var(--bg-tertiary)',
                                                        border: '1px solid var(--border)',
                                                        position: 'relative',
                                                        flexShrink: 0,
                                                        transition: 'background 0.2s',
                                                        cursor: 'pointer',
                                                    }}
                                                >
                                                    <div style={{
                                                        position: 'absolute',
                                                        top: '2px',
                                                        left: val ? '15px' : '2px',
                                                        width: '12px',
                                                        height: '12px',
                                                        borderRadius: '50%',
                                                        background: 'white',
                                                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                                                        transition: 'left 0.2s',
                                                    }} />
                                                </div>
                                                {item.label}
                                            </label>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── Preview count ────────────────────────────────────────────── */}
                    {!singleEntry && (
                        <div style={{
                            padding: '0.75rem',
                            borderRadius: '10px',
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border)',
                            marginBottom: '1rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '0.5rem',
                        }}>
                            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                                {loadingPreview ? (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                                        Loading...
                                    </span>
                                ) : previewEntries.length > 0 ? (
                                    <span>
                                        <strong style={{ color: 'var(--accent)' }}>{previewEntries.length}</strong> entries will be exported
                                        {previewEntries.length > 0 && (
                                            <span style={{ color: 'var(--text-muted)' }}>
                                                {' '}· ~{Math.ceil(previewEntries.reduce((s, e) => s + (e.word_count ?? 0), 0) / 300)} pages
                                            </span>
                                        )}
                                    </span>
                                ) : (
                                    <span style={{ color: 'var(--text-muted)' }}>
                                        Click "Preview" to count entries
                                    </span>
                                )}
                            </div>

                            <button
                                onClick={loadPreview}
                                disabled={loadingPreview}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '0.35rem 0.7rem',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border)',
                                    background: 'var(--bg-tertiary)',
                                    color: 'var(--text-secondary)',
                                    fontSize: '0.75rem',
                                    cursor: loadingPreview ? 'wait' : 'pointer',
                                    fontFamily: 'inherit',
                                    flexShrink: 0,
                                }}
                            >
                                <Eye size={12} />
                                Preview
                            </button>
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '0.6rem',
                            padding: '0.75rem',
                            borderRadius: '10px',
                            background: 'rgba(239,68,68,0.08)',
                            border: '1px solid rgba(239,68,68,0.25)',
                            marginBottom: '1rem',
                        }}>
                            <AlertCircle size={14} style={{ color: '#ef4444', flexShrink: 0, marginTop: '1px' }} />
                            <div>
                                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#ef4444', marginBottom: '2px' }}>
                                    Export Failed
                                </div>
                                <div style={{ fontSize: '0.72rem', color: '#ef4444', opacity: 0.8 }}>
                                    {error}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '1rem 1.5rem',
                    borderTop: '1px solid var(--border)',
                    background: 'var(--bg-secondary)',
                    flexShrink: 0,
                    gap: '0.75rem',
                }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Opens print dialog — Save as PDF
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                            onClick={onClose}
                            style={{
                                padding: '0.5rem 1rem',
                                borderRadius: '10px',
                                border: '1px solid var(--border)',
                                background: 'transparent',
                                color: 'var(--text-secondary)',
                                fontSize: '0.82rem',
                                cursor: 'pointer',
                                fontFamily: 'inherit',
                            }}
                        >
                            Cancel
                        </button>

                        <button
                            onClick={generatePDF}
                            disabled={isGenerating || isSuccess}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '0.5rem 1.25rem',
                                borderRadius: '10px',
                                border: 'none',
                                background: isSuccess
                                    ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                                    : 'linear-gradient(135deg, var(--accent), #7c3aed)',
                                color: 'white',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                cursor: isGenerating ? 'wait' : 'pointer',
                                fontFamily: 'inherit',
                                boxShadow: '0 4px 12px rgba(99,102,241,0.35)',
                                transition: 'all 0.2s',
                                minWidth: '130px',
                                justifyContent: 'center',
                            }}
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                                    Generating...
                                </>
                            ) : isSuccess ? (
                                <>
                                    <Check size={14} />
                                    Done!
                                </>
                            ) : (
                                <>
                                    <Download size={14} />
                                    Export PDF
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            <style>{`
        @keyframes fadeIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes scaleIn {
          from { transform: translate(-50%,-50%) scale(0.93); opacity: 0 }
          to   { transform: translate(-50%,-50%) scale(1);    opacity: 1 }
        }
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
      `}</style>
        </>
    )
}

// ─── PDF HTML Builder ─────────────────────────────────────────────────────────

function buildPDFHTML(entries: Entry[], opts: PDFOptions): string {
    const theme = THEME_CONFIG[opts.theme]
    const fSize = opts.fontSize === 'small' ? '12px' : opts.fontSize === 'large' ? '16px' : '14px'
    const hSize = opts.fontSize === 'small' ? '20px' : opts.fontSize === 'large' ? '28px' : '24px'
    const now = new Date().toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    })

    const coverPage = opts.coverPage ? `
    <div class="cover-page">
      <div class="cover-icon">📔</div>
      <h1 class="cover-title">${escapeHTML(opts.title)}</h1>
      <div class="cover-meta">
        <div>by ${escapeHTML(opts.author)}</div>
        <div>Generated on ${now}</div>
        <div>${entries.length} entries</div>
        <div>${entries.reduce((s, e) => s + (e.word_count ?? 0), 0).toLocaleString()} words total</div>
      </div>
    </div>
    <div class="page-break"></div>
  ` : ''

    const entryPages = entries.map((entry, idx) => {
        const cfg = TYPE_CONFIG[entry.type]
        const mood = entry.mood ? MOOD_EMOJI[entry.mood] : ''
        const date = entry.entry_date
            ? new Date(entry.entry_date).toLocaleDateString('en-US', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            })
            : new Date(entry.created_at).toLocaleDateString('en-US', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            })

        const content = entry.content_plain
            ? entry.content_plain
                .split('\n')
                .map(line => `<p>${escapeHTML(line) || '&nbsp;'}</p>`)
                .join('')
            : '<p><em>No content</em></p>'

        const isLast = idx === entries.length - 1

        return `
      <div class="entry${isLast ? '' : ' page-break'}">
        <div class="entry-header">
          ${opts.includeType ? `<span class="type-badge" style="background:${cfg.color}22;color:${cfg.color};border:1px solid ${cfg.color}44">${cfg.icon} ${cfg.label}</span>` : ''}
          ${opts.includeMood && mood ? `<span class="mood">${mood} ${entry.mood}</span>` : ''}
        </div>

        <h2 class="entry-title">${escapeHTML(entry.title?.trim() || 'Untitled Entry')}</h2>

        ${opts.includeDate ? `<div class="entry-date">📅 ${date}</div>` : ''}
        ${opts.includeWords && entry.word_count > 0 ? `<div class="entry-meta">✍️ ${entry.word_count} words · ${Math.ceil(entry.word_count / 200)} min read</div>` : ''}

        <div class="entry-divider"></div>

        <div class="entry-content">
          ${content}
        </div>
      </div>
    `
    }).join('\n')

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHTML(opts.title)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Inter', -apple-system, sans-serif;
      font-size: ${fSize};
      background: ${theme.bg};
      color: ${theme.text};
      line-height: 1.7;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    @media print {
      body { font-size: ${fSize}; }
      .page-break { page-break-after: always; }
      @page {
        margin: 2cm 2.5cm;
        ${opts.includePageNum ? `
          @bottom-center {
            content: counter(page) ' / ' counter(pages);
            font-family: 'Inter', sans-serif;
            font-size: 10px;
            color: ${theme.muted};
          }
        ` : ''}
      }
    }

    /* Cover page */
    .cover-page {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 90vh;
      text-align: center;
      padding: 3rem;
      background: ${theme.bg};
    }

    .cover-icon {
      font-size: 5rem;
      margin-bottom: 2rem;
      animation: none;
    }

    .cover-title {
      font-family: 'Playfair Display', serif;
      font-size: 2.5rem;
      font-weight: 700;
      color: ${theme.heading};
      margin-bottom: 1.5rem;
      line-height: 1.3;
    }

    .cover-meta {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      font-size: 0.9rem;
      color: ${theme.muted};
      padding: 1.5rem 2rem;
      border-top: 2px solid ${theme.border};
      border-bottom: 2px solid ${theme.border};
      min-width: 300px;
    }

    .cover-meta div:first-child {
      font-weight: 600;
      color: ${theme.text};
    }

    /* Entry */
    .entry {
      padding: 3rem 0;
      border-bottom: 1px solid ${theme.border};
    }

    .entry:last-child {
      border-bottom: none;
    }

    .entry-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 0.75rem;
    }

    .type-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 10px;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.02em;
    }

    .mood {
      font-size: 0.8rem;
      color: ${theme.muted};
      display: flex;
      align-items: center;
      gap: 4px;
      text-transform: capitalize;
    }

    .entry-title {
      font-family: 'Playfair Display', serif;
      font-size: ${hSize};
      font-weight: 700;
      color: ${theme.heading};
      line-height: 1.3;
      margin-bottom: 0.6rem;
    }

    .entry-date {
      font-size: 0.82rem;
      color: ${theme.muted};
      margin-bottom: 0.3rem;
    }

    .entry-meta {
      font-size: 0.78rem;
      color: ${theme.muted};
      margin-bottom: 0.3rem;
    }

    .entry-divider {
      width: 60px;
      height: 3px;
      background: ${theme.accent};
      border-radius: 2px;
      margin: 1rem 0;
      opacity: 0.6;
    }

    .entry-content {
      line-height: 1.8;
      color: ${theme.text};
    }

    .entry-content p {
      margin-bottom: 0.75rem;
      font-size: ${fSize};
    }

    .entry-content p:last-child { margin-bottom: 0; }

    .entry-content strong { font-weight: 600; }
    .entry-content em     { font-style: italic; }

    /* Utilities */
    .page-break { page-break-after: always; margin: 0; }
  </style>
</head>
<body>
  ${coverPage}
  ${entryPages}
</body>
</html>`
}

// ─── Escape HTML ──────────────────────────────────────────────────────────────

function escapeHTML(str: string): string {
    return (str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
}

// ─── Export trigger button ────────────────────────────────────────────────────
// Use this anywhere in the app

export function ExportPDFButton({
    entry,
    label = 'Export PDF',
}: {
    entry?: Entry
    label?: string
}) {
    const [open, setOpen] = useState(false)

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '0.4rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'transparent',
                    color: 'var(--text-secondary)',
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    transition: 'all 0.15s',
                }}
                onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.background = 'var(--bg-tertiary)'
                        ; (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'
                        ; (e.currentTarget as HTMLElement).style.color = 'var(--accent)'
                }}
                onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.background = 'transparent'
                        ; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'
                        ; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'
                }}
            >
                <FileDown size={13} />
                {label}
            </button>

            <PDFExport
                open={open}
                onClose={() => setOpen(false)}
                singleEntry={entry}
            />
        </>
    )
}