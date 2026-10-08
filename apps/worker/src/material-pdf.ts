import { PDFDocument, ParseSpeeds } from "pdf-lib";
import { MaterialFailure } from "./material-input";
import { countPdfPages } from "./pdf-limits";

export async function validatePdf(
  bytes: Uint8Array,
  sectionCount: number,
): Promise<void> {
  if (new TextDecoder().decode(bytes.subarray(0, 5)) !== "%PDF-")
    throw new MaterialFailure(
      400,
      "Choose an original PDF with a valid PDF header.",
    );
  try {
    // Metadata only: the browser owns extraction. The pinned parser patch rejects
    // oversized numeric tokens without logging document-controlled values.
    const document = await PDFDocument.load(bytes, {
      ignoreEncryption: false,
      updateMetadata: false,
      throwOnInvalidObject: true,
      parseSpeed: ParseSpeeds.Fastest,
    });
    const pages = countPdfPages(document);
    if (
      document.isEncrypted ||
      pages < 1 ||
      pages > 50 ||
      pages !== sectionCount
    )
      throw new Error("Unsupported PDF structure");
  } catch {
    throw new MaterialFailure(
      400,
      "The PDF is unreadable, encrypted, exceeds 50 pages, or does not match the preview. Export an unlocked, shorter PDF and extract it again.",
    );
  }
}
