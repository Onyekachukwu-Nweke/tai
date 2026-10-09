import { beforeEach, describe, expect, it } from "vitest";
import { studySessionSchema } from "../packages/contracts/study-sessions";
import { createActivityFixture } from "./activity-fixture";

let fixture: Awaited<ReturnType<typeof createActivityFixture>>;
beforeEach(async () => {
  fixture = await createActivityFixture();
});

describe("study sessions API", () => {
  it("persists a budgeted session and completes it with acknowledged attempts", async () => {
    const sessionId = crypto.randomUUID();
    const request = {
      schemaVersion: 1,
      sessionId,
      budgetMinutes: 5,
      mode: "learn" as const,
      replaceActive: false,
    };
    const response = await fixture.call("/study-session", request);
    expect(response.status).toBe(201);
    let session = studySessionSchema.parse(await response.json());
    expect(session.status).toBe("active");
    expect(session.estimatedMinutes).toBeLessThanOrEqual(5);
    expect(session.items).toHaveLength(2);
    const retry = studySessionSchema.parse(
      await (await fixture.call("/study-session", request)).json(),
    );
    expect(retry.sessionId).toBe(sessionId);
    expect(retry.items).toEqual(session.items);
    expect(
      (
        await fixture.call("/study-session", {
          ...request,
          budgetMinutes: 15,
        })
      ).status,
    ).toBe(409);
    let finalInput: unknown;
    for (const item of session.items) {
      const question = fixture.pack.questions.find(
        (entry) => entry.id === item.questionId,
      )!;
      const common = {
        ...fixture.base(question.id),
        studySessionId: session.sessionId!,
      };
      const input =
        question.type === "recall"
          ? {
              ...common,
              interaction: "recall_self_check" as const,
              answer: "Synthetic answer",
              selfAssessment: "partial" as const,
            }
          : question.type === "explain"
            ? {
                ...common,
                interaction: "explain_submit" as const,
                answer: "Synthetic answer",
              }
            : {
                ...common,
                interaction: "mcq_submit" as const,
                selectedOptionId: question.review.correctOptionId,
              };
      finalInput = input;
      expect((await fixture.call("/activity-attempts", input)).status).toBe(
        201,
      );
    }
    session = studySessionSchema.parse(
      await (await fixture.call("/study-session")).json(),
    );
    expect(session.status).toBe("completed");
    expect(session.items.every((item) => item.completedAt)).toBe(true);
    expect((await fixture.call("/activity-attempts", finalInput)).status).toBe(
      201,
    );
  });

  it("requires explicit replacement and rejects questions outside the active session", async () => {
    const create = () =>
      fixture.call("/study-session", {
        schemaVersion: 1,
        sessionId: crypto.randomUUID(),
        budgetMinutes: 5,
        mode: "review",
        replaceActive: false,
      });
    const first = studySessionSchema.parse(await (await create()).json());
    expect((await create()).status).toBe(409);
    const outside = fixture.pack.questions.find(
      (question) =>
        !first.items.some((item) => item.questionId === question.id),
    )!;
    expect(
      (
        await fixture.call("/activity-attempts", {
          ...fixture.base(outside.id),
          studySessionId: first.sessionId!,
          interaction: "skip",
        })
      ).status,
    ).toBe(409);
    const replacementResponse = await fixture.call("/study-session", {
      schemaVersion: 1,
      sessionId: crypto.randomUUID(),
      budgetMinutes: 15,
      mode: "practise",
      replaceActive: true,
    });
    expect(replacementResponse.status).toBe(201);
    const replacement = studySessionSchema.parse(
      await replacementResponse.json(),
    );
    expect(replacement.sessionId).not.toBe(first.sessionId);
    const replacedRetry = await fixture.call("/study-session", {
      schemaVersion: 1,
      sessionId: first.sessionId!,
      budgetMinutes: 5,
      mode: "review",
      replaceActive: false,
    });
    expect(replacedRetry.status).toBe(409);
    expect(await replacedRetry.json()).toEqual({
      error: "This session was replaced by a newer session.",
    });
    await fixture.call("/activity-pack/generate", {
      schemaVersion: 1,
      requestId: crypto.randomUUID(),
    });
    const afterPack = studySessionSchema.parse(
      await (await fixture.call("/study-session")).json(),
    );
    expect(afterPack.status).toBe("empty");
  });
});
