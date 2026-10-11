import {
  activityPackProviderMetadata,
  type ActivityPackProvider,
} from "../../../packages/adapters/fake-activity-packs";
import {
  type CanonicalActivityPack,
  validateActivityPack,
} from "../../../packages/contracts/activity-packs";
import type { Clock } from "../../../packages/domain/concept-progress";
import type { Env } from "./env";
import {
  AiCallFailure,
  completeAiCall,
  failAiCall,
  reserveAiCall,
} from "./ai-quota-service";
import {
  failPackRequest,
  loadActivityContext,
  loadLearnerPack,
  packRequestState,
  reservePackRequest,
  selectionKey,
} from "./activity-pack-store";

export class ActivityPackFailure extends Error {
  constructor(
    public status: 400 | 403 | 404 | 409 | 503,
    message: string,
  ) {
    super(message);
  }
}
function assignServerIds(pack: CanonicalActivityPack): CanonicalActivityPack {
  return {
    ...pack,
    questions: pack.questions.map((question) => {
      if (question.type !== "mcq")
        return { ...question, id: crypto.randomUUID() };
      const options = question.options.map((option) => ({
        ...option,
        id: crypto.randomUUID(),
      }));
      const correctIndex = question.options.findIndex(
        (option) => option.id === question.correctOptionId,
      );
      return {
        ...question,
        id: crypto.randomUUID(),
        options,
        correctOptionId: options[correctIndex]!.id,
      };
    }),
  };
}
export async function generateActivityPack(
  env: Env,
  provider: ActivityPackProvider,
  userId: string,
  spaceId: string,
  requestId: string,
  clock: Clock,
) {
  const previous = await packRequestState(env, userId, spaceId);
  if (previous?.request_id === requestId && previous.state !== "failed")
    return loadLearnerPack(env, userId, spaceId);
  const context = await loadActivityContext(env, userId, spaceId);
  if (!context)
    throw new ActivityPackFailure(
      409,
      "Select at least two source-backed concepts before preparing activities.",
    );
  const metadata = activityPackProviderMetadata(provider);
  await reservePackRequest(env, userId, spaceId, requestId, context, metadata);
  try {
    await reserveAiCall(env, userId, requestId, "packs", "pack", clock);
    const providerPack = validateActivityPack(
      await provider.generate(context),
      context,
    );
    const pack = validateActivityPack(assignServerIds(providerPack), context);
    const packId = crypto.randomUUID(),
      key = selectionKey(context);
    const gate =
      "EXISTS(SELECT 1 FROM activity_pack_requests r JOIN concept_requests cr ON cr.user_id=r.user_id AND cr.space_id=r.space_id JOIN material_imports m ON m.user_id=r.user_id AND m.space_id=r.space_id JOIN study_spaces s ON s.user_id=r.user_id AND s.id=r.space_id WHERE r.user_id=? AND r.space_id=? AND r.request_id=? AND r.state='pending' AND r.document_id=? AND r.concept_request_id=? AND r.selection_key=? AND cr.request_id=r.concept_request_id AND cr.state='ready' AND m.document_id=r.document_id AND m.state='ready' AND s.deleted_at IS NULL AND r.selection_key=(SELECT group_concat(id, ':') FROM (SELECT id FROM concepts WHERE user_id=r.user_id AND space_id=r.space_id AND request_id=r.concept_request_id AND selected=1 ORDER BY id)))";
    const scope = [
      userId,
      spaceId,
      requestId,
      context.materialId,
      context.conceptRequestId,
      key,
    ];
    await env.DB.batch([
      env.DB.prepare(
        `UPDATE study_sessions SET status='superseded' WHERE user_id=? AND space_id=? AND status='active' AND ${gate}`,
      ).bind(userId, spaceId, ...scope),
      env.DB.prepare(
        `INSERT INTO activity_packs(user_id,space_id,id,request_id,document_id,concept_request_id,selection_key,canonical_json,created_at) SELECT ?,?,?,?,?,?,?,?,? WHERE ${gate}`,
      ).bind(
        userId,
        spaceId,
        packId,
        requestId,
        context.materialId,
        context.conceptRequestId,
        key,
        JSON.stringify(pack),
        new Date().toISOString(),
        ...scope,
      ),
      ...pack.questions.flatMap((question) =>
        question.conceptIds.map((conceptId) =>
          env.DB.prepare(
            `INSERT INTO activity_question_concepts(user_id,space_id,pack_id,question_id,concept_id) SELECT ?,?,?,?,? WHERE ${gate}`,
          ).bind(userId, spaceId, packId, question.id, conceptId, ...scope),
        ),
      ),
      env.DB.prepare(
        `UPDATE activity_pack_requests SET state='ready',error=NULL,provider=?,model=?,prompt_version=?,output_schema_version=? WHERE user_id=? AND space_id=? AND request_id=? AND ${gate}`,
      ).bind(
        metadata.provider,
        metadata.model,
        metadata.promptVersion,
        metadata.schemaVersion,
        userId,
        spaceId,
        requestId,
        ...scope,
      ),
    ]);
    const saved = await loadLearnerPack(env, userId, spaceId);
    if (
      saved.status !== "ready" ||
      saved.requestId !== requestId ||
      saved.packId !== packId
    )
      throw new ActivityPackFailure(
        409,
        "The material or concept selection changed before activities were saved.",
      );
    await completeAiCall(env, userId, requestId, "pack", clock);
    return saved;
  } catch (error) {
    await failAiCall(env, userId, requestId, "pack", clock);
    await failPackRequest(env, userId, spaceId, requestId);
    if (error instanceof ActivityPackFailure || error instanceof AiCallFailure)
      throw error;
    throw new ActivityPackFailure(
      503,
      "Activities could not be prepared. Retry explicitly.",
    );
  }
}
