import type { LearnerActivityPack } from "../../../packages/contracts/activity-packs";
import { gradeNumericAnswer } from "../../../packages/domain/numeric-grading";

type Question = Extract<
  LearnerActivityPack["questions"][number],
  { type: "calculation" }
>;

export function CalculationAnswer({
  question,
  finalAnswer,
  working,
  busy,
  flagged,
  onChange,
  onInvalid,
  onSubmit,
}: {
  question: Question;
  finalAnswer: string;
  working: string;
  busy: boolean;
  flagged: boolean;
  onChange: (value: { finalAnswer?: string; answer?: string }) => void;
  onInvalid: (message: string) => void;
  onSubmit: (local: "correct" | "incorrect") => void;
}) {
  return (
    <>
      <label>
        Final answer (
        {question.review.unitPolicy === "forbidden"
          ? "number only"
          : question.review.unitPolicy === "optional"
            ? "number, unit optional"
            : "one number and unit"}
        )
        <input
          value={finalAnswer}
          disabled={busy}
          maxLength={100}
          placeholder={
            question.review.expectedUnit
              ? `For example: 12 ${question.review.expectedUnit}`
              : "For example: 12"
          }
          onChange={(event) => onChange({ finalAnswer: event.target.value })}
        />
      </label>
      <label>
        Show your working
        <textarea
          value={working}
          disabled={busy}
          maxLength={8000}
          onChange={(event) => onChange({ answer: event.target.value })}
        />
      </label>
      <button
        disabled={busy || flagged || !finalAnswer.trim() || !working.trim()}
        onClick={() => {
          const checked = gradeNumericAnswer(finalAnswer, question.review);
          if (checked.outcome === "invalid") onInvalid(checked.message);
          else onSubmit(checked.outcome);
        }}
      >
        Check answer
      </button>
      {flagged && (
        <p>This flagged question cannot be submitted for a scored result.</p>
      )}
    </>
  );
}
