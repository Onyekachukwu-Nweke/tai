import type { MaterialPreview } from "./material/types";

export function MaterialSummary({
  preview,
  saved,
  saving,
  busy,
  onSave,
}: {
  preview: MaterialPreview;
  saved: boolean;
  saving: boolean;
  busy: boolean;
  onSave: () => void;
}) {
  const unit = preview.format === "pdf" ? "page" : "section";
  const count = preview.sections.length;
  const characters = preview.sections.reduce(
    (total, section) => total + section.text.length,
    0,
  );
  return (
    <section className="material-summary" aria-label="Selected material">
      <div className="material-file">
        <span className="file-badge" aria-hidden="true">
          {preview.format.toUpperCase()}
        </span>
        <div>
          <h3>{preview.filename}</h3>
          <p className="fine-print">
            {count} {unit}
            {count === 1 ? "" : "s"}
            {preview.outline
              ? ` · ${preview.outline.length} chapter${preview.outline.length === 1 ? "" : "s"}`
              : ""}{" "}
            · {characters.toLocaleString()} characters ready for citations
          </p>
        </div>
      </div>
      {preview.warnings.length > 0 && (
        <ul className="material-warnings" aria-label="Extraction warnings">
          {preview.warnings.map((warning, index) => (
            <li key={index}>{warning}</li>
          ))}
        </ul>
      )}
      {!saved && (
        <>
          <p className="fine-print">
            Saving stores the original privately with its extracted text. AI
            activities later send selected excerpts and your answers to the
            configured AI service, never the original file. Saving makes no AI
            request.
          </p>
          <button className="small" disabled={saving || busy} onClick={onSave}>
            {saving ? "Saving material…" : "Save material"}
          </button>
        </>
      )}
    </section>
  );
}
