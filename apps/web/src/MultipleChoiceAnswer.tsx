import type { LearnerActivityPack } from "../../../packages/contracts/activity-packs";

type Question = Extract<
  LearnerActivityPack["questions"][number],
  { type: "mcq" }
>;

export function MultipleChoiceAnswer({
  question,
  selected,
  busy,
  flagged,
  onSelect,
  onSubmit,
}: {
  question: Question;
  selected: string;
  busy: boolean;
  flagged: boolean;
  onSelect: (id: string) => void;
  onSubmit: () => void;
}) {
  return (
    <>
      <fieldset disabled={busy}>
        <legend>Choose one answer</legend>
        {question.options.map((option) => (
          <label key={option.id}>
            <input
              type="radio"
              name={`option-${question.id}`}
              checked={selected === option.id}
              onChange={() => onSelect(option.id)}
            />
            {option.text}
          </label>
        ))}
      </fieldset>
      <button disabled={busy || flagged || !selected} onClick={onSubmit}>
        Check answer
      </button>
      {flagged && (
        <p>
          This flagged question cannot be submitted for a scored result because
          it is excluded from future scoring.
        </p>
      )}
    </>
  );
}
