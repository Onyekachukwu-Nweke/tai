import { z } from "zod";

const identifier = z.string().min(1).max(128);
export const sourceContextSchema = z
  .object({
    studySpaceId: identifier,
    materialId: identifier,
    chunks: z
      .array(
        z
          .object({
            id: identifier,
            studySpaceId: identifier,
            materialId: identifier,
            text: z.string().trim().min(1).max(12000),
          })
          .strict(),
      )
      .min(1)
      .max(20),
  })
  .strict();

export const conceptResultSchema = z
  .object({
    schemaVersion: z.literal(1),
    concepts: z
      .array(
        z
          .object({
            id: identifier,
            title: z.string().trim().min(1).max(120),
            description: z.string().trim().min(1).max(2000),
            sourceIds: z.array(identifier).min(1).max(20),
          })
          .strict(),
      )
      .min(1)
      .max(15),
  })
  .strict();

export type SourceContext = z.infer<typeof sourceContextSchema>;
export type ConceptResult = z.infer<typeof conceptResultSchema>;

export function validateSourceContext(input: unknown): SourceContext {
  const context = sourceContextSchema.parse(input);
  const ids = new Set<string>();
  for (const chunk of context.chunks) {
    if (
      chunk.studySpaceId !== context.studySpaceId ||
      chunk.materialId !== context.materialId ||
      ids.has(chunk.id)
    ) {
      throw new Error("Invalid source association");
    }
    ids.add(chunk.id);
  }
  return context;
}

export function validateConceptResult(
  input: unknown,
  source: SourceContext,
): ConceptResult {
  const context = validateSourceContext(source);
  const result = conceptResultSchema.parse(input);
  const sourceIds = new Set(context.chunks.map((chunk) => chunk.id));
  const conceptIds = new Set<string>();
  for (const concept of result.concepts) {
    if (
      conceptIds.has(concept.id) ||
      new Set(concept.sourceIds).size !== concept.sourceIds.length ||
      concept.sourceIds.some((id) => !sourceIds.has(id))
    ) {
      throw new Error("Invalid concept references");
    }
    conceptIds.add(concept.id);
  }
  return result;
}
