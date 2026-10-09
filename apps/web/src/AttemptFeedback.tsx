import type { ActivityAttemptResponse } from "../../../packages/contracts/activity-attempts";
import type { LearnerActivityPack } from "../../../packages/contracts/activity-packs";

type Question = LearnerActivityPack["questions"][number];

export function AttemptFeedback({
  result,
  question,
  localCorrectness,
}: {
  result: ActivityAttemptResponse;
  question: Question;
  localCorrectness: "correct" | "incorrect" | null;
}) {
  return (
    <div className="notice">
      <p>
        <strong>
          {result.supportedByMaterial
            ? "Supported by your material"
            : question.type === "calculation"
              ? "Calculation saved"
              : question.type === "scenario"
                ? "Scenario response saved"
                : "Explanation saved"}
          :
        </strong>{" "}
        {result.feedback}
      </p>
      {result.answer && <p>{result.answer}</p>}
      {question.type === "mcq" && result.correctOptionId && (
        <p>{question.review.answerExplanation}</p>
      )}
      {result.numericResult && (
        <>
          <p>
            Numeric result: {result.numericResult.outcome}. Submitted{" "}
            {result.numericResult.submittedValue}{" "}
            {result.numericResult.submittedUnit}. The Worker confirmed the
            browser check.
          </p>
          {question.type === "calculation" && (
            <p>
              Accepted key: {question.review.expectedValue}{" "}
              {question.review.expectedUnit ?? "(unitless)"}; tolerance max(
              {question.review.absoluteTolerance}, relative{" "}
              {question.review.relativeTolerance}).
            </p>
          )}
        </>
      )}
      <p>
        {result.correctness
          ? `Result: ${result.correctness}.`
          : "No scored correctness result."}{" "}
        Hint used: {result.hintUsed ? "yes" : "no"}. Alternate explanation used:{" "}
        {result.alternateExplanationUsed ? "yes" : "no"}. Confidence:{" "}
        {result.confidence ?? "not set"}.
      </p>
      {result.correctness && localCorrectness === result.correctness && (
        <p>The instant browser check was confirmed by the server.</p>
      )}
    </div>
  );
}
