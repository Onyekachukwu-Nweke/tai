import { MATERIAL_LIMITS, MaterialError } from "./types";

export function validateFile(
  file: Pick<File, "name" | "size" | "type">,
): "pdf" | "txt" {
  if (file.size === 0)
    throw new MaterialError(
      "empty",
      "This file is empty. Choose a text-based PDF or UTF-8 TXT file.",
    );
  if (file.size > MATERIAL_LIMITS.bytes)
    throw new MaterialError(
      "size",
      "Choose a file no larger than 10 MB (10,000,000 bytes).",
    );
  const extension = file.name.split(".").at(-1)?.toLowerCase();
  if (extension !== "pdf" && extension !== "txt")
    throw new MaterialError(
      "format",
      "Choose a PDF or TXT file. Other formats are not supported.",
    );
  const allowedTypes =
    extension === "pdf"
      ? ["", "application/pdf", "application/octet-stream"]
      : ["", "text/plain", "application/octet-stream"];
  if (!allowedTypes.includes(file.type.toLowerCase()))
    throw new MaterialError(
      "format",
      "The file type does not match its name. Choose an original PDF or TXT file.",
    );
  return extension;
}

export function hasPdfHeader(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 5 &&
    bytes[0] === 37 &&
    bytes[1] === 80 &&
    bytes[2] === 68 &&
    bytes[3] === 70 &&
    bytes[4] === 45
  );
}

export function normalizeText(text: string): string {
  return text.replace(/\r\n?/g, "\n").normalize("NFC");
}

export function decodeText(bytes: Uint8Array): string {
  if (hasPdfHeader(bytes))
    throw new MaterialError(
      "format",
      "This appears to be a PDF renamed as TXT. Choose the original PDF file.",
    );
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new MaterialError(
      "encoding",
      "This TXT file is not valid UTF-8. Save it as UTF-8 text and try again.",
    );
  }
  for (const character of text) {
    const code = character.charCodeAt(0);
    if (
      (code < 32 && code !== 9 && code !== 10 && code !== 13) ||
      (code >= 127 && code <= 159)
    ) {
      throw new MaterialError(
        "binary",
        "This file contains binary or unsupported control characters. Export it as plain UTF-8 text.",
      );
    }
  }
  return normalizeText(text);
}
