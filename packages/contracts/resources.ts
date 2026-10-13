import { z } from "zod";

const id = z.string().uuid();
const httpsUrl = z.string().url().startsWith("https://");

export const resourceSchema = z
  .object({
    id: z.string().min(1).max(80),
    title: z.string().min(1).max(180),
    publisher: z.string().min(1).max(120),
    url: httpsUrl,
    language: z.literal("English"),
    format: z.enum(["article", "course", "textbook", "video"]),
    accessConditions: z.string().min(1).max(300),
    checkedAt: z.string().date(),
    relevance: z.string().min(1).max(400),
    supportedConcept: z.object({ id, label: z.string().min(1).max(120) }),
  })
  .strict();

export const resourceRecommendationsSchema = z
  .object({
    schemaVersion: z.literal(1),
    recommendations: z.array(resourceSchema).max(15),
    unmatchedConcepts: z
      .array(z.object({ id, label: z.string().min(1).max(120) }).strict())
      .max(15),
  })
  .strict();

export type ResourceRecommendations = z.infer<
  typeof resourceRecommendationsSchema
>;
