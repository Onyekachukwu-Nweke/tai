export function MaterialGuidance({ saved }: { saved: boolean }) {
  return (
    <>
      <p className="fine-print">
        {saved
          ? "Saved privately to your account. One material per study space."
          : "This preview stays in this browser tab. It is not uploaded or saved until you choose Save material. Unsaved previews are cleared when you close or reload."}
      </p>
      <details className="disclosure">
        <summary>Supported files and safety details</summary>
        <p id="material-help">
          Text-based PDF or UTF-8 TXT, up to 10 MB and 50 PDF pages. English
          only. Scanned PDFs and OCR are not supported. Check translated
          terminology, symbols, numbers, and units against the original.
        </p>
      </details>
    </>
  );
}
