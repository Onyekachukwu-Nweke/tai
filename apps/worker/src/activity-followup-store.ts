import {
  activityFollowupResponseSchema,
  type ActivityFollowupResponse,
} from "../../../packages/contracts/activity-followup";
import type { Clock } from "../../../packages/domain/concept-progress";
import type { Env } from "./env";

export type FollowupRequestRow = {
  request_hash: string;
  state: "pending" | "ready" | "failed";
  response_json: string | null;
};

export const loadFollowupRequest = (
  env: Env,
  userId: string,
  spaceId: string,
  requestId: string,
) =>
  env.DB.prepare(
    "SELECT request_hash,state,response_json FROM activity_followup_requests WHERE user_id=? AND space_id=? AND request_id=?",
  )
    .bind(userId, spaceId, requestId)
    .first<FollowupRequestRow>();

export async function reserveFollowupRequest(
  env: Env,
  keys: {
    userId: string;
    spaceId: string;
    requestId: string;
    attemptId: string;
    packId: string;
    questionId: string;
    gradeRequestId: string;
  },
  hash: string,
  gradeJson: string,
  clock: Clock,
) {
  const now = clock.now().toISOString();
  const result = await env.DB.prepare(
    `INSERT OR IGNORE INTO activity_followup_requests(user_id,space_id,request_id,attempt_id,pack_id,question_id,grade_request_id,grade_response_json,request_hash,state,response_json,error,created_at,updated_at)
     SELECT ?,?,?,?,?,?,?,?,?,'pending',NULL,NULL,?,?
     WHERE NOT EXISTS(SELECT 1 FROM activity_followup_requests
       WHERE user_id=? AND space_id=? AND attempt_id=? AND state IN ('pending','ready'))`,
  )
    .bind(
      keys.userId,
      keys.spaceId,
      keys.requestId,
      keys.attemptId,
      keys.packId,
      keys.questionId,
      keys.gradeRequestId,
      gradeJson,
      hash,
      now,
      now,
      keys.userId,
      keys.spaceId,
      keys.attemptId,
    )
    .run();
  return result.meta.changes === 1;
}

const stillCurrent = `EXISTS(
 SELECT 1 FROM activity_attempts a
 JOIN activity_packs p ON p.user_id=a.user_id AND p.space_id=a.space_id AND p.id=a.pack_id
 JOIN activity_pack_requests pr ON pr.user_id=p.user_id AND pr.space_id=p.space_id AND pr.request_id=p.request_id
 JOIN study_spaces s ON s.user_id=p.user_id AND s.id=p.space_id
 JOIN activity_rubric_requests g ON g.user_id=a.user_id AND g.space_id=a.space_id
   AND g.request_id=activity_followup_requests.grade_request_id
 WHERE a.user_id=activity_followup_requests.user_id AND a.space_id=activity_followup_requests.space_id
 AND a.id=activity_followup_requests.attempt_id AND a.pack_id=activity_followup_requests.pack_id
 AND a.question_id=activity_followup_requests.question_id AND a.interaction IN ('explain_submit','calculation_submit')
 AND g.attempt_id=a.id AND g.state='ready'
 AND g.response_json=activity_followup_requests.grade_response_json
 AND pr.state='ready' AND s.deleted_at IS NULL AND p.document_id=pr.document_id
 AND p.concept_request_id=pr.concept_request_id AND p.selection_key=pr.selection_key
 AND NOT EXISTS(SELECT 1 FROM activity_question_flags f WHERE f.user_id=a.user_id
   AND f.space_id=a.space_id AND f.pack_id=a.pack_id AND f.question_id=a.question_id)
)`;

export async function finishFollowupRequest(
  env: Env,
  userId: string,
  spaceId: string,
  requestId: string,
  response: ActivityFollowupResponse,
  clock: Clock,
) {
  const result = await env.DB.prepare(
    `UPDATE activity_followup_requests SET state='ready',response_json=?,updated_at=?
     WHERE user_id=? AND space_id=? AND request_id=? AND state='pending' AND ${stillCurrent}`,
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
  await failFollowupRequest(env, userId, spaceId, requestId, clock);
  return false;
}

export async function failFollowupRequest(
  env: Env,
  userId: string,
  spaceId: string,
  requestId: string,
  clock: Clock,
) {
  await env.DB.prepare(
    "UPDATE activity_followup_requests SET state='failed',response_json=NULL,error='Follow-up could not be prepared. Retry explicitly.',updated_at=? WHERE user_id=? AND space_id=? AND request_id=? AND state='pending'",
  )
    .bind(clock.now().toISOString(), userId, spaceId, requestId)
    .run();
}

export async function loadFollowupState(
  env: Env,
  userId: string,
  spaceId: string,
  packId: string,
) {
  const rows = await env.DB.prepare(
    "SELECT response_json FROM activity_followup_requests WHERE user_id=? AND space_id=? AND pack_id=? AND state='ready' ORDER BY created_at,rowid",
  )
    .bind(userId, spaceId, packId)
    .all<{ response_json: string }>();
  return rows.results.map((row) =>
    activityFollowupResponseSchema.parse(JSON.parse(row.response_json)),
  );
}
