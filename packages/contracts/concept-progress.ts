import { z } from "zod";

const item = z
  .object({
    conceptId: z.string().uuid(),
    conceptLabel: z.string().min(1).max(80),
    label: z.enum([
      "Not checked",
      "Needs practice",
      "Recall successful",
      "Review due",
    ]),
    reviewStep: z.number().int().min(0).max(4),
    lastCheckedAt: z.string().datetime().nullable(),
    nextReviewAt: z.string().datetime().nullable(),
  })
  .strict();

export const conceptProgressResponseSchema = z
  .object({
    schemaVersion: z.literal(1),
    asOf: z.string().datetime(),
    policy: z.literal("heuristic"),
    disclosure: z.string().min(1).max(300),
    concepts: z.array(item).max(15),
  })
  .strict();

export type ConceptProgressResponse = z.infer<
  typeof conceptProgressResponseSchema
>;
