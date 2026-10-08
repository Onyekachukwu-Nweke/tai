import {
  canonicalActivityPackSchema,
  type ActivityQuestion,
} from "../../../packages/contracts/activity-packs";
import {
  activityAttemptResponseSchema,
  type ActivityAttemptResponse,
} from "../../../packages/contracts/activity-attempts";
import type { Env } from "./env";

type AttemptRow = { request_hash: string; response_json: string };

export async function loadCurrentQuestion(
  env: Env,
  userId: string,
  spaceId: string,
  packId: string,
  questionId: string,
): Promise<ActivityQuestion | null> {
  const row = await env.DB.prepare(
    "SELECT p.canonical_json FROM activity_packs p JOIN activity_pack_requests r ON r.user_id=p.user_id AND r.space_id=p.space_id AND r.request_id=p.request_id JOIN study_spaces s ON s.user_id=p.user_id AND s.id=p.space_id WHERE p.user_id=? AND p.space_id=? AND p.id=? AND r.state='ready' AND s.deleted_at IS NULL AND p.document_id=r.document_id AND p.concept_request_id=r.concept_request_id AND p.selection_key=r.selection_key",
  )
    .bind(userId, spaceId, packId)
    .first<{ canonical_json: string }>();
  if (!row) return null;
  const pack = canonicalActivityPackSchema.parse(
    JSON.parse(row.canonical_json),
  );
  return pack.questions.find((question) => question.id === questionId) ?? null;
}

export async function saveAttempt(
  env: Env,
  keys: {
    userId: string;
    spaceId: string;
    packId: string;
    questionId: string;
    attemptId: string;
  },
  requestHash: string,
  response: ActivityAttemptResponse,
  fields: {
    interaction: string;
    answer?: string;
    selectedOptionId?: string;
    selfAssessment?: string;
    confidence: string | null;
    correctness: string | null;
    revealed: boolean;
    skipped: boolean;
  },
) {
  const responseJson = JSON.stringify(response);
  await env.DB.prepare(
    "INSERT OR IGNORE INTO activity_attempts(user_id,space_id,id,pack_id,question_id,request_hash,interaction,answer,selected_option_id,self_assessment,confidence,correctness,revealed,skipped,hint_used,response_json,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
  )
    .bind(
      keys.userId,
      keys.spaceId,
      keys.attemptId,
      keys.packId,
      keys.questionId,
      requestHash,
      fields.interaction,
      fields.answer ?? null,
      fields.selectedOptionId ?? null,
      fields.selfAssessment ?? null,
      fields.confidence,
      fields.correctness,
      Number(fields.revealed),
      Number(fields.skipped),
      0,
      responseJson,
      new Date().toISOString(),
    )
    .run();
  const saved = await env.DB.prepare(
    "SELECT request_hash,response_json FROM activity_attempts WHERE user_id=? AND space_id=? AND id=?",
  )
    .bind(keys.userId, keys.spaceId, keys.attemptId)
    .first<AttemptRow>();
  if (!saved) throw new Error("Attempt was not saved");
  return saved.request_hash === requestHash
    ? activityAttemptResponseSchema.parse(JSON.parse(saved.response_json))
    : null;
}

export async function loadActivityState(
  env: Env,
  userId: string,
  spaceId: string,
  packId: string,
) {
  const [attempts, flags] = await Promise.all([
    env.DB.prepare(
      "SELECT question_id,response_json FROM activity_attempts WHERE user_id=? AND space_id=? AND pack_id=? ORDER BY created_at DESC,rowid DESC",
    )
      .bind(userId, spaceId, packId)
      .all<{ question_id: string; response_json: string }>(),
    env.DB.prepare(
      "SELECT question_id,reason FROM activity_question_flags WHERE user_id=? AND space_id=? AND pack_id=? ORDER BY question_id",
    )
      .bind(userId, spaceId, packId)
      .all<{ question_id: string; reason: "incorrect" | "ambiguous" }>(),
  ]);
  const latest = new Map<string, ActivityAttemptResponse>();
  for (const row of attempts.results) {
    const response = activityAttemptResponseSchema.parse(
      JSON.parse(row.response_json),
    );
    if (!latest.has(row.question_id)) latest.set(row.question_id, response);
  }
  return {
    attempts: [...latest].map(([questionId, result]) => ({
      questionId,
      result,
    })),
    flags: flags.results.map((row) => ({
      questionId: row.question_id,
      reason: row.reason,
    })),
  };
}

export async function currentPackExists(
  env: Env,
  userId: string,
  spaceId: string,
  packId: string,
) {
  return Boolean(
    await env.DB.prepare(
      "SELECT 1 FROM activity_packs p JOIN activity_pack_requests r ON r.user_id=p.user_id AND r.space_id=p.space_id AND r.request_id=p.request_id JOIN study_spaces s ON s.user_id=p.user_id AND s.id=p.space_id WHERE p.user_id=? AND p.space_id=? AND p.id=? AND r.state='ready' AND s.deleted_at IS NULL AND p.document_id=r.document_id AND p.concept_request_id=r.concept_request_id AND p.selection_key=r.selection_key",
    )
      .bind(userId, spaceId, packId)
      .first(),
  );
}

export async function saveQuestionFlag(
  env: Env,
  userId: string,
  spaceId: string,
  packId: string,
  questionId: string,
  reason: "incorrect" | "ambiguous",
) {
  const now = new Date().toISOString();
  await env.DB.prepare(
    "INSERT INTO activity_question_flags(user_id,space_id,pack_id,question_id,reason,created_at,updated_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(user_id,space_id,pack_id,question_id) DO UPDATE SET reason=excluded.reason,updated_at=excluded.updated_at",
  )
    .bind(userId, spaceId, packId, questionId, reason, now, now)
    .run();
  return { questionId, reason };
}

export async function questionIsFlagged(
  env: Env,
  userId: string,
  spaceId: string,
  packId: string,
  questionId: string,
) {
  return Boolean(
    await env.DB.prepare(
      "SELECT 1 FROM activity_question_flags WHERE user_id=? AND space_id=? AND pack_id=? AND question_id=?",
    )
      .bind(userId, spaceId, packId, questionId)
      .first(),
  );
}
