import { describe, expect, it } from "vitest";
import {
  selectRecoveryItems,
  type SessionCandidate,
} from "../packages/domain/study-session";

const item = (
  questionId: string,
  label: string,
  estimatedMinutes = 3,
  conceptIds = [questionId],
): SessionCandidate => ({
  questionId,
  conceptIds,
  estimatedMinutes,
  labels: [label],
  completed: true,
  flagged: false,
});

describe("recovery session selection", () => {
  it("orders due, same-concept follow-up, needs practice, then new", () => {
    const result = selectRecoveryItems([
      item("new", "Not checked"),
      item("due", "Review due", 3, ["focus"]),
      item("needs", "Needs practice"),
      item("related", "Not checked", 2, ["focus"]),
    ]);
    expect(result.items.map((entry) => entry.questionId)).toEqual([
      "due",
      "related",
      "needs",
    ]);
    expect(result.estimatedMinutes).toBe(8);
  });

  it("allows attempted questions but excludes flagged and successful items", () => {
    const flagged = item("flagged", "Review due");
    flagged.flagged = true;
    const result = selectRecoveryItems([
      item("attempted", "Review due"),
      flagged,
      item("successful", "Recall successful"),
      item("too-long", "Needs practice", 10),
      item("new", "Not checked", 4),
    ]);
    expect(result.items.map((entry) => entry.questionId)).toEqual([
      "attempted",
      "new",
    ]);
    expect(result.items).toHaveLength(2);
    expect(result.estimatedMinutes).toBeLessThanOrEqual(10);
  });

  it("caps recovery at three items regardless of gap length", () => {
    const result = selectRecoveryItems(
      ["a", "b", "c", "d", "e"].map((id) => item(id, "Review due", 1)),
    );
    expect(result.items).toHaveLength(3);
  });
});
