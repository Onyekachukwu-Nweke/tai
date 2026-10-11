CREATE TABLE practical_task_requests (
  user_id TEXT NOT NULL,
  space_id TEXT NOT NULL,
  request_id TEXT NOT NULL,
  document_id TEXT NOT NULL,
  concept_request_id TEXT NOT NULL,
  selection_key TEXT NOT NULL,
  state TEXT NOT NULL CHECK(state IN ('pending','ready','failed','notSuitable')),
  error TEXT,
  canonical_json TEXT,
  created_at TEXT NOT NULL,
  PRIMARY KEY(user_id,space_id),
  FOREIGN KEY(user_id,space_id) REFERENCES concept_requests(user_id,space_id) ON DELETE CASCADE
);
CREATE TABLE practical_tasks (
  user_id TEXT NOT NULL,
  space_id TEXT NOT NULL,
  id TEXT NOT NULL,
  request_id TEXT NOT NULL,
  canonical_json TEXT NOT NULL,
  completed_at TEXT,
  created_at TEXT NOT NULL,
  PRIMARY KEY(user_id,space_id,id),
  FOREIGN KEY(user_id,space_id) REFERENCES practical_task_requests(user_id,space_id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX practical_tasks_request ON practical_tasks(user_id,space_id,request_id);
