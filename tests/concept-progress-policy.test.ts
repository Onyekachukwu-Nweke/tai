import { describe, expect, it } from "vitest";
import {
  evidenceLabel,
  projectEvidence,
  type ProgressEvidence,
} from "../packages/domain/concept-progress";

const evidence = (...correctness: ProgressEvidence["correctness"][]) =>
  correctness.map((value, index) => ({
    correctness: value,
    createdAt: `2026-01-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`,
  }));

describe("concept review policy", () => {
  it("uses 1, 3, 7 and capped 14 day intervals", () => {
    expect(projectEvidence(evidence("correct"))).toMatchObject({
      reviewStep: 1,
      nextReviewAt: "2026-01-02T00:00:00.000Z",
    });
    expect(projectEvidence(evidence("correct", "correct"))).toMatchObject({
      reviewStep: 2,
      nextReviewAt: "2026-01-05T00:00:00.000Z",
    });
    expect(
      projectEvidence(evidence("correct", "correct", "correct")),
    ).toMatchObject({
      reviewStep: 3,
      nextReviewAt: "2026-01-10T00:00:00.000Z",
    });
    expect(
      projectEvidence(
        evidence("correct", "correct", "correct", "correct", "correct"),
      ),
    ).toMatchObject({
      reviewStep: 4,
      nextReviewAt: "2026-01-19T00:00:00.000Z",
    });
  });

  it("resets after incorrect and changes label at the exact due instant", () => {
    const projected = projectEvidence(evidence("correct", "incorrect"));
    expect(projected).toMatchObject({
      reviewStep: 0,
      nextReviewAt: "2026-01-03T00:00:00.000Z",
    });
    const correct = projectEvidence(evidence("correct"));
    expect(evidenceLabel(correct, new Date("2026-01-01T23:59:59.999Z"))).toBe(
      "Recall successful",
    );
    expect(evidenceLabel(correct, new Date("2026-01-02T00:00:00.000Z"))).toBe(
      "Review due",
    );
  });
});
