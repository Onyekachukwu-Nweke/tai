import { z } from "zod";

const uuid = z.string().uuid();
const source = z
  .object({
    id: z.string().min(1).max(128),
    location: z.number().int().min(1).max(50),
    start: z.number().int().min(0),
    end: z.number().int().positive(),
    text: z
      .string()
      .min(1)
      .max(12_000)
      .refine((value) => value.trim().length > 0, "Source text is blank"),
  })
  .strict()
  .refine(
    (value) =>
      value.end > value.start && value.end - value.start === value.text.length,
    "Invalid source offsets",
  );
const option = z
  .object({ id: uuid, text: z.string().trim().min(1).max(300) })
  .strict();
const baseQuestion = {
  id: uuid,
  conceptIds: z.array(uuid).min(1).max(3),
  prompt: z.string().trim().min(1).max(1_000),
  estimatedMinutes: z.number().int().min(1).max(10),
  sources: z.array(source).min(1).max(4),
};
const learnerQuestion = z.discriminatedUnion("type", [
  z
    .object({
      ...baseQuestion,
      type: z.literal("recall"),
      review: z
        .object({ supportedAnswer: z.string().min(1).max(2_000) })
        .strict(),
    })
    .strict(),
  z.object({ ...baseQuestion, type: z.literal("explain") }).strict(),
  z
    .object({
      ...baseQuestion,
      type: z.literal("mcq"),
      options: z.array(option).min(3).max(5),
      review: z
        .object({
          correctOptionId: uuid,
          answerExplanation: z.string().min(1).max(1_000),
        })
        .strict(),
    })
    .strict(),
]);
export const generateActivityPackSchema = z
  .object({ schemaVersion: z.literal(1), requestId: uuid })
  .strict();
export const learnerActivityPackSchema = z
  .object({
    schemaVersion: z.literal(1),
    status: z.enum(["empty", "pending", "ready", "failed"]),
    requestId: uuid.nullable(),
    packId: uuid.nullable(),
    provider: z.literal("fake"),
    error: z.string().max(240).nullable(),
    questions: z.array(learnerQuestion).max(5),
  })
  .strict();
const canonicalQuestion = z.discriminatedUnion("type", [
  z
    .object({
      ...baseQuestion,
      type: z.literal("recall"),
      supportedAnswer: z.string().trim().min(1).max(2_000),
    })
    .strict(),
  z
    .object({
      ...baseQuestion,
      type: z.literal("explain"),
      rubric: z.array(z.string().trim().min(1).max(500)).min(1).max(5),
    })
    .strict(),
  z
    .object({
      ...baseQuestion,
      type: z.literal("mcq"),
      options: z.array(option).min(3).max(5),
      correctOptionId: uuid,
      answerExplanation: z.string().trim().min(1).max(1_000),
    })
    .strict(),
]);
export const canonicalActivityPackSchema = z
  .object({
    schemaVersion: z.literal(1),
    questions: z.array(canonicalQuestion).min(3).max(5),
  })
  .strict();
export type CanonicalActivityPack = z.infer<typeof canonicalActivityPackSchema>;
export type LearnerActivityPack = z.infer<typeof learnerActivityPackSchema>;
export type ActivityQuestion = CanonicalActivityPack["questions"][number];
export type ActivityContext = {
  studySpaceId: string;
  materialId: string;
  conceptRequestId: string;
  concepts: Array<{
    id: string;
    label: string;
    sources: z.infer<typeof source>[];
  }>;
};

export function validateActivityPack(
  input: unknown,
  context: ActivityContext,
): CanonicalActivityPack {
  const pack = canonicalActivityPackSchema.parse(input);
  const concepts = new Map(
    context.concepts.map((concept) => [concept.id, concept]),
  );
  const sources = new Map(
    context.concepts.flatMap((concept) =>
      concept.sources.map((item) => [item.id, item]),
    ),
  );
  const covered = new Set<string>();
  const questionIds = new Set<string>();
  for (const question of pack.questions) {
    if (
      questionIds.has(question.id) ||
      new Set(question.conceptIds).size !== question.conceptIds.length
    )
      throw new Error("Duplicate activity identifiers");
    questionIds.add(question.id);
    if (question.conceptIds.some((id) => !concepts.has(id)))
      throw new Error("Invalid activity concept");
    question.conceptIds.forEach((id) => covered.add(id));
    if (
      new Set(question.sources.map((item) => item.id)).size !==
      question.sources.length
    )
      throw new Error("Duplicate activity sources");
    for (const citation of question.sources) {
      const actual = sources.get(citation.id);
      if (!actual || JSON.stringify(actual) !== JSON.stringify(citation))
        throw new Error("Invalid activity source");
      if (
        !question.conceptIds.some((conceptId) =>
          concepts
            .get(conceptId)
            ?.sources.some((item) => item.id === citation.id),
        )
      )
        throw new Error("Activity source is outside its concepts");
    }
    if (question.type === "mcq") {
      const ids = question.options.map((item) => item.id);
      const texts = question.options.map((item) => item.text.toLowerCase());
      if (
        new Set(ids).size !== ids.length ||
        new Set(texts).size !== texts.length ||
        !ids.includes(question.correctOptionId)
      )
        throw new Error("Invalid MCQ answer");
    }
  }
  if (covered.size < 2) throw new Error("Activity pack needs two concepts");
  return pack;
}

export function toLearnerActivityPack(pack: CanonicalActivityPack) {
  return pack.questions.map((question) =>
    question.type === "mcq"
      ? {
          id: question.id,
          type: question.type,
          conceptIds: question.conceptIds,
          prompt: question.prompt,
          estimatedMinutes: question.estimatedMinutes,
          sources: question.sources,
          options: question.options,
          review: {
            correctOptionId: question.correctOptionId,
            answerExplanation: question.answerExplanation,
          },
        }
      : question.type === "recall"
        ? {
            id: question.id,
            type: question.type,
            conceptIds: question.conceptIds,
            prompt: question.prompt,
            estimatedMinutes: question.estimatedMinutes,
            sources: question.sources,
            review: { supportedAnswer: question.supportedAnswer },
          }
        : {
            id: question.id,
            type: question.type,
            conceptIds: question.conceptIds,
            prompt: question.prompt,
            estimatedMinutes: question.estimatedMinutes,
            sources: question.sources,
          },
  );
}
