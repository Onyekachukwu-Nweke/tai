import { z } from "zod";

export const aiQuotaCategorySchema = z.enum([
  "concepts",
  "packs",
  "grading",
  "support",
  "practical",
]);
export type AiQuotaCategory = z.infer<typeof aiQuotaCategorySchema>;

export const aiTaskKindSchema = z.enum([
  "concepts",
  "pack",
  "pack_prefetch",
  "rubric_grade",
  "followup_grade",
  "hint",
  "explain_again",
  "followup",
  "practical",
]);
export type AiTaskKind = z.infer<typeof aiTaskKindSchema>;

export const aiCallErrorSchema = z
  .object({
    error: z.string(),
    code: z.enum(["ai_quota_exhausted", "ai_disabled", "ai_operation_reused"]),
    category: aiQuotaCategorySchema.optional(),
    resetAt: z.iso.datetime().optional(),
    retryAfterSeconds: z.number().int().positive().optional(),
  })
  .strict();
