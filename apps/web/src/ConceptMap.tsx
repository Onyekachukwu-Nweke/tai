import { useEffect, useState } from "react";
import type { ConceptCollection } from "../../../packages/contracts/concepts";
type Concept = ConceptCollection["concepts"][number];
type Source = Concept["sources"][number];

const narrowQuery = "(max-width: 520px)";

function useNarrow() {
  const [narrow, setNarrow] = useState(
    () => window.matchMedia(narrowQuery).matches,
  );
  useEffect(() => {
    const media = window.matchMedia(narrowQuery);
    const update = () => setNarrow(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return narrow;
}

function layout(count: number, narrow: boolean) {
  if (count === 1) return [{ x: 50, y: 50 }];
  return Array.from({ length: count }, (_, index) => {
    if (narrow)
      return { x: index % 2 ? 72 : 28, y: ((index + 0.5) / count) * 100 };
    const angle = (index / count) * Math.PI * 2 - Math.PI / 2;
    return { x: 50 + 36 * Math.cos(angle), y: 50 + 36 * Math.sin(angle) };
  });
}

export function ConceptMap({
  concepts,
  relations,
  onSource,
}: {
  concepts: Concept[];
  relations: ConceptCollection["relations"];
  onSource: (source: Source) => void;
}) {
  const narrow = useNarrow();
  const points = layout(concepts.length, narrow);
  const position = new Map(concepts.map((concept, i) => [concept.id, i]));
  const edges = relations.flatMap((relation) => {
    const from = position.get(relation.fromId);
    const to = position.get(relation.toId);
    return from === undefined || to === undefined
      ? []
      : [{ key: `${relation.fromId}-${relation.toId}`, from, to }];
  });
  return (
    <div className="concept-map-wrap">
      <div
        className="concept-map"
        role="list"
        aria-label="Map of concepts"
        style={
          narrow ? { height: `${concepts.length * 70 + 20}px` } : undefined
        }
      >
        <svg
          className="concept-map-edges"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {edges.map((edge) => (
            <line
              key={edge.key}
              x1={points[edge.from]!.x}
              y1={points[edge.from]!.y}
              x2={points[edge.to]!.x}
              y2={points[edge.to]!.y}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
        {concepts.map((concept, index) => {
          const source = concept.sources[0];
          return (
            <div
              key={concept.id}
              role="listitem"
              className="concept-node-slot"
              style={{
                left: `${points[index]!.x}%`,
                top: `${points[index]!.y}%`,
                transform: `translate(-${points[index]!.x}%, -50%)`,
              }}
            >
              <button
                type="button"
                className={
                  concept.selected ? "concept-node" : "concept-node unselected"
                }
                title={concept.description}
                aria-label={`${concept.label}${
                  source ? `, open source page ${source.location}` : ""
                }`}
                disabled={!source}
                onClick={() => source && onSource(source)}
              >
                {concept.label}
              </button>
            </div>
          );
        })}
      </div>
      <p className="fine-print">
        {edges.length > 0
          ? "Lines are suggested connections, not a required order. Select a concept to see its source."
          : "No suggested connections yet. Select a concept to see its source."}
      </p>
    </div>
  );
}
