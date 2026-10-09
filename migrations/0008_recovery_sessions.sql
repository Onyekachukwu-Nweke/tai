CREATE TABLE study_sessions_v2 (
  user_id TEXT NOT NULL, space_id TEXT NOT NULL, id TEXT NOT NULL,
  request_hash TEXT NOT NULL, pack_id TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'standard' CHECK(kind IN ('standard','recovery')),
  budget_minutes INTEGER NOT NULL CHECK(
    (kind='standard' AND budget_minutes IN (5,15,30)) OR
    (kind='recovery' AND budget_minutes=10)
  ),
  estimated_minutes INTEGER NOT NULL CHECK(estimated_minutes BETWEEN 0 AND budget_minutes),
  mode TEXT NOT NULL CHECK(mode IN ('learn','review','practise')),
  concept_id TEXT, status TEXT NOT NULL CHECK(status IN ('active','completed','superseded')),
  created_at TEXT NOT NULL, completed_at TEXT,
  PRIMARY KEY(user_id,space_id,id),
  FOREIGN KEY(user_id,space_id,pack_id) REFERENCES activity_packs(user_id,space_id,id) ON DELETE CASCADE
);
INSERT INTO study_sessions_v2
SELECT user_id,space_id,id,request_hash,pack_id,'standard',budget_minutes,
estimated_minutes,mode,concept_id,status,created_at,completed_at FROM study_sessions;
CREATE TABLE study_session_items_v2 (
  user_id TEXT NOT NULL, space_id TEXT NOT NULL, session_id TEXT NOT NULL,
  question_id TEXT NOT NULL, position INTEGER NOT NULL,
  estimated_minutes INTEGER NOT NULL CHECK(estimated_minutes BETWEEN 1 AND 10),
  reason TEXT NOT NULL, completed_at TEXT, attempt_id TEXT,
  PRIMARY KEY(user_id,space_id,session_id,question_id),
  UNIQUE(user_id,space_id,session_id,position),
  FOREIGN KEY(user_id,space_id,session_id) REFERENCES study_sessions_v2(user_id,space_id,id) ON DELETE CASCADE
);
INSERT INTO study_session_items_v2 SELECT * FROM study_session_items;
DROP TABLE study_session_items;
DROP TABLE study_sessions;
ALTER TABLE study_sessions_v2 RENAME TO study_sessions;
ALTER TABLE study_session_items_v2 RENAME TO study_session_items;
CREATE UNIQUE INDEX one_active_study_session
ON study_sessions(user_id,space_id) WHERE status='active';
CREATE INDEX newest_study_session
ON study_sessions(user_id,space_id,created_at DESC);
CREATE INDEX study_session_kind_created
ON study_sessions(user_id,space_id,kind,created_at DESC);
