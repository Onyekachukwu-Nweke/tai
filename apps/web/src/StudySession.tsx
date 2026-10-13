import { useId, useState } from "react";
import type { StudySession as SavedSession } from "../../../packages/contracts/study-sessions";
import { createStudySession } from "./study-session-api";
import { SessionSummary } from "./SessionSummary";

type Concept = { id: string; label: string };
export function StudySession({
  spaceId,
  session,
  concepts,
  onChange,
}: {
  spaceId: string;
  session: SavedSession;
  concepts: Concept[];
  onChange: (session: SavedSession) => void;
}) {
  const fieldId = useId();
  const [budget, setBudget] = useState<5 | 15 | 30>(15);
  const [mode, setMode] = useState<"learn" | "review" | "practise">("learn");
  const [conceptId, setConceptId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pendingRequest, setPendingRequest] = useState<{
    id: string;
    fingerprint: string;
  } | null>(null);
  async function prepare(replaceActive: boolean) {
    setBusy(true);
    setError("");
    const fingerprint = JSON.stringify({ budget, mode, conceptId });
    const sessionId =
      pendingRequest?.fingerprint === fingerprint
        ? pendingRequest.id
        : crypto.randomUUID();
    setPendingRequest({ id: sessionId, fingerprint });
    try {
      onChange(
        await createStudySession(spaceId, {
          schemaVersion: 1,
          sessionId,
          budgetMinutes: budget,
          mode,
          ...(conceptId ? { conceptId } : {}),
          replaceActive,
        }),
      );
      setPendingRequest(null);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Session preparation failed.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      {session.status === "completed" && <SessionSummary session={session} />}
      <section className="card session-card" aria-labelledby="session-heading">
        <h3 id="session-heading">Today’s session</h3>
        {session.status === "active" && (
          <p>
            Resume your {session.mode} session: about {session.estimatedMinutes}{" "}
            minutes, with no timer or lockout. Change the choices below only if
            you want to replace it.
          </p>
        )}
        <div className="session-controls">
          <label htmlFor={`${fieldId}-time`}>
            Time
            <select
              id={`${fieldId}-time`}
              value={budget}
              onChange={(event) =>
                setBudget(Number(event.target.value) as 5 | 15 | 30)
              }
            >
              <option value={5}>5 minutes</option>
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
            </select>
          </label>
          <label htmlFor={`${fieldId}-activity`}>
            Activity
            <select
              id={`${fieldId}-activity`}
              value={mode}
              onChange={(event) => setMode(event.target.value as typeof mode)}
            >
              <option value="learn">Learn</option>
              <option value="review">Review</option>
              <option value="practise">Practise</option>
            </select>
          </label>
          <label htmlFor={`${fieldId}-concept`}>
            Concept
            <select
              id={`${fieldId}-concept`}
              value={conceptId}
              onChange={(event) => setConceptId(event.target.value)}
            >
              <option value="">Use the recommendation</option>
              {concepts.map((concept) => (
                <option key={concept.id} value={concept.id}>
                  {concept.label}
                </option>
              ))}
            </select>
          </label>
          <button
            disabled={busy}
            onClick={() => void prepare(session.status === "active")}
          >
            {busy
              ? "Preparing session…"
              : session.status === "active"
                ? "Replace with these settings"
                : "Start session ▶"}
          </button>
        </div>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
      </section>
    </>
  );
}
