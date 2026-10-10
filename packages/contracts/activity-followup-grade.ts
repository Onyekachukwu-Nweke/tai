import { z } from "zod";
import { rubricOutcomeSchema } from "./activity-rubric";
import { tutorSourceSchema } from "./activity-tutor";

const uuid = z.string().uuid();
export const followupAttemptRequestSchema = z
  .object({
    schemaVersion: z.literal(1),
    attemptId: uuid,
    followupRequestId: uuid,
    answer: z.string().trim().min(1).max(8_000),
  })
  .strict();
export const followupAttemptSchema = followupAttemptRequestSchema.extend({
  packId: uuid,
  questionId: uuid,
});
export const followupGradeRequestSchema = z
  .object({ schemaVersion: z.literal(1), requestId: uuid, attemptId: uuid })
  .strict();
export const followupGradeResponseSchema = z
  .object({
    schemaVersion: z.literal(1),
    requestId: uuid,
    attemptId: uuid,
    followupRequestId: uuid,
    packId: uuid,
    questionId: uuid,
    targetedCriterion: z.string().trim().min(1).max(500),
    outcome: rubricOutcomeSchema,
    feedback: z.string().trim().min(1).max(1_200),
    sources: z.array(tutorSourceSchema).min(1).max(4),
  })
  .strict();
export const followupGradeStateSchema = z
  .object({
    schemaVersion: z.literal(1),
    packId: uuid,
    attempts: z.array(followupAttemptSchema).max(5),
    grades: z.array(followupGradeResponseSchema).max(5),
  })
  .strict();

export type FollowupAttemptRequest = z.infer<
  typeof followupAttemptRequestSchema
>;
export type FollowupAttempt = z.infer<typeof followupAttemptSchema>;
export type FollowupGradeRequest = z.infer<typeof followupGradeRequestSchema>;
export type FollowupGradeResponse = z.infer<typeof followupGradeResponseSchema>;
export type FollowupGradeContext = {
  requestId: string;
  attemptId: string;
  followupRequestId: string;
  packId: string;
  questionId: string;
  prompt: string;
  answer: string;
  targetedCriterion: string;
  sources: z.infer<typeof tutorSourceSchema>[];
};

export function validateFollowupGrade(
  input: unknown,
  context: FollowupGradeContext,
) {
  const result = followupGradeResponseSchema.parse(input);
  if (
    result.requestId !== context.requestId ||
    result.attemptId !== context.attemptId ||
    result.followupRequestId !== context.followupRequestId ||
    result.packId !== context.packId ||
    result.questionId !== context.questionId ||
    result.targetedCriterion !== context.targetedCriterion
  )
    throw new Error("Follow-up grade changed its saved target");
  const sources = new Map(context.sources.map((source) => [source.id, source]));
  if (
    result.sources.some(
      (source) =>
        JSON.stringify(sources.get(source.id)) !== JSON.stringify(source),
    )
  )
    throw new Error("Follow-up grade cited an invalid source");
  return result;
}
