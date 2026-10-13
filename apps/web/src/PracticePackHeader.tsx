import { useModalDialog } from "./use-modal-dialog";
export function PracticePackHeader({
  busy,
  selectedCount,
  hasPack,
  failed,
  error,
  onPrepare,
}: {
  busy: boolean;
  selectedCount: number;
  hasPack: boolean;
  failed: boolean;
  error: string;
  onPrepare: () => void;
}) {
  const modal = useModalDialog();
  return (
    <>
      <p className="eyebrow">AI-prepared</p>
      <h3 id="activity-heading">Practice questions</h3>
      <p className="practice-disclosure">
        Recall, multiple choice, explain and scenario questions from your
        concepts. Multiple choice is graded locally ·{" "}
        <button ref={modal.triggerRef} className="ghost" onClick={modal.open}>
          How this works
        </button>
      </p>
      <dialog
        ref={modal.dialogRef}
        aria-labelledby="practice-disclosure-title"
        onKeyDown={modal.trap}
        onCancel={(event) => {
          event.preventDefault();
          modal.close();
        }}
      >
        <h4 id="practice-disclosure-title">How practice works</h4>
        <p>
          Selected source excerpts are sent to the configured AI provider to
          prepare prompts. Free-text feedback may send your saved answer and
          cited excerpts. Hints do not send your draft or hidden answer keys. AI
          feedback does not advance review progress.
        </p>
        <button onClick={modal.close}>Close</button>
      </dialog>
      <button
        className="secondary small"
        type="button"
        disabled={busy || selectedCount < 2}
        onClick={onPrepare}
      >
        {busy
          ? "Preparing activities…"
          : hasPack
            ? "Prepare another pack"
            : "Prepare activity pack"}
      </button>
      {selectedCount < 2 && (
        <p className="fine-print">
          Select at least two concepts to prepare a pack.
        </p>
      )}
      {failed && (
        <p>
          Previous preparation failed. Retry explicitly; the last saved pack
          remains below.
        </p>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </>
  );
}
