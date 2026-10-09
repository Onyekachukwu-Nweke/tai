import { useState } from "react";
import type {
  RecoveryOffer,
  StudySession,
} from "../../../packages/contracts/study-sessions";
import { createRecoverySession } from "./recovery-session-api";

export function RecoveryReturn({
  spaceId,
  offer,
  onSession,
}: {
  spaceId: string;
  offer: RecoveryOffer;
  onSession: (session: StudySession) => void;
}) {
  const [pendingId, setPendingId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!offer.offered) return null;
  async function start() {
    setBusy(true);
    setError("");
    const id = pendingId || crypto.randomUUID();
    setPendingId(id);
    try {
      onSession(await createRecoverySession(spaceId, id));
      setPendingId("");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Recovery review failed.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="card" aria-labelledby="return-heading">
      <h4 id="return-heading">Welcome back</h4>
      <p>Welcome back. Your saved progress is still here.</p>
      <div className="preview-actions">
        {offer.canResume && offer.activeSession && (
          <button
            className="secondary"
            onClick={() => onSession(offer.activeSession!)}
          >
            Resume saved session
          </button>
        )}
        <button disabled={busy} onClick={() => void start()}>
          {busy ? "Preparing review…" : "Start a 10-minute review"}
        </button>
      </div>
      {error && (
        <p role="alert" className="error">
          {error} Retry explicitly.
        </p>
      )}
    </section>
  );
}
