import { useEffect, useRef, useState } from "react";
import { extractMaterial } from "./material/extract";
import {
  MaterialError,
  type MaterialPreview as Preview,
} from "./material/types";

type Selection = { file: File; documentId: string };

export function MaterialPreview({
  title,
  onClose,
}: {
  title: string;
  onClose: () => void;
}) {
  const [selection, setSelection] = useState<Selection | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [sectionIndex, setSectionIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    heading.current?.focus();
    return () => controller.current?.abort();
  }, []);

  async function run(candidate: Selection) {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setSelection(candidate);
    setBusy(true);
    setError("");
    setStatus("Reading material in this browser…");
    try {
      const result = await extractMaterial(candidate.file, {
        documentId: candidate.documentId,
        signal: current.signal,
        onProgress: ({ completed, total }) => {
          if (!current.signal.aborted)
            setStatus(`Reading material: ${completed} of ${total}.`);
        },
      });
      if (current.signal.aborted) return;
      setPreview(result);
      setSectionIndex(0);
      setStatus("Preview ready. Material has not been uploaded or saved.");
    } catch (reason) {
      if (current.signal.aborted) return;
      setError(
        reason instanceof MaterialError
          ? reason.message
          : "The material could not be read. Choose another PDF or UTF-8 TXT file.",
      );
      setStatus("");
    } finally {
      if (!current.signal.aborted) setBusy(false);
    }
  }

  function cancel() {
    controller.current?.abort();
    setBusy(false);
    setStatus("Extraction cancelled. Any previous preview is still available.");
  }

  const section = preview?.sections[sectionIndex];
  return (
    <section className="card material-preview" aria-labelledby="material-title">
      <h2 id="material-title" tabIndex={-1} ref={heading}>
        Material preview for {title}
      </h2>
      <p>
        This preview stays in this browser tab. It is not uploaded or saved and
        is cleared when you close it or reload.
      </p>
      <p id="material-help">
        Text-based PDF or UTF-8 TXT, up to 10 MB (10,000,000 bytes) and 50 PDF
        pages. English only. Scanned PDFs and OCR are not supported.
      </p>
      <p className="notice">
        Check equations, symbols, tables, and reading order against your
        original. Extracted text can lose meaning; this preview does not verify
        correctness.
      </p>
      <label htmlFor="material-file">Choose a PDF or TXT file</label>
      <input
        id="material-file"
        type="file"
        accept=".pdf,.txt"
        aria-describedby="material-help"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          if (file) void run({ file, documentId: crypto.randomUUID() });
        }}
      />
      <div className="preview-actions">
        {busy && (
          <button type="button" className="secondary" onClick={cancel}>
            Cancel extraction
          </button>
        )}
        {!busy && selection && (
          <button
            type="button"
            className="secondary"
            onClick={() => void run(selection)}
          >
            Retry extraction
          </button>
        )}
        <button type="button" className="secondary" onClick={onClose}>
          Close preview
        </button>
      </div>
      <p role="status">{status}</p>
      {error && (
        <p role="alert" className="error">
          {error}
          {preview && " Your previous preview is still shown below."}
        </p>
      )}
      {preview && (
        <div>
          <h3>{preview.filename}</h3>
          {preview.warnings.length > 0 && (
            <ul aria-label="Extraction warnings">
              {preview.warnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          )}
          <label htmlFor="material-section">Page or section</label>
          <select
            id="material-section"
            value={sectionIndex}
            onChange={(event) => setSectionIndex(Number(event.target.value))}
          >
            {preview.sections.map((item, index) => (
              <option key={item.location} value={index}>
                {preview.format === "pdf" ? "Page" : "Section"} {item.location}
              </option>
            ))}
          </select>
          {section && (
            <>
              <p>
                {preview.format === "pdf" ? "Page" : "Section"}{" "}
                {section.location} · {section.text.length.toLocaleString()}{" "}
                extracted characters
              </p>
              <pre className="source-text">
                {section.text.slice(0, 20_000) ||
                  "No text could be extracted from this page."}
              </pre>
              {section.text.length > 20_000 && (
                <p>Showing the first 20,000 characters of this section.</p>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
