-- ═══════════════════════════════════════════════════════════════
--  Soul Diary — SQLite Schema
--  All text content is AES-256 encrypted before storing
-- ═══════════════════════════════════════════════════════════════

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA encoding = 'UTF-8';

-- ─────────────────────────────────────────────────────────────
--  ENTRIES  (Diary / Notes / Ideas — all in one table)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS entries (
  id            TEXT    PRIMARY KEY,          -- UUID
  type          TEXT    NOT NULL              -- 'diary' | 'note' | 'idea'
                        CHECK(type IN ('diary','note','idea')),
  title         TEXT    NOT NULL DEFAULT '',  -- encrypted
  content       TEXT    NOT NULL DEFAULT '',  -- encrypted (TipTap JSON)
  content_plain TEXT    NOT NULL DEFAULT '',  -- encrypted (plain text for search)
  mood          TEXT,                         -- encrypted: 'happy'|'sad'|'neutral'|'excited'|'anxious'
  mood_score    INTEGER DEFAULT 0,            -- 1-10
  color         TEXT    DEFAULT '#6366f1',    -- entry accent color
  cover_image   TEXT,                         -- path to cover image
  is_favorite   INTEGER DEFAULT 0,            -- 0 | 1
  is_pinned     INTEGER DEFAULT 0,            -- 0 | 1
  is_deleted    INTEGER DEFAULT 0,            -- soft delete (trash)
  word_count    INTEGER DEFAULT 0,
  char_count    INTEGER DEFAULT 0,
  read_time     INTEGER DEFAULT 0,            -- minutes
  weather       TEXT,                         -- encrypted JSON: {temp, condition, icon}
  location      TEXT,                         -- encrypted
  template_id   TEXT,                         -- which template was used
  version       INTEGER DEFAULT 1,            -- for version history
  created_at    TEXT    NOT NULL,             -- ISO 8601
  updated_at    TEXT    NOT NULL,
  deleted_at    TEXT,
  entry_date    TEXT    NOT NULL              -- YYYY-MM-DD (for diary calendar view)
);

-- ─────────────────────────────────────────────────────────────
--  ENTRY VERSIONS  (version history / undo)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS entry_versions (
  id         TEXT    PRIMARY KEY,
  entry_id   TEXT    NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  content    TEXT    NOT NULL,               -- encrypted snapshot
  version    INTEGER NOT NULL,
  created_at TEXT    NOT NULL
);

-- ─────────────────────────────────────────────────────────────
--  TASKS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
  id           TEXT    PRIMARY KEY,
  title        TEXT    NOT NULL,             -- encrypted
  description  TEXT    DEFAULT '',           -- encrypted
  status       TEXT    DEFAULT 'todo'
               CHECK(status IN ('todo','in_progress','done','cancelled')),
  priority     TEXT    DEFAULT 'medium'
               CHECK(priority IN ('low','medium','high','urgent')),
  due_date     TEXT,                         -- ISO 8601
  reminder_at  TEXT,                         -- ISO 8601
  is_deleted   INTEGER DEFAULT 0,
  is_pinned    INTEGER DEFAULT 0,
  sort_order   INTEGER DEFAULT 0,
  parent_id    TEXT,                         -- for subtasks
  entry_id     TEXT REFERENCES entries(id),  -- linked diary/note
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL,
  completed_at TEXT
);

-- ─────────────────────────────────────────────────────────────
--  TAGS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tags (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,           -- encrypted
  color      TEXT DEFAULT '#6366f1',
  icon       TEXT DEFAULT '🏷️',
  created_at TEXT NOT NULL
);

-- ─────────────────────────────────────────────────────────────
--  ENTRY ↔ TAG (many-to-many)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS entry_tags (
  entry_id TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  tag_id   TEXT NOT NULL REFERENCES tags(id)    ON DELETE CASCADE,
  PRIMARY KEY (entry_id, tag_id)
);

-- ─────────────────────────────────────────────────────────────
--  TASK ↔ TAG (many-to-many)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS task_tags (
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  tag_id  TEXT NOT NULL REFERENCES tags(id)  ON DELETE CASCADE,
  PRIMARY KEY (task_id, tag_id)
);

-- ─────────────────────────────────────────────────────────────
--  TEMPLATES
-- ─────────────────────────────────────────────────────────────
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

-- ─────────────────────────────────────────────────────────────
--  HABITS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS habits (
  id           TEXT    PRIMARY KEY,
  name         TEXT    NOT NULL,             -- encrypted
  description  TEXT    DEFAULT '',           -- encrypted
  icon         TEXT    DEFAULT '⭐',
  color        TEXT    DEFAULT '#6366f1',
  frequency    TEXT    DEFAULT 'daily'
               CHECK(frequency IN ('daily','weekly','custom')),
  target_days  TEXT    DEFAULT '[]',         -- JSON array of weekdays
  is_active    INTEGER DEFAULT 1,
  streak       INTEGER DEFAULT 0,
  best_streak  INTEGER DEFAULT 0,
  created_at   TEXT    NOT NULL
);

-- ─────────────────────────────────────────────────────────────
--  HABIT LOGS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS habit_logs (
  id         TEXT PRIMARY KEY,
  habit_id   TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  log_date   TEXT NOT NULL,                 -- YYYY-MM-DD
  completed  INTEGER DEFAULT 1,
  note       TEXT DEFAULT '',               -- encrypted
  created_at TEXT NOT NULL,
  UNIQUE(habit_id, log_date)
);

-- ─────────────────────────────────────────────────────────────
--  REMINDERS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reminders (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,               -- encrypted
  body        TEXT DEFAULT '',             -- encrypted
  remind_at   TEXT NOT NULL,               -- ISO 8601
  repeat      TEXT DEFAULT 'none'
              CHECK(repeat IN ('none','daily','weekly','monthly')),
  is_done     INTEGER DEFAULT 0,
  entry_id    TEXT REFERENCES entries(id),
  created_at  TEXT NOT NULL
);

-- ─────────────────────────────────────────────────────────────
--  MEDIA  (images, audio, attachments)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS media (
  id         TEXT PRIMARY KEY,
  entry_id   TEXT REFERENCES entries(id) ON DELETE CASCADE,
  file_name  TEXT NOT NULL,
  file_path  TEXT NOT NULL,               -- relative path inside app data
  file_type  TEXT NOT NULL,               -- 'image'|'audio'|'video'|'file'
  file_size  INTEGER DEFAULT 0,           -- bytes
  mime_type  TEXT,
  width      INTEGER,                     -- for images
  height     INTEGER,                     -- for images
  created_at TEXT NOT NULL
);

-- ─────────────────────────────────────────────────────────────
--  APP SETTINGS  (key-value store)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,               -- JSON value (some encrypted)
  updated_at TEXT NOT NULL
);

-- ─────────────────────────────────────────────────────────────
--  WORD PREDICTIONS  (smart typing memory)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS word_predictions (
  id         TEXT PRIMARY KEY,
  phrase     TEXT NOT NULL UNIQUE,        -- encrypted
  frequency  INTEGER DEFAULT 1,
  last_used  TEXT NOT NULL,
  context    TEXT DEFAULT ''             -- 'diary'|'note'|'idea'|'any'
);

-- ─────────────────────────────────────────────────────────────
--  SEARCH INDEX  (FTS5 — Fast Full-Text Search)
-- ─────────────────────────────────────────────────────────────
CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5(
  entry_id    UNINDEXED,
  entry_type  UNINDEXED,
  title,
  content,
  tags,
  tokenize = 'porter ascii'
);

-- ─────────────────────────────────────────────────────────────
--  INDEXES  (for fast queries)
-- ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_entries_type       ON entries(type);
CREATE INDEX IF NOT EXISTS idx_entries_date       ON entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_entries_deleted    ON entries(is_deleted);
CREATE INDEX IF NOT EXISTS idx_entries_favorite   ON entries(is_favorite);
CREATE INDEX IF NOT EXISTS idx_entries_updated    ON entries(updated_at);
CREATE INDEX IF NOT EXISTS idx_tasks_status       ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due          ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_deleted      ON tasks(is_deleted);
CREATE INDEX IF NOT EXISTS idx_habit_logs_date    ON habit_logs(log_date);
CREATE INDEX IF NOT EXISTS idx_habit_logs_habit   ON habit_logs(habit_id);
CREATE INDEX IF NOT EXISTS idx_entry_versions     ON entry_versions(entry_id);

-- ─────────────────────────────────────────────────────────────
--  DEFAULT DATA
-- ─────────────────────────────────────────────────────────────

-- Default app settings
INSERT OR IGNORE INTO app_settings(key, value, updated_at) VALUES
  ('theme',            '"dark"',                          datetime('now')),
  ('language',         '"en"',                            datetime('now')),
  ('fontSize',         '"md"',                            datetime('now')),
  ('fontFamily',       '"serif"',                         datetime('now')),
  ('animationTheme',   '"none"',                          datetime('now')),
  ('autoLock',         'false',                           datetime('now')),
  ('autoLockMinutes',  '5',                               datetime('now')),
  ('hasPin',           'false',                           datetime('now')),
  ('setupDone',        'false',                           datetime('now')),
  ('storageLocation',  'null',                            datetime('now'));

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