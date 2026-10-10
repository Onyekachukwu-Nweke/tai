import { useEffect, useState } from "react";
import type { ActivityFollowupResponse } from "../../../packages/contracts/activity-followup";
import { requestActivityFollowup } from "./activity-followup-api";
import type {
  FollowupAttempt,
  FollowupGradeResponse,
} from "../../../packages/contracts/activity-followup-grade";
import {
  gradeFollowupAnswer,
  loadFollowupGrades,
  saveFollowupAnswer,
} from "./activity-followup-grade-api";

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
  const [answer, setAnswer] = useState("");
  const [answerId] = useState(() => crypto.randomUUID());
  const [savedAnswer, setSavedAnswer] = useState<FollowupAttempt | null>(null);
  const [grade, setGrade] = useState<FollowupGradeResponse | null>(null);
  const [grading, setGrading] = useState(false);
  useEffect(() => {
    if (initial) setFollowup(initial);
  }, [initial]);
  useEffect(() => {
    if (!followup) return;
    const controller = new AbortController();
    loadFollowupGrades(spaceId, followup.packId, controller.signal)
      .then((state) => {
        const restored = state.attempts.find(
          (item) => item.followupRequestId === followup.requestId,
        );
        if (restored) {
          setSavedAnswer(restored);
          setAnswer(restored.answer);
          setGrade(
            state.grades.find(
              (item) => item.attemptId === restored.attemptId,
            ) ?? null,
          );
        }
      })
      .catch(() => setError("Saved follow-up work could not be loaded."));
    return () => controller.abort();
  }, [followup, spaceId]);
  async function gradeSaved(saved: FollowupAttempt) {
    setGrading(true);
    setError("");
    try {
      const restored = await loadFollowupGrades(spaceId, saved.packId);
      const ready = restored.grades.find(
        (item) => item.attemptId === saved.attemptId,
      );
      if (ready) {
        setGrade(ready);
        return;
      }
      setGrade(
        await gradeFollowupAnswer(
          spaceId,
          crypto.randomUUID(),
          saved.attemptId,
        ),
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Follow-up feedback could not be prepared.",
      );
    } finally {
      setGrading(false);
    }
  }
  async function submitAnswer() {
    setGrading(true);
    setError("");
    try {
      const saved = await saveFollowupAnswer(spaceId, {
        schemaVersion: 1,
        attemptId: answerId,
        followupRequestId: followup!.requestId,
        answer,
      });
      setSavedAnswer(saved);
      await gradeSaved(saved);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Your follow-up response could not be saved.",
      );
      setGrading(false);
    }
  }
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
        <label>
          Your follow-up response
          <textarea
            value={answer}
            maxLength={8000}
            disabled={Boolean(savedAnswer) || grading}
            onChange={(event) => setAnswer(event.target.value)}
          />
        </label>
        {!savedAnswer && (
          <button
            type="button"
            disabled={grading || !answer.trim()}
            onClick={() => void submitAnswer()}
          >
            Save and check follow-up response
          </button>
        )}
        {grading && <p role="status">Saving before feedback…</p>}
        {error && (
          <p role="alert" className="error">
            {error} Your response remains available. Retry explicitly.
          </p>
        )}
        {savedAnswer && !grade && !grading && (
          <button
            type="button"
            className="secondary"
            onClick={() => void gradeSaved(savedAnswer)}
          >
            Retry follow-up feedback
          </button>
        )}
        {grade && (
          <div aria-label="Follow-up feedback">
            <p>
              <strong>Source-supported follow-up outcome:</strong>{" "}
              {grade.outcome.replace("_", " ")}
            </p>
            <p>{grade.feedback}</p>
            {grade.sources.map((source) => (
              <button
                key={source.id}
                type="button"
                className="source-link"
                onClick={() => onSource(source)}
              >
                Open feedback source {source.location}
              </button>
            ))}
          </div>
        )}
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
