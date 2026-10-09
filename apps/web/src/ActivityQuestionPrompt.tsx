import type { LearnerActivityPack } from "../../../packages/contracts/activity-packs";

type Question = LearnerActivityPack["questions"][number];

const labels: Record<Question["type"], string> = {
  recall: "Recall",
  mcq: "Multiple choice",
  explain: "Explain",
  scenario: "Scenario",
};

export function ActivityQuestionPrompt({ question }: { question: Question }) {
  return (
    <>
      <p>
        <strong>{labels[question.type]}</strong> · about{" "}
        {question.estimatedMinutes} min
      </p>
      <p>{question.prompt}</p>
      {question.type === "scenario" && (
        <div className="notice">
          <p>
            <strong>Assumptions for this scenario:</strong>
          </p>
          <ul>
            {question.assumptions.map((assumption) => (
              <li key={assumption}>{assumption}</li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
