import { create } from 'zustand'

// ─── Types ────────────────────────────────────────────────────────────────────

export type EntryType = 'diary' | 'note' | 'idea'

export type MoodLabel =
    | 'happy' | 'sad' | 'angry' | 'anxious'
    | 'excited' | 'calm' | 'neutral' | 'grateful'
    | 'frustrated' | 'hopeful' | 'lonely' | 'confused'

export interface Tag {
    id: string
    name: string
    color: string
    icon: string
    created_at: string
}

export interface Entry {
    id: string
    type: EntryType
    title: string
    content: string        // TipTap JSON string
    content_plain: string        // plain text (for search/preview)
    mood: MoodLabel | null
    mood_score: number
    color: string
    cover_image: string | null
    is_favorite: number
    is_pinned: number
    is_deleted?: boolean
    word_count: number
    char_count: number
    read_time: number
    weather: string | null
    location: string | null
    template_id: string | null
    version: number
    created_at: string
    updated_at: string
    entry_date: string
    tags?: Tag[]
}

export interface EntryVersion {
    id: string
    entry_id: string
    content: string
    version: number
    created_at: string
}

export interface AppStats {
    totalEntries: number
    diaryCount: number
    notesCount: number
    ideasCount: number
    taskCount: number
    habitCount: number
    trashCount: number
    totalWords: number
}

// ─── Create Entry Input ───────────────────────────────────────────────────────

export interface CreateEntryInput {
    type: EntryType
    title?: string
    content?: string
    contentPlain?: string
    mood?: MoodLabel
    moodScore?: number
    color?: string
    weather?: string
    location?: string
    templateId?: string
    entryDate?: string
    tags?: string[]
}

export interface UpdateEntryInput {
    title?: string
    content?: string
    contentPlain?: string
    mood?: MoodLabel
    moodScore?: number
    color?: string
    weather?: string
    location?: string
    isFavorite?: boolean
    isPinned?: boolean
    tags?: string[]
}

// ─── Store State ──────────────────────────────────────────────────────────────

interface EntryState {
    // ── Data ───────────────────────────────────────────────────────────────────
    entries: Entry[]
    currentEntry: Entry | null
    trashEntries: Entry[]
    favorites: Entry[]
    tags: Tag[]
    stats: AppStats | null

    // ── UI State ───────────────────────────────────────────────────────────────
    isLoading: boolean
    isSaving: boolean
    activeType: EntryType | 'all'
    searchQuery: string
    searchResults: Entry[]
    isSearching: boolean
    selectedTagId: string | null
    sortBy: 'updated_at' | 'created_at' | 'title' | 'entry_date'
    sortOrder: 'asc' | 'desc'
    viewMode: 'list' | 'grid' | 'timeline'

    // ── Editor State ───────────────────────────────────────────────────────────
    isDirty: boolean       // unsaved changes
    autoSaveTimer: ReturnType<typeof setTimeout> | null
    versions: EntryVersion[]

    // ── Actions: Loading ───────────────────────────────────────────────────────
    loadEntries: (type?: EntryType) => Promise<void>
    loadEntry: (id: string) => Promise<Entry | null>
    loadTrash: () => Promise<void>
    loadFavorites: () => Promise<void>
    loadTags: () => Promise<void>
    loadStats: () => Promise<void>
    loadVersions: (entryId: string) => Promise<void>

    // ── Actions: CRUD ──────────────────────────────────────────────────────────
    createEntry: (data: CreateEntryInput) => Promise<string | null>
    updateEntry: (id: string, data: UpdateEntryInput) => Promise<boolean>
    deleteEntry: (id: string) => Promise<boolean>
    restoreEntry: (id: string) => Promise<boolean>
    permanentDelete: (id: string) => Promise<boolean>
    toggleFavorite: (id: string) => Promise<void>
    togglePin: (id: string) => Promise<void>

    // ── Actions: Tags ──────────────────────────────────────────────────────────
    createTag: (name: string, color?: string, icon?: string) => Promise<string | null>
    deleteTag: (id: string) => Promise<void>

    // ── Actions: Search ────────────────────────────────────────────────────────
    search: (query: string, type?: EntryType) => Promise<void>
    clearSearch: () => void

    // ── Actions: Editor ────────────────────────────────────────────────────────
    setCurrentEntry: (entry: Entry | null) => void
    setDirty: (dirty: boolean) => void
    scheduleAutoSave: (id: string, data: UpdateEntryInput) => void
    cancelAutoSave: () => void
    saveNow: (id: string, data: UpdateEntryInput) => Promise<void>

    // ── Actions: UI ────────────────────────────────────────────────────────────
    setActiveType: (type: EntryType | 'all') => void
    setSelectedTag: (tagId: string | null) => void
    setSortBy: (by: EntryState['sortBy']) => void
    setSortOrder: (order: 'asc' | 'desc') => void
    setViewMode: (mode: EntryState['viewMode']) => void
    setSearchQuery: (q: string) => void
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useEntryStore = create<EntryState>((set, get) => ({

    // ── Initial State ───────────────────────────────────────────────────────────
    entries: [],
    currentEntry: null,
    trashEntries: [],
    favorites: [],
    tags: [],
    stats: null,

    isLoading: false,
    isSaving: false,
    activeType: 'all',
    searchQuery: '',
    searchResults: [],
    isSearching: false,
    selectedTagId: null,
    sortBy: 'updated_at',
    sortOrder: 'desc',
    viewMode: 'list',

    isDirty: false,
    autoSaveTimer: null,
    versions: [],

    // ── Load Entries ────────────────────────────────────────────────────────────
    loadEntries: async (type?) => {
        set({ isLoading: true })
        try {
            const res = await window.electronAPI.db.all(
                type
                    ? 'SELECT * FROM entries WHERE type = ? AND is_deleted = 0 ORDER BY updated_at DESC'
                    : 'SELECT * FROM entries WHERE is_deleted = 0 ORDER BY updated_at DESC',
                type ? [type] : []
            ) as Entry[]
            set({ entries: res ?? [], isLoading: false })
        } catch (err) {
            console.error('[EntryStore] loadEntries:', err)
            set({ isLoading: false })
        }
    },

    // ── Load Single Entry ───────────────────────────────────────────────────────
    loadEntry: async (id: string) => {
        try {
            const result = await window.electronAPI.db.get(
                'SELECT * FROM entries WHERE id = ? AND is_deleted = 0', [id]
            ) as Entry | undefined

            if (!result) return null

            // Load tags for this entry
            const tags = await window.electronAPI.db.all(`
        SELECT t.* FROM tags t
        INNER JOIN entry_tags et ON t.id = et.tag_id
        WHERE et.entry_id = ?
      `, [id]) as Tag[]

            const entry = { ...result, tags: tags ?? [] }
            set({ currentEntry: entry })
            return entry
        } catch (err) {
            console.error('[EntryStore] loadEntry:', err)
            return null
        }
    },

    // ── Load Trash ──────────────────────────────────────────────────────────────
    loadTrash: async () => {
        try {
            const res = await window.electronAPI.db.all(
                'SELECT * FROM entries WHERE is_deleted = 1 ORDER BY deleted_at DESC'
            ) as Entry[]
            set({ trashEntries: res ?? [] })
        } catch (err) {
            console.error('[EntryStore] loadTrash:', err)
        }
    },

    // ── Load Favorites ──────────────────────────────────────────────────────────
    loadFavorites: async () => {
        try {
            const res = await window.electronAPI.db.all(
                'SELECT * FROM entries WHERE is_favorite = 1 AND is_deleted = 0 ORDER BY updated_at DESC'
            ) as Entry[]
            set({ favorites: res ?? [] })
        } catch (err) {
            console.error('[EntryStore] loadFavorites:', err)
        }
    },

    // ── Load Tags ───────────────────────────────────────────────────────────────
    loadTags: async () => {
        try {
            const res = await window.electronAPI.db.all(
                'SELECT * FROM tags ORDER BY name ASC'
            ) as Tag[]
            set({ tags: res ?? [] })
        } catch (err) {
            console.error('[EntryStore] loadTags:', err)
        }
    },

    // ── Load Stats ──────────────────────────────────────────────────────────────
    loadStats: async () => {
        try {
            const [total, diary, notes, ideas, tasks, habits, trash, words] =
                await Promise.all([
                    window.electronAPI.db.get('SELECT COUNT(*) as c FROM entries WHERE is_deleted = 0'),
                    window.electronAPI.db.get('SELECT COUNT(*) as c FROM entries WHERE type="diary" AND is_deleted=0'),
                    window.electronAPI.db.get('SELECT COUNT(*) as c FROM entries WHERE type="note"  AND is_deleted=0'),
                    window.electronAPI.db.get('SELECT COUNT(*) as c FROM entries WHERE type="idea"  AND is_deleted=0'),
                    window.electronAPI.db.get('SELECT COUNT(*) as c FROM tasks   WHERE is_deleted = 0'),
                    window.electronAPI.db.get('SELECT COUNT(*) as c FROM habits  WHERE is_active  = 1'),
                    window.electronAPI.db.get('SELECT COUNT(*) as c FROM entries WHERE is_deleted = 1'),
                    window.electronAPI.db.get('SELECT COALESCE(SUM(word_count),0) as s FROM entries WHERE is_deleted=0'),
                ]) as any[]

            set({
                stats: {
                    totalEntries: total?.c ?? 0,
                    diaryCount: diary?.c ?? 0,
                    notesCount: notes?.c ?? 0,
                    ideasCount: ideas?.c ?? 0,
                    taskCount: tasks?.c ?? 0,
                    habitCount: habits?.c ?? 0,
                    trashCount: trash?.c ?? 0,
                    totalWords: words?.s ?? 0,
                },
            })
        } catch (err) {
            console.error('[EntryStore] loadStats:', err)
        }
    },

    // ── Load Versions ───────────────────────────────────────────────────────────
    loadVersions: async (entryId: string) => {
        try {
            const res = await window.electronAPI.db.all(
                'SELECT * FROM entry_versions WHERE entry_id = ? ORDER BY version DESC',
                [entryId]
            ) as EntryVersion[]
            set({ versions: res ?? [] })
        } catch (err) {
            console.error('[EntryStore] loadVersions:', err)
        }
    },

    // ── Create Entry ────────────────────────────────────────────────────────────
    createEntry: async (data: CreateEntryInput) => {
        try {
            const id = generateId()
            const timestamp = new Date().toISOString()
            const entryDate = data.entryDate ?? today()

            await window.electronAPI.db.run(`
        INSERT INTO entries
          (id, type, title, content, content_plain, mood, mood_score,
           color, cover_image, is_favorite, is_pinned, is_deleted,
           word_count, char_count, read_time, weather, location,
           template_id, version, created_at, updated_at, entry_date)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `, [
                id,
                data.type,
                data.title ?? '',
                data.content ?? '{"type":"doc","content":[{"type":"paragraph"}]}',
                data.contentPlain ?? '',
                data.mood ?? null,
                data.moodScore ?? 0,
                data.color ?? '#6366f1',
                null,                          // cover_image
                0,                             // is_favorite
                0,                             // is_pinned
                0,                             // is_deleted
                countWords(data.contentPlain ?? ''),
                (data.contentPlain ?? '').length,
                Math.ceil(countWords(data.contentPlain ?? '') / 200),
                data.weather ?? null,
                data.location ?? null,
                data.templateId ?? null,
                1,                             // version
                timestamp,
                timestamp,
                entryDate,
            ])

            // Add tags
            if (data.tags?.length) {
                for (const tagId of data.tags) {
                    await window.electronAPI.db.run(
                        'INSERT OR IGNORE INTO entry_tags (entry_id, tag_id) VALUES (?, ?)',
                        [id, tagId]
                    )
                }
            }

            // Reload entries list
            await get().loadEntries(data.type)
            await get().loadStats()

            return id
        } catch (err) {
            console.error('[EntryStore] createEntry:', err)
            return null
        }
    },

    // ── Update Entry ────────────────────────────────────────────────────────────
    updateEntry: async (id: string, data: UpdateEntryInput) => {
        set({ isSaving: true })
        try {
            const sets: string[] = ['updated_at = ?']
            const values: unknown[] = [new Date().toISOString()]

            if (data.title !== undefined) { sets.push('title = ?'); values.push(data.title) }
            if (data.content !== undefined) { sets.push('content = ?'); values.push(data.content) }
            if (data.mood !== undefined) { sets.push('mood = ?'); values.push(data.mood) }
            if (data.moodScore !== undefined) { sets.push('mood_score = ?'); values.push(data.moodScore) }
            if (data.color !== undefined) { sets.push('color = ?'); values.push(data.color) }
            if (data.weather !== undefined) { sets.push('weather = ?'); values.push(data.weather) }
            if (data.location !== undefined) { sets.push('location = ?'); values.push(data.location) }
            if (data.isFavorite !== undefined) { sets.push('is_favorite = ?'); values.push(data.isFavorite ? 1 : 0) }
            if (data.isPinned !== undefined) { sets.push('is_pinned = ?'); values.push(data.isPinned ? 1 : 0) }

            if (data.contentPlain !== undefined) {
                sets.push('content_plain = ?')
                sets.push('word_count = ?')
                sets.push('char_count = ?')
                sets.push('read_time = ?')
                values.push(data.contentPlain)
                values.push(countWords(data.contentPlain))
                values.push(data.contentPlain.length)
                values.push(Math.ceil(countWords(data.contentPlain) / 200))
            }

            values.push(id)

            await window.electronAPI.db.run(
                `UPDATE entries SET ${sets.join(', ')} WHERE id = ?`,
                values
            )

            // Update tags
            if (data.tags !== undefined) {
                await window.electronAPI.db.run(
                    'DELETE FROM entry_tags WHERE entry_id = ?', [id]
                )
                for (const tagId of data.tags) {
                    await window.electronAPI.db.run(
                        'INSERT OR IGNORE INTO entry_tags (entry_id, tag_id) VALUES (?, ?)',
                        [id, tagId]
                    )
                }
            }

            // Update local state — patch in place (no full reload for perf)
            set(state => {
                const { tags: _tags, contentPlain, moodScore, isFavorite, isPinned, ...safeData } = data

                const patch: Partial<Entry> = {
                    ...safeData,
                    updated_at: new Date().toISOString(),
                    ...(contentPlain !== undefined && { content_plain: contentPlain }),
                    ...(moodScore !== undefined && { mood_score: moodScore }),
                    ...(isFavorite !== undefined && { is_favorite: isFavorite ? 1 : 0 }),
                    ...(isPinned !== undefined && { is_pinned: isPinned ? 1 : 0 }),
                }

                return {
                    entries: state.entries.map(e =>
                        e.id === id ? { ...e, ...patch } : e
                    ),
                    currentEntry: state.currentEntry?.id === id
                        ? { ...state.currentEntry, ...patch }
                        : state.currentEntry,
                    isSaving: false,
                    isDirty: false,
                }
            })

            return true
        } catch (err) {
            console.error('[EntryStore] updateEntry:', err)
            set({ isSaving: false })
            return false
        }
    },

    // ── Delete Entry (soft) ─────────────────────────────────────────────────────
    deleteEntry: async (id: string) => {
        try {
            await window.electronAPI.db.run(
                'UPDATE entries SET is_deleted = 1, deleted_at = ? WHERE id = ?',
                [new Date().toISOString(), id]
            )
            set(state => ({
                entries: state.entries.filter(e => e.id !== id),
                currentEntry: state.currentEntry?.id === id ? null : state.currentEntry,
            }))
            await get().loadStats()
            return true
        } catch (err) {
            console.error('[EntryStore] deleteEntry:', err)
            return false
        }
    },

    // ── Restore from Trash ──────────────────────────────────────────────────────
    restoreEntry: async (id: string) => {
        try {
            await window.electronAPI.db.run(
                'UPDATE entries SET is_deleted = 0, deleted_at = NULL WHERE id = ?',
                [id]
            )
            set(state => ({
                trashEntries: state.trashEntries.filter(e => e.id !== id),
            }))
            await get().loadStats()
            return true
        } catch (err) {
            console.error('[EntryStore] restoreEntry:', err)
            return false
        }
    },

    // ── Permanent Delete ────────────────────────────────────────────────────────
    permanentDelete: async (id: string) => {
        try {
            await window.electronAPI.db.run(
                'DELETE FROM entries WHERE id = ?', [id]
            )
            set(state => ({
                trashEntries: state.trashEntries.filter(e => e.id !== id),
            }))
            await get().loadStats()
            return true
        } catch (err) {
            console.error('[EntryStore] permanentDelete:', err)
            return false
        }
    },

    // ── Toggle Favorite ─────────────────────────────────────────────────────────
    toggleFavorite: async (id: string) => {
        const entry = get().entries.find(e => e.id === id)
            ?? get().currentEntry
        if (!entry) return

        const newVal = entry.is_favorite ? 0 : 1
        await window.electronAPI.db.run(
            'UPDATE entries SET is_favorite = ?, updated_at = ? WHERE id = ?',
            [newVal, new Date().toISOString(), id]
        )
        set(state => ({
            entries: state.entries.map(e =>
                e.id === id ? { ...e, is_favorite: newVal } : e
            ),
            currentEntry: state.currentEntry?.id === id
                ? { ...state.currentEntry, is_favorite: newVal }
                : state.currentEntry,
        }))
    },

    // ── Toggle Pin ──────────────────────────────────────────────────────────────
    togglePin: async (id: string) => {
        const entry = get().entries.find(e => e.id === id)
            ?? get().currentEntry
        if (!entry) return

        const newVal = entry.is_pinned ? 0 : 1
        await window.electronAPI.db.run(
            'UPDATE entries SET is_pinned = ?, updated_at = ? WHERE id = ?',
            [newVal, new Date().toISOString(), id]
        )
        set(state => ({
            entries: state.entries.map(e =>
                e.id === id ? { ...e, is_pinned: newVal } : e
            ),
            currentEntry: state.currentEntry?.id === id
                ? { ...state.currentEntry, is_pinned: newVal }
                : state.currentEntry,
        }))
    },

    // ── Create Tag ──────────────────────────────────────────────────────────────
    createTag: async (name: string, color = '#6366f1', icon = '🏷️') => {
        try {
            const id = generateId()
            await window.electronAPI.db.run(
                'INSERT OR IGNORE INTO tags (id, name, color, icon, created_at) VALUES (?, ?, ?, ?, ?)',
                [id, name, color, icon, new Date().toISOString()]
            )
            await get().loadTags()
            return id
        } catch (err) {
            console.error('[EntryStore] createTag:', err)
            return null
        }
    },

    // ── Delete Tag ──────────────────────────────────────────────────────────────
    deleteTag: async (id: string) => {
        try {
            await window.electronAPI.db.run('DELETE FROM tags WHERE id = ?', [id])
            set(state => ({ tags: state.tags.filter(t => t.id !== id) }))
        } catch (err) {
            console.error('[EntryStore] deleteTag:', err)
        }
    },

    // ── Search ──────────────────────────────────────────────────────────────────
    search: async (query: string, type?: EntryType) => {
        if (!query.trim()) {
            set({ searchResults: [], isSearching: false, searchQuery: '' })
            return
        }
        set({ isSearching: true, searchQuery: query })
        try {
            // Simple LIKE search on plain text (FTS5 will be used in Phase 5)
            const sql = type
                ? `SELECT * FROM entries
           WHERE is_deleted = 0 AND type = ?
             AND (title LIKE ? OR content_plain LIKE ?)
           ORDER BY updated_at DESC LIMIT 50`
                : `SELECT * FROM entries
           WHERE is_deleted = 0
             AND (title LIKE ? OR content_plain LIKE ?)
           ORDER BY updated_at DESC LIMIT 50`

            const likeQ = `%${query}%`
            const params = type ? [type, likeQ, likeQ] : [likeQ, likeQ]

            const res = await window.electronAPI.db.all(sql, params) as Entry[]
            set({ searchResults: res ?? [], isSearching: false })
        } catch (err) {
            console.error('[EntryStore] search:', err)
            set({ isSearching: false })
        }
    },

    clearSearch: () => {
        set({ searchQuery: '', searchResults: [], isSearching: false })
    },

    // ── Editor Actions ──────────────────────────────────────────────────────────
    setCurrentEntry: (entry) => set({ currentEntry: entry, isDirty: false }),

    setDirty: (dirty) => set({ isDirty: dirty }),

    // Auto-save: debounced 2 seconds after last keystroke
    scheduleAutoSave: (id: string, data: UpdateEntryInput) => {
        // Cancel previous timer
        const prev = get().autoSaveTimer
        if (prev) clearTimeout(prev)

        const timer = setTimeout(async () => {
            await get().saveNow(id, data)
        }, 2000)

        set({ autoSaveTimer: timer, isDirty: true })
    },

    cancelAutoSave: () => {
        const timer = get().autoSaveTimer
        if (timer) clearTimeout(timer)
        set({ autoSaveTimer: null })
    },

    saveNow: async (id: string, data: UpdateEntryInput) => {
        get().cancelAutoSave()
        await get().updateEntry(id, data)
    },

    // ── UI Actions ──────────────────────────────────────────────────────────────
    setActiveType: (type) => set({ activeType: type }),
    setSelectedTag: (tagId) => set({ selectedTagId: tagId }),
    setSortBy: (by) => set({ sortBy: by }),
    setSortOrder: (order) => set({ sortOrder: order }),
    setViewMode: (mode) => set({ viewMode: mode }),
    setSearchQuery: (q) => set({ searchQuery: q }),
}))

// ─── Selectors (use these in components for performance) ──────────────────────

/** Filtered + sorted entries based on current UI state */
export function useFilteredEntries() {
    return useEntryStore(state => {
        let list = [...state.entries]

        // Filter by type
        if (state.activeType !== 'all') {
            list = list.filter(e => e.type === state.activeType)
        }

        // Filter by tag
        if (state.selectedTagId) {
            list = list.filter(e =>
                e.tags?.some(t => t.id === state.selectedTagId)
            )
        }

        // Sort
        list.sort((a, b) => {
            const av = (a as any)[state.sortBy] ?? ''
            const bv = (b as any)[state.sortBy] ?? ''
            const cmp = av < bv ? -1 : av > bv ? 1 : 0
            return state.sortOrder === 'asc' ? cmp : -cmp
        })

        // Pinned first
        const pinned = list.filter(e => e.is_pinned)
        const unpinned = list.filter(e => !e.is_pinned)
        return [...pinned, ...unpinned]
    })
}

/** Today's diary entries */
export function useTodayEntries() {
    return useEntryStore(state =>
        state.entries.filter(
            e => e.type === 'diary' && e.entry_date === today()
        )
    )
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function generateId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = (Math.random() * 16) | 0
        const v = c === 'x' ? r : (r & 0x3) | 0x8
        return v.toString(16)
    })
}

function today(): string {
    return new Date().toISOString().split('T')[0]
}

function countWords(text: string): number {
    return text.trim().split(/\s+/).filter(Boolean).length
}