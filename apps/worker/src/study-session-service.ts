import type { CreateStudySession } from "../../../packages/contracts/study-sessions";
import type { Clock } from "../../../packages/domain/concept-progress";
import {
  selectSessionItems,
  sessionReason,
} from "../../../packages/domain/study-session";
import type { Env } from "./env";
import {
  loadLatestSession,
  loadSessionById,
  loadSessionContext,
  replaceSession,
} from "./study-session-store";

export class StudySessionFailure extends Error {
  constructor(
    public status: 400 | 403 | 404 | 409 | 503,
    message: string,
  ) {
    super(message);
  }
}

export async function prepareStudySession(
  env: Env,
  userId: string,
  spaceId: string,
  input: CreateStudySession,
  clock: Clock,
) {
  const fingerprint = JSON.stringify({
    budgetMinutes: input.budgetMinutes,
    mode: input.mode,
    conceptId: input.conceptId ?? null,
  });
  const bytes = new TextEncoder().encode(fingerprint);
  const requestHash = [
    ...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
  ]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  const prior = await loadSessionById(env, userId, spaceId, input.sessionId);
  if (prior) {
    if (prior.requestHash !== requestHash)
      throw new StudySessionFailure(
        409,
        "This session ID was already used with different settings.",
      );
    if (prior.superseded)
      throw new StudySessionFailure(
        409,
        "This session was replaced by a newer session.",
      );
    return prior.session;
  }
  const current = await loadLatestSession(env, userId, spaceId);
  if (current.status === "active" && !input.replaceActive)
    throw new StudySessionFailure(
      409,
      "An unfinished session is already available. Resume it or replace it explicitly.",
    );
  const context = await loadSessionContext(env, userId, spaceId, clock);
  if (!context)
    throw new StudySessionFailure(
      409,
      "Prepare an activity pack before starting a session.",
    );
  if (input.conceptId && !context.selectedConcepts.has(input.conceptId))
    throw new StudySessionFailure(
      400,
      "Choose a concept from the current selection.",
    );
  const selected = selectSessionItems(
    context.candidates,
    input.budgetMinutes,
    input.mode,
    input.conceptId,
  );
  await replaceSession(
    env,
    {
      userId,
      spaceId,
      id: input.sessionId,
      packId: context.packId,
      requestHash,
    },
    {
      ...input,
      estimatedMinutes: selected.estimatedMinutes,
      items: selected.items.map((item) => ({
        questionId: item.questionId,
        estimatedMinutes: item.estimatedMinutes,
        reason: sessionReason(item, input.mode, Boolean(input.conceptId)),
      })),
    },
    clock,
  );
  return (await loadSessionById(env, userId, spaceId, input.sessionId))!
    .session;
}
