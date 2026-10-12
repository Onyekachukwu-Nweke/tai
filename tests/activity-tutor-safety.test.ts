import { describe, expect, it } from "vitest";
import { assertTutorAnswerConcealed } from "../apps/worker/src/activity-tutor-safety";
import type { ActivityQuestion } from "../packages/contracts/activity-packs";

const base = {
  id: "10000000-0000-4000-8000-000000000001",
  conceptIds: ["20000000-0000-4000-8000-000000000002"],
  prompt: "Question",
  estimatedMinutes: 2,
  sources: [{ id: "s", location: 1, start: 0, end: 4, text: "fact" }],
};

describe("activity tutor answer concealment", () => {
  it("rejects direct and minimally formatted recall and MCQ answer leakage", () => {
    const recall: ActivityQuestion = {
      ...base,
      type: "recall",
      supportedAnswer: "Photo-synthesis stores energy.",
    };
    expect(() =>
      assertTutorAnswerConcealed(
        "Remember: PHOTOSYNTHESIS stores energy!",
        recall,
      ),
    ).toThrow("revealed protected answer material");

    const correctId = "30000000-0000-4000-8000-000000000003";
    const mcq: ActivityQuestion = {
      ...base,
      type: "mcq",
      options: [
        { id: correctId, text: "Stored chemical energy" },
        {
          id: "40000000-0000-4000-8000-000000000004",
          text: "Sound energy",
        },
        {
          id: "50000000-0000-4000-8000-000000000005",
          text: "No energy",
        },
      ],
      correctOptionId: correctId,
      answerExplanation: "Light becomes stored chemical energy.",
    };
    expect(() =>
      assertTutorAnswerConcealed("Choose stored-chemical-energy.", mcq),
    ).toThrow("revealed protected answer material");
  });

  it("rejects a calculation result but permits a directional clue", () => {
    const calculation: ActivityQuestion = {
      ...base,
      type: "calculation",
      notation: "v=d/t",
      givens: ["d=120m", "t=10s"],
      numericKey: {
        expectedValue: 12,
        absoluteTolerance: 0.1,
        relativeTolerance: 0,
        unitPolicy: "required",
        expectedUnit: "m/s",
        allowedUnits: ["m/s"],
      },
      workedExplanation: "Divide distance by elapsed time.",
      rubric: ["Uses the speed relationship"],
    };
    expect(() =>
      assertTutorAnswerConcealed("The result is 12 m/s.", calculation),
    ).toThrow("revealed protected answer material");
    expect(() =>
      assertTutorAnswerConcealed(
        "Identify the relationship between distance and time.",
        calculation,
      ),
    ).not.toThrow();
  });
});
