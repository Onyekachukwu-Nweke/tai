import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import type { ActivityTutorProvider } from "../packages/adapters/fake-activity-tutor";
import {
  activityTutorResponseSchema,
  validateTutorResponse,
  type TutorContext,
} from "../packages/contracts/activity-tutor";
import { createApp } from "../apps/worker/src/index";
import { createActivityFixture } from "./activity-fixture";

class InspectingProvider implements ActivityTutorProvider {
  calls: TutorContext[] = [];
  fail = false;
  mutateSource = false;
  async generate(context: TutorContext) {
    this.calls.push(context);
    if (this.fail) throw new Error("private provider detail");
    const source = {
      ...context.question.sources[0]!,
      ...(this.mutateSource ? { text: "invented" } : {}),
    };
    return {
      schemaVersion: 1,
      requestId: context.requestId,
      packId: context.packId,
      questionId: context.questionId,
      kind: context.kind,
      text:
        context.kind === "hint" ? "Use the cited clue." : "Try this framing.",
      sources: [source],
      supportedByMaterial: true,
    };
  }
}

class DeferredProvider extends InspectingProvider {
  entered!: () => void;
  release!: () => void;
  enteredPromise = new Promise<void>((resolve) => (this.entered = resolve));
  releasePromise = new Promise<void>((resolve) => (this.release = resolve));
  override async generate(context: TutorContext) {
    this.entered();
    await this.releasePromise;
    return super.generate(context);
  }
}

describe("activity tutor contracts", () => {
  const source = {
    id: "source",
    location: 1,
    start: 0,
    end: 4,
    text: "fact",
  };
  const context: TutorContext = {
    requestId: "10000000-0000-4000-8000-000000000001",
    packId: "10000000-0000-4000-8000-000000000002",
    questionId: "10000000-0000-4000-8000-000000000003",
    kind: "hint",
    question: {
      type: "mcq",
      prompt: "Prompt",
      conceptIds: [],
      sources: [source],
    },
  };
  const valid = {
    schemaVersion: 1,
    requestId: context.requestId,
    packId: context.packId,
    questionId: context.questionId,
    kind: "hint" as const,
    text: "Think about the cited fact.",
    sources: [source],
    supportedByMaterial: true as const,
  };
  it("rejects extra fields, bounds violations, and mutated citations", () => {
    expect(
      activityTutorResponseSchema.safeParse({ ...valid, extra: true }).success,
    ).toBe(false);
    expect(
      activityTutorResponseSchema.safeParse({ ...valid, text: "x".repeat(601) })
        .success,
    ).toBe(false);
    expect(() =>
      validateTutorResponse(
        { ...valid, sources: [{ ...source, text: "fake", end: 4 }] },
        context,
      ),
    ).toThrow();
    expect(() => validateTutorResponse(valid, context)).not.toThrow();
  });
});

describe("activity tutor routes", () => {
  it("keeps hidden keys and learner drafts out of provider context, then restores help", async () => {
    const fixture = await createActivityFixture();
    const provider = new InspectingProvider();
    const question = fixture.pack.questions.find(
      (item) => item.type === "mcq",
    )!;
    const requestId = crypto.randomUUID();
    const app = createApp(
      undefined,
      undefined,
      { now: () => new Date("2026-01-01") },
      provider,
    );
    const call = (body?: unknown) =>
      app.request(
        `http://localhost:8787/api/study-spaces/${fixture.owner.spaceId}/activity-tutor${body ? "" : `?packId=${fixture.pack.packId}`}`,
        {
          method: body ? "POST" : "GET",
          body: body ? JSON.stringify(body) : undefined,
          headers: {
            cookie: fixture.owner.cookie,
            origin: env.APP_ORIGIN,
            "content-type": "application/json",
          },
        },
        env,
      );
    const input = {
      schemaVersion: 1,
      requestId,
      packId: fixture.pack.packId,
      questionId: question.id,
      kind: "hint",
    };
    const first = await call(input);
    expect(first.status).toBe(201);
    expect(provider.calls).toHaveLength(1);
    expect(JSON.stringify(provider.calls[0])).not.toMatch(
      /correctOptionId|answerExplanation|supportedAnswer|rubric|draft|confidence/,
    );
    expect((await call(input)).status).toBe(201);
    expect(provider.calls).toHaveLength(1);
    expect((await call({ ...input, kind: "explain_again" })).status).toBe(409);
    const state = (await (await call()).json()) as { interactions: unknown[] };
    expect(state.interactions).toHaveLength(1);
  });

  it("records assistance on later attempts and excludes assisted success from progress", async () => {
    const fixture = await createActivityFixture();
    const question = fixture.pack.questions.find(
      (item) => item.type === "mcq",
    )!;
    if (question.type !== "mcq") throw new Error("fixture mismatch");
    const help = await fixture.call("/activity-tutor", {
      schemaVersion: 1,
      requestId: crypto.randomUUID(),
      packId: fixture.pack.packId,
      questionId: question.id,
      kind: "hint",
    });
    expect(help.status).toBe(201);
    const attempt = await fixture.call("/activity-attempts", {
      ...fixture.base(question.id),
      interaction: "mcq_submit",
      selectedOptionId: question.review.correctOptionId,
    });
    expect(
      activityTutorResponseSchema.safeParse(await help.clone().json()).success,
    ).toBe(true);
    expect(await attempt.json()).toMatchObject({
      correctness: "correct",
      hintUsed: true,
      alternateExplanationUsed: false,
    });
    expect(
      await env.DB.prepare(
        "SELECT count(*) AS count FROM concept_progress WHERE user_id=? AND space_id=?",
      )
        .bind(fixture.owner.userId, fixture.owner.spaceId)
        .first("count"),
    ).toBe(0);
  });

  it("makes failures immutable and requires a new ID for explicit retry", async () => {
    const fixture = await createActivityFixture();
    const provider = new InspectingProvider();
    provider.fail = true;
    const question = fixture.pack.questions[0]!;
    const app = createApp(undefined, undefined, undefined, provider);
    const post = (requestId: string) =>
      app.request(
        `http://localhost:8787/api/study-spaces/${fixture.owner.spaceId}/activity-tutor`,
        {
          method: "POST",
          body: JSON.stringify({
            schemaVersion: 1,
            requestId,
            packId: fixture.pack.packId,
            questionId: question.id,
            kind: "hint",
          }),
          headers: {
            cookie: fixture.owner.cookie,
            origin: env.APP_ORIGIN,
            "content-type": "application/json",
          },
        },
        env,
      );
    const id = crypto.randomUUID();
    expect((await post(id)).status).toBe(503);
    provider.fail = false;
    expect((await post(id)).status).toBe(409);
    expect((await post(crypto.randomUUID())).status).toBe(201);
    expect(provider.calls).toHaveLength(2);
  });

  it("reserves before one provider call and rejects a concurrent duplicate", async () => {
    const fixture = await createActivityFixture();
    const provider = new DeferredProvider();
    const question = fixture.pack.questions[0]!;
    const app = createApp(undefined, undefined, undefined, provider);
    const input = {
      schemaVersion: 1,
      requestId: crypto.randomUUID(),
      packId: fixture.pack.packId,
      questionId: question.id,
      kind: "explain_again",
    };
    const post = () =>
      app.request(
        `http://localhost:8787/api/study-spaces/${fixture.owner.spaceId}/activity-tutor`,
        {
          method: "POST",
          body: JSON.stringify(input),
          headers: {
            cookie: fixture.owner.cookie,
            origin: env.APP_ORIGIN,
            "content-type": "application/json",
          },
        },
        env,
      );
    const first = post();
    await provider.enteredPromise;
    expect((await post()).status).toBe(409);
    provider.release();
    expect((await first).status).toBe(201);
    expect(provider.calls).toHaveLength(1);
  });

  it("does not change an existing attempt when assistance is requested later", async () => {
    const fixture = await createActivityFixture();
    const question = fixture.pack.questions.find(
      (item) => item.type === "mcq",
    )!;
    if (question.type !== "mcq") throw new Error("fixture mismatch");
    const attemptId = crypto.randomUUID();
    const input = {
      ...fixture.base(question.id, attemptId),
      interaction: "mcq_submit" as const,
      selectedOptionId: question.review.correctOptionId,
    };
    expect(
      await (await fixture.call("/activity-attempts", input)).json(),
    ).toMatchObject({ hintUsed: false });
    expect(
      (
        await fixture.call("/activity-tutor", {
          schemaVersion: 1,
          requestId: crypto.randomUUID(),
          packId: fixture.pack.packId,
          questionId: question.id,
          kind: "hint",
        })
      ).status,
    ).toBe(201);
    expect(
      await (await fixture.call("/activity-attempts", input)).json(),
    ).toMatchObject({
      hintUsed: false,
      alternateExplanationUsed: false,
    });
  });

  it("discards a late completion after deletion and enforces auth and origin", async () => {
    const fixture = await createActivityFixture();
    const provider = new DeferredProvider();
    const question = fixture.pack.questions[0]!;
    const app = createApp(undefined, undefined, undefined, provider);
    const url = `http://localhost:8787/api/study-spaces/${fixture.owner.spaceId}/activity-tutor`;
    const input = {
      schemaVersion: 1,
      requestId: crypto.randomUUID(),
      packId: fixture.pack.packId,
      questionId: question.id,
      kind: "hint",
    };
    const request = (cookie: string, origin = env.APP_ORIGIN) =>
      app.request(
        url,
        {
          method: "POST",
          body: JSON.stringify(input),
          headers: { cookie, origin, "content-type": "application/json" },
        },
        env,
      );
    expect((await request("", env.APP_ORIGIN)).status).toBe(401);
    expect(
      (await request(fixture.owner.cookie, "https://wrong.example")).status,
    ).toBe(403);
    const pending = request(fixture.owner.cookie);
    await provider.enteredPromise;
    await env.DB.prepare(
      "UPDATE study_spaces SET deleted_at=? WHERE user_id=? AND id=?",
    )
      .bind(
        new Date().toISOString(),
        fixture.owner.userId,
        fixture.owner.spaceId,
      )
      .run();
    provider.release();
    expect((await pending).status).toBe(409);
    expect(
      await env.DB.prepare(
        "SELECT state FROM activity_tutor_requests WHERE request_id=?",
      )
        .bind(input.requestId)
        .first("state"),
    ).toBe("failed");
  });
});
