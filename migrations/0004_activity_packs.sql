CREATE TABLE activity_pack_requests (
  user_id TEXT NOT NULL, space_id TEXT NOT NULL, request_id TEXT NOT NULL,
  document_id TEXT NOT NULL, concept_request_id TEXT NOT NULL, selection_key TEXT NOT NULL,
  state TEXT NOT NULL CHECK(state IN ('pending','ready','failed')), error TEXT,
  PRIMARY KEY(user_id,space_id), UNIQUE(user_id,request_id),
  FOREIGN KEY(user_id,space_id) REFERENCES concept_requests(user_id,space_id) ON DELETE CASCADE
);
CREATE TABLE activity_packs (
  user_id TEXT NOT NULL, space_id TEXT NOT NULL, id TEXT NOT NULL, request_id TEXT NOT NULL,
  document_id TEXT NOT NULL, concept_request_id TEXT NOT NULL, selection_key TEXT NOT NULL,
  canonical_json TEXT NOT NULL, created_at TEXT NOT NULL,
  PRIMARY KEY(user_id,space_id,id), UNIQUE(user_id,space_id,request_id),
  FOREIGN KEY(user_id,space_id) REFERENCES activity_pack_requests(user_id,space_id) ON DELETE CASCADE
);
