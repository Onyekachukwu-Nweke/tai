import { useEffect, useRef, useState } from "react";
import { ApiError } from "./api";
import { Reauthenticate } from "./Reauthenticate";
import { materialPath, saveMaterial } from "./material-storage";
import { extractMaterial } from "./material/extract";
import {
  MaterialError,
  type MaterialPreview as Preview,
} from "./material/types";

type Selection = { file: File; documentId: string };

export function MaterialPreview({
  title,
  spaceId,
  initialPreview,
  onClose,
}: {
  title: string;
  spaceId: string;
  initialPreview: Preview | null;
  onClose: () => void;
}) {
  const [selection, setSelection] = useState<Selection | null>(null);
  const [preview, setPreview] = useState<Preview | null>(initialPreview);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [expired, setExpired] = useState(false);
  const [saved, setSaved] = useState(Boolean(initialPreview));
  const [saving, setSaving] = useState(false);
  const saveController = useRef<AbortController | null>(null);
  const [sectionIndex, setSectionIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    heading.current?.focus();
    return () => {
      controller.current?.abort();
      saveController.current?.abort();
    };
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
      setPreviewFile(candidate.file);
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

  async function persist() {
    if (!preview || !previewFile || saving || saved) return;
    const current = new AbortController();
    saveController.current = current;
    setSaving(true);
    setError("");
    setStatus("Saving material…");
    try {
      const material = await saveMaterial(
        spaceId,
        preview,
        previewFile,
        current.signal,
      );
      if (current.signal.aborted) return;
      setPreview(material);
      setSaved(true);
      setPreviewFile(null);
      setSelection(null);
      setStatus("Material saved. You can reopen it from your account.");
    } catch (reason) {
      if (current.signal.aborted) return;
      setStatus("");
      setExpired(reason instanceof ApiError && reason.status === 401);
      setError(
        reason instanceof Error
          ? reason.message
          : "Save failed. Your preview is still available; retry when ready.",
      );
    } finally {
      if (!current.signal.aborted) setSaving(false);
    }
  }

  const section = preview?.sections[sectionIndex];
  return (
    <section className="card material-preview" aria-labelledby="material-title">
      <h2 id="material-title" tabIndex={-1} ref={heading}>
        Material preview for {title}
      </h2>
      <p>
        {saved
          ? "This material is saved privately to your account. One material is allowed per study space; create a new space for another file."
          : "This preview stays in this browser tab. It is not uploaded or saved until you choose Save material. Unsaved previews are cleared when you close or reload."}
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
      {!saved && (
        <>
          <label htmlFor="material-file">Choose a PDF or TXT file</label>
          <input
            id="material-file"
            type="file"
            disabled={saving}
            accept=".pdf,.txt"
            aria-describedby="material-help"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              event.currentTarget.value = "";
              if (file) void run({ file, documentId: crypto.randomUUID() });
            }}
          />
        </>
      )}
      <div className="preview-actions">
        {busy && (
          <button type="button" className="secondary" onClick={cancel}>
            Cancel extraction
          </button>
        )}
        {!busy && !saved && selection && (
          <button
            type="button"
            className="secondary"
            disabled={saving}
            onClick={() => void run(selection)}
          >
            Retry extraction
          </button>
        )}
        <button type="button" className="secondary" onClick={onClose}>
          Close preview
        </button>
      </div>
      {!saved && preview && (
        <div>
          <p>
            Saving stores the original file privately and the extracted text in
            your account until you delete the study space. Future AI activities
            will send selected excerpts and submitted answers to the configured
            AI service, not the original file. No AI request is made when
            saving.
          </p>
          <button disabled={saving || busy} onClick={persist}>
            {saving ? "Saving material…" : "Save material"}
          </button>
        </div>
      )}
      {saved && <a href={`${materialPath(spaceId)}/original`}>Open original</a>}
      <p role="status">{status}</p>
      {error && (
        <p role="alert" className="error">
          {error}
          {preview && " Your previous preview is still shown below."}
        </p>
      )}
      {expired && <Reauthenticate />}
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
