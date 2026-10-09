import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { activityAttemptResponseSchema } from "../packages/contracts/activity-attempts";
import { createActivityFixture } from "./activity-fixture";

describe("calculation attempts", () => {
  it("rechecks numbers on the Worker and keeps working separate", async () => {
    const fixture = await createActivityFixture();
    const calculation = fixture.pack.questions.find(
      (item) => item.type === "calculation",
    );
    if (!calculation || calculation.type !== "calculation")
      throw new Error("quantitative fixture did not produce a calculation");
    expect(calculation.review).toMatchObject({
      expectedValue: 12,
      expectedUnit: "m/s",
    });
    const attemptId = crypto.randomUUID();
    const input = {
      ...fixture.base(calculation.id, attemptId),
      interaction: "calculation_submit" as const,
      finalAnswer: "43.2 km/h",
      working: "I divided 120 metres by 10 seconds.",
    };
    const first = await fixture.call("/activity-attempts", input);
    expect(first.status).toBe(201);
    const saved = activityAttemptResponseSchema.parse(await first.json());
    expect(saved).toMatchObject({
      correctness: "correct",
      numericResult: { outcome: "correct" },
    });
    expect(saved.numericResult?.convertedValue).toBeCloseTo(12);
    expect(
      await (await fixture.call("/activity-attempts", input)).json(),
    ).toEqual(saved);
    expect(
      (
        await fixture.call("/activity-attempts", {
          ...input,
          finalAnswer: "12 km",
          attemptId: crypto.randomUUID(),
        })
      ).status,
    ).toBe(400);
    const grade = await fixture.call("/activity-rubric", {
      schemaVersion: 1,
      requestId: crypto.randomUUID(),
      attemptId,
    });
    expect(grade.status).toBe(201);
    expect(await grade.json()).toMatchObject({
      outcome: "uncertain",
      attemptId,
    });
    expect(
      await env.DB.prepare(
        "SELECT count(*) AS count FROM concept_progress WHERE user_id=? AND space_id=?",
      )
        .bind(fixture.owner.userId, fixture.owner.spaceId)
        .first("count"),
    ).toBe(0);
  });
});
