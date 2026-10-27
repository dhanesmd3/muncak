-- worker/migrations/0001_init.sql
CREATE TABLE answer_logs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  prompt_id   TEXT NOT NULL,
  play_date   TEXT NOT NULL,          -- YYYY-MM-DD WIB
  mode        TEXT NOT NULL,          -- daily | expedition | pack
  input_norm  TEXT NOT NULL,          -- jawaban yang sudah dinormalisasi, maks 60 karakter
  outcome     TEXT NOT NULL,          -- accepted | rejected | unknown
  answer_id   TEXT,                   -- terisi kalau accepted
  device_hash TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_logs_prompt_outcome ON answer_logs (prompt_id, outcome);
CREATE INDEX idx_logs_date ON answer_logs (play_date);

CREATE TABLE daily_salts (
  play_date TEXT PRIMARY KEY,
  salt      TEXT NOT NULL
);

CREATE TABLE groups (
  code           TEXT PRIMARY KEY,    -- MCK-XXXX
  name           TEXT NOT NULL,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  last_active_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE group_members (
  group_code TEXT NOT NULL REFERENCES groups(code) ON DELETE CASCADE,
  member_id  TEXT NOT NULL,
  nickname   TEXT NOT NULL,
  joined_at  TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (group_code, member_id)
);

CREATE TABLE daily_scores (
  member_id TEXT NOT NULL,
  play_date TEXT NOT NULL,
  altitude  INTEGER NOT NULL,
  tiers     TEXT NOT NULL,            -- contoh "basecamp,edelweiss,treeline,summit,camp,fog,summit"
  PRIMARY KEY (member_id, play_date)
);

CREATE TABLE suggestions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  prompt_id  TEXT NOT NULL,
  input_norm TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
