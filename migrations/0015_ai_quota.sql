CREATE TABLE ai_call_ledger (
  user_id TEXT NOT NULL,
  operation_id TEXT NOT NULL,
  utc_day TEXT NOT NULL,
  category TEXT NOT NULL CHECK(category IN ('concepts','packs','grading','support','practical')),
  task_kind TEXT NOT NULL CHECK(task_kind IN ('concepts','pack','pack_prefetch','rubric_grade','followup_grade','hint','explain_again','followup','practical')),
  state TEXT NOT NULL CHECK(state IN ('pending','completed','failed')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, task_kind, operation_id),
  FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);

CREATE INDEX ai_call_ledger_daily_total
  ON ai_call_ledger(user_id, utc_day);
CREATE INDEX ai_call_ledger_daily_category
  ON ai_call_ledger(user_id, utc_day, category);
