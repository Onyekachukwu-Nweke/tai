import { describe, expect, it } from "vitest";
import { createActivityFixture } from "./activity-fixture";

describe("flagged activity attempt policy", () => {
  it("rejects new scored submissions but permits recall help interactions", async () => {
    const fixture = await createActivityFixture();
    const scored = fixture.pack.questions.filter((question) =>
      ["mcq", "explain", "scenario", "calculation"].includes(question.type),
    );
    for (const question of scored) {
      await fixture.call("/activity-flags", {
        schemaVersion: 1,
        packId: fixture.pack.packId,
        questionId: question.id,
        reason: "ambiguous",
      });
      const input =
        question.type === "mcq"
          ? {
              ...fixture.base(question.id),
              interaction: "mcq_submit" as const,
              selectedOptionId: question.options[0]!.id,
            }
          : question.type === "calculation"
            ? {
                ...fixture.base(question.id),
                interaction: "calculation_submit" as const,
                finalAnswer: "12 m/s",
                working: "120 / 10",
              }
            : {
                ...fixture.base(question.id),
                interaction: "explain_submit" as const,
                answer: "A source-grounded response",
              };
      expect((await fixture.call("/activity-attempts", input)).status).toBe(
        409,
      );
    }

    const recall = fixture.pack.questions.find(
      (question) => question.type === "recall",
    )!;
    await fixture.call("/activity-flags", {
      schemaVersion: 1,
      packId: fixture.pack.packId,
      questionId: recall.id,
      reason: "incorrect",
    });
    for (const interaction of [
      "recall_self_check",
      "reveal",
      "skip",
    ] as const) {
      const input =
        interaction === "recall_self_check"
          ? {
              ...fixture.base(recall.id),
              interaction,
              answer: "My retained draft",
              selfAssessment: "partial" as const,
            }
          : { ...fixture.base(recall.id), interaction };
      expect((await fixture.call("/activity-attempts", input)).status).toBe(
        201,
      );
    }
  });

  it("replays an immutable saved result after the question is flagged", async () => {
    const fixture = await createActivityFixture();
    const question = fixture.pack.questions.find(
      (item) => item.type === "explain",
    )!;
    const input = {
      ...fixture.base(question.id),
      interaction: "explain_submit" as const,
      answer: "Saved before the flag",
    };
    expect((await fixture.call("/activity-attempts", input)).status).toBe(201);
    await fixture.call("/activity-flags", {
      schemaVersion: 1,
      packId: fixture.pack.packId,
      questionId: question.id,
      reason: "ambiguous",
    });
    expect((await fixture.call("/activity-attempts", input)).status).toBe(201);
  });
});
