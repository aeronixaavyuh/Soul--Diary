"use strict";
const electron = require("electron");
const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");
const crypto = require("crypto");
function _interopNamespaceDefault(e) {
  const n = Object.create(null, { [Symbol.toStringTag]: { value: "Module" } });
  if (e) {
    for (const k in e) {
      if (k !== "default") {
        const d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: () => e[k]
        });
      }
    }
  }
  n.default = e;
  return Object.freeze(n);
}
const path__namespace = /* @__PURE__ */ _interopNamespaceDefault(path);
const fs__namespace = /* @__PURE__ */ _interopNamespaceDefault(fs);
const is = {
  dev: !electron.app.isPackaged
};
const platform = {
  isWindows: process.platform === "win32",
  isMacOS: process.platform === "darwin",
  isLinux: process.platform === "linux"
};
const electronApp = {
  setAppUserModelId(id) {
    if (platform.isWindows)
      electron.app.setAppUserModelId(is.dev ? process.execPath : id);
  },
  setAutoLaunch(auto) {
    if (platform.isLinux)
      return false;
    const isOpenAtLogin = () => {
      return electron.app.getLoginItemSettings().openAtLogin;
    };
    if (isOpenAtLogin() !== auto) {
      electron.app.setLoginItemSettings({ openAtLogin: auto });
      return isOpenAtLogin() === auto;
    } else {
      return true;
    }
  },
  skipProxy() {
    return electron.session.defaultSession.setProxy({ mode: "direct" });
  }
};
const optimizer = {
  watchWindowShortcuts(window, shortcutOptions) {
    if (!window)
      return;
    const { webContents } = window;
    const { escToCloseWindow = false, zoom = false } = shortcutOptions || {};
    webContents.on("before-input-event", (event, input) => {
      if (input.type === "keyDown") {
        if (!is.dev) {
          if (input.code === "KeyR" && (input.control || input.meta))
            event.preventDefault();
          if (input.code === "KeyI" && (input.alt && input.meta || input.control && input.shift)) {
            event.preventDefault();
          }
        } else {
          if (input.code === "F12") {
            if (webContents.isDevToolsOpened()) {
              webContents.closeDevTools();
            } else {
              webContents.openDevTools({ mode: "undocked" });
              console.log("Open dev tool...");
            }
          }
        }
        if (escToCloseWindow) {
          if (input.code === "Escape" && input.key !== "Process") {
            window.close();
            event.preventDefault();
          }
        }
        if (!zoom) {
          if (input.code === "Minus" && (input.control || input.meta))
            event.preventDefault();
          if (input.code === "Equal" && input.shift && (input.control || input.meta))
            event.preventDefault();
        }
      }
    });
  },
  registerFramelessWindowIpc() {
    electron.ipcMain.on("win:invoke", (event, action) => {
      const win = electron.BrowserWindow.fromWebContents(event.sender);
      if (win) {
        if (action === "show") {
          win.show();
        } else if (action === "showInactive") {
          win.showInactive();
        } else if (action === "min") {
          win.minimize();
        } else if (action === "max") {
          const isMaximized = win.isMaximized();
          if (isMaximized) {
            win.unmaximize();
          } else {
            win.maximize();
          }
        } else if (action === "close") {
          win.close();
        }
      }
    });
  }
};
class DatabaseService {
  constructor() {
    this.db = null;
    this.dbPath = "";
  }
  // ── Init ───────────────────────────────────────────────────────────────────
  init(customPath) {
    try {
      const dataDir = customPath ?? electron.app.getPath("userData");
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
      this.dbPath = path.join(dataDir, "soul-diary.db");
      this.db = new Database(this.dbPath);
      this.db.pragma("journal_mode = WAL");
      this.db.pragma("foreign_keys = ON");
      this.db.pragma("cache_size = -32000");
      this.db.pragma("synchronous = NORMAL");
      this.db.pragma("temp_store = MEMORY");
      this.createAllTables();
      this.runMigrations();
      console.log("[DB] Ready:", this.dbPath);
    } catch (err) {
      console.error("[DB] Init failed:", err);
      throw err;
    }
  }
  // ── Create All Tables ──────────────────────────────────────────────────────
  createAllTables() {
    this.db.exec(`

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

    `);
  }
  // ── Migrations — purani DB ke liye ────────────────────────────────────────
  runMigrations() {
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
      `ALTER TABLE habits ADD COLUMN best_streak INTEGER DEFAULT 0`
    ];
    for (const sql of migrations) {
      try {
        this.db.exec(sql);
      } catch {
      }
    }
    console.log("[DB] Migrations done");
  }
  // ── Raw SQL ────────────────────────────────────────────────────────────────
  run(sql, params = []) {
    this.assertReady();
    return this.db.prepare(sql).run(...params);
  }
  get(sql, params = []) {
    this.assertReady();
    return this.db.prepare(sql).get(...params);
  }
  all(sql, params = []) {
    this.assertReady();
    return this.db.prepare(sql).all(...params);
  }
  transaction(fn) {
    this.assertReady();
    return this.db.transaction(fn)();
  }
  // ── Entries ────────────────────────────────────────────────────────────────
  createEntry(entry) {
    this.run(`
      INSERT INTO entries
        (id, type, title, content, content_plain, mood, mood_score,
         color, cover_image, is_favorite, is_pinned, is_deleted,
         word_count, char_count, read_time, weather, location,
         template_id, version, created_at, updated_at, entry_date)
      VALUES
        (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `, [
      entry.id,
      entry.type,
      entry.title,
      entry.content,
      entry.content_plain,
      entry.mood ?? null,
      entry.mood_score ?? 0,
      entry.color ?? "#6366f1",
      entry.cover_image ?? null,
      entry.is_favorite ?? 0,
      entry.is_pinned ?? 0,
      0,
      entry.word_count ?? 0,
      entry.char_count ?? 0,
      entry.read_time ?? 0,
      entry.weather ?? null,
      entry.location ?? null,
      entry.template_id ?? null,
      entry.version ?? 1,
      entry.created_at,
      entry.updated_at,
      entry.entry_date
    ]);
    return entry.id;
  }
  updateEntry(id, fields) {
    const allowed = [
      "title",
      "content",
      "content_plain",
      "mood",
      "mood_score",
      "color",
      "cover_image",
      "is_favorite",
      "is_pinned",
      "word_count",
      "char_count",
      "read_time",
      "weather",
      "location",
      "updated_at",
      "version"
    ];
    const keys = Object.keys(fields).filter((k) => allowed.includes(k));
    if (!keys.length) return;
    const sets = keys.map((k) => `${k} = ?`).join(", ");
    const values = keys.map((k) => fields[k]);
    this.run(`UPDATE entries SET ${sets} WHERE id = ?`, [...values, id]);
  }
  getEntry(id) {
    return this.get(
      "SELECT * FROM entries WHERE id = ? AND is_deleted = 0",
      [id]
    );
  }
  getEntries(type) {
    if (type) {
      return this.all(
        "SELECT * FROM entries WHERE type = ? AND is_deleted = 0 ORDER BY updated_at DESC",
        [type]
      );
    }
    return this.all(
      "SELECT * FROM entries WHERE is_deleted = 0 ORDER BY updated_at DESC"
    );
  }
  getEntriesByDate(date) {
    return this.all(
      "SELECT * FROM entries WHERE entry_date = ? AND is_deleted = 0 ORDER BY created_at ASC",
      [date]
    );
  }
  softDeleteEntry(id) {
    this.run(
      `UPDATE entries SET is_deleted = 1, deleted_at = ? WHERE id = ?`,
      [(/* @__PURE__ */ new Date()).toISOString(), id]
    );
  }
  restoreEntry(id) {
    this.run(
      `UPDATE entries SET is_deleted = 0, deleted_at = NULL WHERE id = ?`,
      [id]
    );
  }
  permanentDeleteEntry(id) {
    this.run("DELETE FROM entries WHERE id = ?", [id]);
  }
  getTrash() {
    return this.all(
      "SELECT * FROM entries WHERE is_deleted = 1 ORDER BY deleted_at DESC"
    );
  }
  getFavorites() {
    return this.all(
      "SELECT * FROM entries WHERE is_favorite = 1 AND is_deleted = 0 ORDER BY updated_at DESC"
    );
  }
  // ── Entry Versions ─────────────────────────────────────────────────────────
  saveVersion(entryId, content, version) {
    const id = this.generateId();
    this.run(
      `INSERT INTO entry_versions (id, entry_id, content, version, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [id, entryId, content, version, (/* @__PURE__ */ new Date()).toISOString()]
    );
    this.run(`
      DELETE FROM entry_versions
      WHERE entry_id = ? AND id NOT IN (
        SELECT id FROM entry_versions
        WHERE entry_id = ?
        ORDER BY version DESC LIMIT 20
      )
    `, [entryId, entryId]);
  }
  getVersions(entryId) {
    return this.all(
      "SELECT * FROM entry_versions WHERE entry_id = ? ORDER BY version DESC",
      [entryId]
    );
  }
  // ── Tasks ──────────────────────────────────────────────────────────────────
  createTask(task) {
    this.run(`
      INSERT INTO tasks
        (id, title, description, status, priority, due_date,
         reminder_at, is_deleted, is_pinned, sort_order,
         parent_id, entry_id, created_at, updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `, [
      task.id,
      task.title,
      task.description ?? "",
      task.status ?? "todo",
      task.priority ?? "medium",
      task.due_date ?? null,
      task.reminder_at ?? null,
      0,
      task.is_pinned ?? 0,
      task.sort_order ?? 0,
      task.parent_id ?? null,
      task.entry_id ?? null,
      task.created_at,
      task.updated_at
    ]);
    return task.id;
  }
  updateTask(id, fields) {
    const allowed = [
      "title",
      "description",
      "status",
      "priority",
      "due_date",
      "reminder_at",
      "is_pinned",
      "sort_order",
      "updated_at",
      "completed_at"
    ];
    const keys = Object.keys(fields).filter((k) => allowed.includes(k));
    if (!keys.length) return;
    const sets = keys.map((k) => `${k} = ?`).join(", ");
    const values = keys.map((k) => fields[k]);
    this.run(`UPDATE tasks SET ${sets} WHERE id = ?`, [...values, id]);
  }
  getTasks(status) {
    if (status) {
      return this.all(
        "SELECT * FROM tasks WHERE status = ? AND is_deleted = 0 ORDER BY sort_order ASC",
        [status]
      );
    }
    return this.all(
      "SELECT * FROM tasks WHERE is_deleted = 0 ORDER BY sort_order ASC, created_at DESC"
    );
  }
  softDeleteTask(id) {
    this.run(`UPDATE tasks SET is_deleted = 1 WHERE id = ?`, [id]);
  }
  // ── Tags ───────────────────────────────────────────────────────────────────
  createTag(tag) {
    this.run(
      `INSERT OR IGNORE INTO tags (id, name, color, icon, created_at)
       VALUES (?,?,?,?,?)`,
      [tag.id, tag.name, tag.color ?? "#6366f1", tag.icon ?? "🏷️", tag.created_at]
    );
    return tag.id;
  }
  getTags() {
    return this.all("SELECT * FROM tags ORDER BY name ASC");
  }
  addTagToEntry(entryId, tagId) {
    this.run(
      `INSERT OR IGNORE INTO entry_tags (entry_id, tag_id) VALUES (?,?)`,
      [entryId, tagId]
    );
  }
  removeTagFromEntry(entryId, tagId) {
    this.run(
      `DELETE FROM entry_tags WHERE entry_id = ? AND tag_id = ?`,
      [entryId, tagId]
    );
  }
  getEntryTags(entryId) {
    return this.all(`
      SELECT t.* FROM tags t
      INNER JOIN entry_tags et ON t.id = et.tag_id
      WHERE et.entry_id = ?
    `, [entryId]);
  }
  // ── Habits ─────────────────────────────────────────────────────────────────
  createHabit(habit) {
    this.run(`
      INSERT INTO habits
        (id, name, description, icon, color, frequency,
         target_days, is_active, streak, best_streak, created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)
    `, [
      habit.id,
      habit.name,
      habit.description ?? "",
      habit.icon ?? "⭐",
      habit.color ?? "#6366f1",
      habit.frequency ?? "daily",
      habit.target_days ?? "[]",
      1,
      0,
      0,
      habit.created_at
    ]);
    return habit.id;
  }
  getHabits() {
    return this.all(
      "SELECT * FROM habits WHERE is_active = 1 ORDER BY created_at ASC"
    );
  }
  logHabit(id, habitId, date, note = "") {
    this.run(`
      INSERT OR REPLACE INTO habit_logs
        (id, habit_id, log_date, completed, note, created_at)
      VALUES (?,?,?,1,?,?)
    `, [id, habitId, date, note, (/* @__PURE__ */ new Date()).toISOString()]);
    this.updateHabitStreak(habitId);
  }
  getHabitLogs(habitId, fromDate, toDate) {
    return this.all(
      `SELECT * FROM habit_logs
       WHERE habit_id = ? AND log_date BETWEEN ? AND ?
       ORDER BY log_date ASC`,
      [habitId, fromDate, toDate]
    );
  }
  updateHabitStreak(habitId) {
    const logs = this.all(
      `SELECT log_date FROM habit_logs
       WHERE habit_id = ? AND completed = 1
       ORDER BY log_date DESC`,
      [habitId]
    );
    let streak = 0;
    let checkDate = /* @__PURE__ */ new Date();
    checkDate.setHours(0, 0, 0, 0);
    for (const log of logs) {
      const logDate = new Date(log.log_date);
      logDate.setHours(0, 0, 0, 0);
      const diff = Math.round(
        (checkDate.getTime() - logDate.getTime()) / 864e5
      );
      if (diff === 0 || diff === 1) {
        streak++;
        checkDate = logDate;
      } else break;
    }
    const current = this.get(
      "SELECT best_streak FROM habits WHERE id = ?",
      [habitId]
    );
    const best = Math.max(streak, current?.best_streak ?? 0);
    this.run(
      `UPDATE habits SET streak = ?, best_streak = ? WHERE id = ?`,
      [streak, best, habitId]
    );
  }
  // ── Settings ───────────────────────────────────────────────────────────────
  getSetting(key) {
    const row = this.get(
      "SELECT value FROM app_settings WHERE key = ?",
      [key]
    );
    return row?.value ?? null;
  }
  setSetting(key, value) {
    this.run(`
      INSERT INTO app_settings (key, value, updated_at)
      VALUES (?,?,?)
      ON CONFLICT(key) DO UPDATE
        SET value = excluded.value,
            updated_at = excluded.updated_at
    `, [key, value, (/* @__PURE__ */ new Date()).toISOString()]);
  }
  getAllSettings() {
    const rows = this.all(
      "SELECT key, value FROM app_settings"
    );
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  }
  // ── Word Predictions ───────────────────────────────────────────────────────
  upsertPrediction(id, phrase, context = "any") {
    this.run(`
      INSERT INTO word_predictions (id, phrase, frequency, last_used, context)
      VALUES (?,?,1,?,?)
      ON CONFLICT(phrase) DO UPDATE
        SET frequency = frequency + 1,
            last_used = excluded.last_used
    `, [id, phrase, (/* @__PURE__ */ new Date()).toISOString(), context]);
  }
  getPredictions(prefix, context = "any", limit = 8) {
    return this.all(`
      SELECT phrase, frequency FROM word_predictions
      WHERE phrase LIKE ? AND (context = ? OR context = 'any')
      ORDER BY frequency DESC LIMIT ?
    `, [`${prefix}%`, context, limit]);
  }
  // ── Search ─────────────────────────────────────────────────────────────────
  search(query, type) {
    const like = `%${query}%`;
    if (type) {
      return this.all(`
        SELECT id, type, title, content_plain FROM entries
        WHERE is_deleted = 0 AND type = ?
          AND (title LIKE ? OR content_plain LIKE ?)
        ORDER BY updated_at DESC LIMIT 50
      `, [type, like, like]);
    }
    return this.all(`
      SELECT id, type, title, content_plain FROM entries
      WHERE is_deleted = 0
        AND (title LIKE ? OR content_plain LIKE ?)
      ORDER BY updated_at DESC LIMIT 50
    `, [like, like]);
  }
  // ── Stats ──────────────────────────────────────────────────────────────────
  getStats() {
    const c = (sql) => this.get(sql)?.c ?? 0;
    const s = (sql) => this.get(sql)?.s ?? 0;
    return {
      totalEntries: c("SELECT COUNT(*) as c FROM entries WHERE is_deleted=0"),
      diaryCount: c('SELECT COUNT(*) as c FROM entries WHERE type="diary" AND is_deleted=0'),
      notesCount: c('SELECT COUNT(*) as c FROM entries WHERE type="note"  AND is_deleted=0'),
      ideasCount: c('SELECT COUNT(*) as c FROM entries WHERE type="idea"  AND is_deleted=0'),
      taskCount: c("SELECT COUNT(*) as c FROM tasks   WHERE is_deleted=0"),
      habitCount: c("SELECT COUNT(*) as c FROM habits  WHERE is_active=1"),
      trashCount: c("SELECT COUNT(*) as c FROM entries WHERE is_deleted=1"),
      totalWords: s("SELECT COALESCE(SUM(word_count),0) as s FROM entries WHERE is_deleted=0")
    };
  }
  // ── Utilities ──────────────────────────────────────────────────────────────
  generateId() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      return (c === "x" ? r : r & 3 | 8).toString(16);
    });
  }
  close() {
    this.db?.close();
    this.db = null;
    console.log("[DB] Closed");
  }
  getPath() {
    return this.dbPath;
  }
  assertReady() {
    if (!this.db) throw new Error("[DB] Not initialized");
  }
}
const db = new DatabaseService();
const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const SALT_LENGTH = 32;
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const ENC_PREFIX = "ENC:";
class EncryptionService {
  constructor() {
    this.masterKey = null;
    this.isInitialized = false;
    this.appSalt = null;
  }
  // ── Init ───────────────────────────────────────────────────────────────────
  /**
   * Initialize with a password (PIN or passphrase).
   * Must be called before any encrypt/decrypt operations.
   */
  init(password, storedSalt) {
    if (storedSalt) {
      this.appSalt = Buffer.from(storedSalt, "hex");
    } else {
      this.appSalt = crypto.randomBytes(SALT_LENGTH);
    }
    this.masterKey = crypto.scryptSync(
      password,
      this.appSalt,
      KEY_LENGTH,
      { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P }
    );
    this.isInitialized = true;
    console.log("[Encryption] Service initialized");
    return this.appSalt.toString("hex");
  }
  /**
   * Initialize with a fixed device key (no password — for users without PIN).
   * Key is derived from machine-specific data.
   */
  initWithDeviceKey(machineId) {
    const deviceSecret = `soul-diary-device-${machineId}-offline-secure`;
    return this.init(deviceSecret);
  }
  // ── Core Encrypt/Decrypt ───────────────────────────────────────────────────
  /**
   * Encrypt a string value.
   * Returns: "ENC:<base64-json-payload>"
   */
  encrypt(plaintext) {
    if (!this.isInitialized || !this.masterKey) {
      throw new Error("[Encryption] Not initialized. Call init() first.");
    }
    if (!plaintext) return plaintext;
    if (plaintext.startsWith(ENC_PREFIX)) return plaintext;
    try {
      const iv = crypto.randomBytes(IV_LENGTH);
      const cipher = crypto.createCipheriv(ALGORITHM, this.masterKey, iv);
      const encryptedBuffer = Buffer.concat([
        cipher.update(plaintext, "utf8"),
        cipher.final()
      ]);
      const tag = cipher.getAuthTag();
      const payload = {
        salt: this.appSalt.toString("hex"),
        iv: iv.toString("hex"),
        tag: tag.toString("hex"),
        data: encryptedBuffer.toString("hex")
      };
      const encoded = Buffer.from(JSON.stringify(payload)).toString("base64");
      return `${ENC_PREFIX}${encoded}`;
    } catch (err) {
      console.error("[Encryption] Encrypt failed:", err);
      throw new Error("Encryption failed");
    }
  }
  /**
   * Decrypt a value encrypted by encrypt().
   * Returns original plaintext.
   */
  decrypt(ciphertext) {
    if (!this.isInitialized || !this.masterKey) {
      throw new Error("[Encryption] Not initialized. Call init() first.");
    }
    if (!ciphertext) return ciphertext;
    if (!ciphertext.startsWith(ENC_PREFIX)) return ciphertext;
    try {
      const base64 = ciphertext.slice(ENC_PREFIX.length);
      const json = Buffer.from(base64, "base64").toString("utf8");
      const payload = JSON.parse(json);
      const iv = Buffer.from(payload.iv, "hex");
      const tag = Buffer.from(payload.tag, "hex");
      const data = Buffer.from(payload.data, "hex");
      const decipher = crypto.createDecipheriv(ALGORITHM, this.masterKey, iv);
      decipher.setAuthTag(tag);
      const decrypted = Buffer.concat([
        decipher.update(data),
        decipher.final()
      ]);
      return decrypted.toString("utf8");
    } catch (err) {
      console.error("[Encryption] Decrypt failed:", err);
      return "";
    }
  }
  // ── Bulk Operations ────────────────────────────────────────────────────────
  /**
   * Encrypt multiple fields of an object at once.
   * Pass field names to encrypt — rest are left as-is.
   */
  encryptFields(obj, fields) {
    const result = { ...obj };
    for (const field of fields) {
      if (result[field] !== null && result[field] !== void 0) {
        result[field] = this.encrypt(String(result[field]));
      }
    }
    return result;
  }
  /**
   * Decrypt multiple fields of an object at once.
   */
  decryptFields(obj, fields) {
    const result = { ...obj };
    for (const field of fields) {
      if (result[field] !== null && result[field] !== void 0) {
        result[field] = this.decrypt(String(result[field]));
      }
    }
    return result;
  }
  /**
   * Decrypt an array of objects.
   */
  decryptArray(arr, fields) {
    return arr.map((item) => this.decryptFields(item, fields));
  }
  // ── PIN Management ─────────────────────────────────────────────────────────
  /**
   * Hash a PIN for storage.
   * Uses SHA-256 + salt (not bcrypt — must work without native deps).
   */
  hashPin(pin) {
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto.createHash("sha256").update(pin + salt).digest("hex");
    return `${salt}:${hash}`;
  }
  /**
   * Verify a PIN against stored hash.
   * Uses timing-safe comparison to prevent timing attacks.
   */
  verifyPin(pin, storedHash) {
    try {
      const [salt, hash] = storedHash.split(":");
      if (!salt || !hash) return false;
      const inputHash = crypto.createHash("sha256").update(pin + salt).digest("hex");
      const hashBuffer = Buffer.from(hash);
      const inputBuffer = Buffer.from(inputHash);
      if (hashBuffer.length !== inputBuffer.length) return false;
      return crypto.timingSafeEqual(hashBuffer, inputBuffer);
    } catch {
      return false;
    }
  }
  /**
   * Re-encrypt all data with a new password.
   * Called when user changes their PIN.
   */
  reEncryptWithNewKey(oldKey, newPassword, values) {
    this.masterKey;
    this.appSalt;
    this.masterKey = oldKey;
    const decrypted = values.map((v) => this.decrypt(v));
    const newSalt = crypto.randomBytes(SALT_LENGTH);
    this.appSalt = newSalt;
    this.masterKey = crypto.scryptSync(
      newPassword,
      newSalt,
      KEY_LENGTH,
      { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P }
    );
    const reEncrypted = decrypted.map((v) => this.encrypt(v));
    return {
      newSalt: newSalt.toString("hex"),
      reEncrypted
    };
  }
  // ── Backup Encryption ──────────────────────────────────────────────────────
  /**
   * Encrypt a full backup file with a user-supplied password.
   * Different from app encryption — standalone backup password.
   */
  encryptBackup(data, backupPassword) {
    const salt = crypto.randomBytes(SALT_LENGTH);
    const key = crypto.scryptSync(backupPassword, salt, KEY_LENGTH, {
      N: SCRYPT_N,
      r: SCRYPT_R,
      p: SCRYPT_P
    });
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([
      cipher.update(data, "utf8"),
      cipher.final()
    ]);
    const tag = cipher.getAuthTag();
    const payload = {
      version: 1,
      salt: salt.toString("hex"),
      iv: iv.toString("hex"),
      tag: tag.toString("hex"),
      data: encrypted.toString("hex")
    };
    return JSON.stringify(payload);
  }
  /**
   * Decrypt a backup file.
   */
  decryptBackup(encryptedJson, backupPassword) {
    const payload = JSON.parse(encryptedJson);
    const salt = Buffer.from(payload.salt, "hex");
    const iv = Buffer.from(payload.iv, "hex");
    const tag = Buffer.from(payload.tag, "hex");
    const data = Buffer.from(payload.data, "hex");
    const key = crypto.scryptSync(backupPassword, salt, KEY_LENGTH, {
      N: SCRYPT_N,
      r: SCRYPT_R,
      p: SCRYPT_P
    });
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([
      decipher.update(data),
      decipher.final()
    ]).toString("utf8");
  }
  // ── Utilities ──────────────────────────────────────────────────────────────
  /**
   * Check if a string is encrypted by this service.
   */
  isEncrypted(value) {
    return typeof value === "string" && value.startsWith(ENC_PREFIX);
  }
  /**
   * Generate a secure random token (for session tokens, etc).
   */
  generateToken(bytes = 32) {
    return crypto.randomBytes(bytes).toString("hex");
  }
  /**
   * Get current master key (needed for re-encryption).
   */
  getMasterKey() {
    if (!this.masterKey) {
      throw new Error("[Encryption] Not initialized");
    }
    return Buffer.from(this.masterKey);
  }
  /**
   * Get current salt (must be stored to re-derive same key on next launch).
   */
  getSalt() {
    if (!this.appSalt) {
      throw new Error("[Encryption] Not initialized");
    }
    return this.appSalt.toString("hex");
  }
  get ready() {
    return this.isInitialized;
  }
  /**
   * Clear keys from memory (called on app lock / close).
   */
  clear() {
    if (this.masterKey) {
      this.masterKey.fill(0);
      this.masterKey = null;
    }
    if (this.appSalt) {
      this.appSalt.fill(0);
      this.appSalt = null;
    }
    this.isInitialized = false;
    console.log("[Encryption] Keys cleared from memory");
  }
}
const encryption = new EncryptionService();
const ENTRY_ENCRYPTED_FIELDS = [
  "title",
  "content",
  "content_plain",
  "mood",
  "weather",
  "location"
];
const TASK_ENCRYPTED_FIELDS = [
  "title",
  "description"
];
const TAG_ENCRYPTED_FIELDS = [
  "name"
];
const HABIT_ENCRYPTED_FIELDS = [
  "name",
  "description"
];
function uid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === "x" ? r : r & 3 | 8;
    return v.toString(16);
  });
}
function today$1() {
  return (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
}
function now() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
function registerDbHandlers() {
  electron.ipcMain.handle("db:run", (_e, sql, params = []) => {
    return db.run(sql, params);
  });
  electron.ipcMain.handle("db:get", (_e, sql, params = []) => {
    return db.get(sql, params);
  });
  electron.ipcMain.handle("db:all", (_e, sql, params = []) => {
    return db.all(sql, params);
  });
  electron.ipcMain.handle("encryption:init", (_e, password) => {
    try {
      const storedSalt = db.getSetting("encSalt");
      let salt;
      if (password) {
        salt = encryption.init(password, storedSalt ?? void 0);
      } else {
        const machineId = db.getSetting("machineId") ?? uid();
        db.setSetting("machineId", machineId);
        salt = encryption.initWithDeviceKey(machineId);
      }
      db.setSetting("encSalt", salt);
      return { success: true };
    } catch (err) {
      console.error("[IPC] encryption:init failed:", err);
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle("pin:set", (_e, pin) => {
    try {
      const hash = encryption.hashPin(pin);
      db.setSetting("pinHash", hash);
      db.setSetting("hasPin", "true");
      const storedSalt = db.getSetting("encSalt");
      const newSalt = encryption.init(pin, storedSalt ?? void 0);
      db.setSetting("encSalt", newSalt);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle("pin:verify", (_e, pin) => {
    try {
      const stored = db.getSetting("pinHash");
      if (!stored) return { success: false, error: "No PIN set" };
      const valid = encryption.verifyPin(pin, stored);
      if (valid) {
        const storedSalt = db.getSetting("encSalt");
        encryption.init(pin, storedSalt ?? void 0);
        return { success: true };
      }
      return { success: false, error: "Wrong PIN" };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle("pin:remove", () => {
    db.setSetting("hasPin", "false");
    db.setSetting("pinHash", "");
    return { success: true };
  });
  electron.ipcMain.handle("pin:hasPin", () => {
    return db.getSetting("hasPin") === "true";
  });
  electron.ipcMain.handle("entry:create", (_e, data) => {
    try {
      const id = uid();
      const timestamp = now();
      const entryDate = data.entryDate ?? today$1();
      const encrypted = encryption.encryptFields({
        title: data.title ?? "",
        content: data.content ?? "",
        content_plain: data.contentPlain ?? "",
        mood: data.mood ?? null,
        weather: data.weather ?? null,
        location: data.location ?? null
      }, ["title", "content", "content_plain", "mood", "weather", "location"]);
      db.createEntry({
        id,
        type: data.type,
        title: encrypted.title,
        content: encrypted.content,
        content_plain: encrypted.content_plain,
        mood: encrypted.mood,
        mood_score: data.moodScore ?? 0,
        color: data.color ?? "#6366f1",
        cover_image: null,
        is_favorite: 0,
        is_pinned: 0,
        is_deleted: 0,
        word_count: countWords(data.contentPlain ?? ""),
        char_count: (data.contentPlain ?? "").length,
        read_time: Math.ceil(countWords(data.contentPlain ?? "") / 200),
        weather: encrypted.weather,
        location: encrypted.location,
        template_id: data.templateId ?? null,
        version: 1,
        created_at: timestamp,
        updated_at: timestamp,
        deleted_at: null,
        entry_date: entryDate
      });
      if (data.tags?.length) {
        for (const tagId of data.tags) {
          db.addTagToEntry(id, tagId);
        }
      }
      db.updateSearchIndex(
        id,
        data.type,
        data.title ?? "",
        data.contentPlain ?? "",
        ""
      );
      return { success: true, id };
    } catch (err) {
      console.error("[IPC] entry:create failed:", err);
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle("entry:get", (_e, id) => {
    try {
      const entry = db.getEntry(id);
      if (!entry) return { success: false, error: "Not found" };
      const decrypted = encryption.decryptFields(
        entry,
        [...ENTRY_ENCRYPTED_FIELDS]
      );
      const tags = db.getEntryTags(id);
      return {
        success: true,
        entry: {
          ...decrypted,
          tags: encryption.decryptArray(tags, [...TAG_ENCRYPTED_FIELDS])
        }
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle("entry:list", (_e, type) => {
    try {
      const entries = db.getEntries(type);
      const decrypted = entries.map((e) => {
        const dec = encryption.decryptFields(e, [...ENTRY_ENCRYPTED_FIELDS]);
        return {
          ...dec,
          // Only return preview (first 120 chars) for list view performance
          content: void 0,
          content_plain: dec.content_plain?.slice(0, 120) ?? ""
        };
      });
      return { success: true, entries: decrypted };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle("entry:byDate", (_e, date) => {
    try {
      const entries = db.getEntriesByDate(date);
      const decrypted = entries.map(
        (e) => encryption.decryptFields(e, [...ENTRY_ENCRYPTED_FIELDS])
      );
      return { success: true, entries: decrypted };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle("entry:update", (_e, id, data) => {
    try {
      const existing = db.getEntry(id);
      if (!existing) return { success: false, error: "Not found" };
      const updateFields = {
        updated_at: now()
      };
      if (data.title !== void 0) updateFields.title = encryption.encrypt(data.title);
      if (data.content !== void 0) updateFields.content = encryption.encrypt(data.content);
      if (data.mood !== void 0) updateFields.mood = encryption.encrypt(data.mood);
      if (data.weather !== void 0) updateFields.weather = encryption.encrypt(data.weather);
      if (data.location !== void 0) updateFields.location = encryption.encrypt(data.location);
      if (data.moodScore !== void 0) updateFields.mood_score = data.moodScore;
      if (data.color !== void 0) updateFields.color = data.color;
      if (data.isFavorite !== void 0) updateFields.is_favorite = data.isFavorite ? 1 : 0;
      if (data.isPinned !== void 0) updateFields.is_pinned = data.isPinned ? 1 : 0;
      if (data.contentPlain !== void 0) {
        updateFields.content_plain = encryption.encrypt(data.contentPlain);
        updateFields.word_count = countWords(data.contentPlain);
        updateFields.char_count = data.contentPlain.length;
        updateFields.read_time = Math.ceil(countWords(data.contentPlain) / 200);
      }
      const newVersion = (existing.version ?? 1) + 1;
      updateFields.version = newVersion;
      db.saveVersion(id, existing.content, existing.version ?? 1);
      db.updateEntry(id, updateFields);
      if (data.tags !== void 0) {
        db.run("DELETE FROM entry_tags WHERE entry_id = ?", [id]);
        for (const tagId of data.tags) {
          db.addTagToEntry(id, tagId);
        }
      }
      if (data.contentPlain !== void 0 || data.title !== void 0) {
        const updatedEntry = db.getEntry(id);
        if (updatedEntry) {
          const dec = encryption.decryptFields(updatedEntry, [...ENTRY_ENCRYPTED_FIELDS]);
          db.updateSearchIndex(
            id,
            updatedEntry.type,
            dec.title ?? "",
            dec.content_plain ?? "",
            ""
          );
        }
      }
      return { success: true };
    } catch (err) {
      console.error("[IPC] entry:update failed:", err);
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle("entry:delete", (_e, id) => {
    try {
      db.softDeleteEntry(id);
      db.run("DELETE FROM search_index WHERE entry_id = ?", [id]);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle("entry:restore", (_e, id) => {
    try {
      db.restoreEntry(id);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle("entry:deletePermanent", (_e, id) => {
    try {
      db.permanentDeleteEntry(id);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle("entry:trash", () => {
    try {
      const entries = db.getTrash();
      const decrypted = entries.map(
        (e) => encryption.decryptFields(e, [...ENTRY_ENCRYPTED_FIELDS])
      );
      return { success: true, entries: decrypted };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle("entry:favorites", () => {
    try {
      const entries = db.getFavorites();
      const decrypted = entries.map(
        (e) => encryption.decryptFields(e, [...ENTRY_ENCRYPTED_FIELDS])
      );
      return { success: true, entries: decrypted };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle("entry:versions", (_e, entryId) => {
    try {
      const versions = db.getVersions(entryId);
      return {
        success: true,
        versions: versions.map((v) => ({
          ...v,
          content: encryption.decrypt(v.content)
        }))
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle("task:create", (_e, data) => {
    try {
      const id = uid();
      const timestamp = now();
      const encrypted = encryption.encryptFields({
        title: data.title,
        description: data.description ?? ""
      }, ["title", "description"]);
      db.createTask({
        id,
        title: encrypted.title,
        description: encrypted.description,
        status: "todo",
        priority: data.priority ?? "medium",
        due_date: data.dueDate ?? null,
        reminder_at: data.reminderAt ?? null,
        is_deleted: 0,
        is_pinned: 0,
        sort_order: 0,
        parent_id: data.parentId ?? null,
        entry_id: data.entryId ?? null,
        created_at: timestamp,
        updated_at: timestamp,
        completed_at: null
      });
      if (data.tags?.length) {
        for (const tagId of data.tags) {
          db.run(
            "INSERT OR IGNORE INTO task_tags (task_id, tag_id) VALUES (?, ?)",
            [id, tagId]
          );
        }
      }
      return { success: true, id };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle("task:list", (_e, status) => {
    try {
      const tasks = db.getTasks(status);
      const decrypted = tasks.map(
        (t) => encryption.decryptFields(t, [...TASK_ENCRYPTED_FIELDS])
      );
      return { success: true, tasks: decrypted };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle("task:update", (_e, id, data) => {
    try {
      const fields = { updated_at: now() };
      if (data.title !== void 0) fields.title = encryption.encrypt(data.title);
      if (data.description !== void 0) fields.description = encryption.encrypt(data.description);
      if (data.status !== void 0) {
        fields.status = data.status;
        if (data.status === "done") fields.completed_at = now();
      }
      if (data.priority !== void 0) fields.priority = data.priority;
      if (data.dueDate !== void 0) fields.due_date = data.dueDate;
      if (data.isPinned !== void 0) fields.is_pinned = data.isPinned ? 1 : 0;
      db.updateTask(id, fields);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle("task:delete", (_e, id) => {
    try {
      db.softDeleteTask(id);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle("tag:create", (_e, data) => {
    try {
      const id = uid();
      const tag = {
        id,
        name: encryption.encrypt(data.name),
        color: data.color ?? "#6366f1",
        icon: data.icon ?? "🏷️",
        created_at: now()
      };
      db.createTag(tag);
      return { success: true, id };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle("tag:list", () => {
    try {
      const tags = db.getTags();
      return {
        success: true,
        tags: encryption.decryptArray(tags, [...TAG_ENCRYPTED_FIELDS])
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle("tag:delete", (_e, id) => {
    try {
      db.run("DELETE FROM tags WHERE id = ?", [id]);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle("habit:create", (_e, data) => {
    try {
      const id = uid();
      db.createHabit({
        id,
        name: encryption.encrypt(data.name),
        description: encryption.encrypt(data.description ?? ""),
        icon: data.icon ?? "⭐",
        color: data.color ?? "#6366f1",
        frequency: data.frequency ?? "daily",
        target_days: JSON.stringify(data.targetDays ?? []),
        is_active: 1,
        streak: 0,
        best_streak: 0,
        created_at: now()
      });
      return { success: true, id };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle("habit:list", () => {
    try {
      const habits = db.getHabits();
      return {
        success: true,
        habits: encryption.decryptArray(habits, [...HABIT_ENCRYPTED_FIELDS])
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle("habit:log", (_e, habitId, date, note) => {
    try {
      db.logHabit(uid(), habitId, date, note ?? "");
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle("habit:logs", (_e, habitId, from, to) => {
    try {
      const logs = db.getHabitLogs(habitId, from, to);
      return { success: true, logs };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle("settings:get", (_e, key) => {
    try {
      const value = db.getSetting(key);
      return { success: true, value };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle("settings:set", (_e, key, value) => {
    try {
      db.setSetting(key, value);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle("settings:getAll", () => {
    try {
      const all = db.getAllSettings();
      return { success: true, settings: all };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle("search:query", (_e, query, type) => {
    try {
      if (!query.trim()) return { success: true, results: [] };
      const ids = db.search(query, type);
      const results = ids.map(({ entry_id, entry_type }) => {
        const entry = db.getEntry(entry_id);
        if (!entry) return null;
        const dec = encryption.decryptFields(entry, [...ENTRY_ENCRYPTED_FIELDS]);
        return {
          id: entry_id,
          type: entry_type,
          title: dec.title,
          preview: dec.content_plain?.slice(0, 150) ?? "",
          entry_date: entry.entry_date,
          updated_at: entry.updated_at
        };
      }).filter(Boolean);
      return { success: true, results };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle("stats:get", () => {
    try {
      return { success: true, stats: db.getStats() };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle("predict:add", (_e, phrase, context) => {
    try {
      db.upsertPrediction(uid(), encryption.encrypt(phrase), context);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle("predict:get", (_e, prefix, context) => {
    try {
      const results = db.getPredictions(
        encryption.encrypt(prefix),
        context
      );
      return {
        success: true,
        predictions: results.map((r) => ({
          ...r,
          phrase: encryption.decrypt(r.phrase)
        }))
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  console.log("[IPC] All DB handlers registered ✓");
}
function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}
function registerPdfHandlers() {
  electron.ipcMain.handle("pdf:export", async (_event, html, opts = {}) => {
    let win = null;
    try {
      win = new electron.BrowserWindow({
        width: 1200,
        height: 900,
        show: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          javascript: true
        }
      });
      const encoded = encodeURIComponent(html);
      await win.loadURL(`data:text/html;charset=utf-8,${encoded}`);
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const pdfBuffer = await win.webContents.printToPDF({
        printBackground: true,
        pageSize: "A4",
        preferCSSPageSize: false
      });
      win.destroy();
      win = null;
      const safeName = (opts.title ?? "soul-diary").replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, "-").toLowerCase().slice(0, 40) || "soul-diary";
      const today2 = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const { filePath, canceled } = await electron.dialog.showSaveDialog({
        title: "Save PDF",
        defaultPath: path__namespace.join(
          electron.app.getPath("documents"),
          `${safeName}-${today2}.pdf`
        ),
        filters: [{ name: "PDF", extensions: ["pdf"] }],
        buttonLabel: "Save PDF"
      });
      if (canceled || !filePath) {
        return { success: false, canceled: true };
      }
      fs__namespace.writeFileSync(filePath, pdfBuffer);
      return {
        success: true,
        filePath,
        sizeKB: Math.round(pdfBuffer.length / 1024)
      };
    } catch (err) {
      if (win && !win.isDestroyed()) {
        win.destroy();
      }
      console.error("[PDF] Export error:", err?.message);
      return {
        success: false,
        error: err?.message ?? "PDF generation failed"
      };
    }
  });
  electron.ipcMain.handle("pdf:open", async (_event, filePath) => {
    try {
      await electron.shell.openPath(filePath);
      return { success: true };
    } catch (err) {
      return { success: false, error: err?.message };
    }
  });
  electron.ipcMain.handle("pdf:print", async (_event, html) => {
    let win = null;
    try {
      win = new electron.BrowserWindow({
        width: 1200,
        height: 900,
        show: true,
        title: "Soul Diary — Print",
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        }
      });
      const encoded = encodeURIComponent(html);
      await win.loadURL(`data:text/html;charset=utf-8,${encoded}`);
      await new Promise((resolve) => setTimeout(resolve, 1e3));
      win.webContents.print(
        {
          silent: false,
          printBackground: true,
          color: true
        },
        (_success, _reason) => {
          setTimeout(() => {
            if (win && !win.isDestroyed()) win.destroy();
          }, 1e3);
        }
      );
      return { success: true };
    } catch (err) {
      if (win && !win.isDestroyed()) win.destroy();
      return { success: false, error: err?.message };
    }
  });
  electron.ipcMain.handle("pdf:getExportsPath", async () => {
    try {
      const exportsPath = path__namespace.join(
        electron.app.getPath("documents"),
        "Soul Diary Exports"
      );
      if (!fs__namespace.existsSync(exportsPath)) {
        fs__namespace.mkdirSync(exportsPath, { recursive: true });
      }
      return { success: true, path: exportsPath };
    } catch (err) {
      return { success: false, error: err?.message };
    }
  });
}
let mainWindow = null;
function createWindow() {
  mainWindow = new electron.BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    show: false,
    frame: false,
    titleBarStyle: "hidden",
    backgroundColor: "#0f0f1a",
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.js"),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true
    },
    icon: path.join(__dirname, "../../public/icon.png")
  });
  mainWindow.on("ready-to-show", () => {
    mainWindow?.show();
    mainWindow?.webContents.send(
      mainWindow.isMaximized() ? "window:maximized" : "window:unmaximized"
    );
  });
  mainWindow.on("maximize", () => mainWindow?.webContents.send("window:maximized"));
  mainWindow.on("unmaximize", () => mainWindow?.webContents.send("window:unmaximized"));
  mainWindow.on("close", () => {
    mainWindow?.webContents.send("app:beforeClose");
  });
  mainWindow.webContents.setWindowOpenHandler((details) => {
    electron.shell.openExternal(details.url);
    return { action: "deny" };
  });
  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}
async function initServices() {
  try {
    const customPath = getCustomStoragePath();
    db.init(customPath ?? void 0);
    console.log("[Main] Database initialized ✓");
    const hasPin = db.getSetting("hasPin") === "true";
    if (!hasPin) {
      const machineId = db.getSetting("machineId") ?? generateMachineId();
      db.setSetting("machineId", machineId);
      const storedSalt = db.getSetting("encSalt");
      const salt = encryption.initWithDeviceKey(machineId);
      if (!storedSalt) {
        db.setSetting("encSalt", salt);
      }
      console.log("[Main] Encryption initialized (device key) ✓");
    } else {
      console.log("[Main] PIN set — waiting for PIN verify to fully init encryption");
    }
    registerDbHandlers();
    registerWindowHandlers();
    registerFileHandlers();
    registerAppHandlers();
    console.log("[Main] All IPC handlers registered ✓");
  } catch (err) {
    console.error("[Main] Service init failed:", err);
  }
}
function registerWindowHandlers() {
  electron.ipcMain.on("window:minimize", () => mainWindow?.minimize());
  electron.ipcMain.on("window:maximize", () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });
  electron.ipcMain.on("window:close", () => {
    mainWindow?.webContents.send("app:beforeClose");
    setTimeout(() => mainWindow?.destroy(), 800);
  });
  electron.ipcMain.handle("window:isMaximized", () => mainWindow?.isMaximized() ?? false);
  electron.ipcMain.handle("theme:get", () => electron.nativeTheme.shouldUseDarkColors);
  electron.ipcMain.on("theme:set", (_e, theme) => {
    electron.nativeTheme.themeSource = theme;
  });
}
function registerFileHandlers() {
  electron.ipcMain.handle("dialog:openFolder", async () => {
    const result = await electron.dialog.showOpenDialog({
      properties: ["openDirectory", "createDirectory"],
      title: "Choose Storage Location"
    });
    return result.canceled ? null : result.filePaths[0];
  });
  electron.ipcMain.handle("dialog:saveFile", async (_e, options) => {
    const result = await electron.dialog.showSaveDialog(options);
    return result.canceled ? null : result.filePath;
  });
  electron.ipcMain.handle("fs:readFile", (_e, filePath) => {
    try {
      if (!fs.existsSync(filePath)) return null;
      return fs.readFileSync(filePath, "utf-8");
    } catch (err) {
      console.error("[FS] readFile error:", err);
      return null;
    }
  });
  electron.ipcMain.handle("fs:writeFile", (_e, filePath, data) => {
    try {
      fs.writeFileSync(filePath, data, "utf-8");
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle("fs:exists", (_e, filePath) => {
    return fs.existsSync(filePath);
  });
  electron.ipcMain.handle("fs:mkdir", (_e, dirPath) => {
    try {
      fs.mkdirSync(dirPath, { recursive: true });
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle("backup:export", async (_e, backupPassword) => {
    try {
      const entries = db.all("SELECT * FROM entries");
      const tasks = db.all("SELECT * FROM tasks");
      const tags = db.all("SELECT * FROM tags");
      const habits = db.all("SELECT * FROM habits");
      const habitLogs = db.all("SELECT * FROM habit_logs");
      const templates = db.all("SELECT * FROM templates");
      const settings = db.getAllSettings();
      const backupData = JSON.stringify({
        version: 1,
        exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
        entries,
        tasks,
        tags,
        habits,
        habitLogs,
        templates,
        settings
      });
      const encrypted = encryption.encryptBackup(backupData, backupPassword);
      const result = await electron.dialog.showSaveDialog({
        title: "Save Backup",
        defaultPath: `soul-diary-backup-${today()}.sdbackup`,
        filters: [{ name: "Soul Diary Backup", extensions: ["sdbackup"] }]
      });
      if (result.canceled || !result.filePath) {
        return { success: false, error: "Cancelled" };
      }
      fs.writeFileSync(result.filePath, encrypted, "utf-8");
      return { success: true, path: result.filePath };
    } catch (err) {
      console.error("[Backup] Export failed:", err);
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle("backup:import", async (_e, backupPassword) => {
    try {
      const result = await electron.dialog.showOpenDialog({
        title: "Open Backup File",
        filters: [{ name: "Soul Diary Backup", extensions: ["sdbackup"] }],
        properties: ["openFile"]
      });
      if (result.canceled || !result.filePaths[0]) {
        return { success: false, error: "Cancelled" };
      }
      const encrypted = fs.readFileSync(result.filePaths[0], "utf-8");
      const decrypted = encryption.decryptBackup(encrypted, backupPassword);
      const data = JSON.parse(decrypted);
      db.transaction(() => {
        db.run("DELETE FROM entry_tags");
        db.run("DELETE FROM task_tags");
        db.run("DELETE FROM entries");
        db.run("DELETE FROM tasks");
        db.run("DELETE FROM tags");
        db.run("DELETE FROM habits");
        db.run("DELETE FROM habit_logs");
        db.run("DELETE FROM templates");
        for (const entry of data.entries ?? []) {
          db.run(
            `INSERT OR REPLACE INTO entries VALUES
            (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [
              entry.id,
              entry.type,
              entry.title,
              entry.content,
              entry.content_plain,
              entry.mood,
              entry.mood_score,
              entry.color,
              entry.cover_image,
              entry.is_favorite,
              entry.is_pinned,
              entry.is_deleted,
              entry.word_count,
              entry.char_count,
              entry.read_time,
              entry.weather,
              entry.location,
              entry.template_id,
              entry.version,
              entry.created_at,
              entry.updated_at,
              entry.entry_date
            ]
          );
        }
        for (const task of data.tasks ?? []) {
          db.run(
            `INSERT OR REPLACE INTO tasks VALUES
            (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [
              task.id,
              task.title,
              task.description,
              task.status,
              task.priority,
              task.due_date,
              task.reminder_at,
              task.is_deleted,
              task.is_pinned,
              task.sort_order,
              task.parent_id,
              task.entry_id,
              task.created_at,
              task.updated_at,
              task.completed_at
            ]
          );
        }
        for (const tag of data.tags ?? []) {
          db.run(
            "INSERT OR REPLACE INTO tags VALUES (?,?,?,?,?)",
            [tag.id, tag.name, tag.color, tag.icon, tag.created_at]
          );
        }
      });
      return { success: true };
    } catch (err) {
      console.error("[Backup] Import failed:", err);
      return { success: false, error: err.message };
    }
  });
}
function registerAppHandlers() {
  electron.ipcMain.handle("app:version", () => electron.app.getVersion());
  electron.ipcMain.handle("app:path", () => electron.app.getPath("userData"));
  electron.ipcMain.handle("app:dbPath", () => db.getPath());
  electron.ipcMain.handle("app:init", () => ({
    success: true,
    version: electron.app.getVersion(),
    userDataPath: electron.app.getPath("userData"),
    dbPath: db.getPath()
  }));
  electron.ipcMain.on("app:lock", () => {
    encryption.clear();
    mainWindow?.webContents.send("app:locked");
  });
  electron.ipcMain.handle("app:changeStorage", async (_e, newPath) => {
    try {
      db.setSetting("customStoragePath", newPath);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
}
function getCustomStoragePath() {
  try {
    const configPath = path.join(electron.app.getPath("userData"), "storage.config");
    if (fs.existsSync(configPath)) {
      return fs.readFileSync(configPath, "utf-8").trim();
    }
  } catch {
  }
  return null;
}
function generateMachineId() {
  const base = electron.app.getPath("userData") + Math.random().toString(36);
  let hash = 0;
  for (let i = 0; i < base.length; i++) {
    hash = (hash << 5) - hash + base.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(8, "0") + Date.now().toString(16);
}
function today() {
  return (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
}
electron.app.whenReady().then(async () => {
  electronApp.setAppUserModelId("com.souldiary.app");
  electron.app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });
  await initServices();
  createWindow();
  registerPdfHandlers();
  electron.app.on("activate", () => {
    if (electron.BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    encryption.clear();
    db.close();
    electron.app.quit();
  }
});
electron.app.on("before-quit", () => {
  encryption.clear();
  db.close();
});
const gotLock = electron.app.requestSingleInstanceLock();
if (!gotLock) {
  electron.app.quit();
} else {
  electron.app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}
