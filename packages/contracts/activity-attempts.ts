import { z } from "zod";

const uuid = z.string().uuid();
const confidence = z.enum(["low", "medium", "high"]).nullable();
const common = {
  schemaVersion: z.literal(1),
  attemptId: uuid,
  packId: uuid,
  questionId: uuid,
  confidence,
  studySessionId: uuid.optional(),
};
export const activityAttemptRequestSchema = z.discriminatedUnion(
  "interaction",
  [
    z
      .object({
        ...common,
        interaction: z.literal("mcq_submit"),
        selectedOptionId: uuid,
      })
      .strict(),
    z
      .object({
        ...common,
        interaction: z.literal("recall_self_check"),
        answer: z.string().trim().min(1).max(8_000),
        selfAssessment: z.enum(["remembered", "partial", "not_yet"]),
      })
      .strict(),
    z
      .object({
        ...common,
        interaction: z.literal("explain_submit"),
        answer: z.string().trim().min(1).max(8_000),
      })
      .strict(),
    z.object({ ...common, interaction: z.literal("reveal") }).strict(),
    z.object({ ...common, interaction: z.literal("skip") }).strict(),
  ],
);
export const activityAttemptResponseSchema = z
  .object({
    schemaVersion: z.literal(1),
    attemptId: uuid,
    interaction: z.enum([
      "mcq_submit",
      "recall_self_check",
      "explain_submit",
      "reveal",
      "skip",
    ]),
    correctness: z.enum(["correct", "incorrect"]).nullable(),
    selfAssessment: z.enum(["remembered", "partial", "not_yet"]).nullable(),
    confidence,
    revealed: z.boolean(),
    skipped: z.boolean(),
    hintUsed: z.boolean(),
    alternateExplanationUsed: z.boolean(),
    excludedFromScoring: z.boolean(),
    flagReason: z.enum(["incorrect", "ambiguous"]).nullable(),
    feedback: z.string().min(1).max(2_000),
    supportedByMaterial: z.boolean(),
    answer: z.string().max(2_000).nullable(),
    correctOptionId: uuid.nullable(),
  })
  .strict();
export type ActivityAttemptRequest = z.infer<
  typeof activityAttemptRequestSchema
>;
export type ActivityAttemptResponse = z.infer<
  typeof activityAttemptResponseSchema
>;
export const activityFlagRequestSchema = z
  .object({
    schemaVersion: z.literal(1),
    packId: uuid,
    questionId: uuid,
    reason: z.enum(["incorrect", "ambiguous"]),
  })
  .strict();
export const activityStateSchema = z
  .object({
    schemaVersion: z.literal(1),
    packId: uuid,
    attempts: z
      .array(
        z
          .object({ questionId: uuid, result: activityAttemptResponseSchema })
          .strict(),
      )
      .max(5),
    flags: z
      .array(
        z
          .object({
            questionId: uuid,
            reason: z.enum(["incorrect", "ambiguous"]),
          })
          .strict(),
      )
      .max(5),
  })
  .strict();

export function gradeMcq(selectedOptionId: string, correctOptionId: string) {
  return selectedOptionId === correctOptionId
    ? ("correct" as const)
    : ("incorrect" as const);
}
