-- worker/migrations/0002_support.sql
-- Tables that 0001 does not cover (docs/05-teknis.md §10.5).

-- Tiers frozen for one day: written on the first request (or the 00:00 WIB cron) and
-- reused all day, so a deploy in the middle of the day never changes that day's tiers.
CREATE TABLE tier_snapshots (
  play_date TEXT PRIMARY KEY,           -- YYYY-MM-DD WIB
  tiers     TEXT NOT NULL               -- JSON: promptId → answerId → tier
);

-- Request limits per device and day. device_hash uses the daily salt, so these rows are
-- anonymous once the salt is deleted; they are removed after 2 days anyway.
CREATE TABLE rate_limits (
  device_hash TEXT NOT NULL,
  play_date   TEXT NOT NULL,
  kind        TEXT NOT NULL,            -- plays | suggestions | group_create | group_join
  count       INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (device_hash, play_date, kind)
);

-- Answer logs older than 24 months are kept only as counts (docs/07-privasi.md §2).
CREATE TABLE answer_aggregates (
  prompt_id  TEXT NOT NULL,
  mode       TEXT NOT NULL,
  input_norm TEXT NOT NULL,
  outcome    TEXT NOT NULL,
  answer_id  TEXT NOT NULL DEFAULT '',
  count      INTEGER NOT NULL,
  PRIMARY KEY (prompt_id, mode, input_norm, outcome, answer_id)
);

-- Aggregate event counts per day, without any id (docs/05-teknis.md §12).
CREATE TABLE event_counts (
  day   TEXT NOT NULL,
  name  TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, name)
);

-- App errors: message and app version only, kept 30 days.
CREATE TABLE error_logs (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  message    TEXT NOT NULL,
  version    TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_errors_created ON error_logs (created_at);

CREATE INDEX idx_members_member ON group_members (member_id);
CREATE INDEX idx_scores_date ON daily_scores (play_date);
CREATE INDEX idx_logs_unknown ON answer_logs (outcome, prompt_id, input_norm);
