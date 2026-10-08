CREATE TABLE activity_attempts (
  user_id TEXT NOT NULL,
  space_id TEXT NOT NULL,
  id TEXT NOT NULL,
  pack_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  interaction TEXT NOT NULL CHECK(interaction IN ('mcq_submit','recall_self_check','explain_submit','reveal','skip')),
  answer TEXT,
  selected_option_id TEXT,
  self_assessment TEXT CHECK(self_assessment IS NULL OR self_assessment IN ('remembered','partial','not_yet')),
  confidence TEXT CHECK(confidence IS NULL OR confidence IN ('low','medium','high')),
  correctness TEXT CHECK(correctness IS NULL OR correctness IN ('correct','incorrect')),
  revealed INTEGER NOT NULL DEFAULT 0 CHECK(revealed IN (0,1)),
  skipped INTEGER NOT NULL DEFAULT 0 CHECK(skipped IN (0,1)),
  hint_used INTEGER NOT NULL DEFAULT 0 CHECK(hint_used = 0),
  response_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY(user_id,space_id,id),
  FOREIGN KEY(user_id,space_id,pack_id) REFERENCES activity_packs(user_id,space_id,id) ON DELETE CASCADE,
  CHECK(
    (interaction='mcq_submit' AND answer IS NULL AND selected_option_id IS NOT NULL AND self_assessment IS NULL AND correctness IS NOT NULL AND revealed=0 AND skipped=0) OR
    (interaction='recall_self_check' AND answer IS NOT NULL AND selected_option_id IS NULL AND self_assessment IS NOT NULL AND correctness IS NULL AND revealed=1 AND skipped=0) OR
    (interaction='explain_submit' AND answer IS NOT NULL AND selected_option_id IS NULL AND self_assessment IS NULL AND correctness IS NULL AND revealed=0 AND skipped=0) OR
    (interaction='reveal' AND answer IS NULL AND selected_option_id IS NULL AND self_assessment IS NULL AND correctness IS NULL AND revealed=1 AND skipped=0) OR
    (interaction='skip' AND answer IS NULL AND selected_option_id IS NULL AND self_assessment IS NULL AND correctness IS NULL AND revealed=0 AND skipped=1)
  )
);
CREATE INDEX activity_attempts_question ON activity_attempts(user_id,space_id,pack_id,question_id,created_at);

CREATE TABLE activity_question_flags (
  user_id TEXT NOT NULL, space_id TEXT NOT NULL, pack_id TEXT NOT NULL,
  question_id TEXT NOT NULL, reason TEXT NOT NULL CHECK(reason IN ('incorrect','ambiguous')),
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  PRIMARY KEY(user_id,space_id,pack_id,question_id),
  FOREIGN KEY(user_id,space_id,pack_id) REFERENCES activity_packs(user_id,space_id,id) ON DELETE CASCADE
);
