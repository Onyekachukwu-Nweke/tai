import { useEffect, useState } from "react";
import type { ConceptProgressResponse } from "../../../packages/contracts/concept-progress";
import { loadConceptProgress } from "./concept-progress-api";

export function ConceptProgress({
  spaceId,
  revision,
}: {
  spaceId: string;
  revision: number;
}) {
  const [progress, setProgress] = useState<ConceptProgressResponse | null>(
    null,
  );
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    loadConceptProgress(spaceId, controller.signal)
      .then((value) => {
        setProgress(value);
        setError("");
      })
      .catch(() => setError("Saved concept progress could not be loaded."));
    return () => controller.abort();
  }, [revision, spaceId]);
  return (
    <section aria-labelledby="progress-heading" className="concept-progress">
      <h3 id="progress-heading">Concept review</h3>
      {error && <p role="alert">{error}</p>}
      {progress && (
        <>
          <p className="notice">{progress.disclosure}</p>
          <ul>
            {progress.concepts.map((concept) => (
              <li key={concept.conceptId}>
                <strong>{concept.conceptLabel}:</strong> {concept.label}
                {concept.nextReviewAt && (
                  <>
                    {" "}
                    · suggested{" "}
                    {new Date(concept.nextReviewAt).toLocaleDateString()}
                  </>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
