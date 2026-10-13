import { useState } from "react";
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
  const [reason, setReason] = useState<"incorrect" | "ambiguous">("incorrect");
  return (
    <>
      <div className="flag-control">
        <label>
          Flag reason
          <select
            value={reason}
            disabled={busy}
            onChange={(event) => setReason(event.target.value as typeof reason)}
          >
            <option value="incorrect">Incorrect</option>
            <option value="ambiguous">Ambiguous</option>
          </select>
        </label>
        <button
          className="meta-button flag-btn"
          disabled={busy}
          onClick={() => onFlag(reason)}
        >
          ⚑ Flag
        </button>
      </div>
      {flag && (
        <p role="status">
          Flagged as {flag}. This question is excluded from future scoring.
        </p>
      )}
      <ul
        className="source-chips"
        aria-label={`Sources for ${question.prompt}`}
      >
        {question.sources.map((source) => (
          <li key={source.id}>
            <button
              type="button"
              className="source-chip"
              aria-label={`Open source page ${source.location}`}
              onClick={() => onSource(source)}
            >
              Page {source.location}
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
