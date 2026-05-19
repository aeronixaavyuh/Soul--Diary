import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@store/useAppStore'
import { useEntryStore } from '@store/useEntryStore'
import {
    Search, BookOpen, FileText, Lightbulb, CheckSquare,
    Settings, Moon, Sun, Lock, Plus, Heart, Trash2,
    Zap, Command, ArrowRight, Clock, Hash,
    LayoutGrid, List, Download, RefreshCw,
} from 'lucide-react'

// ─── Command Types ────────────────────────────────────────────────────────────

interface Command {
    id: string
    label: string
    desc?: string
    icon: React.ReactNode
    category: string
    shortcut?: string
    action: () => void
    keywords: string[]
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface CommandPaletteProps {
    open: boolean
    onClose: () => void
}

// ─── CommandPalette ───────────────────────────────────────────────────────────

export default function CommandPalette({ open, onClose }: CommandPaletteProps) {
    const navigate = useNavigate()
    const { theme, setTheme, lock, settings, animationsEnabled, toggleAnimations } = useAppStore()
    const { createEntry, loadEntries, entries, favorites } = useEntryStore()

    const [query, setQuery] = useState('')
    const [activeIndex, setActiveIndex] = useState(0)
    const [recentCmds, setRecentCmds] = useState<string[]>([])

    const inputRef = useRef<HTMLInputElement>(null)
    const listRef = useRef<HTMLDivElement>(null)

    // ── Build command list ─────────────────────────────────────────────────────

    const commands: Command[] = useMemo(() => [
        // ── Navigation ────────────────────────────────────────────────────────────
        {
            id: 'nav-diary',
            label: 'Go to Diary',
            desc: 'Open your diary entries',
            icon: <BookOpen size={15} style={{ color: '#f472b6' }} />,
            category: 'Navigate',
            shortcut: 'Alt+1',
            keywords: ['diary', 'journal', 'open', 'go'],
            action: () => { navigate('/diary'); onClose() },
        },
        {
            id: 'nav-notes',
            label: 'Go to Notes',
            desc: 'Open your notes',
            icon: <FileText size={15} style={{ color: '#60a5fa' }} />,
            category: 'Navigate',
            shortcut: 'Alt+2',
            keywords: ['notes', 'open', 'go'],
            action: () => { navigate('/notes'); onClose() },
        },
        {
            id: 'nav-ideas',
            label: 'Go to Ideas',
            desc: 'Open your ideas board',
            icon: <Lightbulb size={15} style={{ color: '#fbbf24' }} />,
            category: 'Navigate',
            shortcut: 'Alt+3',
            keywords: ['ideas', 'board', 'open', 'go'],
            action: () => { navigate('/ideas'); onClose() },
        },
        {
            id: 'nav-tasks',
            label: 'Go to Tasks',
            desc: 'Open task manager',
            icon: <CheckSquare size={15} style={{ color: '#34d399' }} />,
            category: 'Navigate',
            shortcut: 'Alt+4',
            keywords: ['tasks', 'todo', 'checklist', 'open', 'go'],
            action: () => { navigate('/tasks'); onClose() },
        },
        {
            id: 'nav-settings',
            label: 'Open Settings',
            desc: 'App preferences and configuration',
            icon: <Settings size={15} style={{ color: 'var(--text-muted)' }} />,
            category: 'Navigate',
            shortcut: 'Alt+,',
            keywords: ['settings', 'preferences', 'config', 'open'],
            action: () => { navigate('/settings'); onClose() },
        },

        // ── Create ────────────────────────────────────────────────────────────
        {
            id: 'create-diary',
            label: 'New Diary Entry',
            desc: 'Create a new diary entry for today',
            icon: <Plus size={15} style={{ color: '#f472b6' }} />,
            category: 'Create',
            shortcut: 'Ctrl+D',
            keywords: ['new', 'create', 'diary', 'entry', 'add'],
            action: async () => {
                onClose()
                window.location.hash = '#/diary'
                // Thoda wait karo page load ke liye
                setTimeout(async () => {
                    const store = useEntryStore.getState()
                    const id = await store.createEntry({
                        type: 'diary',
                        entryDate: new Date().toISOString().split('T')[0],
                    })
                    if (id) {
                        await store.loadEntries('diary')
                        await store.loadEntry(id)
                    }
                }, 150)
            },
        },
        {
            id: 'create-note',
            label: 'New Note',
            desc: 'Create a new note',
            icon: <Plus size={15} style={{ color: '#60a5fa' }} />,
            category: 'Create',
            shortcut: 'Ctrl+N',
            keywords: ['new', 'create', 'note', 'add'],
            action: async () => {
                onClose()
                window.location.hash = '#/notes'
                setTimeout(async () => {
                    const store = useEntryStore.getState()
                    const id = await store.createEntry({ type: 'note' })
                    if (id) {
                        await store.loadEntries('note')
                        await store.loadEntry(id)
                    }
                }, 150)
            },
        },
        {
            id: 'create-idea',
            label: 'New Idea',
            desc: 'Capture a new idea quickly',
            icon: <Plus size={15} style={{ color: '#fbbf24' }} />,
            category: 'Create',
            shortcut: 'Ctrl+I',
            keywords: ['new', 'create', 'idea', 'capture', 'add'],
            action: async () => {
                onClose()
                window.location.hash = '#/ideas'
                setTimeout(async () => {
                    const store = useEntryStore.getState()
                    const id = await store.createEntry({ type: 'idea' })
                    if (id) {
                        await store.loadEntries('idea')
                        await store.loadEntry(id)
                    }
                }, 150)
            },
        },
        {
            id: 'create-task',
            label: 'New Task',
            desc: 'Add a new task to your list',
            icon: <Plus size={15} style={{ color: '#34d399' }} />,
            category: 'Create',
            shortcut: 'Ctrl+T',
            keywords: ['new', 'create', 'task', 'todo', 'add'],
            action: () => {
                onClose()
                window.location.hash = '#/tasks'
            },
        },
        // ── Theme ─────────────────────────────────────────────────────────────────
        {
            id: 'theme-dark',
            label: 'Switch to Dark Mode',
            desc: 'Dark background, easy on eyes',
            icon: <Moon size={15} style={{ color: '#818cf8' }} />,
            category: 'Appearance',
            keywords: ['dark', 'theme', 'mode', 'night', 'switch'],
            action: () => { setTheme('dark'); onClose() },
        },
        {
            id: 'theme-light',
            label: 'Switch to Light Mode',
            desc: 'Bright and clean look',
            icon: <Sun size={15} style={{ color: '#fbbf24' }} />,
            category: 'Appearance',
            keywords: ['light', 'theme', 'mode', 'day', 'switch'],
            action: () => { setTheme('light'); onClose() },
        },
        {
            id: 'toggle-animations',
            label: animationsEnabled ? 'Disable Animations' : 'Enable Animations',
            desc: animationsEnabled ? 'Save battery, improve performance' : 'Enable smooth transitions',
            icon: <Zap size={15} style={{ color: '#f97316' }} />,
            category: 'Appearance',
            keywords: ['animation', 'performance', 'battery', 'toggle'],
            action: () => { toggleAnimations(); onClose() },
        },

        // ── Security ──────────────────────────────────────────────────────────
        ...(settings.hasPin ? [{
            id: 'lock-app',
            label: 'Lock App',
            desc: 'Lock Soul Diary with your PIN',
            icon: <Lock size={15} style={{ color: '#ef4444' }} />,
            category: 'Security',
            shortcut: 'Ctrl+L',
            keywords: ['lock', 'pin', 'secure', 'protect'],
            action: () => {
                onClose()
                // Thoda delay — palette close hone ke baad lock karo
                setTimeout(() => {
                    useAppStore.getState().lock()
                }, 100)
            },
        }] : []),

        // ── View ──────────────────────────────────────────────────────────────────
        {
            id: 'view-favorites',
            label: 'View Favorites',
            desc: 'See all starred entries',
            icon: <Heart size={15} style={{ color: '#f472b6' }} />,
            category: 'View',
            keywords: ['favorites', 'starred', 'heart', 'liked'],
            action: () => { navigate('/diary'); onClose() },
        },

        // ── Data ──────────────────────────────────────────────────────────────────
        {
            id: 'export-backup',
            label: 'Export Backup',
            desc: 'Save an encrypted backup of all data',
            icon: <Download size={15} style={{ color: '#8b5cf6' }} />,
            category: 'Data',
            keywords: ['export', 'backup', 'save', 'data'],
            action: () => { navigate('/settings'); onClose() },
        },
    ], [theme, animationsEnabled, settings.hasPin])

    // ── Filtered commands ──────────────────────────────────────────────────────

    const filteredCommands = useMemo(() => {
        if (!query.trim()) {
            // Show recent first, then all
            const recents = recentCmds
                .map(id => commands.find(c => c.id === id))
                .filter(Boolean) as Command[]
            const rest = commands.filter(c => !recentCmds.includes(c.id))
            return [...recents, ...rest]
        }

        const q = query.toLowerCase().trim()
        return commands
            .filter(cmd =>
                cmd.label.toLowerCase().includes(q) ||
                (cmd.desc ?? '').toLowerCase().includes(q) ||
                cmd.keywords.some(k => k.includes(q)) ||
                cmd.category.toLowerCase().includes(q)
            )
            .sort((a, b) => {
                // Exact label match first
                const aExact = a.label.toLowerCase().startsWith(q) ? 0 : 1
                const bExact = b.label.toLowerCase().startsWith(q) ? 0 : 1
                return aExact - bExact
            })
    }, [query, commands, recentCmds])

    // Group by category
    const grouped = useMemo(() => {
        const map = new Map<string, Command[]>()
        for (const cmd of filteredCommands) {
            const cat = query.trim() ? cmd.category : (recentCmds.includes(cmd.id) ? 'Recent' : cmd.category)
            if (!map.has(cat)) map.set(cat, [])
            map.get(cat)!.push(cmd)
        }
        return map
    }, [filteredCommands, query, recentCmds])

    // ── Entry results ──────────────────────────────────────────────────────────

    const entryResults = useMemo(() => {
        if (!query.trim() || query.length < 2) return []
        const q = query.toLowerCase()
        return entries
            .filter(e =>
                !e.is_deleted &&
                (e.title.toLowerCase().includes(q) ||
                    e.content_plain.toLowerCase().includes(q))
            )
            .slice(0, 4)
    }, [query, entries])

    // Total items for keyboard nav
    const allItems = useMemo(() => {
        const cmds: Array<{ type: 'command'; cmd: Command } | { type: 'entry'; entry: any }> = []
        for (const cmds2 of grouped.values()) {
            for (const c of cmds2) cmds.push({ type: 'command', cmd: c })
        }
        for (const e of entryResults) cmds.push({ type: 'entry', entry: e })
        return cmds
    }, [grouped, entryResults])

    // ── Effects ────────────────────────────────────────────────────────────────

    // Focus input when opened
    useEffect(() => {
        if (open) {
            setQuery('')
            setActiveIndex(0)
            setTimeout(() => inputRef.current?.focus(), 50)
        }
    }, [open])

    // Reset active index on query change
    useEffect(() => {
        setActiveIndex(0)
    }, [query])

    // Scroll active item into view
    useEffect(() => {
        const el = listRef.current?.querySelector('[data-active="true"]')
        el?.scrollIntoView({ block: 'nearest' })
    }, [activeIndex])

    // Keyboard navigation
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault()
                setActiveIndex(i => Math.min(i + 1, allItems.length - 1))
                break
            case 'ArrowUp':
                e.preventDefault()
                setActiveIndex(i => Math.max(i - 1, 0))
                break
            case 'Enter':
                e.preventDefault()
                const item = allItems[activeIndex]
                if (!item) return
                if (item.type === 'command') {
                    executeCommand(item.cmd)
                } else {
                    navigateToEntry(item.entry)
                }
                break
            case 'Escape':
                e.preventDefault()
                onClose()
                break
        }
    }, [allItems, activeIndex])

    const executeCommand = useCallback((cmd: Command) => {
        setRecentCmds(prev => {
            const next = [cmd.id, ...prev.filter(id => id !== cmd.id)].slice(0, 5)
            return next
        })
        cmd.action()
    }, [])

    const navigateToEntry = useCallback((entry: any) => {
        const typeMap: Record<string, string> = {
            diary: '/diary',
            note: '/notes',
            idea: '/ideas',
        }
        navigate(typeMap[entry.type] ?? '/diary')
        onClose()
    }, [navigate, onClose])

    // ── Global shortcut listener ───────────────────────────────────────────────

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key === 'k') {
                e.preventDefault()
                if (!open) return // Parent handles opening
            }
            // Alt+1-4 shortcuts
            if (e.altKey && !open) {
                if (e.key === '1') { e.preventDefault(); navigate('/diary') }
                if (e.key === '2') { e.preventDefault(); navigate('/notes') }
                if (e.key === '3') { e.preventDefault(); navigate('/ideas') }
                if (e.key === '4') { e.preventDefault(); navigate('/tasks') }
                if (e.key === ',') { e.preventDefault(); navigate('/settings') }
            }
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [open, navigate])

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
                    background: 'rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(4px)',
                    zIndex: 9998,
                    animation: 'fadeIn 0.15s ease',
                }}
            />

            {/* Palette */}
            <div
                style={{
                    position: 'fixed',
                    top: '20%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 'min(600px, 90vw)',
                    maxHeight: '70vh',
                    background: 'var(--bg-card)',
                    borderRadius: '16px',
                    border: '1px solid var(--border)',
                    boxShadow: '0 24px 80px rgba(0,0,0,0.4)',
                    zIndex: 9999,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    animation: 'scaleIn 0.15s ease',
                }}
            >
                {/* Search input */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.875rem 1rem',
                    borderBottom: '1px solid var(--border)',
                    flexShrink: 0,
                }}>
                    <Command size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a command or search..."
                        className="selectable"
                        style={{
                            flex: 1,
                            background: 'transparent',
                            border: 'none',
                            outline: 'none',
                            fontSize: '0.95rem',
                            color: 'var(--text-primary)',
                            fontFamily: 'inherit',
                        }}
                    />
                    {query && (
                        <button
                            onClick={() => setQuery('')}
                            style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'var(--text-muted)',
                                display: 'flex',
                                padding: '2px',
                            }}
                        >
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Clear</span>
                        </button>
                    )}
                    <kbd style={{
                        fontSize: '0.65rem',
                        padding: '2px 6px',
                        borderRadius: '5px',
                        border: '1px solid var(--border)',
                        background: 'var(--bg-tertiary)',
                        color: 'var(--text-muted)',
                        flexShrink: 0,
                    }}>
                        ESC
                    </kbd>
                </div>

                {/* Results */}
                <div
                    ref={listRef}
                    style={{
                        overflowY: 'auto',
                        flex: 1,
                        padding: '0.5rem',
                    }}
                >
                    {allItems.length === 0 ? (
                        <div style={{
                            padding: '2rem',
                            textAlign: 'center',
                            color: 'var(--text-muted)',
                            fontSize: '0.875rem',
                        }}>
                            No results for "<strong style={{ color: 'var(--text-secondary)' }}>{query}</strong>"
                        </div>
                    ) : (
                        <>
                            {/* Command groups */}
                            {(() => {
                                let itemIndex = 0
                                return Array.from(grouped.entries()).map(([category, cmds]) => (
                                    <div key={category} style={{ marginBottom: '0.5rem' }}>
                                        {/* Category label */}
                                        <div style={{
                                            fontSize: '0.65rem',
                                            fontWeight: 600,
                                            color: 'var(--text-muted)',
                                            letterSpacing: '0.08em',
                                            textTransform: 'uppercase',
                                            padding: '0.25rem 0.5rem',
                                            marginBottom: '2px',
                                        }}>
                                            {category}
                                        </div>

                                        {cmds.map(cmd => {
                                            const idx = itemIndex++
                                            const isActive = activeIndex === idx
                                            return (
                                                <button
                                                    key={cmd.id}
                                                    data-active={isActive}
                                                    onClick={() => executeCommand(cmd)}
                                                    onMouseEnter={() => setActiveIndex(idx)}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.75rem',
                                                        width: '100%',
                                                        padding: '0.55rem 0.75rem',
                                                        borderRadius: '10px',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        background: isActive
                                                            ? 'rgba(99,102,241,0.12)' : 'transparent',
                                                        transition: 'background 0.1s',
                                                        textAlign: 'left',
                                                        fontFamily: 'inherit',
                                                    }}
                                                >
                                                    {/* Icon */}
                                                    <div style={{
                                                        width: '30px',
                                                        height: '30px',
                                                        borderRadius: '8px',
                                                        background: isActive
                                                            ? 'rgba(99,102,241,0.15)' : 'var(--bg-tertiary)',
                                                        border: '1px solid var(--border)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        flexShrink: 0,
                                                        transition: 'background 0.1s',
                                                    }}>
                                                        {cmd.icon}
                                                    </div>

                                                    {/* Label + desc */}
                                                    <div style={{ flex: 1, overflow: 'hidden' }}>
                                                        <div style={{
                                                            fontSize: '0.875rem',
                                                            fontWeight: 500,
                                                            color: isActive ? 'var(--accent)' : 'var(--text-primary)',
                                                            whiteSpace: 'nowrap',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                        }}>
                                                            {cmd.label}
                                                        </div>
                                                        {cmd.desc && (
                                                            <div style={{
                                                                fontSize: '0.72rem',
                                                                color: 'var(--text-muted)',
                                                                whiteSpace: 'nowrap',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                            }}>
                                                                {cmd.desc}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Shortcut */}
                                                    {cmd.shortcut && (
                                                        <div style={{ display: 'flex', gap: '3px', flexShrink: 0 }}>
                                                            {cmd.shortcut.split('+').map((k, ki) => (
                                                                <kbd
                                                                    key={ki}
                                                                    style={{
                                                                        fontSize: '0.62rem',
                                                                        padding: '2px 5px',
                                                                        borderRadius: '4px',
                                                                        border: '1px solid var(--border)',
                                                                        background: 'var(--bg-tertiary)',
                                                                        color: 'var(--text-muted)',
                                                                    }}
                                                                >
                                                                    {k}
                                                                </kbd>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* Active arrow */}
                                                    {isActive && (
                                                        <ArrowRight size={13} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                                                    )}
                                                </button>
                                            )
                                        })}
                                    </div>
                                ))
                            })()}

                            {/* Entry search results */}
                            {entryResults.length > 0 && (
                                <div style={{ marginBottom: '0.5rem' }}>
                                    <div style={{
                                        fontSize: '0.65rem',
                                        fontWeight: 600,
                                        color: 'var(--text-muted)',
                                        letterSpacing: '0.08em',
                                        textTransform: 'uppercase',
                                        padding: '0.25rem 0.5rem',
                                        marginBottom: '2px',
                                    }}>
                                        Entries
                                    </div>

                                    {entryResults.map(entry => {
                                        const idx = grouped.size + entryResults.indexOf(entry)
                                        const isActive = activeIndex === idx
                                        const typeIcon = entry.type === 'diary' ? <BookOpen size={13} style={{ color: '#f472b6' }} />
                                            : entry.type === 'note' ? <FileText size={13} style={{ color: '#60a5fa' }} />
                                                : <Lightbulb size={13} style={{ color: '#fbbf24' }} />

                                        return (
                                            <button
                                                key={entry.id}
                                                data-active={isActive}
                                                onClick={() => navigateToEntry(entry)}
                                                onMouseEnter={() => setActiveIndex(idx)}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.75rem',
                                                    width: '100%',
                                                    padding: '0.55rem 0.75rem',
                                                    borderRadius: '10px',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    background: isActive ? 'rgba(99,102,241,0.12)' : 'transparent',
                                                    transition: 'background 0.1s',
                                                    textAlign: 'left',
                                                    fontFamily: 'inherit',
                                                }}
                                            >
                                                <div style={{
                                                    width: '30px',
                                                    height: '30px',
                                                    borderRadius: '8px',
                                                    background: isActive ? 'rgba(99,102,241,0.15)' : 'var(--bg-tertiary)',
                                                    border: '1px solid var(--border)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    flexShrink: 0,
                                                }}>
                                                    {typeIcon}
                                                </div>

                                                <div style={{ flex: 1, overflow: 'hidden' }}>
                                                    <div style={{
                                                        fontSize: '0.875rem',
                                                        fontWeight: 500,
                                                        color: isActive ? 'var(--accent)' : 'var(--text-primary)',
                                                        whiteSpace: 'nowrap',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                    }}>
                                                        {entry.title || 'Untitled'}
                                                    </div>
                                                    <div style={{
                                                        fontSize: '0.72rem',
                                                        color: 'var(--text-muted)',
                                                        whiteSpace: 'nowrap',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                    }}>
                                                        {entry.content_plain?.slice(0, 60) || 'Empty...'}
                                                    </div>
                                                </div>

                                                <div style={{
                                                    fontSize: '0.65rem',
                                                    color: 'var(--text-muted)',
                                                    flexShrink: 0,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '3px',
                                                }}>
                                                    <Clock size={9} />
                                                    {formatRelTime(entry.updated_at)}
                                                </div>

                                                {isActive && (
                                                    <ArrowRight size={13} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                                                )}
                                            </button>
                                        )
                                    })}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.5rem 1rem',
                    borderTop: '1px solid var(--border)',
                    flexShrink: 0,
                    background: 'var(--bg-secondary)',
                }}>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        {[
                            { key: '↑↓', desc: 'Navigate' },
                            { key: '↵', desc: 'Select' },
                            { key: 'Esc', desc: 'Close' },
                        ].map(k => (
                            <div key={k.key} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <kbd style={{
                                    fontSize: '0.62rem',
                                    padding: '2px 5px',
                                    borderRadius: '4px',
                                    border: '1px solid var(--border)',
                                    background: 'var(--bg-tertiary)',
                                    color: 'var(--text-muted)',
                                }}>
                                    {k.key}
                                </kbd>
                                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                                    {k.desc}
                                </span>
                            </div>
                        ))}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Command size={11} style={{ color: 'var(--text-muted)' }} />
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                            Soul Diary
                        </span>
                    </div>
                </div>
            </div>

            <style>{`
        @keyframes fadeIn  { from { opacity: 0 }                 to { opacity: 1 }               }
        @keyframes scaleIn { from { transform: translateX(-50%) scale(0.95); opacity: 0 }
                             to   { transform: translateX(-50%) scale(1);    opacity: 1 } }
      `}</style>
        </>
    )
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function formatRelTime(iso: string): string {
    try {
        const diff = Date.now() - new Date(iso).getTime()
        const mins = Math.floor(diff / 60000)
        const hrs = Math.floor(diff / 3600000)
        const days = Math.floor(diff / 86400000)
        if (mins < 1) return 'Just now'
        if (mins < 60) return `${mins}m`
        if (hrs < 24) return `${hrs}h`
        if (days < 7) return `${days}d`
        return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    } catch { return '' }
}