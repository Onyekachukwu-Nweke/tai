import { z } from "zod";

const sectionSchema = z
  .object({
    location: z.number().int().min(1).max(50),
    text: z.string().max(500_000),
  })
  .strict();
const chunkSchema = sectionSchema
  .extend({
    id: z.string().min(1).max(128),
    documentId: z.string().uuid(),
    start: z.number().int().min(0),
    end: z.number().int().min(1),
    text: z.string().min(1).max(2000),
  })
  .strict();

export const materialPreviewSchema = z
  .object({
    schemaVersion: z.literal(1),
    documentId: z.string().uuid(),
    filename: z
      .string()
      .min(1)
      .max(255)
      .refine((name) =>
        Array.from(name).every(
          (character) =>
            character.charCodeAt(0) >= 32 && character.charCodeAt(0) !== 127,
        ),
      ),
    format: z.enum(["pdf", "txt"]),
    sections: z.array(sectionSchema).min(1).max(50),
    chunks: z.array(chunkSchema).min(1).max(500),
    warnings: z.array(z.string().max(512)).max(100),
  })
  .strict()
  .superRefine((preview, context) => {
    const issue = () =>
      context.addIssue({
        code: "custom",
        message: "Invalid material source references or limits.",
      });
    if (preview.format === "txt" && preview.sections.length !== 1) issue();
    if (
      preview.sections.reduce((sum, section) => sum + section.text.length, 0) >
      500_000
    )
      issue();
    let chunkIndex = 0;
    for (const [index, section] of preview.sections.entries()) {
      if (
        section.location !== index + 1 ||
        section.text !== section.text.replace(/\r\n?/g, "\n").normalize("NFC")
      )
        issue();
      for (let start = 0; start < section.text.length;) {
        let end = Math.min(start + 2000, section.text.length);
        const last = section.text.charCodeAt(end - 1);
        if (end < section.text.length && last >= 0xd800 && last <= 0xdbff)
          end--;
        const text = section.text.slice(start, end);
        if (text.trim()) {
          const chunk = preview.chunks[chunkIndex++];
          if (
            !chunk ||
            chunk.documentId !== preview.documentId ||
            chunk.location !== section.location ||
            chunk.start !== start ||
            chunk.end !== end ||
            chunk.text !== text ||
            chunk.id !== `${preview.documentId}:${section.location}:${start}`
          )
            issue();
        }
        start = end;
      }
    }
    if (chunkIndex !== preview.chunks.length) issue();
  });

export const materialEnvelopeSchema = z
  .object({
    schemaVersion: z.literal(1),
    material: materialPreviewSchema.nullable(),
  })
  .strict();
export type MaterialPreview = z.infer<typeof materialPreviewSchema>;
