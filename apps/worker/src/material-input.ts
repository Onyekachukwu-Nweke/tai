import {
  materialPreviewSchema,
  type MaterialPreview,
} from "../../../packages/contracts/materials";
import { validatePdf } from "./material-pdf";

export class MaterialFailure extends Error {
  constructor(
    public readonly status: 400 | 403 | 404 | 409 | 413 | 415 | 503,
    message: string,
  ) {
    super(message);
  }
}

export async function readMaterial(request: Request): Promise<{
  preview: MaterialPreview;
  bytes: Uint8Array;
  fingerprint: string;
}> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.startsWith("multipart/form-data;"))
    throw new MaterialFailure(
      415,
      "Send the original file and its extracted preview together.",
    );
  const length = request.headers.get("content-length");
  if (length && (!/^\d+$/.test(length) || Number(length) > 24_000_000))
    throw new MaterialFailure(413, "The upload is too large.");
  const reader = request.body?.getReader();
  if (!reader)
    throw new MaterialFailure(400, "Choose the original file again.");
  const parts: Uint8Array<ArrayBuffer>[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 24_000_000)
        throw new MaterialFailure(413, "The upload is too large.");
      parts.push(new Uint8Array(value));
    }
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
  let form: FormData;
  try {
    form = await new Response(new Blob(parts), {
      headers: { "content-type": contentType },
    }).formData();
  } catch {
    throw new MaterialFailure(
      400,
      "The upload could not be read. Choose the file again.",
    );
  }
  if (
    [...form.keys()].length !== 2 ||
    form.getAll("original").length !== 1 ||
    form.getAll("preview").length !== 1
  )
    throw new MaterialFailure(
      400,
      "Provide exactly one original file and preview.",
    );
  const original = form.get("original");
  const raw = form.get("preview");
  if (
    !(original instanceof File) ||
    typeof raw !== "string" ||
    raw.length > 7_000_000
  )
    throw new MaterialFailure(
      400,
      "Provide the original file and a bounded preview.",
    );
  if (!original.size || original.size > 10_000_000)
    throw new MaterialFailure(
      413,
      "Choose a nonempty file no larger than 10 MB.",
    );
  let preview: MaterialPreview;
  try {
    preview = materialPreviewSchema.parse(JSON.parse(raw));
  } catch {
    throw new MaterialFailure(
      400,
      "The extracted source references are invalid. Extract the file again.",
    );
  }
  const extension = original.name.split(".").at(-1)?.toLowerCase();
  const allowed =
    preview.format === "pdf"
      ? ["", "application/pdf", "application/octet-stream"]
      : ["", "text/plain", "application/octet-stream"];
  if (
    original.name !== preview.filename ||
    extension !== preview.format ||
    !allowed.includes(original.type.toLowerCase())
  )
    throw new MaterialFailure(
      400,
      "The original file does not match its preview.",
    );
  const bytes = new Uint8Array(await original.arrayBuffer());
  if (preview.format === "txt") {
    let text: string;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      throw new MaterialFailure(
        400,
        "Save the TXT file as UTF-8 and try again.",
      );
    }
    if (
      text.startsWith("%PDF-") ||
      Array.from(text).some((character) => {
        const code = character.charCodeAt(0);
        return (
          (code < 32 && code !== 9 && code !== 10 && code !== 13) ||
          (code >= 127 && code <= 159)
        );
      }) ||
      text.replace(/\r\n?/g, "\n").normalize("NFC") !==
        preview.sections[0]?.text
    )
      throw new MaterialFailure(
        400,
        "The TXT preview does not match the original plain text. Extract it again.",
      );
  } else await validatePdf(bytes, preview.sections.length);
  const digest = async (data: BufferSource) =>
    [...new Uint8Array(await crypto.subtle.digest("SHA-256", data))]
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  const fingerprint = await digest(
    new TextEncoder().encode(
      `${await digest(bytes)}:${JSON.stringify(preview)}`,
    ),
  );
  return { preview, bytes, fingerprint };
}
