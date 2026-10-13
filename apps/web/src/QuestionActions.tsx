import type { ReactNode } from "react";

export function QuestionActions({
  type,
  busy,
  flagged,
  hasAnswer,
  checkingRecall,
  onSkip,
  onReveal,
  onSeeAnswer,
  onCheckWritten,
  children,
}: {
  type: "recall" | "mcq" | "explain" | "scenario" | "calculation";
  busy: boolean;
  flagged: boolean;
  hasAnswer: boolean;
  checkingRecall: boolean;
  onSkip: () => void;
  onReveal: () => void;
  onSeeAnswer: () => void;
  onCheckWritten: () => void;
  children: ReactNode;
}) {
  const written = type === "explain" || type === "scenario";
  return (
    <div className="question-actions">
      <div className="question-assist">{children}</div>
      <div className="question-main">
        <button className="secondary" disabled={busy} onClick={onSkip}>
          Skip
        </button>
        {type !== "recall" && (
          <button className="ghost" disabled={busy} onClick={onReveal}>
            Reveal answer
          </button>
        )}
        {type === "recall" && !checkingRecall && (
          <button disabled={busy} onClick={onSeeAnswer}>
            See the answer <kbd aria-hidden="true">Ctrl ↵</kbd>
          </button>
        )}
        {written && (
          <button
            disabled={busy || flagged || !hasAnswer}
            onClick={onCheckWritten}
          >
            Check answer <kbd aria-hidden="true">Ctrl ↵</kbd>
          </button>
        )}
      </div>
      {type === "recall" && !hasAnswer && !checkingRecall && (
        <p className="focus-meta">
          Write your answer first to check yourself. Seeing the answer without
          one is saved as a reveal, which does not count as recall.
        </p>
      )}
      {written && flagged && (
        <p className="focus-meta">
          This flagged question cannot be submitted for rubric feedback. Your
          draft remains available.
        </p>
      )}
    </div>
  );
}
