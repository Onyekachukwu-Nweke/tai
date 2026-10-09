import { z } from "zod";

const uuid = z.string().uuid();
export const tutorKindSchema = z.enum(["hint", "explain_again"]);
export const tutorSourceSchema = z
  .object({
    id: z.string().min(1).max(128),
    location: z.number().int().min(1).max(50),
    start: z.number().int().min(0),
    end: z.number().int().positive(),
    text: z.string().min(1).max(12_000),
  })
  .strict()
  .refine(
    (source) =>
      source.text.trim().length > 0 &&
      source.end > source.start &&
      source.end - source.start === source.text.length,
    "Invalid tutor source",
  );

export const activityTutorRequestSchema = z
  .object({
    schemaVersion: z.literal(1),
    requestId: uuid,
    packId: uuid,
    questionId: uuid,
    kind: tutorKindSchema,
  })
  .strict();

export const activityTutorResponseSchema = z
  .object({
    schemaVersion: z.literal(1),
    requestId: uuid,
    packId: uuid,
    questionId: uuid,
    kind: tutorKindSchema,
    text: z.string().trim().min(1).max(1_200),
    sources: z.array(tutorSourceSchema).min(1).max(4),
    supportedByMaterial: z.literal(true),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.kind === "hint" && value.text.length > 600)
      context.addIssue({
        code: "custom",
        path: ["text"],
        message: "Hint is too long",
      });
  });

export const activityTutorStateSchema = z
  .object({
    schemaVersion: z.literal(1),
    packId: uuid,
    interactions: z.array(activityTutorResponseSchema).max(10),
  })
  .strict();

export type ActivityTutorRequest = z.infer<typeof activityTutorRequestSchema>;
export type ActivityTutorResponse = z.infer<typeof activityTutorResponseSchema>;
export type TutorSource = z.infer<typeof tutorSourceSchema>;
export type TutorContext = {
  requestId: string;
  packId: string;
  questionId: string;
  kind: "hint" | "explain_again";
  question: {
    type: "recall" | "mcq" | "explain" | "scenario" | "calculation";
    prompt: string;
    conceptIds: string[];
    sources: TutorSource[];
  };
};

export function validateTutorResponse(
  input: unknown,
  context: TutorContext,
): ActivityTutorResponse {
  const result = activityTutorResponseSchema.parse(input);
  if (
    result.requestId !== context.requestId ||
    result.packId !== context.packId ||
    result.questionId !== context.questionId ||
    result.kind !== context.kind
  )
    throw new Error("Tutor response identifiers do not match");
  const currentSources = new Map(
    context.question.sources.map((source) => [source.id, source]),
  );
  for (const citation of result.sources) {
    const current = currentSources.get(citation.id);
    if (!current || JSON.stringify(current) !== JSON.stringify(citation))
      throw new Error("Tutor response cited an invalid source");
  }
  return result;
}
