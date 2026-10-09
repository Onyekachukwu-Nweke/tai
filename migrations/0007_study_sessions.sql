CREATE TABLE study_sessions (
  user_id TEXT NOT NULL, space_id TEXT NOT NULL, id TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  pack_id TEXT NOT NULL, budget_minutes INTEGER NOT NULL CHECK(budget_minutes IN (5,15,30)),
  estimated_minutes INTEGER NOT NULL CHECK(estimated_minutes BETWEEN 0 AND budget_minutes),
  mode TEXT NOT NULL CHECK(mode IN ('learn','review','practise')), concept_id TEXT,
  status TEXT NOT NULL CHECK(status IN ('active','completed','superseded')),
  created_at TEXT NOT NULL, completed_at TEXT,
  PRIMARY KEY(user_id,space_id,id),
  FOREIGN KEY(user_id,space_id,pack_id) REFERENCES activity_packs(user_id,space_id,id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX one_active_study_session
ON study_sessions(user_id,space_id) WHERE status='active';
CREATE INDEX newest_study_session
ON study_sessions(user_id,space_id,created_at DESC);

CREATE TABLE study_session_items (
  user_id TEXT NOT NULL, space_id TEXT NOT NULL, session_id TEXT NOT NULL,
  question_id TEXT NOT NULL, position INTEGER NOT NULL,
  estimated_minutes INTEGER NOT NULL CHECK(estimated_minutes BETWEEN 1 AND 10),
  reason TEXT NOT NULL, completed_at TEXT, attempt_id TEXT,
  PRIMARY KEY(user_id,space_id,session_id,question_id),
  UNIQUE(user_id,space_id,session_id,position),
  FOREIGN KEY(user_id,space_id,session_id) REFERENCES study_sessions(user_id,space_id,id) ON DELETE CASCADE
);
