import type { Clock } from "../../../packages/domain/concept-progress";
import { evidenceLabel } from "../../../packages/domain/concept-progress";
import type { Env } from "./env";

const eligible = `FROM activity_attempts a
JOIN activity_question_concepts qc ON qc.user_id=a.user_id AND qc.space_id=a.space_id AND qc.pack_id=a.pack_id AND qc.question_id=a.question_id
JOIN activity_packs p ON p.user_id=a.user_id AND p.space_id=a.space_id AND p.id=a.pack_id
JOIN concept_requests cr ON cr.user_id=p.user_id AND cr.space_id=p.space_id AND cr.request_id=p.concept_request_id
JOIN material_imports m ON m.user_id=p.user_id AND m.space_id=p.space_id AND m.document_id=p.document_id
LEFT JOIN activity_question_flags f ON f.user_id=a.user_id AND f.space_id=a.space_id AND f.pack_id=a.pack_id AND f.question_id=a.question_id
WHERE a.user_id=? AND a.space_id=? AND qc.concept_id=? AND a.interaction='mcq_submit' AND a.correctness IS NOT NULL
AND f.question_id IS NULL AND a.hint_used=0 AND a.alternate_explanation_used=0
AND cr.state='ready' AND m.state='ready'`;

export const recomputeProgressStatement = (
  env: Env,
  userId: string,
  spaceId: string,
  conceptId: string,
) => {
  return env.DB.prepare(
    `WITH evidence AS (SELECT a.rowid,a.correctness,a.created_at ${eligible}),
last_bad AS (SELECT COALESCE(MAX(rowid),0) AS rowid FROM evidence WHERE correctness='incorrect'),
stats AS (SELECT MIN(4,COUNT(*)) AS step FROM evidence,last_bad WHERE correctness='correct' AND evidence.rowid>last_bad.rowid),
latest AS (SELECT correctness,created_at FROM evidence ORDER BY created_at DESC,rowid DESC LIMIT 1)
INSERT INTO concept_progress(user_id,space_id,concept_id,review_step,latest_correctness,last_checked_at,next_review_at)
SELECT ?,?,?,stats.step,latest.correctness,latest.created_at,strftime('%Y-%m-%dT%H:%M:%fZ',latest.created_at,CASE WHEN latest.correctness='incorrect' THEN '+1 day' WHEN stats.step=1 THEN '+1 day' WHEN stats.step=2 THEN '+3 days' WHEN stats.step=3 THEN '+7 days' ELSE '+14 days' END)
FROM latest,stats WHERE true
ON CONFLICT(user_id,space_id,concept_id) DO UPDATE SET review_step=excluded.review_step,latest_correctness=excluded.latest_correctness,last_checked_at=excluded.last_checked_at,next_review_at=excluded.next_review_at`,
  ).bind(userId, spaceId, conceptId, userId, spaceId, conceptId);
};

export async function questionConceptIds(
  env: Env,
  userId: string,
  spaceId: string,
  packId: string,
  questionId: string,
) {
  const rows = await env.DB.prepare(
    "SELECT concept_id FROM activity_question_concepts WHERE user_id=? AND space_id=? AND pack_id=? AND question_id=? ORDER BY concept_id",
  )
    .bind(userId, spaceId, packId, questionId)
    .all<{ concept_id: string }>();
  return rows.results.map((row) => row.concept_id);
}

export async function loadConceptProgress(
  env: Env,
  userId: string,
  spaceId: string,
  clock: Clock,
) {
  const rows = await env.DB.prepare(
    "SELECT c.id,c.label,p.review_step,p.latest_correctness,p.last_checked_at,p.next_review_at FROM concepts c JOIN concept_requests cr ON cr.user_id=c.user_id AND cr.space_id=c.space_id AND cr.request_id=c.request_id JOIN study_spaces s ON s.user_id=c.user_id AND s.id=c.space_id LEFT JOIN concept_progress p ON p.user_id=c.user_id AND p.space_id=c.space_id AND p.concept_id=c.id WHERE c.user_id=? AND c.space_id=? AND cr.state='ready' AND s.deleted_at IS NULL ORDER BY c.rowid",
  )
    .bind(userId, spaceId)
    .all<{
      id: string;
      label: string;
      review_step: number | null;
      latest_correctness: "correct" | "incorrect" | null;
      last_checked_at: string | null;
      next_review_at: string | null;
    }>();
  const now = clock.now();
  return rows.results.map((row) => {
    const projected = row.latest_correctness
      ? {
          reviewStep: row.review_step!,
          latestCorrectness: row.latest_correctness,
          lastCheckedAt: row.last_checked_at!,
          nextReviewAt: row.next_review_at!,
        }
      : null;
    return {
      conceptId: row.id,
      conceptLabel: row.label,
      label: evidenceLabel(projected, now),
      reviewStep: projected?.reviewStep ?? 0,
      lastCheckedAt: projected?.lastCheckedAt ?? null,
      nextReviewAt: projected?.nextReviewAt ?? null,
    };
  });
}
