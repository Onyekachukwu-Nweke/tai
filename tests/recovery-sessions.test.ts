import { env } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import {
  recoveryOfferSchema,
  studySessionSchema,
} from "../packages/contracts/study-sessions";
import { createActivityFixture } from "./activity-fixture";
import { learner } from "./material-fixtures";

let fixture: Awaited<ReturnType<typeof createActivityFixture>>;
beforeEach(async () => {
  env.RETURN_GAP_DAYS = "3";
  fixture = await createActivityFixture();
});

const standard = () =>
  fixture.call("/study-session", {
    schemaVersion: 1,
    sessionId: crypto.randomUUID(),
    budgetMinutes: 5,
    mode: "learn",
    replaceActive: false,
  });

describe("return recovery API", () => {
  it("does not treat pack generation as learning activity", async () => {
    fixture.setNow("2026-01-20T00:00:00.000Z");
    const offer = recoveryOfferSchema.parse(
      await (await fixture.call("/recovery-offer")).json(),
    );
    expect(offer).toMatchObject({
      offered: false,
      inactiveSince: null,
      canResume: false,
      thresholdDays: 3,
      budgetMinutes: 10,
    });
  });

  it("offers at the exact threshold and resumes without a write", async () => {
    const session = studySessionSchema.parse(await (await standard()).json());
    fixture.setNow("2026-01-03T23:59:59.999Z");
    expect(
      recoveryOfferSchema.parse(
        await (await fixture.call("/recovery-offer")).json(),
      ).offered,
    ).toBe(false);
    fixture.setNow("2026-01-04T00:00:00.000Z");
    const first = recoveryOfferSchema.parse(
      await (await fixture.call("/recovery-offer")).json(),
    );
    const second = recoveryOfferSchema.parse(
      await (await fixture.call("/recovery-offer")).json(),
    );
    expect(first).toMatchObject({ offered: true, canResume: true });
    expect(first.activeSession?.sessionId).toBe(session.sessionId);
    expect(second).toEqual(first);
  });

  it("uses alternate configuration and builds one bounded five-day review", async () => {
    env.RETURN_GAP_DAYS = "5";
    const standardSession = studySessionSchema.parse(
      await (await standard()).json(),
    );
    fixture.setNow("2026-01-06T00:00:00.000Z");
    const offer = recoveryOfferSchema.parse(
      await (await fixture.call("/recovery-offer")).json(),
    );
    expect(offer).toMatchObject({ offered: true, thresholdDays: 5 });
    const id = crypto.randomUUID();
    const input = { schemaVersion: 1, sessionId: id };
    const recovery = studySessionSchema.parse(
      await (await fixture.call("/recovery-session", input)).json(),
    );
    expect(recovery).toMatchObject({
      kind: "recovery",
      budgetMinutes: 10,
      mode: "review",
    });
    expect(recovery.items.length).toBeLessThanOrEqual(3);
    expect(recovery.estimatedMinutes).toBeLessThanOrEqual(10);
    const retry = studySessionSchema.parse(
      await (await fixture.call("/recovery-session", input)).json(),
    );
    expect(retry).toEqual(recovery);
    expect(
      (
        await fixture.call("/recovery-session", {
          schemaVersion: 1,
          sessionId: standardSession.sessionId,
        })
      ).status,
    ).toBe(409);
  });

  it("reports invalid threshold configuration explicitly", async () => {
    env.RETURN_GAP_DAYS = "0";
    const response = await fixture.call("/recovery-offer");
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: "Return gap configuration is invalid.",
    });
  });

  it("uses the latest attempt and allows its due question to reappear", async () => {
    const question = fixture.pack.questions.find(
      (entry) => entry.type === "mcq",
    )!;
    fixture.setNow("2026-01-02T00:00:00.000Z");
    expect(
      (
        await fixture.call("/activity-attempts", {
          ...fixture.base(question.id),
          interaction: "mcq_submit",
          selectedOptionId: question.review.correctOptionId,
        })
      ).status,
    ).toBe(201);
    fixture.setNow("2026-01-04T23:59:59.999Z");
    expect(
      recoveryOfferSchema.parse(
        await (await fixture.call("/recovery-offer")).json(),
      ).offered,
    ).toBe(false);
    fixture.setNow("2026-01-05T00:00:00.000Z");
    const recovery = studySessionSchema.parse(
      await (
        await fixture.call("/recovery-session", {
          schemaVersion: 1,
          sessionId: crypto.randomUUID(),
        })
      ).json(),
    );
    expect(recovery.items.map((item) => item.questionId)).toContain(
      question.id,
    );
  });

  it("permits an honest completed recovery when all pack items are flagged", async () => {
    await standard();
    for (const question of fixture.pack.questions) {
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
    }
    fixture.setNow("2026-01-06T00:00:00.000Z");
    const recovery = studySessionSchema.parse(
      await (
        await fixture.call("/recovery-session", {
          schemaVersion: 1,
          sessionId: crypto.randomUUID(),
        })
      ).json(),
    );
    expect(recovery).toMatchObject({
      kind: "recovery",
      status: "completed",
      estimatedMinutes: 0,
      items: [],
    });
  });

  it("does not expose or replace another learner's sessions", async () => {
    await standard();
    fixture.setNow("2026-01-06T00:00:00.000Z");
    const outsider = await learner(`outsider-${crypto.randomUUID()}`);
    const offer = recoveryOfferSchema.parse(
      await (
        await fixture.call("/recovery-offer", undefined, outsider.cookie)
      ).json(),
    );
    expect(offer).toMatchObject({
      offered: false,
      inactiveSince: null,
      canResume: false,
      activeSession: null,
    });
    expect(
      (
        await fixture.call(
          "/recovery-session",
          { schemaVersion: 1, sessionId: crypto.randomUUID() },
          outsider.cookie,
        )
      ).status,
    ).toBe(409);
    expect(
      studySessionSchema.parse(
        await (await fixture.call("/study-session")).json(),
      ).status,
    ).toBe("active");
  });
});
