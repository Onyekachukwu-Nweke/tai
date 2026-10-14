import { useEffect, useState } from "react";
import { deleteSpace } from "./material-storage";
import { useModalDialog } from "./use-modal-dialog";
export function DeleteStudySpace({
  spaceId,
  deletionPending,
  title,
  onDeleted,
  onDeleting,
  restoreFocus,
}: {
  spaceId: string;
  deletionPending?: boolean;
  title: string;
  onDeleted: () => void;
  onDeleting: () => void;
  restoreFocus?: () => void;
}) {
  const modal = useModalDialog();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(
    deletionPending
      ? "Deletion has not finished. Retry to remove remaining data."
      : "",
  );
  useEffect(() => {
    if (deletionPending) modal.open();
  }, [deletionPending]);
  async function remove() {
    if (busy) return;
    setBusy(true);
    setError("");
    onDeleting();
    try {
      await deleteSpace(spaceId);
      modal.close();
      restoreFocus?.();
      onDeleted();
    } catch {
      setError(
        "Deletion could not be confirmed. Retry deletion to finish removing its data.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button
        ref={modal.triggerRef}
        className="destructive"
        onClick={modal.open}
      >
        Delete
      </button>
      <dialog
        className="delete-space-dialog"
        ref={modal.dialogRef}
        aria-labelledby={`delete-${spaceId}`}
        onKeyDown={(event) => {
          if (event.key === "Escape") event.stopPropagation();
          modal.trap(event);
        }}
        onCancel={(event) => {
          event.preventDefault();
          if (!busy) {
            modal.close();
            restoreFocus?.();
          }
        }}
      >
        <h2 id={`delete-${spaceId}`}>Delete “{title}”?</h2>
        <p>This removes the file and all progress. This cannot be undone.</p>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <div className="button-row delete-dialog-actions">
          <button
            className="destructive"
            disabled={busy}
            onClick={() => void remove()}
          >
            {busy ? "Deleting…" : error ? "Retry deletion" : "Delete"}
          </button>
          <button
            className="secondary"
            disabled={busy || Boolean(error)}
            onClick={() => {
              modal.close();
              restoreFocus?.();
            }}
          >
            Cancel
          </button>
        </div>
      </dialog>
    </>
  );
}
