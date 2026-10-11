import {
  canonicalActivityPackSchema,
  learnerActivityPackSchema,
  toLearnerActivityPack,
  type ActivityContext,
} from "../../../packages/contracts/activity-packs";
import type { Env } from "./env";
import type { ActivityPackProviderMetadata } from "../../../packages/adapters/fake-activity-packs";

export type PackRequestRow = {
  request_id: string;
  document_id: string;
  concept_request_id: string;
  selection_key: string;
  state: "pending" | "ready" | "failed";
  error: string | null;
  provider: "fake" | "workers_ai";
  model: string | null;
  prompt_version: string;
  output_schema_version: 1;
};
export async function loadActivityContext(
  env: Env,
  userId: string,
  spaceId: string,
): Promise<ActivityContext | null> {
  const revision = await env.DB.prepare(
    "SELECT m.document_id,c.request_id FROM material_imports m JOIN concept_requests c ON c.user_id=m.user_id AND c.space_id=m.space_id JOIN study_spaces s ON s.user_id=m.user_id AND s.id=m.space_id WHERE m.user_id=? AND m.space_id=? AND m.state='ready' AND c.state='ready' AND s.deleted_at IS NULL",
  )
    .bind(userId, spaceId)
    .first<{ document_id: string; request_id: string }>();
  if (!revision) return null;
  const rows = await env.DB.prepare(
    "SELECT c.id,c.label,mc.id AS source_id,mc.location,mc.start_offset AS start,mc.end_offset AS end,mc.text FROM concepts c JOIN concept_sources cs ON cs.user_id=c.user_id AND cs.space_id=c.space_id AND cs.concept_id=c.id JOIN material_chunks mc ON mc.user_id=cs.user_id AND mc.space_id=cs.space_id AND mc.id=cs.chunk_id WHERE c.user_id=? AND c.space_id=? AND c.selected=1 AND c.request_id=? ORDER BY c.rowid,mc.location,mc.start_offset",
  )
    .bind(userId, spaceId, revision.request_id)
    .all<{
      id: string;
      label: string;
      source_id: string;
      location: number;
      start: number;
      end: number;
      text: string;
    }>();
  const ids = [...new Set(rows.results.map((row) => row.id))];
  if (ids.length < 2) return null;
  return {
    studySpaceId: spaceId,
    materialId: revision.document_id,
    conceptRequestId: revision.request_id,
    concepts: ids.map((id) => ({
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
export const selectionKey = (context: ActivityContext) =>
  context.concepts
    .map((concept) => concept.id)
    .sort()
    .join(":");
export async function packRequestState(
  env: Env,
  userId: string,
  spaceId: string,
) {
  return env.DB.prepare(
    "SELECT request_id,document_id,concept_request_id,selection_key,state,error,provider,model,prompt_version,output_schema_version FROM activity_pack_requests WHERE user_id=? AND space_id=?",
  )
    .bind(userId, spaceId)
    .first<PackRequestRow>();
}
export async function reservePackRequest(
  env: Env,
  userId: string,
  spaceId: string,
  requestId: string,
  context: ActivityContext,
  metadata: ActivityPackProviderMetadata,
) {
  await env.DB.prepare(
    "INSERT INTO activity_pack_requests(user_id,space_id,request_id,document_id,concept_request_id,selection_key,state,error,provider,model,prompt_version,output_schema_version) VALUES(?,?,?,?,?,?,'pending',NULL,?,?,?,?) ON CONFLICT(user_id,space_id) DO UPDATE SET request_id=excluded.request_id,document_id=excluded.document_id,concept_request_id=excluded.concept_request_id,selection_key=excluded.selection_key,state='pending',error=NULL",
  )
    .bind(
      userId,
      spaceId,
      requestId,
      context.materialId,
      context.conceptRequestId,
      selectionKey(context),
      metadata.provider,
      metadata.model,
      metadata.promptVersion,
      metadata.schemaVersion,
    )
    .run();
}
export async function failPackRequest(
  env: Env,
  userId: string,
  spaceId: string,
  requestId: string,
) {
  await env.DB.prepare(
    "UPDATE activity_pack_requests SET state='failed',error='Activities could not be prepared. Retry explicitly.' WHERE user_id=? AND space_id=? AND request_id=? AND state='pending'",
  )
    .bind(userId, spaceId, requestId)
    .run();
}
export async function loadLearnerPack(
  env: Env,
  userId: string,
  spaceId: string,
) {
  const request = await packRequestState(env, userId, spaceId);
  if (!request)
    return learnerActivityPackSchema.parse({
      schemaVersion: 1,
      status: "empty",
      requestId: null,
      packId: null,
      provider: "fake",
      error: null,
      questions: [],
    });
  const row = await env.DB.prepare(
    "SELECT id,canonical_json FROM activity_packs WHERE user_id=? AND space_id=? ORDER BY created_at DESC,rowid DESC LIMIT 1",
  )
    .bind(userId, spaceId)
    .first<{ id: string; canonical_json: string }>();
  const pack = row
    ? canonicalActivityPackSchema.parse(JSON.parse(row.canonical_json))
    : null;
  return learnerActivityPackSchema.parse({
    schemaVersion: 1,
    status: request.state,
    requestId: request.request_id,
    packId: row?.id ?? null,
    provider: request.provider,
    error: request.error,
    questions: pack ? toLearnerActivityPack(pack) : [],
  });
}
