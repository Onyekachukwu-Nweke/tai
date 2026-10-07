import {
  MATERIAL_LIMITS,
  MaterialError,
  checkCancelled,
  type ExtractionOptions,
  type MaterialSection,
} from "./types";
import { readPageText } from "./pdf-text";

export async function extractPdf(
  bytes: Uint8Array,
  options: ExtractionOptions,
): Promise<MaterialSection[]> {
  const pdfjs = await import("pdfjs-dist");
  const { default: workerUrl } =
    await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  checkCancelled(options.signal);
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  const loading = pdfjs.getDocument({
    data: bytes,
    // PDF.js 6 removed eval-based compilation; scripting/sandbox APIs are not loaded.
    useWorkerFetch: false,
    disableFontFace: true,
    useSystemFonts: false,
    disableAutoFetch: true,
    disableStream: true,
    verbosity: 0,
  });
  const cancel = () => {
    void loading.destroy().catch(() => undefined);
  };
  options.signal?.addEventListener("abort", cancel, { once: true });
  try {
    const document = await loading.promise;
    checkCancelled(options.signal);
    if (document.numPages > MATERIAL_LIMITS.pages)
      throw new MaterialError(
        "pages",
        "Choose a PDF with no more than 50 pages. Export a shorter section and try again.",
      );
    const sections: MaterialSection[] = [];
    let characters = 0;
    for (let location = 1; location <= document.numPages; location++) {
      checkCancelled(options.signal);
      const page = await document.getPage(location);
      try {
        const normalized = await readPageText(page, characters, options.signal);
        characters += normalized.length;
        sections.push({ location, text: normalized });
        options.onProgress?.({ completed: location, total: document.numPages });
      } finally {
        page.cleanup();
      }
    }
    return sections;
  } catch (error) {
    checkCancelled(options.signal);
    if (error instanceof MaterialError) throw error;
    if (error instanceof Error && error.name === "PasswordException")
      throw new MaterialError(
        "password",
        "This PDF is password-protected. Export an unlocked copy and try again.",
      );
    throw new MaterialError(
      "pdf",
      "This PDF could not be read. Try an undamaged, text-based PDF or export the material as UTF-8 TXT.",
    );
  } finally {
    options.signal?.removeEventListener("abort", cancel);
    await loading.destroy().catch(() => undefined);
  }
}
