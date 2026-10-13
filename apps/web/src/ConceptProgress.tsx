import { useEffect, useState } from "react";
import type { ConceptProgressResponse } from "../../../packages/contracts/concept-progress";
import { loadConceptProgress } from "./concept-progress-api";
import { loadSelfRatings, saveSelfRating } from "./concept-self-ratings";
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
  const [ratingConcept, setRatingConcept] = useState<string | null>(null);
  const [ratings, setRatings] = useState<Record<string, number>>(() =>
    loadSelfRatings(spaceId),
  );
  useEffect(() => {
    setRatings(loadSelfRatings(spaceId));
    const controller = new AbortController();
    loadConceptProgress(spaceId, controller.signal)
      .then((value) => {
        setProgress(value);
        setError("");
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError("Saved concept progress could not be loaded.");
      });
    return () => controller.abort();
  }, [revision, spaceId]);
  function rate(id: string, value: number) {
    setRatings(saveSelfRating(spaceId, id, value));
    setRatingConcept(null);
  }
  return (
    <section aria-labelledby="progress-heading" className="concept-progress">
      <h3 id="progress-heading">Concept review</h3>
      {error && <p role="alert">{error}</p>}
      {progress && (
        <>
          <details className="disclosure">
            <summary>How review status works</summary>
            <p>{progress.disclosure}</p>
            <p>
              Self-ratings are private browser notes and never change saved
              recall evidence.
            </p>
          </details>
          <ul className="concept-statuses">
            {progress.concepts.map((concept) => {
              const completed = concept.label !== "Not checked";
              const days = concept.nextReviewAt
                ? Math.max(
                    1,
                    Math.ceil(
                      (new Date(concept.nextReviewAt).getTime() - Date.now()) /
                        86_400_000,
                    ),
                  )
                : null;
              return (
                <li key={concept.conceptId}>
                  <strong>{concept.conceptLabel}</strong>
                  <span>
                    <button
                      className={
                        completed ? "status-chip complete" : "status-chip"
                      }
                      onClick={() => setRatingConcept(concept.conceptId)}
                    >
                      {completed ? `✓ ${concept.label}` : "Not reviewed"}
                      {ratings[concept.conceptId]
                        ? ` · self-rating ${ratings[concept.conceptId]}/5`
                        : ""}
                    </button>
                    {days && (
                      <span className="fine-print">
                        {" "}
                        Review again: in {days} day{days === 1 ? "" : "s"}
                      </span>
                    )}
                  </span>
                  {ratingConcept === concept.conceptId && (
                    <fieldset>
                      <legend>
                        Your self-rating (does not change saved review evidence)
                      </legend>
                      {[1, 2, 3, 4, 5].map((value) => (
                        <button
                          className="secondary"
                          key={value}
                          onClick={() => rate(concept.conceptId, value)}
                          aria-label={`${value} out of 5`}
                        >
                          {value}
                        </button>
                      ))}
                    </fieldset>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
