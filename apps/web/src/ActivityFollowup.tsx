import { useEffect, useState } from "react";
import type { ActivityFollowupResponse } from "../../../packages/contracts/activity-followup";
import { requestActivityFollowup } from "./activity-followup-api";

export function ActivityFollowup({
  spaceId,
  attemptId,
  initial,
  onSaved,
  onSource,
}: {
  spaceId: string;
  attemptId: string;
  initial: ActivityFollowupResponse | null;
  onSaved: (followup: ActivityFollowupResponse) => void;
  onSource: (source: ActivityFollowupResponse["sources"][number]) => void;
}) {
  const [followup, setFollowup] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (initial) setFollowup(initial);
  }, [initial]);
  async function request() {
    setBusy(true);
    setError("");
    try {
      const saved = await requestActivityFollowup(
        spaceId,
        crypto.randomUUID(),
        attemptId,
      );
      setFollowup(saved);
      onSaved(saved);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Follow-up could not be prepared. Retry explicitly.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (followup)
    return (
      <section className="notice" aria-label="Targeted follow-up">
        <p>
          <strong>Practice this assessed gap:</strong>{" "}
          {followup.targetedCriterion}
        </p>
        <p>{followup.prompt}</p>
        {followup.sources.map((source) => (
          <button
            key={source.id}
            type="button"
            className="source-link"
            onClick={() => onSource(source)}
          >
            Open supporting section {source.location}
          </button>
        ))}
        <p className="fine-print">
          This practice prompt is not submitted or graded in this preview.
        </p>
      </section>
    );
  return (
    <div>
      {busy && <p role="status">Preparing targeted practice…</p>}
      {error && (
        <p role="alert" className="error">
          {error} Your saved response and feedback remain available. Retry
          explicitly.
        </p>
      )}
      {!busy && (
        <button
          type="button"
          className="secondary"
          onClick={() => void request()}
        >
          {error ? "Retry targeted follow-up" : "Practise this gap"}
        </button>
      )}
    </div>
  );
}
