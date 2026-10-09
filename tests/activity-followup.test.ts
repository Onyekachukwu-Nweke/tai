import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import type { ActivityFollowupProvider } from "../packages/adapters/fake-activity-followup";
import {
  activityFollowupResponseSchema,
  validateFollowupResponse,
  type FollowupContext,
} from "../packages/contracts/activity-followup";
import { createApp } from "../apps/worker/src/index";
import { createActivityFixture } from "./activity-fixture";
import { learner } from "./material-fixtures";

class InspectingProvider implements ActivityFollowupProvider {
  calls: FollowupContext[] = [];
  mutateCitation = false;
  changeGrade = false;
  async generate(context: FollowupContext) {
    this.calls.push(context);
    if (this.changeGrade)
      await env.DB.prepare(
        "UPDATE activity_rubric_requests SET response_json='{}' WHERE request_id IN (SELECT grade_request_id FROM activity_followup_requests WHERE request_id=?)",
      )
        .bind(context.requestId)
        .run();
    return {
      schemaVersion: 1,
      requestId: context.requestId,
      attemptId: context.attemptId,
      packId: context.packId,
      questionId: context.questionId,
      targetedCriterion: context.targetedCriterion,
      gapOutcome: context.gapOutcome,
      conceptIds: context.conceptIds,
      prompt: "Apply the cited point to a new example.",
      sources: [
        {
          ...context.sources[0]!,
          ...(this.mutateCitation ? { text: "invented" } : {}),
        },
      ],
    };
  }
}

describe("activity follow-up contracts", () => {
  it("requires unchanged targets, concepts, citations and bounds", () => {
    const context: FollowupContext = {
      requestId: "10000000-0000-4000-8000-000000000001",
      attemptId: "10000000-0000-4000-8000-000000000002",
      packId: "10000000-0000-4000-8000-000000000003",
      questionId: "10000000-0000-4000-8000-000000000004",
      originalPrompt: "Explain it",
      savedAnswer: "My answer",
      targetedCriterion: "Connect cause and effect",
      gapOutcome: "partial",
      criterionFeedback: "Add the effect",
      conceptIds: ["10000000-0000-4000-8000-000000000005"],
      sources: [{ id: "s", location: 1, start: 0, end: 4, text: "fact" }],
    };
    const valid = {
      schemaVersion: 1 as const,
      requestId: context.requestId,
      attemptId: context.attemptId,
      packId: context.packId,
      questionId: context.questionId,
      targetedCriterion: context.targetedCriterion,
      gapOutcome: context.gapOutcome,
      conceptIds: context.conceptIds,
      prompt: "Try a new example.",
      sources: context.sources,
    };
    expect(() => validateFollowupResponse(valid, context)).not.toThrow();
    expect(() =>
      validateFollowupResponse(
        { ...valid, targetedCriterion: "changed" },
        context,
      ),
    ).toThrow();
    expect(() =>
      validateFollowupResponse(
        { ...valid, sources: [{ ...context.sources[0], text: "fake" }] },
        context,
      ),
    ).toThrow();
    expect(
      activityFollowupResponseSchema.safeParse({
        ...valid,
        prompt: "x".repeat(1_001),
      }).success,
    ).toBe(false);
  });
});

async function gradedFixture() {
  const fixture = await createActivityFixture();
  const question = fixture.pack.questions.find(
    (item) => item.type === "scenario",
  )!;
  const attemptId = crypto.randomUUID();
  await fixture.call("/activity-attempts", {
    ...fixture.base(question.id, attemptId),
    interaction: "explain_submit",
    answer: "A saved learner response",
  });
  const gradeRequestId = crypto.randomUUID();
  const canonical = await env.DB.prepare(
    "SELECT canonical_json FROM activity_packs WHERE user_id=? AND space_id=? AND id=?",
  )
    .bind(fixture.owner.userId, fixture.owner.spaceId, fixture.pack.packId)
    .first<{ canonical_json: string }>();
  const privateQuestion = JSON.parse(canonical!.canonical_json).questions.find(
    (item: { id: string }) => item.id === question.id,
  );
  const elements = privateQuestion.rubric.map(
    (criterion: string, index: number) => ({
      criterion,
      outcome: index === 0 ? "partial" : "not_supported",
      feedback: `Gap ${index}`,
    }),
  );
  const grade = {
    schemaVersion: 1,
    requestId: gradeRequestId,
    attemptId,
    packId: fixture.pack.packId,
    questionId: question.id,
    outcome: "partial",
    feedback: "More detail is needed.",
    elements,
    sources: question.sources,
  };
  const now = "2026-01-01T00:00:00.000Z";
  await env.DB.prepare(
    "INSERT INTO activity_rubric_requests(user_id,space_id,request_id,attempt_id,pack_id,question_id,request_hash,state,response_json,error,created_at,updated_at) VALUES(?,?,?,?,?,?,?,'ready',?,NULL,?,?)",
  )
    .bind(
      fixture.owner.userId,
      fixture.owner.spaceId,
      gradeRequestId,
      attemptId,
      fixture.pack.packId,
      question.id,
      "grade-hash",
      JSON.stringify(grade),
      now,
      now,
    )
    .run();
  return { fixture, question, attemptId, elements };
}

describe("activity follow-up routes", () => {
  it("selects the deterministic gap, keeps context private, replays and restores", async () => {
    const { fixture, attemptId, elements } = await gradedFixture();
    const provider = new InspectingProvider();
    const app = createApp(
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      provider,
    );
    const call = (body?: unknown, cookie = fixture.owner.cookie) =>
      app.request(
        `http://localhost:8787/api/study-spaces/${fixture.owner.spaceId}/activity-followup${body ? "" : `?packId=${fixture.pack.packId}`}`,
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
      savedAnswer: "A saved learner response",
      targetedCriterion: elements[1]!.criterion,
      gapOutcome: "not_supported",
    });
    expect(JSON.stringify(provider.calls[0])).not.toMatch(
      /userId|correctOptionId/,
    );
    expect((await call(input)).status).toBe(201);
    expect(provider.calls).toHaveLength(1);
    expect(
      (await call({ ...input, attemptId: crypto.randomUUID() })).status,
    ).toBe(409);
    const state = (await (await call()).json()) as { followups: unknown[] };
    expect(state.followups).toHaveLength(1);
    expect(
      (await call({ ...input, requestId: crypto.randomUUID() })).status,
    ).toBe(409);
    const other = await learner("followup-other");
    expect(
      (await call({ ...input, requestId: crypto.randomUUID() }, other.cookie))
        .status,
    ).toBe(404);
  });

  it("requires a new ID after failure and rejects changed grading", async () => {
    const { fixture, attemptId } = await gradedFixture();
    const provider = new InspectingProvider();
    provider.mutateCitation = true;
    const app = createApp(
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      provider,
    );
    const post = (requestId: string) =>
      app.request(
        `http://localhost:8787/api/study-spaces/${fixture.owner.spaceId}/activity-followup`,
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
    provider.mutateCitation = false;
    expect((await post(failedId)).status).toBe(409);
    provider.changeGrade = true;
    expect((await post(crypto.randomUUID())).status).toBe(409);
  });
});
