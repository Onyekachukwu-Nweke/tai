import { describe, expect, it } from "vitest";
import { selectSessionItems } from "../packages/domain/study-session";

const candidate = (
  questionId: string,
  minutes: number,
  label: string,
  conceptIds = [questionId],
) => ({
  questionId,
  conceptIds,
  estimatedMinutes: minutes,
  labels: [label],
  completed: false,
  flagged: false,
});

describe("study session selection", () => {
  it("fits the budget, prioritizes due review and adds same-concept practice", () => {
    const result = selectSessionItems(
      [
        candidate("new", 2, "Not checked"),
        candidate("due", 2, "Review due", ["plants"]),
        candidate("other", 2, "Needs practice"),
        candidate("related", 1, "Recall successful", ["plants"]),
      ],
      5,
      "learn",
    );
    expect(result.estimatedMinutes).toBe(5);
    expect(result.items.map((item) => item.questionId)).toEqual([
      "due",
      "related",
      "new",
    ]);
  });

  it("keeps targeted same-concept practice when an unrelated item would fill the budget", () => {
    const result = selectSessionItems(
      [
        candidate("new", 2, "Not checked"),
        candidate("due", 2, "Review due", ["focus"]),
        candidate("related", 2, "Recall successful", ["focus"]),
      ],
      5,
      "learn",
    );
    expect(result.items.map((item) => item.questionId)).toEqual([
      "due",
      "related",
    ]);
  });

  it("excludes completed and flagged questions and honors a concept override", () => {
    const completed = candidate("completed", 1, "Review due", ["focus"]);
    completed.completed = true;
    const flagged = candidate("flagged", 1, "Review due", ["focus"]);
    flagged.flagged = true;
    const result = selectSessionItems(
      [
        completed,
        flagged,
        candidate("selected", 3, "Not checked", ["focus"]),
        candidate("outside", 1, "Review due"),
      ],
      5,
      "practise",
      "focus",
    );
    expect(result.items.map((item) => item.questionId)).toEqual(["selected"]);
  });
});
