import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { ApiError } from "./api";
import { fetchOriginal } from "./material-storage";
import { loadPdfForReading, renderPdfPage } from "./material/pdf-render";
import { Reauthenticate } from "./Reauthenticate";

export function SourceReader({
  spaceId,
  page,
  onPageChange,
}: {
  spaceId: string;
  page: number;
  onPageChange: (page: number) => void;
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

  useEffect(
    () => () => {
      loadController.current?.abort();
      void document?.loadingTask.destroy();
    },
    [document],
  );

  function close() {
    loadController.current?.abort();
    setDocument(null);
    setOpen(false);
    setLoading(false);
    setRenderedPage(null);
    setError("");
  }

  if (!open)
    return (
      <button type="button" className="secondary" onClick={() => void load()}>
        View PDF page
      </button>
    );

  const pages = document?.numPages ?? 0;
  return (
    <section className="source-reader" aria-label="Original PDF page">
      <div className="preview-actions">
        {document && (
          <>
            <button
              type="button"
              className="secondary"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              Previous page
            </button>
            <label htmlFor="pdf-reader-page">PDF page</label>
            <select
              id="pdf-reader-page"
              value={page}
              onChange={(event) => onPageChange(Number(event.target.value))}
            >
              {Array.from({ length: pages }, (_, index) => (
                <option value={index + 1} key={index + 1}>
                  {index + 1} of {pages}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="secondary"
              disabled={page >= pages}
              onClick={() => onPageChange(page + 1)}
            >
              Next page
            </button>
          </>
        )}
        <button type="button" className="secondary" onClick={close}>
          Close PDF reader
        </button>
      </div>
      <p role="status">
        {loading
          ? "Loading saved PDF…"
          : rendering
            ? `Rendering PDF page ${page}…`
            : document && renderedPage === page
              ? `PDF page ${page} of ${pages} ready.`
              : ""}
      </p>
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
