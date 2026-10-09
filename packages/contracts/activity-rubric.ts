import { z } from "zod";
import { tutorSourceSchema } from "./activity-tutor";

const uuid = z.string().uuid();
export const rubricOutcomeSchema = z.enum([
  "supported",
  "partial",
  "not_supported",
  "uncertain",
]);
export const activityRubricRequestSchema = z
  .object({ schemaVersion: z.literal(1), requestId: uuid, attemptId: uuid })
  .strict();
const rubricElementResultSchema = z
  .object({
    criterion: z.string().trim().min(1).max(500),
    outcome: rubricOutcomeSchema,
    feedback: z.string().trim().min(1).max(500),
  })
  .strict();
export const activityRubricResponseSchema = z
  .object({
    schemaVersion: z.literal(1),
    requestId: uuid,
    attemptId: uuid,
    packId: uuid,
    questionId: uuid,
    outcome: rubricOutcomeSchema,
    feedback: z.string().trim().min(1).max(1_600),
    elements: z.array(rubricElementResultSchema).min(1).max(5),
    sources: z.array(tutorSourceSchema).min(1).max(4),
  })
  .strict();
export const activityRubricStateSchema = z
  .object({
    schemaVersion: z.literal(1),
    packId: uuid,
    grades: z.array(activityRubricResponseSchema).max(5),
  })
  .strict();

export type ActivityRubricRequest = z.infer<typeof activityRubricRequestSchema>;
export type ActivityRubricResponse = z.infer<
  typeof activityRubricResponseSchema
>;
export type RubricContext = {
  requestId: string;
  attemptId: string;
  packId: string;
  questionId: string;
  prompt: string;
  answer: string;
  rubric: string[];
  sources: z.infer<typeof tutorSourceSchema>[];
};

export function validateRubricResponse(input: unknown, context: RubricContext) {
  const result = activityRubricResponseSchema.parse(input);
  if (
    result.requestId !== context.requestId ||
    result.attemptId !== context.attemptId ||
    result.packId !== context.packId ||
    result.questionId !== context.questionId
  )
    throw new Error("Rubric response identifiers do not match");
  if (
    result.elements.length !== context.rubric.length ||
    result.elements.some(
      (element, index) => element.criterion !== context.rubric[index],
    )
  )
    throw new Error("Rubric response changed the reviewed rubric");
  const sources = new Map(context.sources.map((source) => [source.id, source]));
  for (const citation of result.sources) {
    if (JSON.stringify(sources.get(citation.id)) !== JSON.stringify(citation))
      throw new Error("Rubric response cited an invalid source");
  }
  return result;
}
