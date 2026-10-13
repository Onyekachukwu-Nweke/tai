import {
  conceptProviderMetadata,
  type ConceptProvider,
} from "../../../packages/adapters/fake-concepts";
import {
  validateConceptDrafts,
  validateSourceContext,
  type PageRange,
} from "../../../packages/contracts/concepts";
import type { Clock } from "../../../packages/domain/concept-progress";
import type { Env } from "./env";
import {
  AiCallFailure,
  completeAiCall,
  failAiCall,
  reserveAiCall,
} from "./ai-quota-service";
import {
  loadConcepts,
  loadContext,
  markFailed,
  requestState,
  reserveRequest,
} from "./concept-store";

export class ConceptFailure extends Error {
  constructor(
    public status: 400 | 403 | 404 | 409 | 503,
    message: string,
  ) {
    super(message);
  }
}
export async function generateConcepts(
  env: Env,
  provider: ConceptProvider,
  userId: string,
  spaceId: string,
  requestId: string,
  range: PageRange,
  clock: Clock,
) {
  const previous = await requestState(env, userId, spaceId);
  if (previous?.request_id === requestId && previous.state !== "failed")
    return loadConcepts(env, userId, spaceId);
  const loaded = await loadContext(env, userId, spaceId, range);
  if (!loaded)
    throw new ConceptFailure(
      409,
      "The selected pages have no usable saved text.",
    );
  // Validate before reserving quota so an unusable context never spends a call.
  let context: typeof loaded;
  try {
    context = validateSourceContext(loaded);
  } catch {
    throw new ConceptFailure(
      409,
      "The selected pages could not be prepared from saved text.",
    );
  }
  const metadata = conceptProviderMetadata(provider);
  await reserveRequest(env, userId, spaceId, requestId, context, metadata);
  try {
    await reserveAiCall(env, userId, requestId, "concepts", "concepts", clock);
    const result = validateConceptDrafts(
      await provider.generate(context),
      context,
    );
    const ids = result.concepts.map(() => crypto.randomUUID());
    const gate =
      "EXISTS(SELECT 1 FROM concept_requests r JOIN material_imports m ON m.user_id=r.user_id AND m.space_id=r.space_id JOIN study_spaces s ON s.user_id=r.user_id AND s.id=r.space_id WHERE r.user_id=? AND r.space_id=? AND r.request_id=? AND r.document_id=? AND r.state='pending' AND m.document_id=r.document_id AND m.state='ready' AND s.deleted_at IS NULL)";
    const scope = [userId, spaceId, requestId, context.materialId];
    const statements = [
      env.DB.prepare(
        `DELETE FROM concept_relations WHERE user_id=? AND space_id=? AND ${gate}`,
      ).bind(userId, spaceId, ...scope),
      env.DB.prepare(
        `DELETE FROM concept_sources WHERE user_id=? AND space_id=? AND ${gate}`,
      ).bind(userId, spaceId, ...scope),
      env.DB.prepare(
        `DELETE FROM concepts WHERE user_id=? AND space_id=? AND ${gate}`,
      ).bind(userId, spaceId, ...scope),
      ...result.concepts.flatMap((concept, index) => [
        env.DB.prepare(
          `INSERT INTO concepts(user_id,space_id,id,request_id,title,label,description) SELECT ?,?,?,?,?,?,? WHERE ${gate}`,
        ).bind(
          userId,
          spaceId,
          ids[index],
          requestId,
          concept.title,
          concept.title,
          concept.description,
          ...scope,
        ),
        ...concept.sourceIds.map((sourceId) =>
          env.DB.prepare(
            `INSERT INTO concept_sources(user_id,space_id,concept_id,chunk_id) SELECT ?,?,?,? WHERE ${gate}`,
          ).bind(userId, spaceId, ids[index], sourceId, ...scope),
        ),
      ]),
    ];
    statements.push(
      ...result.relations.map((relation) =>
        env.DB.prepare(
          `INSERT INTO concept_relations(user_id,space_id,from_id,to_id,kind) SELECT ?,?,?,?,'suggested' WHERE ${gate}`,
        ).bind(userId, spaceId, ids[relation.from], ids[relation.to], ...scope),
      ),
    );
    statements.push(
      env.DB.prepare(
        `UPDATE concept_requests SET state='ready',error=NULL,provider=?,model=?,prompt_version=?,output_schema_version=? WHERE user_id=? AND space_id=? AND request_id=? AND document_id=? AND state='pending' AND ${gate}`,
      ).bind(
        metadata.provider,
        metadata.model,
        metadata.promptVersion,
        metadata.schemaVersion,
        ...scope,
        ...scope,
      ),
    );
    await env.DB.batch(statements);
    const saved = await loadConcepts(env, userId, spaceId);
    if (saved.status !== "ready" || saved.requestId !== requestId)
      throw new ConceptFailure(
        409,
        "The material changed or study space was deleted before concepts were saved.",
      );
    await completeAiCall(env, userId, requestId, "concepts", clock);
    return saved;
  } catch (error) {
    await failAiCall(env, userId, requestId, "concepts", clock);
    await markFailed(env, userId, spaceId, requestId);
    if (error instanceof ConceptFailure || error instanceof AiCallFailure)
      throw error;
    throw new ConceptFailure(
      503,
      "Concepts could not be prepared from this source. Retry explicitly.",
    );
  }
}
