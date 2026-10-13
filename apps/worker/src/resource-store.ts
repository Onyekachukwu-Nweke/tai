import type { Env } from "./env";
import type { ResourceConcept } from "../../../packages/domain/resource-matcher";

export async function loadSelectedResourceConcepts(
  env: Env,
  userId: string,
  spaceId: string,
): Promise<ResourceConcept[] | null> {
  const space = await env.DB.prepare(
    "SELECT 1 FROM study_spaces WHERE user_id=? AND id=? AND deleted_at IS NULL",
  )
    .bind(userId, spaceId)
    .first();
  if (!space) return null;
  const rows = await env.DB.prepare(
    "SELECT c.id,c.label,c.title,c.description FROM concepts c JOIN concept_requests r ON r.user_id=c.user_id AND r.space_id=c.space_id AND r.request_id=c.request_id JOIN material_imports m ON m.user_id=r.user_id AND m.space_id=r.space_id AND m.document_id=r.document_id WHERE c.user_id=? AND c.space_id=? AND c.selected=1 AND r.state='ready' AND m.state='ready' ORDER BY c.rowid",
  )
    .bind(userId, spaceId)
    .all<ResourceConcept>();
  return rows.results;
}
