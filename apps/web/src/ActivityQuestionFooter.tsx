import type { LearnerActivityPack } from "../../../packages/contracts/activity-packs";

type Question = LearnerActivityPack["questions"][number];
export function ActivityQuestionFooter({
  question,
  busy,
  flag,
  onFlag,
  onSource,
}: {
  question: Question;
  busy: boolean;
  flag: "incorrect" | "ambiguous" | null;
  onFlag: (reason: "incorrect" | "ambiguous") => void;
  onSource: (source: Question["sources"][number]) => void;
}) {
  return (
    <>
      <div className="preview-actions">
        <button
          className="secondary"
          disabled={busy}
          onClick={() => onFlag("incorrect")}
        >
          Flag incorrect
        </button>
        <button
          className="secondary"
          disabled={busy}
          onClick={() => onFlag("ambiguous")}
        >
          Flag ambiguous
        </button>
      </div>
      {flag && (
        <p role="status">
          Flagged as {flag}. This question is excluded from future scoring.
        </p>
      )}
      <ul aria-label={`Sources for ${question.prompt}`}>
        {question.sources.map((source) => (
          <li key={source.id}>
            <button
              type="button"
              className="source-link"
              onClick={() => onSource(source)}
            >
              Open source section {source.location}: {source.text.slice(0, 80)}
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
