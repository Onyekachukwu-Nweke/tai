import { useEffect, useRef, useState } from "react";
import type { ActivityRubricResponse } from "../../../packages/contracts/activity-rubric";
import { requestRubricGrade } from "./activity-rubric-api";

export function ActivityRubricFeedback({
  spaceId,
  attemptId,
  initial,
  gradeNow,
  onSaved,
  onSource,
}: {
  spaceId: string;
  attemptId: string;
  initial: ActivityRubricResponse | null;
  gradeNow: boolean;
  onSaved: (grade: ActivityRubricResponse) => void;
  onSource: (source: ActivityRubricResponse["sources"][number]) => void;
}) {
  const [grade, setGrade] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const started = useRef(false);
  useEffect(() => {
    if (initial) setGrade(initial);
  }, [initial]);
  async function request() {
    setBusy(true);
    setError("");
    try {
      const saved = await requestRubricGrade(
        spaceId,
        crypto.randomUUID(),
        attemptId,
      );
      setGrade(saved);
      onSaved(saved);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Rubric feedback could not be prepared. Retry explicitly.",
      );
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (gradeNow && !grade && !started.current) {
      started.current = true;
      void request();
    }
  }, [gradeNow, grade]);
  if (grade)
    return (
      <section
        className="feedback-card rubric-feedback"
        aria-label="Rubric feedback"
      >
        <header className="feedback-heading">
          <div>
            <p className="eyebrow">Source-supported feedback</p>
            <h3>How your response met the rubric</h3>
          </div>
          <div className="feedback-outcome">
            <span className="sr-only">
              Source-supported rubric outcome: {grade.outcome}
            </span>
            <span
              className={`outcome-pill outcome-${grade.outcome}`}
              aria-hidden="true"
            >
              {grade.outcome}
            </span>
          </div>
        </header>
        <p className="feedback-summary">{grade.feedback}</p>
        <ul className="criterion-list">
          {grade.elements.map((element) => (
            <li key={element.criterion}>
              <div className="criterion-heading">
                <strong>{element.criterion}</strong>
                <span
                  className={`criterion-outcome outcome-${element.outcome}`}
                >
                  {element.outcome.replace("_", " ")}
                </span>
              </div>
              <p>{element.feedback}</p>
            </li>
          ))}
        </ul>
        <div className="feedback-sources" aria-label="Supporting sources">
          {grade.sources.map((source) => (
            <button
              key={source.id}
              type="button"
              className="source-chip"
              aria-label={`Open supporting section ${source.location}`}
              onClick={() => onSource(source)}
            >
              Section {source.location}
            </button>
          ))}
        </div>
        <p className="feedback-note">
          This feedback does not advance review progress.
        </p>
      </section>
    );
  return (
    <div>
      {busy && <p role="status">Preparing source-grounded feedback…</p>}
      {error && (
        <p role="alert" className="error">
          {error} Your saved response remains available. Retry explicitly.
        </p>
      )}
      {!busy && (
        <button
          type="button"
          className="secondary"
          onClick={() => void request()}
        >
          {error ? "Retry rubric feedback" : "Get rubric feedback"}
        </button>
      )}
    </div>
  );
}
