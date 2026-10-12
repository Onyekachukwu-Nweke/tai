import {
  practicalTaskDraftSchema,
  practicalTaskStateSchema,
  type PracticalContext,
} from "../../../packages/contracts/practical-tasks";
import type { Env } from "./env";
import type { PracticalTaskProviderMetadata } from "../../../packages/adapters/fake-practical-tasks";

export const practicalSelectionKey = (ids: string[]) =>
  [...ids].sort().join(":");

export async function practicalRequestIsCurrent(
  env: Env,
  userId: string,
  spaceId: string,
  requestId: string,
) {
  return Boolean(
    await env.DB.prepare(
      "SELECT 1 FROM practical_task_requests r JOIN material_imports m ON m.user_id=r.user_id AND m.space_id=r.space_id JOIN concept_requests cr ON cr.user_id=r.user_id AND cr.space_id=r.space_id JOIN concepts c ON c.user_id=r.user_id AND c.space_id=r.space_id AND c.request_id=r.concept_request_id AND c.id=r.selection_key JOIN study_spaces s ON s.user_id=r.user_id AND s.id=r.space_id WHERE r.user_id=? AND r.space_id=? AND r.request_id=? AND r.document_id=m.document_id AND m.state='ready' AND r.concept_request_id=cr.request_id AND cr.state='ready' AND c.selected=1 AND s.deleted_at IS NULL AND NOT EXISTS(SELECT 1 FROM account_deletions d WHERE d.user_id=r.user_id)",
    )
      .bind(userId, spaceId, requestId)
      .first(),
  );
}

export async function reservePracticalRequest(
  env: Env,
  userId: string,
  spaceId: string,
  requestId: string,
  context: PracticalContext,
  createdAt: string,
  staleAt: string,
  metadata: PracticalTaskProviderMetadata,
) {
  const key = practicalSelectionKey(context.concepts.map(({ id }) => id));
  const result = await env.DB.prepare(
    "INSERT INTO practical_task_requests(user_id,space_id,request_id,document_id,concept_request_id,selection_key,state,error,canonical_json,created_at,provider,model,prompt_version,output_schema_version) SELECT ?,?,?,?,?,?,'pending',NULL,NULL,?,?,?,?,? WHERE NOT EXISTS(SELECT 1 FROM account_deletions WHERE user_id=?) ON CONFLICT(user_id,space_id) DO UPDATE SET request_id=excluded.request_id,document_id=excluded.document_id,concept_request_id=excluded.concept_request_id,selection_key=excluded.selection_key,state='pending',error=NULL,canonical_json=NULL,created_at=excluded.created_at,provider=excluded.provider,model=excluded.model,prompt_version=excluded.prompt_version,output_schema_version=excluded.output_schema_version WHERE practical_task_requests.state IN ('ready','failed','notSuitable') OR (practical_task_requests.state='pending' AND practical_task_requests.created_at<=?)",
  )
    .bind(
      userId,
      spaceId,
      requestId,
      context.materialId,
      context.conceptRequestId,
      key,
      createdAt,
      metadata.provider,
      metadata.model,
      metadata.promptVersion,
      metadata.schemaVersion,
      userId,
      staleAt,
    )
    .run();
  return result.meta.changes === 1;
}

export async function loadPracticalContext(
  env: Env,
  userId: string,
  spaceId: string,
  conceptIds: string[],
): Promise<PracticalContext | null> {
  const revision = await env.DB.prepare(
    "SELECT m.document_id,c.request_id FROM material_imports m JOIN concept_requests c ON c.user_id=m.user_id AND c.space_id=m.space_id JOIN study_spaces s ON s.user_id=m.user_id AND s.id=m.space_id WHERE m.user_id=? AND m.space_id=? AND m.state='ready' AND c.state='ready' AND s.deleted_at IS NULL",
  )
    .bind(userId, spaceId)
    .first<{ document_id: string; request_id: string }>();
  if (!revision) return null;
  const marks = conceptIds.map(() => "?").join(",");
  const rows = await env.DB.prepare(
    `SELECT c.id,c.label,mc.id source_id,mc.location,mc.start_offset start,mc.end_offset end,mc.text FROM concepts c JOIN concept_sources cs ON cs.user_id=c.user_id AND cs.space_id=c.space_id AND cs.concept_id=c.id JOIN material_chunks mc ON mc.user_id=cs.user_id AND mc.space_id=cs.space_id AND mc.id=cs.chunk_id WHERE c.user_id=? AND c.space_id=? AND c.request_id=? AND c.selected=1 AND c.id IN (${marks}) ORDER BY c.id,mc.location,mc.start_offset`,
  )
    .bind(userId, spaceId, revision.request_id, ...conceptIds)
    .all<{
      id: string;
      label: string;
      source_id: string;
      location: number;
      start: number;
      end: number;
      text: string;
    }>();
  const found = [...new Set(rows.results.map((row) => row.id))];
  if (found.length !== conceptIds.length) return null;
  return {
    studySpaceId: spaceId,
    materialId: revision.document_id,
    conceptRequestId: revision.request_id,
    concepts: conceptIds.map((id) => ({
      id,
      label: rows.results.find((row) => row.id === id)!.label,
      sources: rows.results
        .filter((row) => row.id === id)
        .map((row) => ({
          id: row.source_id,
          location: row.location,
          start: row.start,
          end: row.end,
          text: row.text,
        })),
    })),
  };
}

export async function loadPracticalTask(
  env: Env,
  userId: string,
  spaceId: string,
) {
  const request = await env.DB.prepare(
    "SELECT request_id,state,error,canonical_json FROM practical_task_requests WHERE user_id=? AND space_id=?",
  )
    .bind(userId, spaceId)
    .first<{
      request_id: string;
      state: "pending" | "ready" | "failed" | "notSuitable";
      error: string | null;
      canonical_json: string | null;
    }>();
  if (!request)
    return practicalTaskStateSchema.parse({
      schemaVersion: 1,
      status: "empty",
      requestId: null,
      reason: null,
      error: null,
      task: null,
    });
  if (
    !(await practicalRequestIsCurrent(env, userId, spaceId, request.request_id))
  )
    return practicalTaskStateSchema.parse({
      schemaVersion: 1,
      status: "empty",
      requestId: null,
      reason: null,
      error:
        "The saved practical task no longer matches the current material and concept selection.",
      task: null,
    });
  const row = await env.DB.prepare(
    "SELECT id,canonical_json,completed_at FROM practical_tasks WHERE user_id=? AND space_id=? AND request_id=?",
  )
    .bind(userId, spaceId, request.request_id)
    .first<{
      id: string;
      canonical_json: string;
      completed_at: string | null;
    }>();
  const draft = row
    ? practicalTaskDraftSchema.parse(JSON.parse(row.canonical_json))
    : null;
  const result = request.canonical_json
    ? practicalTaskDraftSchema.parse(JSON.parse(request.canonical_json))
    : null;
  return practicalTaskStateSchema.parse({
    schemaVersion: 1,
    status: request.state,
    requestId: request.request_id,
    reason: result?.reason ?? null,
    error: request.error,
    task:
      row && draft
        ? {
            ...draft,
            id: row.id,
            completed: Boolean(row.completed_at),
            completedAt: row.completed_at,
          }
        : null,
  });
}
