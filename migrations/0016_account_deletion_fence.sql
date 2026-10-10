CREATE TABLE account_deletions (
  user_id TEXT PRIMARY KEY NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  started_at TEXT NOT NULL
);
