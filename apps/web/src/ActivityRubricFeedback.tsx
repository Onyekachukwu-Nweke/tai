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
      <section className="notice" aria-label="Rubric feedback">
        <p>
          <strong>Source-supported rubric outcome:</strong> {grade.outcome}
        </p>
        <p>{grade.feedback}</p>
        <ul>
          {grade.elements.map((element) => (
            <li key={element.criterion}>
              <strong>{element.criterion}</strong>: {element.outcome}.{" "}
              {element.feedback}
            </li>
          ))}
        </ul>
        {grade.sources.map((source) => (
          <button
            key={source.id}
            type="button"
            className="source-link"
            onClick={() => onSource(source)}
          >
            Open supporting section {source.location}
          </button>
        ))}
        <p>This feedback does not advance review progress.</p>
      </section>
    );
  return (
    <div>
      {busy && <p role="status">Preparing source-grounded feedback…</p>}
      {error && (
        <p role="alert" className="error">
          {error} Your saved explanation remains available. Retry explicitly.
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
