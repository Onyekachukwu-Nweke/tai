import { useState } from "react";
import { deleteAccount } from "./account-api";
import { clearUserDrafts } from "./activity-drafts";

export function DeleteAccount({
  userId,
  onDeleted,
}: {
  userId: string;
  onDeleted: (warning: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  async function remove() {
    if (busy) return;
    setBusy(true);
    setStatus("Deleting your account data…");
    try {
      const result = await deleteAccount();
      if (result === "pending") {
        setStatus(
          "Cleanup is still in progress. Your account is retained so you can retry deletion.",
        );
        return;
      }
      onDeleted(clearUserDrafts(userId));
    } catch (reason) {
      setStatus(
        reason instanceof Error
          ? reason.message
          : "Account deletion could not be completed. Retry when ready.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card" aria-labelledby="delete-account-title">
      <h2 id="delete-account-title">Delete account and data</h2>
      <p>
        TAI stores your original files privately and sends bounded excerpts and
        answers to the configured AI service when needed. Deletion removes data
        controlled by this application. It cannot retract data already processed
        under an AI provider’s retention practices.
      </p>
      {!confirming ? (
        <button className="secondary" onClick={() => setConfirming(true)}>
          Delete my account
        </button>
      ) : (
        <div>
          <p>
            Permanently delete your account, study spaces, originals, extracted
            text, activities, answers, progress, and sessions? This cannot be
            undone.
          </p>
          <button disabled={busy} onClick={remove}>
            {busy
              ? "Deleting…"
              : status
                ? "Retry deletion"
                : "Delete permanently"}
          </button>
          {!status && (
            <button
              className="secondary"
              disabled={busy}
              onClick={() => setConfirming(false)}
            >
              Keep my account
            </button>
          )}
        </div>
      )}
      {status && <p role="status">{status}</p>}
    </section>
  );
}
