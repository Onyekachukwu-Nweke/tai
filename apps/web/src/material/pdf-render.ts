import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import { MATERIAL_LIMITS } from "./types";

async function pdfJs() {
  const pdfjs = await import("pdfjs-dist");
  const { default: workerUrl } =
    await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  return pdfjs;
}

export async function loadPdfForReading(
  bytes: Uint8Array,
  signal: AbortSignal,
): Promise<PDFDocumentProxy> {
  const pdfjs = await pdfJs();
  if (signal.aborted) throw new DOMException("Aborted", "AbortError");
  const loading = pdfjs.getDocument({
    data: bytes,
    useWorkerFetch: false,
    disableFontFace: true,
    useSystemFonts: false,
    disableAutoFetch: true,
    disableStream: true,
    verbosity: 0,
  });
  const abort = () => void loading.destroy().catch(() => undefined);
  signal.addEventListener("abort", abort, { once: true });
  try {
    const document = await loading.promise;
    if (document.numPages > MATERIAL_LIMITS.pages) {
      await document.loadingTask.destroy();
      throw new Error("The saved PDF exceeds the 50-page reader limit.");
    }
    return document;
  } finally {
    signal.removeEventListener("abort", abort);
  }
}

export async function renderPdfPage(
  document: PDFDocumentProxy,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  signal: AbortSignal,
): Promise<void> {
  const page = await document.getPage(pageNumber);
  let task: RenderTask | undefined;
  const cancel = () => task?.cancel();
  signal.addEventListener("abort", cancel, { once: true });
  try {
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    const base = page.getViewport({ scale: 1 });
    const available = canvas.parentElement?.clientWidth || base.width;
    const scale = Math.min(2, available / base.width);
    const viewport = page.getViewport({ scale });
    const density = Math.min(window.devicePixelRatio || 1, 2);
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("Canvas rendering is unavailable.");
    canvas.width = Math.ceil(viewport.width * density);
    canvas.height = Math.ceil(viewport.height * density);
    canvas.style.aspectRatio = `${viewport.width} / ${viewport.height}`;
    task = page.render({
      canvas,
      canvasContext: context,
      viewport,
      transform: density === 1 ? undefined : [density, 0, 0, density, 0, 0],
    });
    await task.promise;
  } finally {
    signal.removeEventListener("abort", cancel);
    page.cleanup();
  }
}
