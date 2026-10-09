import {
  activityTutorResponseSchema,
  type ActivityTutorResponse,
} from "../../../packages/contracts/activity-tutor";
import type { Clock } from "../../../packages/domain/concept-progress";
import type { Env } from "./env";

export type TutorRequestRow = {
  request_hash: string;
  state: "pending" | "ready" | "failed";
  response_json: string | null;
};

export async function loadTutorRequest(
  env: Env,
  userId: string,
  spaceId: string,
  requestId: string,
) {
  return env.DB.prepare(
    "SELECT request_hash,state,response_json FROM activity_tutor_requests WHERE user_id=? AND space_id=? AND request_id=?",
  )
    .bind(userId, spaceId, requestId)
    .first<TutorRequestRow>();
}

export async function reserveTutorRequest(
  env: Env,
  keys: {
    userId: string;
    spaceId: string;
    requestId: string;
    packId: string;
    questionId: string;
    kind: string;
  },
  requestHash: string,
  clock: Clock,
) {
  const now = clock.now().toISOString();
  const result = await env.DB.prepare(
    "INSERT OR IGNORE INTO activity_tutor_requests(user_id,space_id,request_id,pack_id,question_id,kind,request_hash,state,response_json,error,created_at,updated_at) VALUES(?,?,?,?,?,?,?,'pending',NULL,NULL,?,?)",
  )
    .bind(
      keys.userId,
      keys.spaceId,
      keys.requestId,
      keys.packId,
      keys.questionId,
      keys.kind,
      requestHash,
      now,
      now,
    )
    .run();
  return result.meta.changes === 1;
}

const currentQuestion = `EXISTS(
 SELECT 1 FROM activity_packs p
 JOIN activity_pack_requests r ON r.user_id=p.user_id AND r.space_id=p.space_id AND r.request_id=p.request_id
 JOIN study_spaces s ON s.user_id=p.user_id AND s.id=p.space_id
 JOIN material_imports m ON m.user_id=p.user_id AND m.space_id=p.space_id AND m.document_id=p.document_id
 JOIN concept_requests cr ON cr.user_id=p.user_id AND cr.space_id=p.space_id AND cr.request_id=p.concept_request_id
 WHERE p.user_id=activity_tutor_requests.user_id AND p.space_id=activity_tutor_requests.space_id
 AND p.id=activity_tutor_requests.pack_id AND r.state='ready' AND s.deleted_at IS NULL
 AND m.state='ready' AND cr.state='ready' AND p.document_id=r.document_id
 AND p.concept_request_id=r.concept_request_id AND p.selection_key=r.selection_key
 AND EXISTS(SELECT 1 FROM json_each(p.canonical_json,'$.questions') q
   WHERE json_extract(q.value,'$.id')=activity_tutor_requests.question_id)
)`;

export async function finishTutorRequest(
  env: Env,
  userId: string,
  spaceId: string,
  requestId: string,
  response: ActivityTutorResponse,
  clock: Clock,
) {
  const updated = await env.DB.prepare(
    `UPDATE activity_tutor_requests SET state='ready',response_json=?,updated_at=?
     WHERE user_id=? AND space_id=? AND request_id=? AND state='pending' AND ${currentQuestion}`,
  )
    .bind(
      JSON.stringify(response),
      clock.now().toISOString(),
      userId,
      spaceId,
      requestId,
    )
    .run();
  if (updated.meta.changes !== 1) {
    await failTutorRequest(env, userId, spaceId, requestId, clock);
    return false;
  }
  return true;
}

export async function failTutorRequest(
  env: Env,
  userId: string,
  spaceId: string,
  requestId: string,
  clock: Clock,
) {
  await env.DB.prepare(
    "UPDATE activity_tutor_requests SET state='failed',error='Tutor help could not be prepared. Retry explicitly.',updated_at=? WHERE user_id=? AND space_id=? AND request_id=? AND state='pending'",
  )
    .bind(clock.now().toISOString(), userId, spaceId, requestId)
    .run();
}

export async function loadTutorState(
  env: Env,
  userId: string,
  spaceId: string,
  packId: string,
) {
  const rows = await env.DB.prepare(
    `SELECT response_json FROM (
      SELECT response_json,created_at,rowid,
      ROW_NUMBER() OVER(PARTITION BY question_id,kind ORDER BY created_at DESC,rowid DESC) AS newest
      FROM activity_tutor_requests
      WHERE user_id=? AND space_id=? AND pack_id=? AND state='ready'
    ) WHERE newest=1 ORDER BY created_at,rowid`,
  )
    .bind(userId, spaceId, packId)
    .all<{ response_json: string }>();
  return rows.results.map((row) =>
    activityTutorResponseSchema.parse(JSON.parse(row.response_json)),
  );
}

export async function assistanceForQuestion(
  env: Env,
  userId: string,
  spaceId: string,
  packId: string,
  questionId: string,
) {
  const row = await env.DB.prepare(
    "SELECT MAX(kind='hint') AS hint_used,MAX(kind='explain_again') AS explanation_used FROM activity_tutor_requests WHERE user_id=? AND space_id=? AND pack_id=? AND question_id=? AND state='ready'",
  )
    .bind(userId, spaceId, packId, questionId)
    .first<{ hint_used: number | null; explanation_used: number | null }>();
  return {
    hintUsed: Boolean(row?.hint_used),
    alternateExplanationUsed: Boolean(row?.explanation_used),
  };
}
