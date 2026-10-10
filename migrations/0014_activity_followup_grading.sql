CREATE TABLE activity_followup_attempts (
  user_id TEXT NOT NULL, space_id TEXT NOT NULL, id TEXT NOT NULL,
  followup_request_id TEXT NOT NULL, pack_id TEXT NOT NULL, question_id TEXT NOT NULL,
  answer TEXT NOT NULL, request_hash TEXT NOT NULL, created_at TEXT NOT NULL,
  PRIMARY KEY(user_id,space_id,id),
  UNIQUE(user_id,space_id,followup_request_id),
  FOREIGN KEY(user_id,space_id,followup_request_id) REFERENCES activity_followup_requests(user_id,space_id,request_id) ON DELETE CASCADE,
  CHECK(length(answer) BETWEEN 1 AND 8000)
);
CREATE INDEX activity_followup_attempt_pack
ON activity_followup_attempts(user_id,space_id,pack_id,created_at);

CREATE TABLE activity_followup_grade_requests (
  user_id TEXT NOT NULL, space_id TEXT NOT NULL, request_id TEXT NOT NULL,
  attempt_id TEXT NOT NULL, followup_request_id TEXT NOT NULL,
  pack_id TEXT NOT NULL, question_id TEXT NOT NULL,
  followup_response_json TEXT NOT NULL, request_hash TEXT NOT NULL,
  state TEXT NOT NULL CHECK(state IN ('pending','ready','failed')),
  response_json TEXT, error TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  PRIMARY KEY(user_id,space_id,request_id),
  FOREIGN KEY(user_id,space_id,attempt_id) REFERENCES activity_followup_attempts(user_id,space_id,id) ON DELETE CASCADE,
  FOREIGN KEY(user_id,space_id,followup_request_id) REFERENCES activity_followup_requests(user_id,space_id,request_id) ON DELETE CASCADE,
  CHECK((state='ready' AND response_json IS NOT NULL AND error IS NULL) OR
        (state='failed' AND response_json IS NULL AND error IS NOT NULL) OR
        (state='pending' AND response_json IS NULL AND error IS NULL))
);
CREATE UNIQUE INDEX activity_followup_grade_active
ON activity_followup_grade_requests(user_id,space_id,attempt_id)
WHERE state IN ('pending','ready');
CREATE INDEX activity_followup_grade_pack
ON activity_followup_grade_requests(user_id,space_id,pack_id,created_at);
