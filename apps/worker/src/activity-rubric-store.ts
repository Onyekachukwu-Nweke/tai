import {
  activityRubricResponseSchema,
  type ActivityRubricResponse,
} from "../../../packages/contracts/activity-rubric";
import type { Clock } from "../../../packages/domain/concept-progress";
import type { Env } from "./env";

export type RubricRequestRow = {
  request_hash: string;
  state: "pending" | "ready" | "failed";
  response_json: string | null;
};

export const loadRubricRequest = (
  env: Env,
  userId: string,
  spaceId: string,
  requestId: string,
) =>
  env.DB.prepare(
    "SELECT request_hash,state,response_json FROM activity_rubric_requests WHERE user_id=? AND space_id=? AND request_id=?",
  )
    .bind(userId, spaceId, requestId)
    .first<RubricRequestRow>();

export async function reserveRubricRequest(
  env: Env,
  keys: {
    userId: string;
    spaceId: string;
    requestId: string;
    attemptId: string;
    packId: string;
    questionId: string;
  },
  hash: string,
  clock: Clock,
) {
  const now = clock.now().toISOString();
  const result = await env.DB.prepare(
    "INSERT OR IGNORE INTO activity_rubric_requests(user_id,space_id,request_id,attempt_id,pack_id,question_id,request_hash,state,response_json,error,created_at,updated_at) VALUES(?,?,?,?,?,?,?,'pending',NULL,NULL,?,?)",
  )
    .bind(
      keys.userId,
      keys.spaceId,
      keys.requestId,
      keys.attemptId,
      keys.packId,
      keys.questionId,
      hash,
      now,
      now,
    )
    .run();
  return result.meta.changes === 1;
}

const currentAttempt = `EXISTS(
 SELECT 1 FROM activity_attempts a
 JOIN activity_packs p ON p.user_id=a.user_id AND p.space_id=a.space_id AND p.id=a.pack_id
 JOIN activity_pack_requests r ON r.user_id=p.user_id AND r.space_id=p.space_id AND r.request_id=p.request_id
 JOIN study_spaces s ON s.user_id=p.user_id AND s.id=p.space_id
 WHERE a.user_id=activity_rubric_requests.user_id AND a.space_id=activity_rubric_requests.space_id
 AND a.id=activity_rubric_requests.attempt_id AND a.pack_id=activity_rubric_requests.pack_id
 AND a.question_id=activity_rubric_requests.question_id AND a.interaction IN ('explain_submit','calculation_submit')
 AND r.state='ready' AND s.deleted_at IS NULL AND p.document_id=r.document_id
 AND p.concept_request_id=r.concept_request_id AND p.selection_key=r.selection_key
 AND NOT EXISTS(SELECT 1 FROM activity_question_flags f WHERE f.user_id=a.user_id
   AND f.space_id=a.space_id AND f.pack_id=a.pack_id AND f.question_id=a.question_id)
)`;

export async function finishRubricRequest(
  env: Env,
  userId: string,
  spaceId: string,
  requestId: string,
  response: ActivityRubricResponse,
  clock: Clock,
) {
  const result = await env.DB.prepare(
    `UPDATE activity_rubric_requests SET state='ready',response_json=?,updated_at=?
     WHERE user_id=? AND space_id=? AND request_id=? AND state='pending' AND ${currentAttempt}`,
  )
    .bind(
      JSON.stringify(response),
      clock.now().toISOString(),
      userId,
      spaceId,
      requestId,
    )
    .run();
  if (result.meta.changes === 1) return true;
  await failRubricRequest(env, userId, spaceId, requestId, clock);
  return false;
}

export async function failRubricRequest(
  env: Env,
  userId: string,
  spaceId: string,
  requestId: string,
  clock: Clock,
) {
  await env.DB.prepare(
    "UPDATE activity_rubric_requests SET state='failed',response_json=NULL,error='Rubric feedback could not be prepared. Retry explicitly.',updated_at=? WHERE user_id=? AND space_id=? AND request_id=? AND state='pending'",
  )
    .bind(clock.now().toISOString(), userId, spaceId, requestId)
    .run();
}

export async function loadRubricState(
  env: Env,
  userId: string,
  spaceId: string,
  packId: string,
) {
  const rows = await env.DB.prepare(
    `SELECT response_json FROM (
      SELECT response_json,created_at,rowid,
      ROW_NUMBER() OVER(PARTITION BY question_id ORDER BY created_at DESC,rowid DESC) AS newest
      FROM activity_rubric_requests
      WHERE user_id=? AND space_id=? AND pack_id=? AND state='ready'
    ) WHERE newest=1 ORDER BY created_at,rowid`,
  )
    .bind(userId, spaceId, packId)
    .all<{ response_json: string }>();
  return rows.results.map((row) =>
    activityRubricResponseSchema.parse(JSON.parse(row.response_json)),
  );
}
