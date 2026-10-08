import {
  conceptCollectionSchema,
  type ConceptCollection,
  type SourceContext,
} from "../../../packages/contracts/concepts";
import type { Env } from "./env";

type RequestRow = {
  request_id: string;
  document_id: string;
  location: number;
  state: "pending" | "ready" | "failed";
  error: string | null;
};
export async function loadConcepts(
  env: Env,
  userId: string,
  spaceId: string,
): Promise<ConceptCollection> {
  const request = await env.DB.prepare(
    "SELECT request_id,document_id,location,state,error FROM concept_requests WHERE user_id=? AND space_id=?",
  )
    .bind(userId, spaceId)
    .first<RequestRow>();
  if (!request)
    return conceptCollectionSchema.parse({
      schemaVersion: 1,
      status: "empty",
      requestId: null,
      location: null,
      concepts: [],
      relations: [],
      error: null,
      provider: "fake",
    });
  const [conceptRows, sourceRows, relationRows] = await Promise.all([
    env.DB.prepare(
      "SELECT id,title,label,description,selected FROM concepts WHERE user_id=? AND space_id=? ORDER BY rowid",
    )
      .bind(userId, spaceId)
      .all<{
        id: string;
        title: string;
        label: string;
        description: string;
        selected: number;
      }>(),
    env.DB.prepare(
      "SELECT cs.concept_id,c.id,c.location,c.start_offset AS start,c.end_offset AS end,c.text FROM concept_sources cs JOIN material_chunks c ON c.user_id=cs.user_id AND c.space_id=cs.space_id AND c.id=cs.chunk_id WHERE cs.user_id=? AND cs.space_id=? ORDER BY c.location,c.start_offset",
    )
      .bind(userId, spaceId)
      .all<{
        concept_id: string;
        id: string;
        location: number;
        start: number;
        end: number;
        text: string;
      }>(),
    env.DB.prepare(
      "SELECT from_id AS fromId,to_id AS toId,kind FROM concept_relations WHERE user_id=? AND space_id=?",
    )
      .bind(userId, spaceId)
      .all(),
  ]);
  return conceptCollectionSchema.parse({
    schemaVersion: 1,
    status: request.state,
    requestId: request.request_id,
    location: request.location,
    concepts: conceptRows.results.map((row) => ({
      ...row,
      selected: Boolean(row.selected),
      sources: sourceRows.results
        .filter((source) => source.concept_id === row.id)
        .map((source) => ({
          id: source.id,
          location: source.location,
          start: source.start,
          end: source.end,
          text: source.text,
        })),
    })),
    relations: relationRows.results,
    error: request.error,
    provider: "fake",
  });
}

export async function loadContext(
  env: Env,
  userId: string,
  spaceId: string,
  location: number,
): Promise<SourceContext | null> {
  const material = await env.DB.prepare(
    "SELECT m.document_id FROM material_imports m JOIN study_spaces s ON s.id=m.space_id AND s.user_id=m.user_id WHERE m.user_id=? AND m.space_id=? AND m.state='ready' AND s.deleted_at IS NULL",
  )
    .bind(userId, spaceId)
    .first<{ document_id: string }>();
  if (!material) return null;
  const chunks = await env.DB.prepare(
    "SELECT id,location,start_offset AS start,end_offset AS end,text FROM material_chunks WHERE user_id=? AND space_id=? AND document_id=? AND location=? ORDER BY start_offset LIMIT 20",
  )
    .bind(userId, spaceId, material.document_id, location)
    .all<{
      id: string;
      location: number;
      start: number;
      end: number;
      text: string;
    }>();
  if (!chunks.results.length) return null;
  return {
    studySpaceId: spaceId,
    materialId: material.document_id,
    location,
    chunks: chunks.results.map((chunk) => ({
      ...chunk,
      studySpaceId: spaceId,
      materialId: material.document_id,
    })),
  };
}

export async function requestState(
  env: Env,
  userId: string,
  spaceId: string,
): Promise<RequestRow | null> {
  return env.DB.prepare(
    "SELECT request_id,document_id,location,state,error FROM concept_requests WHERE user_id=? AND space_id=?",
  )
    .bind(userId, spaceId)
    .first<RequestRow>();
}

export async function reserveRequest(
  env: Env,
  userId: string,
  spaceId: string,
  requestId: string,
  context: SourceContext,
): Promise<void> {
  await env.DB.prepare(
    "INSERT INTO concept_requests(user_id,space_id,request_id,document_id,location,state,error) VALUES(?,?,?,?,?,'pending',NULL) ON CONFLICT(user_id,space_id) DO UPDATE SET request_id=excluded.request_id,document_id=excluded.document_id,location=excluded.location,state='pending',error=NULL",
  )
    .bind(userId, spaceId, requestId, context.materialId, context.location)
    .run();
}

export async function markFailed(
  env: Env,
  userId: string,
  spaceId: string,
  requestId: string,
): Promise<void> {
  await env.DB.prepare(
    "UPDATE concept_requests SET state='failed',error='Concepts could not be prepared from this source. Retry explicitly.' WHERE user_id=? AND space_id=? AND request_id=? AND state='pending'",
  )
    .bind(userId, spaceId, requestId)
    .run();
}
