import { z } from "zod";

const uuid = z.string().uuid();
export const createStudySessionSchema = z
  .object({
    schemaVersion: z.literal(1),
    sessionId: uuid,
    budgetMinutes: z.union([z.literal(5), z.literal(15), z.literal(30)]),
    mode: z.enum(["learn", "review", "practise"]),
    conceptId: uuid.optional(),
    replaceActive: z.boolean().default(false),
  })
  .strict();
const sessionItem = z
  .object({
    questionId: uuid,
    position: z.number().int().nonnegative(),
    estimatedMinutes: z.number().int().min(1).max(10),
    reason: z.string().min(1).max(240),
    completedAt: z.string().datetime().nullable(),
  })
  .strict();
export const studySessionSchema = z
  .object({
    schemaVersion: z.literal(1),
    status: z.enum(["empty", "active", "completed"]),
    sessionId: uuid.nullable(),
    packId: uuid.nullable(),
    budgetMinutes: z
      .union([z.literal(5), z.literal(15), z.literal(30)])
      .nullable(),
    estimatedMinutes: z.number().int().nonnegative(),
    mode: z.enum(["learn", "review", "practise"]).nullable(),
    conceptId: uuid.nullable(),
    items: z.array(sessionItem).max(5),
    createdAt: z.string().datetime().nullable(),
    completedAt: z.string().datetime().nullable(),
  })
  .strict();
export type CreateStudySession = z.infer<typeof createStudySessionSchema>;
export type StudySession = z.infer<typeof studySessionSchema>;
