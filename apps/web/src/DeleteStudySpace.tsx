import { useState } from "react";
import { deleteSpace } from "./material-storage";

export function DeleteStudySpace({
  spaceId,
  deletionPending,
  title,
  onDeleted,
  onDeleting,
}: {
  spaceId: string;
  deletionPending?: boolean;
  title: string;
  onDeleted: () => void;
  onDeleting: () => void;
}) {
  const [confirming, setConfirming] = useState(Boolean(deletionPending));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(
    deletionPending
      ? "Deletion has not finished. Retry to remove remaining data."
      : "",
  );
  async function remove() {
    if (busy) return;
    setBusy(true);
    setError("");
    onDeleting();
    try {
      await deleteSpace(spaceId);
      onDeleted();
    } catch {
      setError(
        "Deletion could not be confirmed. The space may already be hidden. Retry deletion to finish removing its data.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (!confirming)
    return (
      <button className="secondary" onClick={() => setConfirming(true)}>
        Delete study space
      </button>
    );
  return (
    <div>
      <p>
        Delete “{title}” and its original file and extracted text? This cannot
        be undone.
      </p>
      {error && <p role="alert">{error}</p>}
      <button disabled={busy} onClick={remove}>
        {busy ? "Deleting…" : error ? "Retry deletion" : "Delete permanently"}
      </button>
      {!error && (
        <button
          className="secondary"
          disabled={busy}
          onClick={() => setConfirming(false)}
        >
          Keep study space
        </button>
      )}
    </div>
  );
}
