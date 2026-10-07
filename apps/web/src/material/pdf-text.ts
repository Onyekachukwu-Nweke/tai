import type { PDFPageProxy } from "pdfjs-dist";
import type { TextContent } from "pdfjs-dist/types/src/display/api";
import { MATERIAL_LIMITS, MaterialError, checkCancelled } from "./types";
import { normalizeText } from "./validation";

export async function readPageText(
  page: PDFPageProxy,
  previousCharacters: number,
  signal?: AbortSignal,
): Promise<string> {
  const reader: ReadableStreamDefaultReader<TextContent> = page
    .streamTextContent()
    .getReader();
  let text = "";
  try {
    while (true) {
      checkCancelled(signal);
      const { done, value } = await reader.read();
      checkCancelled(signal);
      if (done) break;
      for (const item of value.items) {
        if (!("str" in item)) continue;
        if (
          previousCharacters + text.length + item.str.length + 1 >
          MATERIAL_LIMITS.characters
        )
          throw new MaterialError(
            "text-limit",
            "This PDF contains too much text. Export a shorter section (up to 500,000 characters).",
          );
        text += item.str + (item.hasEOL ? "\n" : " ");
      }
    }
    return normalizeText(text).trim();
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}
