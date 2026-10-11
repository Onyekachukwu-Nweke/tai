import type { PracticalTaskProvider } from "../../../packages/adapters/fake-practical-tasks";
import { practicalTaskDraftSchema } from "../../../packages/contracts/practical-tasks";
import type { Clock } from "../../../packages/domain/concept-progress";
import type { Env } from "./env";
import {
  AiCallFailure,
  completeAiCall,
  failAiCall,
  reserveAiCall,
} from "./ai-quota-service";
import { assertSafePracticalTask } from "./practical-task-safety";
import {
  loadPracticalContext,
  loadPracticalTask,
  practicalSelectionKey,
  reservePracticalRequest,
} from "./practical-task-store";

export class PracticalTaskFailure extends Error {
  constructor(
    public status: 400 | 403 | 404 | 409 | 503,
    message: string,
  ) {
    super(message);
  }
}

export async function generatePracticalTask(
  env: Env,
  provider: PracticalTaskProvider,
  userId: string,
  spaceId: string,
  requestId: string,
  conceptIds: string[],
  clock: Clock,
) {
  const replay = await env.DB.prepare(
    "SELECT request_id,state FROM practical_task_requests WHERE user_id=? AND space_id=?",
  )
    .bind(userId, spaceId)
    .first<{ request_id: string; state: string }>();
  if (replay?.request_id === requestId)
    return loadPracticalTask(env, userId, spaceId);
  const context = await loadPracticalContext(env, userId, spaceId, conceptIds);
  if (!context)
    throw new PracticalTaskFailure(
      409,
      "Choose current, selected source-backed concepts.",
    );
  const key = practicalSelectionKey(conceptIds),
    currentTime = clock.now(),
    now = currentTime.toISOString(),
    staleAt = new Date(currentTime.getTime() - 5 * 60_000).toISOString();
  const reserved = await reservePracticalRequest(
    env,
    userId,
    spaceId,
    requestId,
    context,
    now,
    staleAt,
  );
  if (!reserved) {
    const owner = await env.DB.prepare(
      "SELECT request_id FROM practical_task_requests WHERE user_id=? AND space_id=?",
    )
      .bind(userId, spaceId)
      .first<{ request_id: string }>();
    if (owner?.request_id === requestId)
      return loadPracticalTask(env, userId, spaceId);
    throw new PracticalTaskFailure(
      409,
      "Another practical task request is still in progress.",
    );
  }
  try {
    await reserveAiCall(
      env,
      userId,
      requestId,
      "practical",
      "practical",
      clock,
    );
    const draft = practicalTaskDraftSchema.parse(
      await provider.generate(context),
    );
    if (practicalSelectionKey(draft.conceptIds) !== key)
      throw new Error("Concept references changed");
    const sourceIds = new Set(
      context.concepts.flatMap((concept) =>
        concept.sources.map((source) => source.id),
      ),
    );
    if (
      new Set(draft.sourceIds).size !== draft.sourceIds.length ||
      draft.sourceIds.some((id) => !sourceIds.has(id))
    )
      throw new Error("Invalid source references");
    assertSafePracticalTask(draft);
    const state = draft.suitable ? "ready" : "notSuitable",
      taskId = crypto.randomUUID();
    const gate =
      "EXISTS(SELECT 1 FROM practical_task_requests r JOIN material_imports m ON m.user_id=r.user_id AND m.space_id=r.space_id JOIN concept_requests c ON c.user_id=r.user_id AND c.space_id=r.space_id JOIN study_spaces s ON s.user_id=r.user_id AND s.id=r.space_id WHERE r.user_id=? AND r.space_id=? AND r.request_id=? AND r.state='pending' AND r.document_id=m.document_id AND m.state='ready' AND r.concept_request_id=c.request_id AND c.state='ready' AND r.selection_key=? AND s.deleted_at IS NULL AND NOT EXISTS(SELECT 1 FROM account_deletions d WHERE d.user_id=r.user_id) AND r.selection_key=(SELECT group_concat(id, ':') FROM (SELECT id FROM concepts WHERE user_id=r.user_id AND space_id=r.space_id AND request_id=r.concept_request_id AND selected=1 AND id IN (SELECT value FROM json_each(?)) ORDER BY id)))";
    const scope = [userId, spaceId, requestId, key, JSON.stringify(conceptIds)];
    const batch = [];
    if (draft.suitable)
      batch.push(
        env.DB.prepare(
          `INSERT INTO practical_tasks(user_id,space_id,id,request_id,canonical_json,created_at) SELECT ?,?,?,?,?,? WHERE ${gate}`,
        ).bind(
          userId,
          spaceId,
          taskId,
          requestId,
          JSON.stringify(draft),
          now,
          ...scope,
        ),
      );
    batch.push(
      env.DB.prepare(
        `UPDATE practical_task_requests SET state=?,error=NULL,canonical_json=? WHERE user_id=? AND space_id=? AND request_id=? AND ${gate}`,
      ).bind(
        state,
        JSON.stringify(draft),
        userId,
        spaceId,
        requestId,
        ...scope,
      ),
    );
    await env.DB.batch(batch);
    const saved = await loadPracticalTask(env, userId, spaceId);
    if (saved.requestId !== requestId || saved.status !== state)
      throw new PracticalTaskFailure(
        409,
        "The material or concept selection changed before the task was saved.",
      );
    await completeAiCall(env, userId, requestId, "practical", clock);
    return saved;
  } catch (error) {
    await failAiCall(env, userId, requestId, "practical", clock);
    await env.DB.prepare(
      "UPDATE practical_task_requests SET state='failed',error='A safe practical task could not be prepared. Retry explicitly.' WHERE user_id=? AND space_id=? AND request_id=? AND state='pending'",
    )
      .bind(userId, spaceId, requestId)
      .run();
    if (error instanceof PracticalTaskFailure || error instanceof AiCallFailure)
      throw error;
    throw new PracticalTaskFailure(
      503,
      "A safe practical task could not be prepared. Retry explicitly.",
    );
  }
}
