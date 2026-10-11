import { z } from "zod";

const id = z.string().uuid();
const text = (max: number) => z.string().trim().min(1).max(max);
const source = z
  .object({
    id: text(128),
    location: z.number().int().min(1).max(50),
    start: z.number().int().min(0),
    end: z.number().int().positive(),
    text: text(12_000),
  })
  .strict()
  .refine(
    (value) =>
      value.end > value.start && value.end - value.start === value.text.length,
  );
export const practicalVariantSchema = z
  .object({
    modality: z.enum([
      "written_analysis",
      "data_analysis",
      "code_exercise",
      "design_mockup",
      "simulation",
    ]),
    objective: text(500),
    instructions: z.array(text(500)).min(1).max(10),
    expectedOutput: text(1_000),
    requiredTools: z
      .array(
        z.enum([
          "paper",
          "pen",
          "notes_app",
          "spreadsheet",
          "code_editor",
          "calculator",
          "design_app",
          "simulation_app",
        ]),
      )
      .min(1)
      .max(8),
    estimatedMinutes: z.number().int().min(1).max(180),
    selfCheck: z.array(text(500)).min(1).max(10),
    connectivity: z
      .object({
        requirement: z.enum(["none", "optional", "required"]),
        disclosure: text(240),
      })
      .strict(),
    cost: z.discriminatedUnion("kind", [
      z.object({ kind: z.literal("none") }).strict(),
      z
        .object({ kind: z.literal("disclosed"), disclosure: text(240) })
        .strict(),
    ]),
  })
  .strict();
export const practicalTaskDraftSchema = z
  .object({
    schemaVersion: z.literal(1),
    suitable: z.boolean(),
    reason: text(500),
    conceptIds: z.tuple([id]),
    sourceIds: z.array(text(128)).min(1).max(20),
    task: practicalVariantSchema.nullable(),
    simpler: practicalVariantSchema.nullable(),
    freeAlternative: practicalVariantSchema.nullable(),
  })
  .strict()
  .superRefine((value, context) => {
    const variants = [value.task, value.simpler, value.freeAlternative];
    if (value.suitable && variants.some((variant) => !variant))
      context.addIssue({
        code: "custom",
        message: "Suitable tasks require all variants",
      });
    if (!value.suitable && variants.some((variant) => variant))
      context.addIssue({
        code: "custom",
        message: "Unsuitable tasks cannot include variants",
      });
    if (value.suitable && value.freeAlternative?.cost.kind !== "none")
      context.addIssue({
        code: "custom",
        message: "The free alternative must have no cost",
      });
  });
export const generatePracticalTaskSchema = z
  .object({
    schemaVersion: z.literal(1),
    requestId: id,
    conceptIds: z.tuple([id]),
  })
  .strict()
  .refine((v) => new Set(v.conceptIds).size === v.conceptIds.length);
export const practicalContextSchema = z
  .object({
    studySpaceId: id,
    materialId: id,
    conceptRequestId: id,
    concepts: z
      .array(
        z
          .object({
            id,
            label: text(120),
            sources: z.array(source).min(1).max(20),
          })
          .strict(),
      )
      .length(1),
  })
  .strict();
export const practicalTaskSchema = practicalTaskDraftSchema.safeExtend({
  id,
  completed: z.boolean(),
  completedAt: z.string().datetime().nullable(),
});
export const practicalTaskStateSchema = z
  .object({
    schemaVersion: z.literal(1),
    status: z.enum(["empty", "pending", "ready", "failed", "notSuitable"]),
    requestId: id.nullable(),
    reason: z.string().max(500).nullable(),
    error: z.string().max(240).nullable(),
    task: practicalTaskSchema.nullable(),
  })
  .strict();
export const practicalCompletionSchema = z
  .object({ schemaVersion: z.literal(1), completed: z.boolean() })
  .strict();

export type PracticalContext = z.infer<typeof practicalContextSchema>;
export type PracticalTaskDraft = z.infer<typeof practicalTaskDraftSchema>;
export type PracticalTaskState = z.infer<typeof practicalTaskStateSchema>;
