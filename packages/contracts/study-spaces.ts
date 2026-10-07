import { z } from "zod";

export const createStudySpaceSchema = z
  .object({
    schemaVersion: z.literal(1),
    title: z.string().trim().min(1).max(120),
  })
  .strict();

export const studySpaceSchema = z
  .object({
    id: z.string().uuid(),
    title: z.string().min(1).max(120),
    createdAt: z.string().datetime(),
  })
  .strict();

export const sessionSchema = z
  .object({
    schemaVersion: z.literal(1),
    user: z
      .object({ id: z.string(), name: z.string(), email: z.string() })
      .strict()
      .nullable(),
  })
  .strict();

export const studySpaceListSchema = z
  .object({
    schemaVersion: z.literal(1),
    spaces: z.array(studySpaceSchema),
  })
  .strict();

export const studySpaceResponseSchema = z
  .object({
    schemaVersion: z.literal(1),
    space: studySpaceSchema,
  })
  .strict();

export type StudySpace = z.infer<typeof studySpaceSchema>;
