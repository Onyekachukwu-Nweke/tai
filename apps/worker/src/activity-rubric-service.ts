import type { ActivityRubricProvider } from "../../../packages/adapters/fake-activity-rubric";
import {
  activityRubricResponseSchema,
  validateRubricResponse,
  type ActivityRubricRequest,
  type RubricContext,
} from "../../../packages/contracts/activity-rubric";
import type { Clock } from "../../../packages/domain/concept-progress";
import type { Env } from "./env";
import {
  loadCurrentQuestion,
  questionIsFlagged,
} from "./activity-attempt-store";
import {
  failRubricRequest,
  finishRubricRequest,
  loadActiveRubricForAttempt,
  loadRubricRequest,
  reserveRubricRequest,
} from "./activity-rubric-store";

export class RubricFailure extends Error {
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
function existing(row: Awaited<ReturnType<typeof loadRubricRequest>>) {
  if (!row) return null;
  if (row.state === "pending")
    throw new RubricFailure(409, "Rubric feedback is already being prepared.");
  if (row.state === "failed")
    throw new RubricFailure(
      409,
      "This grading request failed. Retry explicitly with a new request ID.",
    );
  return activityRubricResponseSchema.parse(JSON.parse(row.response_json!));
}

export async function gradeExplanation(
  env: Env,
  provider: ActivityRubricProvider,
  userId: string,
  spaceId: string,
  input: ActivityRubricRequest,
  clock: Clock,
) {
  const hash = await digest(input);
  const prior = await loadRubricRequest(env, userId, spaceId, input.requestId);
  if (prior) {
    if (prior.request_hash !== hash)
      throw new RubricFailure(409, "This request ID was already used.");
    return existing(prior);
  }
  const attempt = await env.DB.prepare(
    "SELECT pack_id,question_id,answer FROM activity_attempts WHERE user_id=? AND space_id=? AND id=? AND interaction IN ('explain_submit','calculation_submit')",
  )
    .bind(userId, spaceId, input.attemptId)
    .first<{ pack_id: string; question_id: string; answer: string }>();
  if (!attempt) throw new RubricFailure(404, "The explanation was not found.");
  const question = await loadCurrentQuestion(
    env,
    userId,
    spaceId,
    attempt.pack_id,
    attempt.question_id,
  );
  if (
    !question ||
    (question.type !== "explain" &&
      question.type !== "scenario" &&
      question.type !== "calculation")
  )
    throw new RubricFailure(
      404,
      "The current free-text question was not found.",
    );
  if (
    await questionIsFlagged(
      env,
      userId,
      spaceId,
      attempt.pack_id,
      attempt.question_id,
    )
  )
    throw new RubricFailure(409, "Flagged questions cannot be graded.");
  const keys = {
    userId,
    spaceId,
    requestId: input.requestId,
    attemptId: input.attemptId,
    packId: attempt.pack_id,
    questionId: attempt.question_id,
  };
  if (!(await reserveRubricRequest(env, keys, hash, clock))) {
    const raced = await loadRubricRequest(
      env,
      userId,
      spaceId,
      input.requestId,
    );
    if (!raced) {
      const active = await loadActiveRubricForAttempt(
        env,
        userId,
        spaceId,
        input.attemptId,
      );
      if (active)
        throw new RubricFailure(
          409,
          "Rubric feedback already exists or is being prepared for this attempt.",
        );
      throw new RubricFailure(409, "This request could not be reserved.");
    }
    if (raced.request_hash !== hash)
      throw new RubricFailure(409, "This request ID was already used.");
    return existing(raced);
  }
  const context: RubricContext = {
    requestId: input.requestId,
    attemptId: input.attemptId,
    packId: attempt.pack_id,
    questionId: attempt.question_id,
    prompt: question.prompt,
    answer: attempt.answer,
    rubric: question.rubric,
    sources: question.sources,
  };
  try {
    const response = validateRubricResponse(
      await provider.grade(context),
      context,
    );
    if (
      !(await finishRubricRequest(
        env,
        userId,
        spaceId,
        input.requestId,
        response,
        clock,
      ))
    )
      throw new RubricFailure(
        409,
        "The activity changed before feedback was saved.",
      );
    return response;
  } catch (error) {
    await failRubricRequest(env, userId, spaceId, input.requestId, clock);
    if (error instanceof RubricFailure) throw error;
    throw new RubricFailure(
      503,
      "Rubric feedback could not be prepared. Retry explicitly.",
    );
  }
}
