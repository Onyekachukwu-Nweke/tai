import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { ApiError } from "./api";
import { fetchOriginal } from "./material-storage";
import { loadPdfForReading, renderPdfPage } from "./material/pdf-render";
import { Reauthenticate } from "./Reauthenticate";
import { Icon } from "./Icon";

export function SourceReader({
  spaceId,
  page,
  onPageChange,
  defaultOpen = false,
}: {
  spaceId: string;
  page: number;
  onPageChange: (page: number) => void;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
  const [loading, setLoading] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [renderedPage, setRenderedPage] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [expired, setExpired] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const loadController = useRef<AbortController | null>(null);

  async function load() {
    loadController.current?.abort();
    const controller = new AbortController();
    loadController.current = controller;
    setOpen(true);
    setLoading(true);
    setError("");
    setExpired(false);
    try {
      const bytes = await fetchOriginal(spaceId, controller.signal);
      const result = await loadPdfForReading(bytes, controller.signal);
      if (!controller.signal.aborted) setDocument(result);
    } catch (reason) {
      if (controller.signal.aborted) return;
      setExpired(reason instanceof ApiError && reason.status === 401);
      setError(
        reason instanceof ApiError
          ? reason.message
          : "The saved PDF could not be opened. Retry when ready.",
      );
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  useEffect(() => {
    if (!document || !canvas.current || !open) return;
    const controller = new AbortController();
    setRendering(true);
    setRenderedPage(null);
    setError("");
    renderPdfPage(document, page, canvas.current, controller.signal)
      .then(() => {
        if (!controller.signal.aborted) setRenderedPage(page);
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError(
            "This PDF page could not be rendered. Retry opening the PDF when ready.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setRendering(false);
      });
    return () => controller.abort();
  }, [document, open, page]);

  useEffect(() => {
    if (!defaultOpen) return;
    // Deferred so a StrictMode remount cancels it instead of fetching twice.
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(
    () => () => {
      loadController.current?.abort();
      void document?.loadingTask.destroy();
    },
    [document],
  );

  const pages = document?.numPages ?? 0;

  if (!open)
    return (
      <button type="button" className="secondary" onClick={() => void load()}>
        View PDF
      </button>
    );

  return (
    <section className="source-reader" aria-label="Original PDF page">
      <div className="pdf-nav-bar">
        {document ? (
          <>
            <button
              type="button"
              className="icon-button"
              aria-label="Previous page"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              <Icon className="icon" name="chevron-left" />
            </button>
            <span className="pdf-page-label">
              Page {page} of {pages}
            </span>
            <button
              type="button"
              className="icon-button"
              aria-label="Next page"
              disabled={page >= pages}
              onClick={() => onPageChange(page + 1)}
            >
              <Icon className="icon" name="chevron-right" />
            </button>
          </>
        ) : (
          <span className="pdf-page-label">
            {loading ? "Loading PDF…" : ""}
          </span>
        )}
      </div>
      {rendering && (
        <p role="status" className="fine-print">
          Rendering page {page}…
        </p>
      )}
      {error && (
        <div>
          <p role="alert" className="error">
            {error}
          </p>
          {expired && <Reauthenticate />}
          <button type="button" onClick={() => void load()}>
            Retry opening PDF
          </button>
        </div>
      )}
      {document && (
        <div className="pdf-canvas-wrap">
          <canvas
            ref={canvas}
            hidden={renderedPage !== page}
            aria-label={
              renderedPage === null
                ? "PDF page rendering"
                : `Rendered PDF page ${renderedPage}`
            }
          />
        </div>
      )}
    </section>
  );
}
