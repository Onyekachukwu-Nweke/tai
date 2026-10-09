import {
  activityAttemptResponseSchema,
  gradeMcq,
  type ActivityAttemptRequest,
  type ActivityAttemptResponse,
} from "../../../packages/contracts/activity-attempts";
import type { ActivityQuestion } from "../../../packages/contracts/activity-packs";
import type { Env } from "./env";
import {
  loadAttempt,
  loadCurrentQuestion,
  saveAttempt,
  sessionItemIsPending,
} from "./activity-attempt-store";
import { questionIsFlagged } from "./activity-attempt-store";
import type { Clock } from "../../../packages/domain/concept-progress";

export class AttemptFailure extends Error {
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
function review(question: ActivityQuestion) {
  if (question.type === "recall") return question.supportedAnswer;
  if (question.type === "mcq") return question.answerExplanation;
  return question.rubric.join("; ");
}
function result(
  input: ActivityAttemptRequest,
  question: ActivityQuestion,
): ActivityAttemptResponse {
  if (input.interaction === "mcq_submit" && question.type !== "mcq")
    throw new AttemptFailure(
      409,
      "This response does not match the current question.",
    );
  if (input.interaction === "recall_self_check" && question.type !== "recall")
    throw new AttemptFailure(
      409,
      "This response does not match the current question.",
    );
  if (input.interaction === "explain_submit" && question.type !== "explain")
    throw new AttemptFailure(
      409,
      "This response does not match the current question.",
    );
  if (input.interaction === "mcq_submit") {
    if (question.type !== "mcq")
      throw new AttemptFailure(
        409,
        "This response does not match the current question.",
      );
    if (!question.options.some((item) => item.id === input.selectedOptionId))
      throw new AttemptFailure(
        400,
        "Choose an option from the current question.",
      );
  }
  const correctness =
    input.interaction === "mcq_submit" && question.type === "mcq"
      ? gradeMcq(input.selectedOptionId, question.correctOptionId)
      : null;
  const revealed =
    input.interaction === "reveal" || input.interaction === "recall_self_check";
  const feedback =
    input.interaction === "explain_submit"
      ? "Your explanation was saved ungraded. Rubric feedback is not available in this development slice."
      : input.interaction === "skip"
        ? "Skipped without a correctness result."
        : input.interaction === "recall_self_check"
          ? "Your self-check was saved without a scored correctness result."
          : revealed
            ? "The supported answer is shown below. Reveal does not count as correct."
            : correctness === "correct"
              ? "Correct. The explanation is supported by your material."
              : "Not yet. Review the material-supported explanation below.";
  return {
    schemaVersion: 1,
    attemptId: input.attemptId,
    interaction: input.interaction,
    correctness,
    selfAssessment:
      input.interaction === "recall_self_check" ? input.selfAssessment : null,
    confidence: input.confidence,
    revealed,
    skipped: input.interaction === "skip",
    hintUsed: false,
    excludedFromScoring: false,
    flagReason: null,
    feedback,
    supportedByMaterial: input.interaction !== "explain_submit",
    answer: revealed ? review(question) : null,
    correctOptionId:
      (revealed || input.interaction === "mcq_submit") &&
      question.type === "mcq"
        ? question.correctOptionId
        : null,
  };
}
export async function recordAttempt(
  env: Env,
  userId: string,
  spaceId: string,
  input: ActivityAttemptRequest,
  clock: Clock,
) {
  const hash = await digest(input);
  const prior = await loadAttempt(env, userId, spaceId, input.attemptId);
  if (prior) {
    if (prior.request_hash !== hash)
      throw new AttemptFailure(
        409,
        "This attempt ID was already used for a different response.",
      );
    return activityAttemptResponseSchema.parse(JSON.parse(prior.response_json));
  }
  const question = await loadCurrentQuestion(
    env,
    userId,
    spaceId,
    input.packId,
    input.questionId,
  );
  if (!question)
    throw new AttemptFailure(
      404,
      "The current activity question was not found.",
    );
  if (
    input.studySessionId &&
    !(await sessionItemIsPending(
      env,
      userId,
      spaceId,
      input.studySessionId,
      input.packId,
      input.questionId,
    ))
  )
    throw new AttemptFailure(
      409,
      "This question is not pending in the active study session.",
    );
  if (
    input.interaction === "mcq_submit" &&
    (await questionIsFlagged(
      env,
      userId,
      spaceId,
      input.packId,
      input.questionId,
    ))
  )
    throw new AttemptFailure(
      409,
      "This flagged question is excluded from future scoring.",
    );
  const response = result(input, question);
  const fields = {
    interaction: input.interaction,
    answer: "answer" in input ? input.answer : undefined,
    selectedOptionId:
      "selectedOptionId" in input ? input.selectedOptionId : undefined,
    selfAssessment:
      "selfAssessment" in input ? input.selfAssessment : undefined,
    confidence: input.confidence,
    correctness: response.correctness,
    revealed: response.revealed,
    skipped: response.skipped,
  };
  const saved = await saveAttempt(
    env,
    {
      userId,
      spaceId,
      packId: input.packId,
      questionId: input.questionId,
      attemptId: input.attemptId,
      studySessionId: input.studySessionId,
    },
    hash,
    response,
    fields,
    clock,
  );
  if (!saved)
    throw new AttemptFailure(
      409,
      "This attempt ID was already used for a different response.",
    );
  return saved;
}
