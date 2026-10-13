import { buildChunks } from "./chunks";
import {
  checkCancelled,
  MaterialError,
  type ExtractionOptions,
  type MaterialPreview,
} from "./types";
import { decodeText, hasPdfHeader, validateFile } from "./validation";

export async function extractMaterial(
  file: File,
  options: ExtractionOptions,
): Promise<MaterialPreview> {
  checkCancelled(options.signal);
  const format = validateFile(file);
  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await file.arrayBuffer());
  } catch {
    checkCancelled(options.signal);
    throw new MaterialError(
      "read",
      "The file could not be opened. Choose it again and retry.",
    );
  }
  checkCancelled(options.signal);
  if (format === "pdf" && !hasPdfHeader(bytes))
    throw new MaterialError(
      "format",
      "This file does not have a PDF header. Choose the original PDF or a UTF-8 TXT export.",
    );
  const { sections, outline } =
    format === "txt"
      ? { sections: [{ location: 1, text: decodeText(bytes) }], outline: [] }
      : await (await import("./pdf")).extractPdf(bytes, options);
  checkCancelled(options.signal);
  const chunks = buildChunks(options.documentId, sections);
  const warnings =
    format === "pdf"
      ? [
          "Check the extracted text against your original, especially equations, symbols, columns and tables. Extraction does not verify their accuracy.",
        ]
      : [];
  for (const section of sections) {
    if (!section.text.trim())
      warnings.push(
        `Page ${section.location} has no readable text. Any images on this page were not extracted.`,
      );
    if (section.text.includes("\uFFFD"))
      warnings.push(
        `Location ${section.location} contains unrecognized symbols. Compare it with the original before using it for study.`,
      );
  }
  if (format === "txt") options.onProgress?.({ completed: 1, total: 1 });
  return {
    schemaVersion: 1,
    documentId: options.documentId,
    filename: file.name,
    format,
    sections,
    chunks,
    warnings,
    ...(outline.length ? { outline } : {}),
  };
}
