import { useState, type FormEvent } from "react";
import type { ConceptCollection } from "../../../packages/contracts/concepts";
type Concept = ConceptCollection["concepts"][number];
export function ConceptCard({
  concept,
  relations,
  allConcepts,
  onChange,
  onSource,
}: {
  concept: Concept;
  relations: ConceptCollection["relations"];
  allConcepts: Concept[];
  onChange: (
    id: string,
    update: { label?: string; selected?: boolean },
  ) => void;
  onSource: (source: Concept["sources"][number]) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(concept.label);
  const dirty = label.trim() !== concept.label;
  function submit(event: FormEvent) {
    event.preventDefault();
    if (dirty) onChange(concept.id, { label: label.trim() });
    setEditing(false);
  }
  const related = relations
    .filter((relation) => relation.fromId === concept.id)
    .map((relation) => allConcepts.find((item) => item.id === relation.toId))
    .filter((item): item is Concept => Boolean(item));
  return (
    <li className={concept.selected ? "concept-row" : "concept-row unselected"}>
      <label className="concept-select">
        <input
          type="checkbox"
          checked={concept.selected}
          onChange={(event) =>
            onChange(concept.id, { selected: event.target.checked })
          }
        />
        <span className="sr-only">Include {concept.label}</span>
      </label>
      <div className="concept-body">
        <div className="concept-title-line">
          <strong>{concept.label}</strong>
          <button
            type="button"
            className="icon-button concept-edit"
            aria-label={`Edit ${concept.label}`}
            aria-expanded={editing}
            onClick={() => setEditing((value) => !value)}
          >
            ✎
          </button>
        </div>
        {editing && (
          <form className="concept-edit-form" onSubmit={submit}>
            <label>
              <span className="sr-only">Concept label</span>
              <input
                aria-label="Concept label"
                value={label}
                maxLength={120}
                onChange={(event) => setLabel(event.target.value)}
              />
            </label>
            {dirty && <button className="small">Save label</button>}
          </form>
        )}
        <p className="concept-desc">{concept.description}</p>
        {related.length > 0 && (
          <p className="concept-related">
            Related: {related.map((item) => item.label).join(", ")}
          </p>
        )}
      </div>
      <ul
        className="concept-sources"
        aria-label={`Sources for ${concept.label}`}
      >
        {concept.sources.map((source) => (
          <li key={source.id}>
            <button
              type="button"
              className="source-chip"
              aria-label={`Open source page ${source.location}`}
              onClick={() => onSource(source)}
            >
              Page {source.location}
            </button>
          </li>
        ))}
      </ul>
    </li>
  );
}
