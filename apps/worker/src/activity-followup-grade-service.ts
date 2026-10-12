import {
  activityFollowupGradeProviderMetadata,
  type ActivityFollowupGradeProvider,
} from "../../../packages/adapters/fake-activity-followup-grade";
import {
  followupAttemptSchema,
  followupGradeResponseSchema,
  validateFollowupGrade,
  type FollowupAttemptRequest,
  type FollowupGradeContext,
  type FollowupGradeRequest,
} from "../../../packages/contracts/activity-followup-grade";
import { activityFollowupResponseSchema } from "../../../packages/contracts/activity-followup";
import type { Clock } from "../../../packages/domain/concept-progress";
import type { Env } from "./env";
import {
  AiCallFailure,
  completeAiCall,
  failAiCall,
  reserveAiCall,
} from "./ai-quota-service";
import {
  failFollowupGrade,
  expireStaleFollowupGrade,
  finishFollowupGrade,
  loadActiveFollowupGrade,
  loadAttemptForFollowup,
  loadFollowupAttempt,
  loadFollowupGrade,
  reserveFollowupGrade,
} from "./activity-followup-grade-store";

export class FollowupGradeFailure extends Error {
  constructor(
    public status: 400 | 403 | 404 | 409 | 503,
    message: string,
  ) {
    super(message);
  }
}
const digest = async (value: unknown) => {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  return [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};
const currentFollowup = async (
  env: Env,
  userId: string,
  spaceId: string,
  followupId: string,
) =>
  env.DB.prepare(
    `SELECT f.pack_id,f.question_id,f.response_json
    FROM activity_followup_requests f
    JOIN activity_rubric_requests r ON r.user_id=f.user_id AND r.space_id=f.space_id AND r.request_id=f.grade_request_id
    JOIN activity_packs p ON p.user_id=f.user_id AND p.space_id=f.space_id AND p.id=f.pack_id
    JOIN activity_pack_requests pr ON pr.user_id=p.user_id AND pr.space_id=p.space_id AND pr.request_id=p.request_id
    JOIN study_spaces s ON s.user_id=p.user_id AND s.id=p.space_id
    WHERE f.user_id=? AND f.space_id=? AND f.request_id=? AND f.state='ready'
    AND r.state='ready' AND r.response_json=f.grade_response_json AND pr.state='ready' AND s.deleted_at IS NULL
    AND p.document_id=pr.document_id AND p.concept_request_id=pr.concept_request_id AND p.selection_key=pr.selection_key
    AND NOT EXISTS(SELECT 1 FROM activity_question_flags q WHERE q.user_id=f.user_id AND q.space_id=f.space_id AND q.pack_id=f.pack_id AND q.question_id=f.question_id)`,
  )
    .bind(userId, spaceId, followupId)
    .first<{ pack_id: string; question_id: string; response_json: string }>();

export async function saveFollowupAttempt(
  env: Env,
  userId: string,
  spaceId: string,
  input: FollowupAttemptRequest,
  clock: Clock,
) {
  const hash = await digest(input);
  const prior = await loadFollowupAttempt(
    env,
    userId,
    spaceId,
    input.attemptId,
  );
  if (prior) {
    if (prior.request_hash !== hash)
      throw new FollowupGradeFailure(409, "This attempt ID was already used.");
    return followupAttemptSchema.parse({
      schemaVersion: 1,
      attemptId: prior.id,
      followupRequestId: prior.followup_request_id,
      packId: prior.pack_id,
      questionId: prior.question_id,
      answer: prior.answer,
    });
  }
  if (
    await loadAttemptForFollowup(env, userId, spaceId, input.followupRequestId)
  )
    throw new FollowupGradeFailure(
      409,
      "A response is already saved for this follow-up.",
    );
  const followup = await currentFollowup(
    env,
    userId,
    spaceId,
    input.followupRequestId,
  );
  if (!followup)
    throw new FollowupGradeFailure(
      404,
      "The current targeted follow-up was not found.",
    );
  const now = clock.now().toISOString();
  const result = await env.DB.prepare(
    "INSERT OR IGNORE INTO activity_followup_attempts(user_id,space_id,id,followup_request_id,pack_id,question_id,answer,request_hash,created_at) VALUES(?,?,?,?,?,?,?,?,?)",
  )
    .bind(
      userId,
      spaceId,
      input.attemptId,
      input.followupRequestId,
      followup.pack_id,
      followup.question_id,
      input.answer.trim(),
      hash,
      now,
    )
    .run();
  if (result.meta.changes !== 1)
    throw new FollowupGradeFailure(
      409,
      "The response could not be saved because another response won the race.",
    );
  return followupAttemptSchema.parse({
    ...input,
    answer: input.answer.trim(),
    packId: followup.pack_id,
    questionId: followup.question_id,
  });
}

function existing(row: Awaited<ReturnType<typeof loadFollowupGrade>>) {
  if (!row) return null;
  if (row.state === "pending")
    throw new FollowupGradeFailure(
      409,
      "Follow-up feedback is already being prepared.",
    );
  if (row.state === "failed")
    throw new FollowupGradeFailure(
      409,
      "This grading request failed. Retry explicitly with a new request ID.",
    );
  return followupGradeResponseSchema.parse(JSON.parse(row.response_json!));
}
export async function gradeFollowup(
  env: Env,
  provider: ActivityFollowupGradeProvider,
  userId: string,
  spaceId: string,
  input: FollowupGradeRequest,
  clock: Clock,
) {
  const hash = await digest(input);
  const prior = await loadFollowupGrade(env, userId, spaceId, input.requestId);
  if (prior) {
    if (prior.request_hash !== hash)
      throw new FollowupGradeFailure(409, "This request ID was already used.");
    return existing(prior);
  }
  const attempt = await loadFollowupAttempt(
    env,
    userId,
    spaceId,
    input.attemptId,
  );
  if (!attempt)
    throw new FollowupGradeFailure(
      404,
      "The saved follow-up response was not found.",
    );
  const current = await currentFollowup(
    env,
    userId,
    spaceId,
    attempt.followup_request_id,
  );
  if (!current)
    throw new FollowupGradeFailure(
      409,
      "The originating activity or feedback changed before grading.",
    );
  const followup = activityFollowupResponseSchema.parse(
    JSON.parse(current.response_json),
  );
  const keys = {
    userId,
    spaceId,
    requestId: input.requestId,
    attemptId: input.attemptId,
    followupId: attempt.followup_request_id,
    packId: attempt.pack_id,
    questionId: attempt.question_id,
  };
  await expireStaleFollowupGrade(env, userId, spaceId, input.attemptId, clock);
  if (
    !(await reserveFollowupGrade(
      env,
      keys,
      current.response_json,
      hash,
      activityFollowupGradeProviderMetadata(provider),
      clock,
    ))
  ) {
    const raced = await loadFollowupGrade(
      env,
      userId,
      spaceId,
      input.requestId,
    );
    if (raced) return existing(raced);
    if (await loadActiveFollowupGrade(env, userId, spaceId, input.attemptId))
      throw new FollowupGradeFailure(
        409,
        "Follow-up feedback already exists or is being prepared for this response.",
      );
    throw new FollowupGradeFailure(
      409,
      "This grading request could not be reserved.",
    );
  }
  const context: FollowupGradeContext = {
    requestId: input.requestId,
    attemptId: input.attemptId,
    followupRequestId: attempt.followup_request_id,
    packId: attempt.pack_id,
    questionId: attempt.question_id,
    prompt: followup.prompt,
    answer: attempt.answer,
    targetedCriterion: followup.targetedCriterion,
    sources: followup.sources,
  };
  try {
    await reserveAiCall(
      env,
      userId,
      input.requestId,
      "grading",
      "followup_grade",
      clock,
    );
    const response = validateFollowupGrade(
      await provider.grade(context),
      context,
    );
    if (
      !(await finishFollowupGrade(
        env,
        userId,
        spaceId,
        input.requestId,
        response,
        clock,
      ))
    )
      throw new FollowupGradeFailure(
        409,
        "The activity changed before follow-up feedback was saved.",
      );
    await completeAiCall(env, userId, input.requestId, "followup_grade", clock);
    return response;
  } catch (error) {
    await failAiCall(env, userId, input.requestId, "followup_grade", clock);
    await failFollowupGrade(env, userId, spaceId, input.requestId, clock);
    if (error instanceof FollowupGradeFailure || error instanceof AiCallFailure)
      throw error;
    throw new FollowupGradeFailure(
      503,
      "Follow-up feedback could not be prepared. Retry explicitly.",
    );
  }
}
