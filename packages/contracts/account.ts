import { z } from "zod";

export const accountCleanupPendingSchema = z
  .object({
    schemaVersion: z.literal(1),
    cleanupPending: z.literal(true),
  })
  .strict();

export type AccountCleanupPending = z.infer<typeof accountCleanupPendingSchema>;
