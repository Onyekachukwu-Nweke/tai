import { useEffect, useRef } from "react";

export type Citation = { id: string; location: number; text: string };

export function CitationPanel({
  citation,
  unit,
  onClose,
}: {
  citation: Citation;
  unit: "page" | "section";
  onClose: () => void;
}) {
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    panel.current?.focus();
  }, [citation.id]);
  return (
    <aside
      className="citation-panel"
      aria-label="Cited passage"
      tabIndex={-1}
      ref={panel}
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
    >
      <div className="section-header">
        <span className="citation-label">
          Cited from {unit} {citation.location}
        </span>
        <button
          type="button"
          className="icon-button"
          aria-label="Close cited passage"
          onClick={onClose}
        >
          ✕
        </button>
      </div>
      <blockquote>
        <mark>{citation.text}</mark>
      </blockquote>
    </aside>
  );
}
