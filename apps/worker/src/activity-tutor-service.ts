import {
  activityTutorProviderMetadata,
  type ActivityTutorProvider,
} from "../../../packages/adapters/fake-activity-tutor";
import {
  activityTutorResponseSchema,
  validateTutorResponse,
  type ActivityTutorRequest,
  type TutorContext,
} from "../../../packages/contracts/activity-tutor";
import type { Clock } from "../../../packages/domain/concept-progress";
import type { Env } from "./env";
import {
  AiCallFailure,
  completeAiCall,
  failAiCall,
  reserveAiCall,
} from "./ai-quota-service";
import { loadCurrentQuestion } from "./activity-attempt-store";
import {
  failTutorRequest,
  finishTutorRequest,
  loadTutorRequest,
  reserveTutorRequest,
} from "./activity-tutor-store";
import { assertTutorAnswerConcealed } from "./activity-tutor-safety";

export class TutorFailure extends Error {
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

function existing(row: Awaited<ReturnType<typeof loadTutorRequest>>) {
  if (!row) return null;
  if (row.state === "pending")
    throw new TutorFailure(409, "Tutor help is already being prepared.");
  if (row.state === "failed")
    throw new TutorFailure(
      409,
      "This tutor request failed. Retry explicitly with a new request ID.",
    );
  return activityTutorResponseSchema.parse(JSON.parse(row.response_json!));
}

export async function requestTutorHelp(
  env: Env,
  provider: ActivityTutorProvider,
  userId: string,
  spaceId: string,
  input: ActivityTutorRequest,
  clock: Clock,
) {
  const hash = await digest(input);
  const prior = await loadTutorRequest(env, userId, spaceId, input.requestId);
  if (prior) {
    if (prior.request_hash !== hash)
      throw new TutorFailure(
        409,
        "This request ID was already used for different tutor help.",
      );
    return existing(prior);
  }
  const question = await loadCurrentQuestion(
    env,
    userId,
    spaceId,
    input.packId,
    input.questionId,
  );
  if (!question)
    throw new TutorFailure(404, "The current activity question was not found.");
  const metadata = activityTutorProviderMetadata(provider);
  const reserved = await reserveTutorRequest(
    env,
    { userId, spaceId, ...input },
    hash,
    clock,
    metadata,
  );
  if (!reserved) {
    const raced = await loadTutorRequest(env, userId, spaceId, input.requestId);
    if (!raced || raced.request_hash !== hash)
      throw new TutorFailure(
        409,
        "This request ID was already used for different tutor help.",
      );
    return existing(raced);
  }
  const context: TutorContext = {
    requestId: input.requestId,
    packId: input.packId,
    questionId: input.questionId,
    kind: input.kind,
    question: {
      type: question.type,
      prompt: question.prompt,
      conceptIds: question.conceptIds,
      sources: question.sources,
    },
  };
  try {
    await reserveAiCall(
      env,
      userId,
      input.requestId,
      "support",
      input.kind,
      clock,
    );
    const response = validateTutorResponse(
      await provider.generate(context),
      context,
    );
    assertTutorAnswerConcealed(response.text, question);
    if (
      !(await finishTutorRequest(
        env,
        userId,
        spaceId,
        input.requestId,
        response,
        clock,
      ))
    )
      throw new TutorFailure(
        409,
        "The activity changed before tutor help was saved.",
      );
    await completeAiCall(env, userId, input.requestId, input.kind, clock);
    return response;
  } catch (error) {
    await failAiCall(env, userId, input.requestId, input.kind, clock);
    await failTutorRequest(env, userId, spaceId, input.requestId, clock);
    if (error instanceof TutorFailure || error instanceof AiCallFailure)
      throw error;
    throw new TutorFailure(
      503,
      "Tutor help could not be prepared. Retry explicitly.",
    );
  }
}
