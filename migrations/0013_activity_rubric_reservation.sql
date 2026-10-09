-- Reconcile legacy requests without deleting rows referenced by follow-up work.
-- A ready request wins. Otherwise the oldest pending request remains active.
UPDATE activity_rubric_requests AS candidate
SET state='failed', response_json=NULL,
    error='Superseded by another grading request for this attempt.',
    updated_at=CURRENT_TIMESTAMP
WHERE candidate.state='pending'
  AND EXISTS (
    SELECT 1 FROM activity_rubric_requests AS preferred
    WHERE preferred.user_id=candidate.user_id
      AND preferred.space_id=candidate.space_id
      AND preferred.attempt_id=candidate.attempt_id
      AND (
        preferred.state='ready'
        OR (
          preferred.state='pending'
          AND (
            preferred.created_at < candidate.created_at
            OR (preferred.created_at = candidate.created_at
                AND preferred.request_id < candidate.request_id)
          )
        )
      )
  );

DROP INDEX activity_rubric_attempt_ready;
CREATE UNIQUE INDEX activity_rubric_attempt_active
ON activity_rubric_requests(user_id,space_id,attempt_id)
WHERE state IN ('pending','ready');
