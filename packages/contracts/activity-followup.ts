import { z } from "zod";
import { rubricOutcomeSchema } from "./activity-rubric";
import { tutorSourceSchema } from "./activity-tutor";

const uuid = z.string().uuid();
export const activityFollowupRequestSchema = z
  .object({ schemaVersion: z.literal(1), requestId: uuid, attemptId: uuid })
  .strict();
export const activityFollowupResponseSchema = z
  .object({
    schemaVersion: z.literal(1),
    requestId: uuid,
    attemptId: uuid,
    packId: uuid,
    questionId: uuid,
    targetedCriterion: z.string().trim().min(1).max(500),
    gapOutcome: rubricOutcomeSchema.exclude(["supported"]),
    conceptIds: z.array(uuid).min(1).max(3),
    prompt: z.string().trim().min(1).max(1_000),
    sources: z.array(tutorSourceSchema).min(1).max(4),
  })
  .strict();
export const activityFollowupStateSchema = z
  .object({
    schemaVersion: z.literal(1),
    packId: uuid,
    followups: z.array(activityFollowupResponseSchema).max(5),
  })
  .strict();

export type ActivityFollowupRequest = z.infer<
  typeof activityFollowupRequestSchema
>;
export type ActivityFollowupResponse = z.infer<
  typeof activityFollowupResponseSchema
>;
export type FollowupContext = {
  requestId: string;
  attemptId: string;
  packId: string;
  questionId: string;
  originalPrompt: string;
  savedAnswer: string;
  targetedCriterion: string;
  gapOutcome: "not_supported" | "partial" | "uncertain";
  criterionFeedback: string;
  conceptIds: string[];
  sources: z.infer<typeof tutorSourceSchema>[];
};

export function validateFollowupResponse(
  input: unknown,
  context: FollowupContext,
) {
  const result = activityFollowupResponseSchema.parse(input);
  if (
    result.requestId !== context.requestId ||
    result.attemptId !== context.attemptId ||
    result.packId !== context.packId ||
    result.questionId !== context.questionId ||
    result.targetedCriterion !== context.targetedCriterion ||
    result.gapOutcome !== context.gapOutcome ||
    JSON.stringify(result.conceptIds) !== JSON.stringify(context.conceptIds)
  )
    throw new Error("Follow-up response changed its assessed target");
  const sources = new Map(context.sources.map((source) => [source.id, source]));
  if (
    result.sources.some(
      (source) =>
        JSON.stringify(sources.get(source.id)) !== JSON.stringify(source),
    )
  )
    throw new Error("Follow-up response cited an invalid source");
  return result;
}
