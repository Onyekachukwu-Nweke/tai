import type { Clock } from "../../../packages/domain/concept-progress";
import {
  recoveryReason,
  selectRecoveryItems,
} from "../../../packages/domain/study-session";
import type { Env } from "./env";
import { StudySessionFailure } from "./study-session-service";
import {
  loadActiveCurrentPackSession,
  loadLastLearningInteraction,
  loadSessionById,
  loadSessionContext,
  replaceSession,
} from "./study-session-store";

const DAY_MS = 86_400_000;

export function returnGapDays(value?: string) {
  if (value === undefined || value === "") return 3;
  if (!/^\d+$/.test(value))
    throw new StudySessionFailure(503, "Return gap configuration is invalid.");
  const days = Number(value);
  if (days < 1 || days > 30)
    throw new StudySessionFailure(503, "Return gap configuration is invalid.");
  return days;
}

export async function recoveryOffer(
  env: Env,
  userId: string,
  spaceId: string,
  clock: Clock,
) {
  const thresholdDays = returnGapDays(env.RETURN_GAP_DAYS);
  const context = await loadSessionContext(env, userId, spaceId, clock);
  const inactiveSince = context
    ? await loadLastLearningInteraction(env, userId, spaceId, context.packId)
    : null;
  const offered = Boolean(
    inactiveSince &&
    clock.now().getTime() - new Date(inactiveSince).getTime() >=
      thresholdDays * DAY_MS,
  );
  const activeSession =
    offered && context
      ? await loadActiveCurrentPackSession(env, userId, spaceId, context.packId)
      : null;
  return {
    schemaVersion: 1 as const,
    offered,
    inactiveSince,
    thresholdDays,
    budgetMinutes: 10 as const,
    canResume: Boolean(activeSession),
    activeSession,
  };
}

export async function prepareRecoverySession(
  env: Env,
  userId: string,
  spaceId: string,
  sessionId: string,
  clock: Clock,
) {
  const requestHash = await recoveryHash();
  const prior = await loadSessionById(env, userId, spaceId, sessionId);
  if (prior) {
    if (prior.requestHash !== requestHash || prior.superseded)
      throw new StudySessionFailure(
        409,
        "This session ID was already used for a different session.",
      );
    return prior.session;
  }
  const offer = await recoveryOffer(env, userId, spaceId, clock);
  if (!offer.offered)
    throw new StudySessionFailure(409, "A recovery review is not available.");
  const context = await loadSessionContext(env, userId, spaceId, clock);
  if (!context)
    throw new StudySessionFailure(
      409,
      "Prepare an activity pack before starting a recovery review.",
    );
  const selected = selectRecoveryItems(context.candidates);
  await replaceSession(
    env,
    { userId, spaceId, id: sessionId, packId: context.packId, requestHash },
    {
      kind: "recovery",
      budgetMinutes: 10,
      estimatedMinutes: selected.estimatedMinutes,
      mode: "review",
      items: selected.items.map((item) => ({
        questionId: item.questionId,
        estimatedMinutes: item.estimatedMinutes,
        reason: recoveryReason(item),
      })),
    },
    clock,
  );
  return (await loadSessionById(env, userId, spaceId, sessionId))!.session;
}

async function recoveryHash() {
  const bytes = new TextEncoder().encode("recovery:10:review");
  return [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
