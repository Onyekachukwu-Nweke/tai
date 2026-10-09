import { beforeEach, describe, expect, it } from "vitest";
import { env } from "cloudflare:test";
import { conceptProgressResponseSchema } from "../packages/contracts/concept-progress";
import { createActivityFixture } from "./activity-fixture";

let fixture: Awaited<ReturnType<typeof createActivityFixture>>;
beforeEach(async () => {
  fixture = await createActivityFixture();
});

const progress = async () =>
  conceptProgressResponseSchema.parse(
    await (await fixture.call("/concept-progress")).json(),
  );

describe("concept progress API", () => {
  it("projects only deterministic MCQ evidence across due boundaries", async () => {
    const question = fixture.pack.questions.find(
      (item) => item.type === "mcq",
    )!;
    if (question.type !== "mcq") throw new Error("fixture mismatch");
    expect(
      (await progress()).concepts.every((item) => item.label === "Not checked"),
    ).toBe(true);
    for (const interaction of ["reveal", "skip"] as const)
      expect(
        (
          await fixture.call("/activity-attempts", {
            ...fixture.base(question.id),
            interaction,
          })
        ).status,
      ).toBe(201);
    await fixture.call("/activity-attempts", {
      ...fixture.base(question.id),
      interaction: "mcq_submit",
      selectedOptionId: question.review.correctOptionId,
    });
    const affected = (await progress()).concepts.filter((item) =>
      question.conceptIds.includes(item.conceptId),
    );
    expect(affected).toHaveLength(question.conceptIds.length);
    expect(affected.every((item) => item.reviewStep === 1)).toBe(true);
    expect(affected[0]).toMatchObject({
      label: "Recall successful",
      nextReviewAt: "2026-01-02T00:00:00.000Z",
    });
    fixture.setNow("2026-01-02T00:00:00.000Z");
    expect(
      (await progress()).concepts.find(
        (item) => item.conceptId === affected[0]!.conceptId,
      )?.label,
    ).toBe("Review due");
  });

  it("serializes concurrent checks, resets incorrect, and retroactively excludes flags", async () => {
    const question = fixture.pack.questions.find(
      (item) => item.type === "mcq",
    )!;
    if (question.type !== "mcq") throw new Error("fixture mismatch");
    const submit = (selectedOptionId = question.review.correctOptionId) =>
      fixture.call("/activity-attempts", {
        ...fixture.base(question.id),
        interaction: "mcq_submit",
        selectedOptionId,
      });
    expect(
      (await Promise.all([submit(), submit()])).map((item) => item.status),
    ).toEqual([201, 201]);
    expect(
      (await progress()).concepts
        .filter((item) => question.conceptIds.includes(item.conceptId))
        .every((item) => item.reviewStep === 2),
    ).toBe(true);
    fixture.setNow("2026-01-03T00:00:00.000Z");
    await submit(
      question.options.find(
        (item) => item.id !== question.review.correctOptionId,
      )!.id,
    );
    expect(
      (await progress()).concepts.find((item) =>
        question.conceptIds.includes(item.conceptId),
      ),
    ).toMatchObject({
      reviewStep: 0,
      label: "Needs practice",
      nextReviewAt: "2026-01-04T00:00:00.000Z",
    });
    expect(
      (
        await fixture.call("/activity-flags", {
          schemaVersion: 1,
          packId: fixture.pack.packId,
          questionId: question.id,
          reason: "ambiguous",
        })
      ).status,
    ).toBe(201);
    expect(
      (await progress()).concepts
        .filter((item) => question.conceptIds.includes(item.conceptId))
        .every((item) => item.label === "Not checked"),
    ).toBe(true);
  });

  it("requires authentication and removes projections with their study space", async () => {
    expect(
      (await fixture.call("/concept-progress", undefined, "")).status,
    ).toBe(401);
    const question = fixture.pack.questions.find(
      (item) => item.type === "mcq",
    )!;
    if (question.type !== "mcq") throw new Error("fixture mismatch");
    await fixture.call("/activity-attempts", {
      ...fixture.base(question.id),
      interaction: "mcq_submit",
      selectedOptionId: question.review.correctOptionId,
    });
    await env.DB.prepare("DELETE FROM study_spaces WHERE user_id=? AND id=?")
      .bind(fixture.owner.userId, fixture.owner.spaceId)
      .run();
    expect(
      await env.DB.prepare(
        "SELECT count(*) AS count FROM concept_progress WHERE user_id=?",
      )
        .bind(fixture.owner.userId)
        .first("count"),
    ).toBe(0);
  });

  it("rolls back the attempt when its projection cannot be saved", async () => {
    const question = fixture.pack.questions.find(
      (item) => item.type === "mcq",
    )!;
    if (question.type !== "mcq") throw new Error("fixture mismatch");
    await env.DB.prepare(
      "CREATE TRIGGER reject_progress BEFORE INSERT ON concept_progress BEGIN SELECT RAISE(ABORT,'synthetic projection failure'); END",
    ).run();
    const attemptId = crypto.randomUUID();
    expect(
      (
        await fixture.call("/activity-attempts", {
          ...fixture.base(question.id, attemptId),
          interaction: "mcq_submit",
          selectedOptionId: question.review.correctOptionId,
        })
      ).status,
    ).toBe(503);
    expect(
      await env.DB.prepare(
        "SELECT count(*) AS count FROM activity_attempts WHERE id=?",
      )
        .bind(attemptId)
        .first("count"),
    ).toBe(0);
    await env.DB.prepare("DROP TRIGGER reject_progress").run();
  });

  it("retains stable-concept evidence across a new pack and deselection", async () => {
    const question = fixture.pack.questions.find(
      (item) => item.type === "mcq",
    )!;
    if (question.type !== "mcq") throw new Error("fixture mismatch");
    await fixture.call("/activity-attempts", {
      ...fixture.base(question.id),
      interaction: "mcq_submit",
      selectedOptionId: question.review.correctOptionId,
    });
    await fixture.call("/activity-pack/generate", {
      schemaVersion: 1,
      requestId: crypto.randomUUID(),
    });
    await env.DB.prepare(
      "UPDATE concepts SET selected=0 WHERE user_id=? AND space_id=? AND id=?",
    )
      .bind(fixture.owner.userId, fixture.owner.spaceId, question.conceptIds[0])
      .run();
    expect(
      (await progress()).concepts.find(
        (item) => item.conceptId === question.conceptIds[0],
      ),
    ).toMatchObject({ reviewStep: 1, label: "Recall successful" });
  });
});
