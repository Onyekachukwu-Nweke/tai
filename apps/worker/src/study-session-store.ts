import { canonicalActivityPackSchema } from "../../../packages/contracts/activity-packs";
import type { StudySession } from "../../../packages/contracts/study-sessions";
import type { Clock } from "../../../packages/domain/concept-progress";
import { evidenceLabel } from "../../../packages/domain/concept-progress";
import type { SessionCandidate } from "../../../packages/domain/study-session";
import type { Env } from "./env";

type SessionRow = {
  id: string;
  pack_id: string;
  budget_minutes: 5 | 15 | 30;
  estimated_minutes: number;
  mode: "learn" | "review" | "practise";
  concept_id: string | null;
  status: "active" | "completed" | "superseded";
  created_at: string;
  completed_at: string | null;
};
type SessionRequestRow = SessionRow & { request_hash: string };

export async function loadSessionContext(
  env: Env,
  userId: string,
  spaceId: string,
  clock: Clock,
) {
  const pack = await env.DB.prepare(
    "SELECT p.id,p.canonical_json FROM activity_packs p JOIN activity_pack_requests r ON r.user_id=p.user_id AND r.space_id=p.space_id AND r.request_id=p.request_id JOIN study_spaces s ON s.user_id=p.user_id AND s.id=p.space_id WHERE p.user_id=? AND p.space_id=? AND r.state='ready' AND s.deleted_at IS NULL AND p.document_id=r.document_id AND p.concept_request_id=r.concept_request_id AND p.selection_key=r.selection_key ORDER BY p.created_at DESC,p.rowid DESC LIMIT 1",
  )
    .bind(userId, spaceId)
    .first<{ id: string; canonical_json: string }>();
  if (!pack) return null;
  const [flags, attempts, progress, concepts] = await Promise.all([
    env.DB.prepare(
      "SELECT question_id FROM activity_question_flags WHERE user_id=? AND space_id=? AND pack_id=?",
    )
      .bind(userId, spaceId, pack.id)
      .all<{ question_id: string }>(),
    env.DB.prepare(
      "SELECT DISTINCT question_id FROM activity_attempts WHERE user_id=? AND space_id=? AND pack_id=?",
    )
      .bind(userId, spaceId, pack.id)
      .all<{ question_id: string }>(),
    env.DB.prepare(
      "SELECT concept_id,review_step,latest_correctness,last_checked_at,next_review_at FROM concept_progress WHERE user_id=? AND space_id=?",
    )
      .bind(userId, spaceId)
      .all<{
        concept_id: string;
        review_step: number;
        latest_correctness: "correct" | "incorrect";
        last_checked_at: string;
        next_review_at: string;
      }>(),
    env.DB.prepare(
      "SELECT id FROM concepts WHERE user_id=? AND space_id=? AND selected=1",
    )
      .bind(userId, spaceId)
      .all<{ id: string }>(),
  ]);
  const flagged = new Set(flags.results.map((row) => row.question_id));
  const completed = new Set(attempts.results.map((row) => row.question_id));
  const labels = new Map(
    progress.results.map((row) => [
      row.concept_id,
      evidenceLabel(
        {
          reviewStep: row.review_step,
          latestCorrectness: row.latest_correctness,
          lastCheckedAt: row.last_checked_at,
          nextReviewAt: row.next_review_at,
        },
        clock.now(),
      ),
    ]),
  );
  const parsed = canonicalActivityPackSchema.parse(
    JSON.parse(pack.canonical_json),
  );
  const candidates: SessionCandidate[] = parsed.questions.map((question) => ({
    questionId: question.id,
    conceptIds: question.conceptIds,
    estimatedMinutes: question.estimatedMinutes,
    completed: completed.has(question.id),
    flagged: flagged.has(question.id),
    labels: question.conceptIds.map((id) => labels.get(id) ?? "Not checked"),
  }));
  return {
    packId: pack.id,
    candidates,
    selectedConcepts: new Set(concepts.results.map((row) => row.id)),
  };
}

export async function replaceSession(
  env: Env,
  keys: {
    userId: string;
    spaceId: string;
    id: string;
    packId: string;
    requestHash: string;
  },
  input: {
    budgetMinutes: 5 | 15 | 30;
    estimatedMinutes: number;
    mode: string;
    conceptId?: string;
    items: Array<{
      questionId: string;
      estimatedMinutes: number;
      reason: string;
    }>;
  },
  clock: Clock,
) {
  const now = clock.now().toISOString();
  await env.DB.batch([
    env.DB.prepare(
      "UPDATE study_sessions SET status='superseded' WHERE user_id=? AND space_id=? AND status='active'",
    ).bind(keys.userId, keys.spaceId),
    env.DB.prepare(
      "INSERT INTO study_sessions(user_id,space_id,id,request_hash,pack_id,budget_minutes,estimated_minutes,mode,concept_id,status,created_at,completed_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
    ).bind(
      keys.userId,
      keys.spaceId,
      keys.id,
      keys.requestHash,
      keys.packId,
      input.budgetMinutes,
      input.estimatedMinutes,
      input.mode,
      input.conceptId ?? null,
      input.items.length ? "active" : "completed",
      now,
      input.items.length ? null : now,
    ),
    ...input.items.map((item, position) =>
      env.DB.prepare(
        "INSERT INTO study_session_items(user_id,space_id,session_id,question_id,position,estimated_minutes,reason) VALUES(?,?,?,?,?,?,?)",
      ).bind(
        keys.userId,
        keys.spaceId,
        keys.id,
        item.questionId,
        position,
        item.estimatedMinutes,
        item.reason,
      ),
    ),
  ]);
}

export async function loadLatestSession(
  env: Env,
  userId: string,
  spaceId: string,
) {
  const row = await env.DB.prepare(
    "SELECT id,pack_id,budget_minutes,estimated_minutes,mode,concept_id,status,created_at,completed_at FROM study_sessions WHERE user_id=? AND space_id=? AND status IN ('active','completed') ORDER BY CASE status WHEN 'active' THEN 0 ELSE 1 END,created_at DESC,rowid DESC LIMIT 1",
  )
    .bind(userId, spaceId)
    .first<SessionRow>();
  if (!row) return emptySession();
  return loadSessionItems(env, userId, spaceId, row);
}

export async function loadSessionById(
  env: Env,
  userId: string,
  spaceId: string,
  sessionId: string,
) {
  const row = await env.DB.prepare(
    "SELECT id,request_hash,pack_id,budget_minutes,estimated_minutes,mode,concept_id,status,created_at,completed_at FROM study_sessions WHERE user_id=? AND space_id=? AND id=?",
  )
    .bind(userId, spaceId, sessionId)
    .first<SessionRequestRow>();
  if (!row) return null;
  if (row.status === "superseded")
    return {
      requestHash: row.request_hash,
      session: null,
      superseded: true as const,
    };
  return {
    requestHash: row.request_hash,
    session: await loadSessionItems(env, userId, spaceId, row),
    superseded: false as const,
  };
}

async function loadSessionItems(
  env: Env,
  userId: string,
  spaceId: string,
  row: SessionRow,
) {
  if (row.status === "superseded")
    throw new Error("Superseded sessions are not learner-visible.");
  const items = await env.DB.prepare(
    "SELECT question_id,position,estimated_minutes,reason,completed_at FROM study_session_items WHERE user_id=? AND space_id=? AND session_id=? ORDER BY position",
  )
    .bind(userId, spaceId, row.id)
    .all<{
      question_id: string;
      position: number;
      estimated_minutes: number;
      reason: string;
      completed_at: string | null;
    }>();
  return {
    schemaVersion: 1,
    status: row.status,
    sessionId: row.id,
    packId: row.pack_id,
    budgetMinutes: row.budget_minutes,
    estimatedMinutes: row.estimated_minutes,
    mode: row.mode,
    conceptId: row.concept_id,
    items: items.results.map((item) => ({
      questionId: item.question_id,
      position: item.position,
      estimatedMinutes: item.estimated_minutes,
      reason: item.reason,
      completedAt: item.completed_at,
    })),
    createdAt: row.created_at,
    completedAt: row.completed_at,
  } satisfies StudySession;
}

export const emptySession = (): StudySession => ({
  schemaVersion: 1,
  status: "empty",
  sessionId: null,
  packId: null,
  budgetMinutes: null,
  estimatedMinutes: 0,
  mode: null,
  conceptId: null,
  items: [],
  createdAt: null,
  completedAt: null,
});
