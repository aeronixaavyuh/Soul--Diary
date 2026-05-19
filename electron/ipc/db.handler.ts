import { ipcMain } from 'electron'
import { db }         from '../services/database'
import { encryption,
  ENTRY_ENCRYPTED_FIELDS,
  TASK_ENCRYPTED_FIELDS,
  TAG_ENCRYPTED_FIELDS,
  HABIT_ENCRYPTED_FIELDS,
  TEMPLATE_ENCRYPTED_FIELDS,
} from '../services/encryption'

// ─── Helper: generate UUID ────────────────────────────────────────────────────
function uid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// ─── Helper: today as YYYY-MM-DD ──────────────────────────────────────────────
function today(): string {
  return new Date().toISOString().split('T')[0]
}

// ─── Helper: now as ISO string ────────────────────────────────────────────────
function now(): string {
  return new Date().toISOString()
}

// ─────────────────────────────────────────────────────────────────────────────
//  Register ALL IPC handlers
//  Called once from electron/main.ts
// ─────────────────────────────────────────────────────────────────────────────
export function registerDbHandlers(): void {

  // ── Raw DB access (used by preload bridge) ──────────────────────────────────
  ipcMain.handle('db:run', (_e, sql: string, params: unknown[] = []) => {
    return db.run(sql, params)
  })
  ipcMain.handle('db:get', (_e, sql: string, params: unknown[] = []) => {
    return db.get(sql, params)
  })
  ipcMain.handle('db:all', (_e, sql: string, params: unknown[] = []) => {
    return db.all(sql, params)
  })

  // ════════════════════════════════════════════════════════════════════════════
  //  ENCRYPTION SETUP
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Initialize encryption on app start.
   * If user has no PIN → use device key.
   * If user has PIN   → called after PIN verified.
   */
  ipcMain.handle('encryption:init', (_e, password?: string) => {
    try {
      // Get stored salt from settings
      const storedSalt = db.getSetting('encSalt')

      let salt: string
      if (password) {
        // PIN-based encryption
        salt = encryption.init(password, storedSalt ?? undefined)
      } else {
        // Device-key encryption (no PIN)
        const machineId = db.getSetting('machineId') ?? uid()
        db.setSetting('machineId', machineId)
        salt = encryption.initWithDeviceKey(machineId)
      }

      // Store salt for future launches
      db.setSetting('encSalt', salt)
      return { success: true }
    } catch (err: any) {
      console.error('[IPC] encryption:init failed:', err)
      return { success: false, error: err.message }
    }
  })

  // ════════════════════════════════════════════════════════════════════════════
  //  PIN MANAGEMENT
  // ════════════════════════════════════════════════════════════════════════════

  ipcMain.handle('pin:set', (_e, pin: string) => {
    try {
      const hash = encryption.hashPin(pin)
      db.setSetting('pinHash', hash)
      db.setSetting('hasPin', 'true')

      // Re-init encryption with the PIN as password
      const storedSalt = db.getSetting('encSalt')
      const newSalt    = encryption.init(pin, storedSalt ?? undefined)
      db.setSetting('encSalt', newSalt)

      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('pin:verify', (_e, pin: string) => {
    try {
      const stored = db.getSetting('pinHash')
      if (!stored) return { success: false, error: 'No PIN set' }

      const valid = encryption.verifyPin(pin, stored)
      if (valid) {
        // Init encryption with the verified PIN
        const storedSalt = db.getSetting('encSalt')
        encryption.init(pin, storedSalt ?? undefined)
        return { success: true }
      }
      return { success: false, error: 'Wrong PIN' }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('pin:remove', () => {
    db.setSetting('hasPin',   'false')
    db.setSetting('pinHash',  '')
    return { success: true }
  })

  ipcMain.handle('pin:hasPin', () => {
    return db.getSetting('hasPin') === 'true'
  })

  // ════════════════════════════════════════════════════════════════════════════
  //  ENTRIES  (Diary / Notes / Ideas)
  // ════════════════════════════════════════════════════════════════════════════

  // ── Create ─────────────────────────────────────────────────────────────────
  ipcMain.handle('entry:create', (_e, data: {
    type:        'diary' | 'note' | 'idea'
    title?:      string
    content?:    string
    contentPlain?: string
    mood?:       string
    moodScore?:  number
    color?:      string
    weather?:    string
    location?:   string
    templateId?: string
    entryDate?:  string
    tags?:       string[]
  }) => {
    try {
      const id        = uid()
      const timestamp = now()
      const entryDate = data.entryDate ?? today()

      // Encrypt sensitive fields
      const encrypted = encryption.encryptFields({
        title:         data.title        ?? '',
        content:       data.content      ?? '',
        content_plain: data.contentPlain ?? '',
        mood:          data.mood         ?? null,
        weather:       data.weather      ?? null,
        location:      data.location     ?? null,
      }, ['title', 'content', 'content_plain', 'mood', 'weather', 'location'])

      db.createEntry({
        id,
        type:          data.type,
        title:         encrypted.title,
        content:       encrypted.content,
        content_plain: encrypted.content_plain,
        mood:          encrypted.mood,
        mood_score:    data.moodScore    ?? 0,
        color:         data.color        ?? '#6366f1',
        cover_image:   null,
        is_favorite:   0,
        is_pinned:     0,
        is_deleted:    0,
        word_count:    countWords(data.contentPlain ?? ''),
        char_count:    (data.contentPlain ?? '').length,
        read_time:     Math.ceil(countWords(data.contentPlain ?? '') / 200),
        weather:       encrypted.weather,
        location:      encrypted.location,
        template_id:   data.templateId  ?? null,
        version:       1,
        created_at:    timestamp,
        updated_at:    timestamp,
        deleted_at:    null,
        entry_date:    entryDate,
      })

      // Add tags if provided
      if (data.tags?.length) {
        for (const tagId of data.tags) {
          db.addTagToEntry(id, tagId)
        }
      }

      // Update search index (plain text for searching)
      db.updateSearchIndex(
        id, data.type,
        data.title        ?? '',
        data.contentPlain ?? '',
        ''
      )

      return { success: true, id }
    } catch (err: any) {
      console.error('[IPC] entry:create failed:', err)
      return { success: false, error: err.message }
    }
  })

  // ── Get single entry ────────────────────────────────────────────────────────
  ipcMain.handle('entry:get', (_e, id: string) => {
    try {
      const entry = db.getEntry(id)
      if (!entry) return { success: false, error: 'Not found' }

      const decrypted = encryption.decryptFields(
        entry, [...ENTRY_ENCRYPTED_FIELDS]
      )
      const tags = db.getEntryTags(id)

      return {
        success: true,
        entry: {
          ...decrypted,
          tags: encryption.decryptArray(tags, [...TAG_ENCRYPTED_FIELDS]),
        },
      }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  // ── Get all entries (list view) ─────────────────────────────────────────────
  ipcMain.handle('entry:list', (_e, type?: 'diary' | 'note' | 'idea') => {
    try {
      const entries = db.getEntries(type)
      const decrypted = entries.map(e => {
        const dec = encryption.decryptFields(e, [...ENTRY_ENCRYPTED_FIELDS])
        return {
          ...dec,
          // Only return preview (first 120 chars) for list view performance
          content:       undefined,
          content_plain: dec.content_plain?.slice(0, 120) ?? '',
        }
      })
      return { success: true, entries: decrypted }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  // ── Get entries by date ─────────────────────────────────────────────────────
  ipcMain.handle('entry:byDate', (_e, date: string) => {
    try {
      const entries   = db.getEntriesByDate(date)
      const decrypted = entries.map(e =>
        encryption.decryptFields(e, [...ENTRY_ENCRYPTED_FIELDS])
      )
      return { success: true, entries: decrypted }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  // ── Update entry ────────────────────────────────────────────────────────────
  ipcMain.handle('entry:update', (_e, id: string, data: {
    title?:        string
    content?:      string
    contentPlain?: string
    mood?:         string
    moodScore?:    number
    color?:        string
    weather?:      string
    location?:     string
    isFavorite?:   boolean
    isPinned?:     boolean
    tags?:         string[]
  }) => {
    try {
      const existing = db.getEntry(id)
      if (!existing) return { success: false, error: 'Not found' }

      // Build update fields
      const updateFields: Record<string, any> = {
        updated_at: now(),
      }

      // Encrypt text fields if provided
      if (data.title        !== undefined) updateFields.title         = encryption.encrypt(data.title)
      if (data.content      !== undefined) updateFields.content       = encryption.encrypt(data.content)
      if (data.mood         !== undefined) updateFields.mood          = encryption.encrypt(data.mood)
      if (data.weather      !== undefined) updateFields.weather       = encryption.encrypt(data.weather)
      if (data.location     !== undefined) updateFields.location      = encryption.encrypt(data.location)
      if (data.moodScore    !== undefined) updateFields.mood_score    = data.moodScore
      if (data.color        !== undefined) updateFields.color         = data.color
      if (data.isFavorite   !== undefined) updateFields.is_favorite   = data.isFavorite ? 1 : 0
      if (data.isPinned     !== undefined) updateFields.is_pinned     = data.isPinned   ? 1 : 0

      if (data.contentPlain !== undefined) {
        updateFields.content_plain = encryption.encrypt(data.contentPlain)
        updateFields.word_count    = countWords(data.contentPlain)
        updateFields.char_count    = data.contentPlain.length
        updateFields.read_time     = Math.ceil(countWords(data.contentPlain) / 200)
      }

      // Save version before update
      const newVersion = (existing.version ?? 1) + 1
      updateFields.version = newVersion
      db.saveVersion(id, existing.content, existing.version ?? 1)

      db.updateEntry(id, updateFields)

      // Update tags if provided
      if (data.tags !== undefined) {
        // Remove all existing tags and re-add
        db.run('DELETE FROM entry_tags WHERE entry_id = ?', [id])
        for (const tagId of data.tags) {
          db.addTagToEntry(id, tagId)
        }
      }

      // Update search index
      if (data.contentPlain !== undefined || data.title !== undefined) {
        const updatedEntry = db.getEntry(id)
        if (updatedEntry) {
          const dec = encryption.decryptFields(updatedEntry, [...ENTRY_ENCRYPTED_FIELDS])
          db.updateSearchIndex(
            id, updatedEntry.type,
            dec.title ?? '',
            dec.content_plain ?? '',
            ''
          )
        }
      }

      return { success: true }
    } catch (err: any) {
      console.error('[IPC] entry:update failed:', err)
      return { success: false, error: err.message }
    }
  })

  // ── Delete (soft) ───────────────────────────────────────────────────────────
  ipcMain.handle('entry:delete', (_e, id: string) => {
    try {
      db.softDeleteEntry(id)
      db.run('DELETE FROM search_index WHERE entry_id = ?', [id])
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  // ── Restore from trash ──────────────────────────────────────────────────────
  ipcMain.handle('entry:restore', (_e, id: string) => {
    try {
      db.restoreEntry(id)
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  // ── Permanent delete ────────────────────────────────────────────────────────
  ipcMain.handle('entry:deletePermanent', (_e, id: string) => {
    try {
      db.permanentDeleteEntry(id)
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  // ── Trash list ──────────────────────────────────────────────────────────────
  ipcMain.handle('entry:trash', () => {
    try {
      const entries   = db.getTrash()
      const decrypted = entries.map(e =>
        encryption.decryptFields(e, [...ENTRY_ENCRYPTED_FIELDS])
      )
      return { success: true, entries: decrypted }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  // ── Favorites ───────────────────────────────────────────────────────────────
  ipcMain.handle('entry:favorites', () => {
    try {
      const entries   = db.getFavorites()
      const decrypted = entries.map(e =>
        encryption.decryptFields(e, [...ENTRY_ENCRYPTED_FIELDS])
      )
      return { success: true, entries: decrypted }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  // ── Version history ─────────────────────────────────────────────────────────
  ipcMain.handle('entry:versions', (_e, entryId: string) => {
    try {
      const versions = db.getVersions(entryId)
      return {
        success: true,
        versions: versions.map((v: any) => ({
          ...v,
          content: encryption.decrypt(v.content),
        })),
      }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  // ════════════════════════════════════════════════════════════════════════════
  //  TASKS
  // ════════════════════════════════════════════════════════════════════════════

  ipcMain.handle('task:create', (_e, data: {
    title:        string
    description?: string
    priority?:    'low' | 'medium' | 'high' | 'urgent'
    dueDate?:     string
    reminderAt?:  string
    parentId?:    string
    entryId?:     string
    tags?:        string[]
  }) => {
    try {
      const id        = uid()
      const timestamp = now()

      const encrypted = encryption.encryptFields({
        title:       data.title,
        description: data.description ?? '',
      }, ['title', 'description'])

      db.createTask({
        id,
        title:        encrypted.title,
        description:  encrypted.description,
        status:       'todo',
        priority:     data.priority   ?? 'medium',
        due_date:     data.dueDate    ?? null,
        reminder_at:  data.reminderAt ?? null,
        is_deleted:   0,
        is_pinned:    0,
        sort_order:   0,
        parent_id:    data.parentId   ?? null,
        entry_id:     data.entryId    ?? null,
        created_at:   timestamp,
        updated_at:   timestamp,
        completed_at: null,
      })

      if (data.tags?.length) {
        for (const tagId of data.tags) {
          db.run(
            'INSERT OR IGNORE INTO task_tags (task_id, tag_id) VALUES (?, ?)',
            [id, tagId]
          )
        }
      }

      return { success: true, id }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('task:list', (_e, status?: string) => {
    try {
      const tasks     = db.getTasks(status)
      const decrypted = tasks.map(t =>
        encryption.decryptFields(t, [...TASK_ENCRYPTED_FIELDS])
      )
      return { success: true, tasks: decrypted }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('task:update', (_e, id: string, data: {
    title?:       string
    description?: string
    status?:      'todo' | 'in_progress' | 'done' | 'cancelled'
    priority?:    'low' | 'medium' | 'high' | 'urgent'
    dueDate?:     string | null
    isPinned?:    boolean
  }) => {
    try {
      const fields: Record<string, any> = { updated_at: now() }

      if (data.title       !== undefined) fields.title       = encryption.encrypt(data.title)
      if (data.description !== undefined) fields.description = encryption.encrypt(data.description)
      if (data.status      !== undefined) {
        fields.status = data.status
        if (data.status === 'done') fields.completed_at = now()
      }
      if (data.priority    !== undefined) fields.priority    = data.priority
      if (data.dueDate     !== undefined) fields.due_date    = data.dueDate
      if (data.isPinned    !== undefined) fields.is_pinned   = data.isPinned ? 1 : 0

      db.updateTask(id, fields)
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('task:delete', (_e, id: string) => {
    try {
      db.softDeleteTask(id)
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  // ════════════════════════════════════════════════════════════════════════════
  //  TAGS
  // ════════════════════════════════════════════════════════════════════════════

  ipcMain.handle('tag:create', (_e, data: {
    name:   string
    color?: string
    icon?:  string
  }) => {
    try {
      const id  = uid()
      const tag = {
        id,
        name:       encryption.encrypt(data.name),
        color:      data.color ?? '#6366f1',
        icon:       data.icon  ?? '🏷️',
        created_at: now(),
      }
      db.createTag(tag)
      return { success: true, id }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('tag:list', () => {
    try {
      const tags = db.getTags()
      return {
        success: true,
        tags: encryption.decryptArray(tags, [...TAG_ENCRYPTED_FIELDS]),
      }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('tag:delete', (_e, id: string) => {
    try {
      db.run('DELETE FROM tags WHERE id = ?', [id])
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  // ════════════════════════════════════════════════════════════════════════════
  //  HABITS
  // ════════════════════════════════════════════════════════════════════════════

  ipcMain.handle('habit:create', (_e, data: {
    name:        string
    description?: string
    icon?:       string
    color?:      string
    frequency?:  string
    targetDays?: number[]
  }) => {
    try {
      const id = uid()
      db.createHabit({
        id,
        name:        encryption.encrypt(data.name),
        description: encryption.encrypt(data.description ?? ''),
        icon:        data.icon        ?? '⭐',
        color:       data.color       ?? '#6366f1',
        frequency:   data.frequency   ?? 'daily',
        target_days: JSON.stringify(data.targetDays ?? []),
        is_active:   1,
        streak:      0,
        best_streak: 0,
        created_at:  now(),
      })
      return { success: true, id }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('habit:list', () => {
    try {
      const habits = db.getHabits()
      return {
        success: true,
        habits: encryption.decryptArray(habits, [...HABIT_ENCRYPTED_FIELDS]),
      }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('habit:log', (_e, habitId: string, date: string, note?: string) => {
    try {
      db.logHabit(uid(), habitId, date, note ?? '')
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('habit:logs', (_e, habitId: string, from: string, to: string) => {
    try {
      const logs = db.getHabitLogs(habitId, from, to)
      return { success: true, logs }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  // ════════════════════════════════════════════════════════════════════════════
  //  SETTINGS
  // ════════════════════════════════════════════════════════════════════════════

  ipcMain.handle('settings:get', (_e, key: string) => {
    try {
      const value = db.getSetting(key)
      return { success: true, value }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('settings:set', (_e, key: string, value: string) => {
    try {
      db.setSetting(key, value)
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('settings:getAll', () => {
    try {
      const all = db.getAllSettings()
      return { success: true, settings: all }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  // ════════════════════════════════════════════════════════════════════════════
  //  SEARCH
  // ════════════════════════════════════════════════════════════════════════════

  ipcMain.handle('search:query', (_e, query: string, type?: string) => {
    try {
      if (!query.trim()) return { success: true, results: [] }

      const ids = db.search(query, type)
      const results = ids.map(({ entry_id, entry_type }) => {
        const entry = db.getEntry(entry_id)
        if (!entry) return null
        const dec = encryption.decryptFields(entry, [...ENTRY_ENCRYPTED_FIELDS])
        return {
          id:            entry_id,
          type:          entry_type,
          title:         dec.title,
          preview:       dec.content_plain?.slice(0, 150) ?? '',
          entry_date:    entry.entry_date,
          updated_at:    entry.updated_at,
        }
      }).filter(Boolean)

      return { success: true, results }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  // ════════════════════════════════════════════════════════════════════════════
  //  STATS
  // ════════════════════════════════════════════════════════════════════════════

  ipcMain.handle('stats:get', () => {
    try {
      return { success: true, stats: db.getStats() }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  // ════════════════════════════════════════════════════════════════════════════
  //  WORD PREDICTIONS  (smart typing)
  // ════════════════════════════════════════════════════════════════════════════

  ipcMain.handle('predict:add', (_e, phrase: string, context: string) => {
    try {
      db.upsertPrediction(uid(), encryption.encrypt(phrase), context)
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('predict:get', (_e, prefix: string, context: string) => {
    try {
      // Get encrypted predictions matching encrypted prefix
      const results = db.getPredictions(
        encryption.encrypt(prefix), context
      )
      return {
        success: true,
        predictions: results.map((r: any) => ({
          ...r,
          phrase: encryption.decrypt(r.phrase),
        })),
      }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  console.log('[IPC] All DB handlers registered ✓')
}

// ─── Utility ──────────────────────────────────────────────────────────────────
function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}