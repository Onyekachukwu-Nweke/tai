import { z } from "zod";

const id = z.string().uuid();
const source = z
  .object({
    id: z.string().min(1).max(128),
    location: z.number().int().min(1).max(50),
    start: z.number().int().min(0),
    end: z.number().int().positive(),
    // Exact chunk text: chunk boundaries can start or end on whitespace.
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
const page = z.number().int().min(1).max(50);
export const pageRange = z
  .object({ startLocation: page, endLocation: page })
  .strict()
  .refine(
    (value) => value.startLocation <= value.endLocation,
    "Invalid page range",
  );
export type PageRange = z.infer<typeof pageRange>;
export const generateConceptsSchema = z
  .object({
    schemaVersion: z.literal(1),
    requestId: id,
    selection: pageRange,
  })
  .strict();
export const sourceContextSchema = z
  .object({
    studySpaceId: id,
    materialId: id,
    startLocation: page,
    endLocation: page,
    chunks: z
      .array(source.extend({ studySpaceId: id, materialId: id }))
      .min(1)
      .max(20),
  })
  .strict();
export const conceptDraftResultSchema = z
  .object({
    schemaVersion: z.literal(1),
    concepts: z
      .array(
        z
          .object({
            title: z.string().trim().min(1).max(120),
            description: z.string().trim().min(1).max(2_000),
            sourceIds: z.array(z.string().min(1).max(128)).min(1).max(20),
          })
          .strict(),
      )
      .min(1)
      .max(15),
    relations: z
      .array(
        z
          .object({
            from: z.number().int().min(0),
            to: z.number().int().min(0),
            kind: z.literal("suggested"),
          })
          .strict(),
      )
      .max(30),
  })
  .strict();
export const conceptSchema = z
  .object({
    id,
    title: z.string().min(1).max(120),
    label: z.string().min(1).max(120),
    description: z.string().min(1).max(2_000),
    selected: z.boolean(),
    sources: z.array(source).min(1).max(20),
  })
  .strict();
export const conceptCollectionSchema = z
  .object({
    schemaVersion: z.literal(1),
    status: z.enum(["empty", "pending", "ready", "failed"]),
    requestId: id.nullable(),
    scope: pageRange.nullable(),
    concepts: z.array(conceptSchema).max(15),
    relations: z
      .array(
        z
          .object({ fromId: id, toId: id, kind: z.literal("suggested") })
          .strict(),
      )
      .max(30),
    error: z.string().max(240).nullable(),
    provider: z.enum(["fake", "workers_ai"]),
  })
  .strict();
export const updateConceptSchema = z
  .object({
    schemaVersion: z.literal(1),
    label: z.string().trim().min(1).max(120).optional(),
    selected: z.boolean().optional(),
  })
  .strict()
  .refine((value) => value.label !== undefined || value.selected !== undefined);
export type SourceContext = z.infer<typeof sourceContextSchema>;
export type ConceptDraftResult = z.infer<typeof conceptDraftResultSchema>;
export type ConceptCollection = z.infer<typeof conceptCollectionSchema>;
export function validateSourceContext(input: unknown): SourceContext {
  const context = sourceContextSchema.parse(input);
  const ids = new Set<string>();
  for (const chunk of context.chunks)
    if (
      chunk.studySpaceId !== context.studySpaceId ||
      chunk.materialId !== context.materialId ||
      chunk.location < context.startLocation ||
      chunk.location > context.endLocation ||
      chunk.end <= chunk.start ||
      ids.has(chunk.id)
    )
      throw new Error("Invalid source association");
    else ids.add(chunk.id);
  return context;
}
export function validateConceptDrafts(
  input: unknown,
  sourceContext: SourceContext,
): ConceptDraftResult {
  const context = validateSourceContext(sourceContext);
  const result = conceptDraftResultSchema.parse(input);
  const sources = new Set(context.chunks.map((chunk) => chunk.id));
  for (const concept of result.concepts)
    if (
      new Set(concept.sourceIds).size !== concept.sourceIds.length ||
      concept.sourceIds.some((sourceId) => !sources.has(sourceId))
    )
      throw new Error("Invalid concept references");
  if (
    new Set(result.concepts.map((concept) => concept.title.toLocaleLowerCase()))
      .size !== result.concepts.length
  )
    throw new Error("Duplicate concepts");
  for (const relation of result.relations)
    if (
      relation.from === relation.to ||
      relation.from >= result.concepts.length ||
      relation.to >= result.concepts.length
    )
      throw new Error("Invalid concept relation");
  return result;
}
