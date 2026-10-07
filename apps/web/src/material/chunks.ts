import {
  MATERIAL_LIMITS,
  MaterialError,
  type MaterialChunk,
  type MaterialSection,
} from "./types";

export function buildChunks(
  documentId: string,
  sections: MaterialSection[],
): MaterialChunk[] {
  if (!documentId || documentId.length > 128)
    throw new MaterialError(
      "document",
      "Choose the file again to start a new material preview.",
    );
  const chunks: MaterialChunk[] = [];
  let total = 0;
  for (const section of sections) {
    total += section.text.length;
    if (total > MATERIAL_LIMITS.characters)
      throw new MaterialError(
        "text-limit",
        "This material contains too much text. Choose a shorter section (up to 500,000 characters).",
      );
    let start = 0;
    while (start < section.text.length) {
      let end = Math.min(
        start + MATERIAL_LIMITS.chunkCharacters,
        section.text.length,
      );
      // Keep a UTF-16 surrogate pair together without changing source offsets.
      const last = section.text.charCodeAt(end - 1);
      if (end < section.text.length && last >= 0xd800 && last <= 0xdbff) end--;
      const text = section.text.slice(start, end);
      if (text.trim())
        chunks.push({
          id: `${documentId}:${section.location}:${start}`,
          documentId,
          location: section.location,
          start,
          end,
          text,
        });
      if (chunks.length > MATERIAL_LIMITS.chunks)
        throw new MaterialError(
          "chunk-limit",
          "This material has too many text sections. Choose a smaller document.",
        );
      start = end;
    }
  }
  if (!chunks.length)
    throw new MaterialError(
      "no-text",
      "No readable text was found. Choose a text-based PDF or TXT file; scanned images need a text export first.",
    );
  return chunks;
}
