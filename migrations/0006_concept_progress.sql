CREATE TABLE activity_question_concepts (
  user_id TEXT NOT NULL, space_id TEXT NOT NULL, pack_id TEXT NOT NULL,
  question_id TEXT NOT NULL, concept_id TEXT NOT NULL,
  PRIMARY KEY(user_id,space_id,pack_id,question_id,concept_id),
  FOREIGN KEY(user_id,space_id,pack_id) REFERENCES activity_packs(user_id,space_id,id) ON DELETE CASCADE
);

INSERT INTO activity_question_concepts(user_id,space_id,pack_id,question_id,concept_id)
SELECT p.user_id,p.space_id,p.id,
  json_extract(q.value,'$.id'),c.value
FROM activity_packs p,json_each(p.canonical_json,'$.questions') q,
  json_each(q.value,'$.conceptIds') c;

CREATE INDEX activity_question_concepts_concept
ON activity_question_concepts(user_id,space_id,concept_id);

CREATE TABLE concept_progress (
  user_id TEXT NOT NULL, space_id TEXT NOT NULL, concept_id TEXT NOT NULL,
  review_step INTEGER NOT NULL CHECK(review_step BETWEEN 0 AND 4),
  latest_correctness TEXT NOT NULL CHECK(latest_correctness IN ('correct','incorrect')),
  last_checked_at TEXT NOT NULL, next_review_at TEXT NOT NULL,
  PRIMARY KEY(user_id,space_id,concept_id),
  FOREIGN KEY(user_id,space_id,concept_id) REFERENCES concepts(user_id,space_id,id) ON DELETE CASCADE
);
