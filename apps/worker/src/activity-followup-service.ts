import type { ActivityFollowupProvider } from "../../../packages/adapters/fake-activity-followup";
import {
  activityFollowupResponseSchema,
  validateFollowupResponse,
  type ActivityFollowupRequest,
  type FollowupContext,
} from "../../../packages/contracts/activity-followup";
import {
  activityRubricResponseSchema,
  type ActivityRubricResponse,
} from "../../../packages/contracts/activity-rubric";
import type { Clock } from "../../../packages/domain/concept-progress";
import {
  loadCurrentQuestion,
  questionIsFlagged,
} from "./activity-attempt-store";
import {
  failFollowupRequest,
  finishFollowupRequest,
  loadFollowupRequest,
  reserveFollowupRequest,
} from "./activity-followup-store";
import type { Env } from "./env";

export class FollowupFailure extends Error {
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
function existing(row: Awaited<ReturnType<typeof loadFollowupRequest>>) {
  if (!row) return null;
  if (row.state === "pending")
    throw new FollowupFailure(409, "A follow-up is already being prepared.");
  if (row.state === "failed")
    throw new FollowupFailure(
      409,
      "This follow-up request failed. Retry explicitly with a new request ID.",
    );
  return activityFollowupResponseSchema.parse(JSON.parse(row.response_json!));
}
function selectGap(grade: ActivityRubricResponse) {
  const priority = {
    not_supported: 0,
    partial: 1,
    uncertain: 2,
    supported: 3,
  } as const;
  return grade.elements
    .map((element, index) => ({ element, index }))
    .filter(({ element }) => element.outcome !== "supported")
    .sort(
      (a, b) =>
        priority[a.element.outcome] - priority[b.element.outcome] ||
        a.index - b.index,
    )[0]?.element;
}

export async function generateFollowup(
  env: Env,
  provider: ActivityFollowupProvider,
  userId: string,
  spaceId: string,
  input: ActivityFollowupRequest,
  clock: Clock,
) {
  const hash = await digest(input);
  const prior = await loadFollowupRequest(
    env,
    userId,
    spaceId,
    input.requestId,
  );
  if (prior) {
    if (prior.request_hash !== hash)
      throw new FollowupFailure(409, "This request ID was already used.");
    return existing(prior);
  }
  const row = await env.DB.prepare(
    `SELECT a.pack_id,a.question_id,a.answer,g.request_id AS grade_request_id,g.response_json
     FROM activity_attempts a JOIN activity_rubric_requests g
       ON g.user_id=a.user_id AND g.space_id=a.space_id AND g.attempt_id=a.id
     WHERE a.user_id=? AND a.space_id=? AND a.id=? AND a.interaction='explain_submit'
       AND g.state='ready' ORDER BY g.created_at DESC,g.rowid DESC LIMIT 1`,
  )
    .bind(userId, spaceId, input.attemptId)
    .first<{
      pack_id: string;
      question_id: string;
      answer: string;
      grade_request_id: string;
      response_json: string;
    }>();
  if (!row)
    throw new FollowupFailure(404, "Ready rubric feedback was not found.");
  const question = await loadCurrentQuestion(
    env,
    userId,
    spaceId,
    row.pack_id,
    row.question_id,
  );
  if (
    !question ||
    (question.type !== "explain" && question.type !== "scenario")
  )
    throw new FollowupFailure(
      404,
      "The current free-text question was not found.",
    );
  if (
    await questionIsFlagged(env, userId, spaceId, row.pack_id, row.question_id)
  )
    throw new FollowupFailure(
      409,
      "Flagged questions cannot receive follow-up.",
    );
  const grade = activityRubricResponseSchema.parse(
    JSON.parse(row.response_json),
  );
  const gap = selectGap(grade);
  if (!gap)
    throw new FollowupFailure(
      409,
      "This feedback has no assessed gap for follow-up.",
    );
  const keys = {
    userId,
    spaceId,
    requestId: input.requestId,
    attemptId: input.attemptId,
    packId: row.pack_id,
    questionId: row.question_id,
    gradeRequestId: row.grade_request_id,
  };
  if (
    !(await reserveFollowupRequest(env, keys, hash, row.response_json, clock))
  )
    throw new FollowupFailure(
      409,
      "A follow-up already exists for this response.",
    );
  const context: FollowupContext = {
    requestId: input.requestId,
    attemptId: input.attemptId,
    packId: row.pack_id,
    questionId: row.question_id,
    originalPrompt: question.prompt,
    savedAnswer: row.answer,
    targetedCriterion: gap.criterion,
    gapOutcome: gap.outcome as "not_supported" | "partial" | "uncertain",
    criterionFeedback: gap.feedback,
    conceptIds: question.conceptIds,
    sources: question.sources,
  };
  try {
    const response = validateFollowupResponse(
      await provider.generate(context),
      context,
    );
    if (
      !(await finishFollowupRequest(
        env,
        userId,
        spaceId,
        input.requestId,
        response,
        clock,
      ))
    )
      throw new FollowupFailure(
        409,
        "The activity changed before follow-up was saved.",
      );
    return response;
  } catch (error) {
    await failFollowupRequest(env, userId, spaceId, input.requestId, clock);
    if (error instanceof FollowupFailure) throw error;
    throw new FollowupFailure(
      503,
      "Follow-up could not be prepared. Retry explicitly.",
    );
  }
}
