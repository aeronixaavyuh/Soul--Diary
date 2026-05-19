import Database from 'better-sqlite3'
import { app }  from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DbEntry {
  id: string; type: 'diary' | 'note' | 'idea'
  title: string; content: string; content_plain: string
  mood: string | null; mood_score: number; color: string
  cover_image: string | null; is_favorite: number; is_pinned: number
  is_deleted: number; word_count: number; char_count: number
  read_time: number; weather: string | null; location: string | null
  template_id: string | null; version: number
  created_at: string; updated_at: string
  deleted_at: string | null; entry_date: string
}

export interface DbTask {
  id: string; title: string; description: string
  status: 'todo' | 'in_progress' | 'done' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  due_date: string | null; reminder_at: string | null
  is_deleted: number; is_pinned: number; sort_order: number
  parent_id: string | null; entry_id: string | null
  created_at: string; updated_at: string; completed_at: string | null
}

export interface DbTag {
  id: string; name: string; color: string
  icon: string; created_at: string
}

export interface DbHabit {
  id: string; name: string; description: string
  icon: string; color: string; frequency: string
  target_days: string; is_active: number
  streak: number; best_streak: number; created_at: string
}

// ─── DatabaseService ──────────────────────────────────────────────────────────

class DatabaseService {
  private db: Database.Database | null = null
  private dbPath: string = ''

  // ── Init ───────────────────────────────────────────────────────────────────

  init(customPath?: string): void {
    try {
      const dataDir = customPath ?? app.getPath('userData')
      if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true })

      this.dbPath = join(dataDir, 'soul-diary.db')
      this.db     = new Database(this.dbPath)

      this.db.pragma('journal_mode = WAL')
      this.db.pragma('foreign_keys = ON')
      this.db.pragma('cache_size = -32000')
      this.db.pragma('synchronous = NORMAL')
      this.db.pragma('temp_store = MEMORY')

      this.createAllTables()
      this.runMigrations()

      console.log('[DB] Ready:', this.dbPath)
    } catch (err) {
      console.error('[DB] Init failed:', err)
      throw err
    }
  }

  // ── Create All Tables ──────────────────────────────────────────────────────

  private createAllTables(): void {
    this.db!.exec(`

      CREATE TABLE IF NOT EXISTS entries (
        id            TEXT PRIMARY KEY,
        type          TEXT NOT NULL,
        title         TEXT NOT NULL DEFAULT '',
        content       TEXT NOT NULL DEFAULT '',
        content_plain TEXT NOT NULL DEFAULT '',
        mood          TEXT,
        mood_score    INTEGER DEFAULT 0,
        color         TEXT DEFAULT '#6366f1',
        cover_image   TEXT,
        is_favorite   INTEGER DEFAULT 0,
        is_pinned     INTEGER DEFAULT 0,
        is_deleted    INTEGER DEFAULT 0,
        word_count    INTEGER DEFAULT 0,
        char_count    INTEGER DEFAULT 0,
        read_time     INTEGER DEFAULT 0,
        weather       TEXT,
        location      TEXT,
        template_id   TEXT,
        version       INTEGER DEFAULT 1,
        created_at    TEXT NOT NULL,
        updated_at    TEXT NOT NULL,
        deleted_at    TEXT,
        entry_date    TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id           TEXT PRIMARY KEY,
        title        TEXT NOT NULL,
        description  TEXT DEFAULT '',
        status       TEXT DEFAULT 'todo',
        priority     TEXT DEFAULT 'medium',
        due_date     TEXT,
        reminder_at  TEXT,
        is_deleted   INTEGER DEFAULT 0,
        is_pinned    INTEGER DEFAULT 0,
        sort_order   INTEGER DEFAULT 0,
        parent_id    TEXT,
        entry_id     TEXT,
        created_at   TEXT NOT NULL,
        updated_at   TEXT NOT NULL,
        completed_at TEXT
      );

      CREATE TABLE IF NOT EXISTS tags (
        id         TEXT PRIMARY KEY,
        name       TEXT NOT NULL UNIQUE,
        color      TEXT DEFAULT '#6366f1',
        icon       TEXT DEFAULT '🏷️',
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS entry_tags (
        entry_id TEXT NOT NULL,
        tag_id   TEXT NOT NULL,
        PRIMARY KEY (entry_id, tag_id)
      );

      CREATE TABLE IF NOT EXISTS task_tags (
        task_id TEXT NOT NULL,
        tag_id  TEXT NOT NULL,
        PRIMARY KEY (task_id, tag_id)
      );

      CREATE TABLE IF NOT EXISTS habits (
        id          TEXT PRIMARY KEY,
        name        TEXT NOT NULL,
        description TEXT DEFAULT '',
        icon        TEXT DEFAULT '⭐',
        color       TEXT DEFAULT '#6366f1',
        frequency   TEXT DEFAULT 'daily',
        target_days TEXT DEFAULT '[]',
        is_active   INTEGER DEFAULT 1,
        streak      INTEGER DEFAULT 0,
        best_streak INTEGER DEFAULT 0,
        created_at  TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS habit_logs (
        id         TEXT PRIMARY KEY,
        habit_id   TEXT NOT NULL,
        log_date   TEXT NOT NULL,
        completed  INTEGER DEFAULT 1,
        note       TEXT DEFAULT '',
        created_at TEXT NOT NULL,
        UNIQUE(habit_id, log_date)
      );

      CREATE TABLE IF NOT EXISTS templates (
        id          TEXT PRIMARY KEY,
        name        TEXT NOT NULL,
        description TEXT DEFAULT '',
        type        TEXT DEFAULT 'note',
        category    TEXT DEFAULT 'custom',
        icon        TEXT DEFAULT '📝',
        content     TEXT DEFAULT '{}',
        preview     TEXT DEFAULT '',
        is_builtin  INTEGER DEFAULT 0,
        is_favorite INTEGER DEFAULT 0,
        use_count   INTEGER DEFAULT 0,
        tags        TEXT DEFAULT '',
        is_active   INTEGER DEFAULT 1,
        created_at  TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS app_settings (
        key        TEXT PRIMARY KEY,
        value      TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS word_predictions (
        id        TEXT PRIMARY KEY,
        phrase    TEXT NOT NULL UNIQUE,
        frequency INTEGER DEFAULT 1,
        last_used TEXT NOT NULL,
        context   TEXT DEFAULT ''
      );

      CREATE TABLE IF NOT EXISTS media (
        id         TEXT PRIMARY KEY,
        entry_id   TEXT,
        file_name  TEXT NOT NULL,
        file_path  TEXT NOT NULL,
        file_type  TEXT NOT NULL,
        file_size  INTEGER DEFAULT 0,
        mime_type  TEXT,
        width      INTEGER,
        height     INTEGER,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS entry_versions (
        id         TEXT PRIMARY KEY,
        entry_id   TEXT NOT NULL,
        content    TEXT NOT NULL,
        version    INTEGER NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS reminders (
        id         TEXT PRIMARY KEY,
        title      TEXT NOT NULL,
        body       TEXT DEFAULT '',
        remind_at  TEXT NOT NULL,
        repeat     TEXT DEFAULT 'none',
        is_done    INTEGER DEFAULT 0,
        entry_id   TEXT,
        created_at TEXT NOT NULL
      );

    `)
  }

  // ── Migrations — purani DB ke liye ────────────────────────────────────────

  private runMigrations(): void {
    const migrations = [
      // Templates — new columns
      `ALTER TABLE templates ADD COLUMN category    TEXT    DEFAULT 'custom'`,
      `ALTER TABLE templates ADD COLUMN icon        TEXT    DEFAULT '📝'`,
      `ALTER TABLE templates ADD COLUMN preview     TEXT    DEFAULT ''`,
      `ALTER TABLE templates ADD COLUMN is_builtin  INTEGER DEFAULT 0`,
      `ALTER TABLE templates ADD COLUMN is_favorite INTEGER DEFAULT 0`,
      `ALTER TABLE templates ADD COLUMN use_count   INTEGER DEFAULT 0`,
      `ALTER TABLE templates ADD COLUMN tags        TEXT    DEFAULT ''`,
      `ALTER TABLE templates ADD COLUMN is_active   INTEGER DEFAULT 1`,
      // Habits — safety
      `ALTER TABLE habits ADD COLUMN streak      INTEGER DEFAULT 0`,
      `ALTER TABLE habits ADD COLUMN best_streak INTEGER DEFAULT 0`,
    ]

    for (const sql of migrations) {
      try { this.db!.exec(sql) }
      catch { /* column already exists — ignore */ }
    }

    // Remove updated_at NOT NULL constraint issue by checking if old column exists
    // If templates has updated_at column (old schema), we handle it in INSERT
    console.log('[DB] Migrations done')
  }

  // ── Raw SQL ────────────────────────────────────────────────────────────────

  run(sql: string, params: unknown[] = []): Database.RunResult {
    this.assertReady()
    return this.db!.prepare(sql).run(...params)
  }

  get<T = Record<string, unknown>>(
    sql: string, params: unknown[] = []
  ): T | undefined {
    this.assertReady()
    return this.db!.prepare(sql).get(...params) as T | undefined
  }

  all<T = Record<string, unknown>>(
    sql: string, params: unknown[] = []
  ): T[] {
    this.assertReady()
    return this.db!.prepare(sql).all(...params) as T[]
  }

  transaction<T>(fn: () => T): T {
    this.assertReady()
    return this.db!.transaction(fn)()
  }

  // ── Entries ────────────────────────────────────────────────────────────────

  createEntry(entry: Omit<DbEntry, 'version'> & { version?: number }): string {
    this.run(`
      INSERT INTO entries
        (id, type, title, content, content_plain, mood, mood_score,
         color, cover_image, is_favorite, is_pinned, is_deleted,
         word_count, char_count, read_time, weather, location,
         template_id, version, created_at, updated_at, entry_date)
      VALUES
        (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `, [
      entry.id, entry.type, entry.title, entry.content,
      entry.content_plain, entry.mood ?? null, entry.mood_score ?? 0,
      entry.color ?? '#6366f1', entry.cover_image ?? null,
      entry.is_favorite ?? 0, entry.is_pinned ?? 0, 0,
      entry.word_count ?? 0, entry.char_count ?? 0, entry.read_time ?? 0,
      entry.weather ?? null, entry.location ?? null,
      entry.template_id ?? null, entry.version ?? 1,
      entry.created_at, entry.updated_at, entry.entry_date,
    ])
    return entry.id
  }

  updateEntry(id: string, fields: Partial<DbEntry>): void {
    const allowed = [
      'title','content','content_plain','mood','mood_score',
      'color','cover_image','is_favorite','is_pinned',
      'word_count','char_count','read_time','weather',
      'location','updated_at','version',
    ]
    const keys = Object.keys(fields).filter(k => allowed.includes(k))
    if (!keys.length) return
    const sets   = keys.map(k => `${k} = ?`).join(', ')
    const values = keys.map(k => (fields as any)[k])
    this.run(`UPDATE entries SET ${sets} WHERE id = ?`, [...values, id])
  }

  getEntry(id: string): DbEntry | undefined {
    return this.get<DbEntry>(
      'SELECT * FROM entries WHERE id = ? AND is_deleted = 0', [id]
    )
  }

  getEntries(type?: 'diary' | 'note' | 'idea'): DbEntry[] {
    if (type) {
      return this.all<DbEntry>(
        'SELECT * FROM entries WHERE type = ? AND is_deleted = 0 ORDER BY updated_at DESC',
        [type]
      )
    }
    return this.all<DbEntry>(
      'SELECT * FROM entries WHERE is_deleted = 0 ORDER BY updated_at DESC'
    )
  }

  getEntriesByDate(date: string): DbEntry[] {
    return this.all<DbEntry>(
      'SELECT * FROM entries WHERE entry_date = ? AND is_deleted = 0 ORDER BY created_at ASC',
      [date]
    )
  }

  softDeleteEntry(id: string): void {
    this.run(
      `UPDATE entries SET is_deleted = 1, deleted_at = ? WHERE id = ?`,
      [new Date().toISOString(), id]
    )
  }

  restoreEntry(id: string): void {
    this.run(
      `UPDATE entries SET is_deleted = 0, deleted_at = NULL WHERE id = ?`, [id]
    )
  }

  permanentDeleteEntry(id: string): void {
    this.run('DELETE FROM entries WHERE id = ?', [id])
  }

  getTrash(): DbEntry[] {
    return this.all<DbEntry>(
      'SELECT * FROM entries WHERE is_deleted = 1 ORDER BY deleted_at DESC'
    )
  }

  getFavorites(): DbEntry[] {
    return this.all<DbEntry>(
      'SELECT * FROM entries WHERE is_favorite = 1 AND is_deleted = 0 ORDER BY updated_at DESC'
    )
  }

  // ── Entry Versions ─────────────────────────────────────────────────────────

  saveVersion(entryId: string, content: string, version: number): void {
    const id = this.generateId()
    this.run(
      `INSERT INTO entry_versions (id, entry_id, content, version, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [id, entryId, content, version, new Date().toISOString()]
    )
    this.run(`
      DELETE FROM entry_versions
      WHERE entry_id = ? AND id NOT IN (
        SELECT id FROM entry_versions
        WHERE entry_id = ?
        ORDER BY version DESC LIMIT 20
      )
    `, [entryId, entryId])
  }

  getVersions(entryId: string) {
    return this.all(
      'SELECT * FROM entry_versions WHERE entry_id = ? ORDER BY version DESC',
      [entryId]
    )
  }

  // ── Tasks ──────────────────────────────────────────────────────────────────

  createTask(task: DbTask): string {
    this.run(`
      INSERT INTO tasks
        (id, title, description, status, priority, due_date,
         reminder_at, is_deleted, is_pinned, sort_order,
         parent_id, entry_id, created_at, updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `, [
      task.id, task.title, task.description ?? '',
      task.status ?? 'todo', task.priority ?? 'medium',
      task.due_date ?? null, task.reminder_at ?? null,
      0, task.is_pinned ?? 0, task.sort_order ?? 0,
      task.parent_id ?? null, task.entry_id ?? null,
      task.created_at, task.updated_at,
    ])
    return task.id
  }

  updateTask(id: string, fields: Partial<DbTask>): void {
    const allowed = [
      'title','description','status','priority','due_date',
      'reminder_at','is_pinned','sort_order','updated_at','completed_at',
    ]
    const keys = Object.keys(fields).filter(k => allowed.includes(k))
    if (!keys.length) return
    const sets   = keys.map(k => `${k} = ?`).join(', ')
    const values = keys.map(k => (fields as any)[k])
    this.run(`UPDATE tasks SET ${sets} WHERE id = ?`, [...values, id])
  }

  getTasks(status?: string): DbTask[] {
    if (status) {
      return this.all<DbTask>(
        'SELECT * FROM tasks WHERE status = ? AND is_deleted = 0 ORDER BY sort_order ASC',
        [status]
      )
    }
    return this.all<DbTask>(
      'SELECT * FROM tasks WHERE is_deleted = 0 ORDER BY sort_order ASC, created_at DESC'
    )
  }

  softDeleteTask(id: string): void {
    this.run(`UPDATE tasks SET is_deleted = 1 WHERE id = ?`, [id])
  }

  // ── Tags ───────────────────────────────────────────────────────────────────

  createTag(tag: DbTag): string {
    this.run(
      `INSERT OR IGNORE INTO tags (id, name, color, icon, created_at)
       VALUES (?,?,?,?,?)`,
      [tag.id, tag.name, tag.color ?? '#6366f1', tag.icon ?? '🏷️', tag.created_at]
    )
    return tag.id
  }

  getTags(): DbTag[] {
    return this.all<DbTag>('SELECT * FROM tags ORDER BY name ASC')
  }

  addTagToEntry(entryId: string, tagId: string): void {
    this.run(
      `INSERT OR IGNORE INTO entry_tags (entry_id, tag_id) VALUES (?,?)`,
      [entryId, tagId]
    )
  }

  removeTagFromEntry(entryId: string, tagId: string): void {
    this.run(
      `DELETE FROM entry_tags WHERE entry_id = ? AND tag_id = ?`,
      [entryId, tagId]
    )
  }

  getEntryTags(entryId: string): DbTag[] {
    return this.all<DbTag>(`
      SELECT t.* FROM tags t
      INNER JOIN entry_tags et ON t.id = et.tag_id
      WHERE et.entry_id = ?
    `, [entryId])
  }

  // ── Habits ─────────────────────────────────────────────────────────────────

  createHabit(habit: DbHabit): string {
    this.run(`
      INSERT INTO habits
        (id, name, description, icon, color, frequency,
         target_days, is_active, streak, best_streak, created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)
    `, [
      habit.id, habit.name, habit.description ?? '',
      habit.icon ?? '⭐', habit.color ?? '#6366f1',
      habit.frequency ?? 'daily', habit.target_days ?? '[]',
      1, 0, 0, habit.created_at,
    ])
    return habit.id
  }

  getHabits(): DbHabit[] {
    return this.all<DbHabit>(
      'SELECT * FROM habits WHERE is_active = 1 ORDER BY created_at ASC'
    )
  }

  logHabit(
    id: string, habitId: string,
    date: string, note: string = ''
  ): void {
    this.run(`
      INSERT OR REPLACE INTO habit_logs
        (id, habit_id, log_date, completed, note, created_at)
      VALUES (?,?,?,1,?,?)
    `, [id, habitId, date, note, new Date().toISOString()])
    this.updateHabitStreak(habitId)
  }

  getHabitLogs(habitId: string, fromDate: string, toDate: string) {
    return this.all(
      `SELECT * FROM habit_logs
       WHERE habit_id = ? AND log_date BETWEEN ? AND ?
       ORDER BY log_date ASC`,
      [habitId, fromDate, toDate]
    )
  }

  private updateHabitStreak(habitId: string): void {
    const logs = this.all<{ log_date: string }>(
      `SELECT log_date FROM habit_logs
       WHERE habit_id = ? AND completed = 1
       ORDER BY log_date DESC`,
      [habitId]
    )

    let streak    = 0
    let checkDate = new Date()
    checkDate.setHours(0, 0, 0, 0)

    for (const log of logs) {
      const logDate = new Date(log.log_date)
      logDate.setHours(0, 0, 0, 0)
      const diff = Math.round(
        (checkDate.getTime() - logDate.getTime()) / 86400000
      )
      if (diff === 0 || diff === 1) {
        streak++
        checkDate = logDate
      } else break
    }

    const current = this.get<{ best_streak: number }>(
      'SELECT best_streak FROM habits WHERE id = ?', [habitId]
    )
    const best = Math.max(streak, current?.best_streak ?? 0)
    this.run(
      `UPDATE habits SET streak = ?, best_streak = ? WHERE id = ?`,
      [streak, best, habitId]
    )
  }

  // ── Settings ───────────────────────────────────────────────────────────────

  getSetting(key: string): string | null {
    const row = this.get<{ value: string }>(
      'SELECT value FROM app_settings WHERE key = ?', [key]
    )
    return row?.value ?? null
  }

  setSetting(key: string, value: string): void {
    this.run(`
      INSERT INTO app_settings (key, value, updated_at)
      VALUES (?,?,?)
      ON CONFLICT(key) DO UPDATE
        SET value = excluded.value,
            updated_at = excluded.updated_at
    `, [key, value, new Date().toISOString()])
  }

  getAllSettings(): Record<string, string> {
    const rows = this.all<{ key: string; value: string }>(
      'SELECT key, value FROM app_settings'
    )
    return Object.fromEntries(rows.map(r => [r.key, r.value]))
  }

  // ── Word Predictions ───────────────────────────────────────────────────────

  upsertPrediction(
    id: string, phrase: string, context: string = 'any'
  ): void {
    this.run(`
      INSERT INTO word_predictions (id, phrase, frequency, last_used, context)
      VALUES (?,?,1,?,?)
      ON CONFLICT(phrase) DO UPDATE
        SET frequency = frequency + 1,
            last_used = excluded.last_used
    `, [id, phrase, new Date().toISOString(), context])
  }

  getPredictions(
    prefix: string, context: string = 'any', limit: number = 8
  ) {
    return this.all(`
      SELECT phrase, frequency FROM word_predictions
      WHERE phrase LIKE ? AND (context = ? OR context = 'any')
      ORDER BY frequency DESC LIMIT ?
    `, [`${prefix}%`, context, limit])
  }

  // ── Search ─────────────────────────────────────────────────────────────────

  search(query: string, type?: string) {
    const like = `%${query}%`
    if (type) {
      return this.all(`
        SELECT id, type, title, content_plain FROM entries
        WHERE is_deleted = 0 AND type = ?
          AND (title LIKE ? OR content_plain LIKE ?)
        ORDER BY updated_at DESC LIMIT 50
      `, [type, like, like])
    }
    return this.all(`
      SELECT id, type, title, content_plain FROM entries
      WHERE is_deleted = 0
        AND (title LIKE ? OR content_plain LIKE ?)
      ORDER BY updated_at DESC LIMIT 50
    `, [like, like])
  }

  // ── Stats ──────────────────────────────────────────────────────────────────

  getStats() {
    const c = (sql: string) =>
      (this.get<{ c: number }>(sql))?.c ?? 0
    const s = (sql: string) =>
      (this.get<{ s: number }>(sql))?.s ?? 0

    return {
      totalEntries: c('SELECT COUNT(*) as c FROM entries WHERE is_deleted=0'),
      diaryCount:   c('SELECT COUNT(*) as c FROM entries WHERE type="diary" AND is_deleted=0'),
      notesCount:   c('SELECT COUNT(*) as c FROM entries WHERE type="note"  AND is_deleted=0'),
      ideasCount:   c('SELECT COUNT(*) as c FROM entries WHERE type="idea"  AND is_deleted=0'),
      taskCount:    c('SELECT COUNT(*) as c FROM tasks   WHERE is_deleted=0'),
      habitCount:   c('SELECT COUNT(*) as c FROM habits  WHERE is_active=1'),
      trashCount:   c('SELECT COUNT(*) as c FROM entries WHERE is_deleted=1'),
      totalWords:   s('SELECT COALESCE(SUM(word_count),0) as s FROM entries WHERE is_deleted=0'),
    }
  }

  // ── Utilities ──────────────────────────────────────────────────────────────

  generateId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
    })
  }

  close(): void {
    this.db?.close()
    this.db = null
    console.log('[DB] Closed')
  }

  getPath(): string { return this.dbPath }

  private assertReady(): void {
    if (!this.db) throw new Error('[DB] Not initialized')
  }
}

export const db = new DatabaseService()