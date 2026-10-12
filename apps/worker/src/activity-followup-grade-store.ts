import {
  followupAttemptSchema,
  followupGradeResponseSchema,
  type FollowupAttempt,
  type FollowupGradeResponse,
} from "../../../packages/contracts/activity-followup-grade";
import type { Clock } from "../../../packages/domain/concept-progress";
import type { Env } from "./env";
import type { ActivityFollowupGradeProviderMetadata } from "../../../packages/adapters/fake-activity-followup-grade";

export type FollowupGradeRow = {
  request_hash: string;
  state: "pending" | "ready" | "failed";
  response_json: string | null;
};
export const FOLLOWUP_GRADE_LEASE_MS = 5 * 60 * 1_000;
export const loadFollowupAttempt = (
  env: Env,
  userId: string,
  spaceId: string,
  id: string,
) =>
  env.DB.prepare(
    "SELECT id,followup_request_id,pack_id,question_id,answer,request_hash FROM activity_followup_attempts WHERE user_id=? AND space_id=? AND id=?",
  )
    .bind(userId, spaceId, id)
    .first<{
      id: string;
      followup_request_id: string;
      pack_id: string;
      question_id: string;
      answer: string;
      request_hash: string;
    }>();
export const loadAttemptForFollowup = (
  env: Env,
  userId: string,
  spaceId: string,
  followupId: string,
) =>
  env.DB.prepare(
    "SELECT id,followup_request_id,pack_id,question_id,answer,request_hash FROM activity_followup_attempts WHERE user_id=? AND space_id=? AND followup_request_id=?",
  )
    .bind(userId, spaceId, followupId)
    .first<{
      id: string;
      followup_request_id: string;
      pack_id: string;
      question_id: string;
      answer: string;
      request_hash: string;
    }>();
export const loadFollowupGrade = (
  env: Env,
  userId: string,
  spaceId: string,
  requestId: string,
) =>
  env.DB.prepare(
    "SELECT request_hash,state,response_json FROM activity_followup_grade_requests WHERE user_id=? AND space_id=? AND request_id=?",
  )
    .bind(userId, spaceId, requestId)
    .first<FollowupGradeRow>();
export const loadActiveFollowupGrade = (
  env: Env,
  userId: string,
  spaceId: string,
  attemptId: string,
) =>
  env.DB.prepare(
    "SELECT request_hash,state,response_json FROM activity_followup_grade_requests WHERE user_id=? AND space_id=? AND attempt_id=? AND state IN ('pending','ready') LIMIT 1",
  )
    .bind(userId, spaceId, attemptId)
    .first<FollowupGradeRow>();

export async function expireStaleFollowupGrade(
  env: Env,
  userId: string,
  spaceId: string,
  attemptId: string,
  clock: Clock,
) {
  const cutoff = new Date(
    clock.now().getTime() - FOLLOWUP_GRADE_LEASE_MS,
  ).toISOString();
  const result = await env.DB.prepare(
    `UPDATE activity_followup_grade_requests
     SET state='failed',response_json=NULL,
       error='Grading reservation expired. Retry explicitly with a new request ID.',
       updated_at=?
     WHERE user_id=? AND space_id=? AND attempt_id=? AND state='pending'
       AND updated_at<=?`,
  )
    .bind(clock.now().toISOString(), userId, spaceId, attemptId, cutoff)
    .run();
  return result.meta.changes === 1;
}

export async function reserveFollowupGrade(
  env: Env,
  keys: {
    userId: string;
    spaceId: string;
    requestId: string;
    attemptId: string;
    followupId: string;
    packId: string;
    questionId: string;
  },
  followupJson: string,
  hash: string,
  metadata: ActivityFollowupGradeProviderMetadata,
  clock: Clock,
) {
  const now = clock.now().toISOString();
  const result = await env.DB.prepare(
    "INSERT OR IGNORE INTO activity_followup_grade_requests(user_id,space_id,request_id,attempt_id,followup_request_id,pack_id,question_id,followup_response_json,request_hash,state,response_json,error,created_at,updated_at,provider,model,prompt_version,output_schema_version) VALUES(?,?,?,?,?,?,?,?,?,'pending',NULL,NULL,?,?,?,?,?,?)",
  )
    .bind(
      keys.userId,
      keys.spaceId,
      keys.requestId,
      keys.attemptId,
      keys.followupId,
      keys.packId,
      keys.questionId,
      followupJson,
      hash,
      now,
      now,
      metadata.provider,
      metadata.model,
      metadata.promptVersion,
      metadata.schemaVersion,
    )
    .run();
  return result.meta.changes === 1;
}

const stillCurrent = `EXISTS(
 SELECT 1 FROM activity_followup_attempts a
 JOIN activity_followup_requests f ON f.user_id=a.user_id AND f.space_id=a.space_id AND f.request_id=a.followup_request_id
 JOIN activity_rubric_requests r ON r.user_id=f.user_id AND r.space_id=f.space_id AND r.request_id=f.grade_request_id
 JOIN activity_packs p ON p.user_id=a.user_id AND p.space_id=a.space_id AND p.id=a.pack_id
 JOIN activity_pack_requests pr ON pr.user_id=p.user_id AND pr.space_id=p.space_id AND pr.request_id=p.request_id
 JOIN study_spaces s ON s.user_id=p.user_id AND s.id=p.space_id
 WHERE a.user_id=activity_followup_grade_requests.user_id AND a.space_id=activity_followup_grade_requests.space_id
 AND a.id=activity_followup_grade_requests.attempt_id AND a.followup_request_id=activity_followup_grade_requests.followup_request_id
 AND a.pack_id=activity_followup_grade_requests.pack_id AND a.question_id=activity_followup_grade_requests.question_id
 AND f.state='ready' AND f.response_json=activity_followup_grade_requests.followup_response_json
 AND r.state='ready' AND r.response_json=f.grade_response_json
 AND pr.state='ready' AND s.deleted_at IS NULL AND p.document_id=pr.document_id
 AND p.concept_request_id=pr.concept_request_id AND p.selection_key=pr.selection_key
 AND NOT EXISTS(SELECT 1 FROM activity_question_flags q WHERE q.user_id=a.user_id AND q.space_id=a.space_id AND q.pack_id=a.pack_id AND q.question_id=a.question_id)
)`;
export async function finishFollowupGrade(
  env: Env,
  userId: string,
  spaceId: string,
  requestId: string,
  response: FollowupGradeResponse,
  clock: Clock,
) {
  const result = await env.DB.prepare(
    `UPDATE activity_followup_grade_requests SET state='ready',response_json=?,updated_at=? WHERE user_id=? AND space_id=? AND request_id=? AND state='pending' AND ${stillCurrent}`,
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
  await failFollowupGrade(env, userId, spaceId, requestId, clock);
  return false;
}
export async function failFollowupGrade(
  env: Env,
  userId: string,
  spaceId: string,
  requestId: string,
  clock: Clock,
) {
  await env.DB.prepare(
    "UPDATE activity_followup_grade_requests SET state='failed',response_json=NULL,error='Follow-up feedback could not be prepared. Retry explicitly.',updated_at=? WHERE user_id=? AND space_id=? AND request_id=? AND state='pending'",
  )
    .bind(clock.now().toISOString(), userId, spaceId, requestId)
    .run();
}
export async function loadFollowupGradeState(
  env: Env,
  userId: string,
  spaceId: string,
  packId: string,
) {
  const attempts = await env.DB.prepare(
    "SELECT id AS attemptId,followup_request_id AS followupRequestId,pack_id AS packId,question_id AS questionId,answer FROM activity_followup_attempts WHERE user_id=? AND space_id=? AND pack_id=? ORDER BY created_at,rowid",
  )
    .bind(userId, spaceId, packId)
    .all<Omit<FollowupAttempt, "schemaVersion">>();
  const grades = await env.DB.prepare(
    "SELECT response_json FROM activity_followup_grade_requests WHERE user_id=? AND space_id=? AND pack_id=? AND state='ready' ORDER BY created_at,rowid",
  )
    .bind(userId, spaceId, packId)
    .all<{ response_json: string }>();
  return {
    attempts: attempts.results.map((attempt) =>
      followupAttemptSchema.parse({ schemaVersion: 1, ...attempt }),
    ),
    grades: grades.results.map((row) =>
      followupGradeResponseSchema.parse(JSON.parse(row.response_json)),
    ),
  };
}
