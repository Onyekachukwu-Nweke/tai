import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import type { ActivityRubricProvider } from "../packages/adapters/fake-activity-rubric";
import {
  activityRubricResponseSchema,
  validateRubricResponse,
  type RubricContext,
} from "../packages/contracts/activity-rubric";
import { createApp } from "../apps/worker/src/index";
import { createActivityFixture } from "./activity-fixture";
import { learner } from "./material-fixtures";

class InspectingProvider implements ActivityRubricProvider {
  calls: RubricContext[] = [];
  fail = false;
  mutate = false;
  async grade(context: RubricContext) {
    this.calls.push(context);
    if (this.fail) throw new Error("private provider detail");
    return {
      schemaVersion: 1,
      requestId: context.requestId,
      attemptId: context.attemptId,
      packId: context.packId,
      questionId: context.questionId,
      outcome: "partial",
      feedback: "The response addresses part of the cited point.",
      elements: context.rubric.map((criterion) => ({
        criterion,
        outcome: "partial",
        feedback: "Add the remaining source-supported detail.",
      })),
      sources: [
        {
          ...context.sources[0]!,
          ...(this.mutate ? { text: "invented" } : {}),
        },
      ],
    };
  }
}

describe("activity rubric contracts", () => {
  it("rejects changed rubric elements, citations and bounds", () => {
    const context: RubricContext = {
      requestId: "10000000-0000-4000-8000-000000000001",
      attemptId: "10000000-0000-4000-8000-000000000002",
      packId: "10000000-0000-4000-8000-000000000003",
      questionId: "10000000-0000-4000-8000-000000000004",
      prompt: "Explain it",
      answer: "My answer",
      rubric: ["Use the cited fact"],
      sources: [{ id: "s", location: 1, start: 0, end: 4, text: "fact" }],
    };
    const valid = {
      schemaVersion: 1,
      requestId: context.requestId,
      attemptId: context.attemptId,
      packId: context.packId,
      questionId: context.questionId,
      outcome: "supported",
      feedback: "Supported by the cited fact.",
      elements: [
        {
          criterion: context.rubric[0],
          outcome: "supported",
          feedback: "The criterion is present.",
        },
      ],
      sources: context.sources,
    };
    expect(() => validateRubricResponse(valid, context)).not.toThrow();
    expect(() =>
      validateRubricResponse(
        {
          ...valid,
          elements: [{ ...valid.elements[0], criterion: "changed" }],
        },
        context,
      ),
    ).toThrow();
    expect(() =>
      validateRubricResponse(
        { ...valid, sources: [{ ...context.sources[0], text: "fake" }] },
        context,
      ),
    ).toThrow();
    expect(
      activityRubricResponseSchema.safeParse({
        ...valid,
        feedback: "x".repeat(1601),
      }).success,
    ).toBe(false);
  });
});

describe("activity rubric routes", () => {
  it("builds private context server-side, persists one result and restores it", async () => {
    const fixture = await createActivityFixture();
    const question = fixture.pack.questions.find(
      (item) => item.type === "scenario",
    )!;
    const attemptId = crypto.randomUUID();
    expect(
      (
        await fixture.call("/activity-attempts", {
          ...fixture.base(question.id, attemptId),
          interaction: "explain_submit",
          answer: "A learner explanation",
        })
      ).status,
    ).toBe(201);
    const provider = new InspectingProvider();
    const app = createApp(undefined, undefined, undefined, undefined, provider);
    const call = (body?: unknown, cookie = fixture.owner.cookie) =>
      app.request(
        `http://localhost:8787/api/study-spaces/${fixture.owner.spaceId}/activity-rubric${body ? "" : `?packId=${fixture.pack.packId}`}`,
        {
          method: body ? "POST" : "GET",
          body: body ? JSON.stringify(body) : undefined,
          headers: {
            cookie,
            origin: env.APP_ORIGIN,
            "content-type": "application/json",
          },
        },
        env,
      );
    const input = {
      schemaVersion: 1,
      requestId: crypto.randomUUID(),
      attemptId,
    };
    expect((await call(input)).status).toBe(201);
    expect(provider.calls[0]).toMatchObject({
      answer: "A learner explanation",
    });
    expect(JSON.stringify(provider.calls[0])).not.toMatch(/userId|assumptions/);
    expect((await call(input)).status).toBe(201);
    expect(provider.calls).toHaveLength(1);
    expect(
      (await call({ ...input, attemptId: crypto.randomUUID() })).status,
    ).toBe(409);
    const state = (await (await call()).json()) as { grades: unknown[] };
    expect(state.grades).toHaveLength(1);
    expect(
      await env.DB.prepare(
        "SELECT count(*) AS count FROM concept_progress WHERE user_id=? AND space_id=?",
      )
        .bind(fixture.owner.userId, fixture.owner.spaceId)
        .first("count"),
    ).toBe(0);
    const other = await learner("rubric-other");
    expect(
      (await call({ ...input, requestId: crypto.randomUUID() }, other.cookie))
        .status,
    ).toBe(404);
  });

  it("requires explicit retry after invalid output and rejects flagged questions", async () => {
    const fixture = await createActivityFixture();
    const question = fixture.pack.questions.find(
      (item) => item.type === "explain",
    )!;
    const attemptId = crypto.randomUUID();
    await fixture.call("/activity-attempts", {
      ...fixture.base(question.id, attemptId),
      interaction: "explain_submit",
      answer: "Saved first",
    });
    const provider = new InspectingProvider();
    provider.mutate = true;
    const app = createApp(undefined, undefined, undefined, undefined, provider);
    const post = (requestId: string) =>
      app.request(
        `http://localhost:8787/api/study-spaces/${fixture.owner.spaceId}/activity-rubric`,
        {
          method: "POST",
          body: JSON.stringify({ schemaVersion: 1, requestId, attemptId }),
          headers: {
            cookie: fixture.owner.cookie,
            origin: env.APP_ORIGIN,
            "content-type": "application/json",
          },
        },
        env,
      );
    const failedId = crypto.randomUUID();
    expect((await post(failedId)).status).toBe(503);
    provider.mutate = false;
    expect((await post(failedId)).status).toBe(409);
    await fixture.call("/activity-flags", {
      schemaVersion: 1,
      packId: fixture.pack.packId,
      questionId: question.id,
      reason: "ambiguous",
    });
    expect((await post(crypto.randomUUID())).status).toBe(409);
  });

  it("rejects stale revisions and deletion removes grading records", async () => {
    const fixture = await createActivityFixture();
    const question = fixture.pack.questions.find(
      (item) => item.type === "explain",
    )!;
    const attemptId = crypto.randomUUID();
    await fixture.call("/activity-attempts", {
      ...fixture.base(question.id, attemptId),
      interaction: "explain_submit",
      answer: "Saved explanation",
    });
    const app = createApp();
    const post = () =>
      app.request(
        `http://localhost:8787/api/study-spaces/${fixture.owner.spaceId}/activity-rubric`,
        {
          method: "POST",
          body: JSON.stringify({
            schemaVersion: 1,
            requestId: crypto.randomUUID(),
            attemptId,
          }),
          headers: {
            cookie: fixture.owner.cookie,
            origin: env.APP_ORIGIN,
            "content-type": "application/json",
          },
        },
        env,
      );
    await env.DB.prepare(
      "UPDATE activity_pack_requests SET selection_key='stale' WHERE user_id=? AND space_id=?",
    )
      .bind(fixture.owner.userId, fixture.owner.spaceId)
      .run();
    expect((await post()).status).toBe(404);
    await env.DB.prepare("DELETE FROM study_spaces WHERE user_id=? AND id=?")
      .bind(fixture.owner.userId, fixture.owner.spaceId)
      .run();
    expect((await post()).status).toBe(404);
    expect(
      await env.DB.prepare(
        "SELECT count(*) AS count FROM activity_rubric_requests WHERE user_id=?",
      )
        .bind(fixture.owner.userId)
        .first("count"),
    ).toBe(0);
  });
});
