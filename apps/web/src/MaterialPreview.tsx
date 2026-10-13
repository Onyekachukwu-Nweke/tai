import { useEffect, useRef, useState } from "react";
import { ApiError } from "./api";
import { Reauthenticate } from "./Reauthenticate";
import { SourceReader } from "./SourceReader";
import { ConceptExplorer } from "./ConceptExplorer";
import { PracticeWorkspaceView } from "./PracticeWorkspaceView";
import { MaterialGuidance } from "./MaterialGuidance";
import { MaterialSummary } from "./MaterialSummary";
import { CitationPanel, type Citation } from "./CitationPanel";
import { conceptScopes } from "./concept-scopes";
import { saveMaterial } from "./material-storage";
import { extractMaterial } from "./material/extract";
import {
  MaterialError,
  type MaterialPreview as Preview,
} from "./material/types";

type Selection = { file: File; documentId: string };

export function MaterialPreview({
  title,
  spaceId,
  userId,
  initialPreview,
  onClose,
  practiceOnly = false,
}: {
  title: string;
  spaceId: string;
  userId: string;
  initialPreview: Preview | null;
  onClose: () => void;
  practiceOnly?: boolean;
}) {
  const [selection, setSelection] = useState<Selection | null>(null);
  const [preview, setPreview] = useState<Preview | null>(initialPreview);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [expired, setExpired] = useState(false);
  const [saved, setSaved] = useState(Boolean(initialPreview));
  const [saving, setSaving] = useState(false);
  const saveController = useRef<AbortController | null>(null);
  const [sectionIndex, setSectionIndex] = useState(0);
  const [citation, setCitation] = useState<Citation | null>(null);
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

  if (practiceOnly && saved && preview && section)
    return (
      <PracticeWorkspaceView
        title={title}
        userId={userId}
        spaceId={spaceId}
        preview={preview}
        onLocation={setSectionIndex}
      />
    );

  return (
    <section className="card material-preview" aria-labelledby="material-title">
      <div className="section-header">
        <h2 id="material-title" tabIndex={-1} ref={heading}>
          {saved ? "Your material" : "Upload material"}
        </h2>
        <button
          type="button"
          className="ghost small"
          aria-label="Close preview"
          onClick={onClose}
        >
          ✕ Close
        </button>
      </div>
      <MaterialGuidance saved={saved} />
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
      </div>
      <p role="status" className="fine-print">
        {status}
      </p>
      {error && (
        <p role="alert" className="error">
          {error}
          {preview && " Your previous file is still ready below."}
        </p>
      )}
      {expired && <Reauthenticate />}
      {preview && (!saved || preview.format === "txt") && (
        <MaterialSummary
          preview={preview}
          saved={saved}
          saving={saving}
          busy={busy}
          onSave={() => void persist()}
        />
      )}
      {saved && preview?.format === "pdf" && section && (
        <SourceReader
          spaceId={spaceId}
          page={section.location}
          onPageChange={(page) => setSectionIndex(page - 1)}
          defaultOpen
        />
      )}
      {saved && section && (
        <ConceptExplorer
          userId={userId}
          spaceId={spaceId}
          scopes={conceptScopes(preview!)}
          onSource={(source) => {
            const index = preview!.sections.findIndex(
              (item) => item.location === source.location,
            );
            if (index >= 0) setSectionIndex(index);
            setCitation(source);
          }}
        />
      )}
      {citation && preview && (
        <CitationPanel
          citation={citation}
          unit={preview.format === "pdf" ? "page" : "section"}
          onClose={() => setCitation(null)}
        />
      )}
    </section>
  );
}
