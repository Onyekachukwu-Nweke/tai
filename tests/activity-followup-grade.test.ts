import { env } from "cloudflare:test";
import { describe, expect, it, vi } from "vitest";
import {
  validateFollowupGrade,
  type FollowupGradeContext,
} from "../packages/contracts/activity-followup-grade";
import { learner } from "./material-fixtures";
import {
  InspectingProvider,
  appWith,
  readyFollowup,
  request,
} from "./followup-grade-fixture";

describe("follow-up grade contract", () => {
  it("rejects changed targets and invented citations", () => {
    const context: FollowupGradeContext = {
      requestId: crypto.randomUUID(),
      attemptId: crypto.randomUUID(),
      followupRequestId: crypto.randomUUID(),
      packId: crypto.randomUUID(),
      questionId: crypto.randomUUID(),
      prompt: "Prompt",
      answer: "Answer",
      targetedCriterion: "Criterion",
      sources: [{ id: "source", location: 1, start: 0, end: 4, text: "fact" }],
    };
    const valid = {
      schemaVersion: 1,
      requestId: context.requestId,
      attemptId: context.attemptId,
      followupRequestId: context.followupRequestId,
      packId: context.packId,
      questionId: context.questionId,
      targetedCriterion: context.targetedCriterion,
      outcome: "supported",
      feedback: "Supported.",
      sources: context.sources,
    };
    expect(() => validateFollowupGrade(valid, context)).not.toThrow();
    expect(() =>
      validateFollowupGrade(
        { ...valid, targetedCriterion: "changed" },
        context,
      ),
    ).toThrow();
    expect(() =>
      validateFollowupGrade(
        { ...valid, sources: [{ ...context.sources[0], text: "invented" }] },
        context,
      ),
    ).toThrow();
  });
});

describe("follow-up answer and grade routes", () => {
  it("saves before grading, replays, restores, and isolates owners", async () => {
    const { fixture, followupId } = await readyFollowup();
    const provider = new InspectingProvider();
    const app = appWith(provider);
    const attempt = {
      schemaVersion: 1,
      attemptId: crypto.randomUUID(),
      followupRequestId: followupId,
      answer: "A saved follow-up answer",
    };
    const attemptCall = () =>
      request(
        app,
        fixture.owner.spaceId,
        "/activity-followup-attempts",
        fixture.owner.cookie,
        attempt,
      );
    expect((await attemptCall()).status).toBe(201);
    expect((await attemptCall()).status).toBe(201);
    expect(
      (
        await request(
          app,
          fixture.owner.spaceId,
          "/activity-followup-attempts",
          fixture.owner.cookie,
          { ...attempt, answer: "changed" },
        )
      ).status,
    ).toBe(409);
    const grade = {
      schemaVersion: 1,
      requestId: crypto.randomUUID(),
      attemptId: attempt.attemptId,
    };
    expect(
      (
        await request(
          app,
          fixture.owner.spaceId,
          "/activity-followup-grades",
          fixture.owner.cookie,
          grade,
        )
      ).status,
    ).toBe(201);
    expect(provider.calls).toHaveLength(1);
    expect(provider.calls[0]).toMatchObject({ answer: attempt.answer });
    expect(JSON.stringify(provider.calls[0])).not.toMatch(
      /userId|Original answer/,
    );
    const provenance = await env.DB.prepare(
      "SELECT provider,model,prompt_version,output_schema_version FROM activity_followup_grade_requests WHERE request_id=?",
    )
      .bind(grade.requestId)
      .first();
    expect(provenance).toEqual({
      provider: "fake",
      model: null,
      prompt_version: "injected-fake-v1",
      output_schema_version: 1,
    });
    expect(
      (
        await request(
          app,
          fixture.owner.spaceId,
          "/activity-followup-grades",
          fixture.owner.cookie,
          grade,
        )
      ).status,
    ).toBe(201);
    expect(provider.calls).toHaveLength(1);
    const state = await request(
      app,
      fixture.owner.spaceId,
      `/activity-followup-grades?packId=${fixture.pack.packId}`,
      fixture.owner.cookie,
    );
    expect(await state.json()).toMatchObject({
      attempts: [{ answer: attempt.answer }],
      grades: [{ outcome: "partial" }],
    });
    const other = await learner("followup-grade-other");
    expect(
      (
        await request(
          app,
          fixture.owner.spaceId,
          "/activity-followup-grades",
          other.cookie,
          { ...grade, requestId: crypto.randomUUID() },
        )
      ).status,
    ).toBe(404);
  });

  it("reserves one provider call during concurrent grading", async () => {
    const { fixture, followupId } = await readyFollowup();
    const provider = new InspectingProvider();
    let release!: () => void;
    provider.wait = new Promise<void>((resolve) => {
      release = resolve;
    });
    const app = appWith(provider);
    const attemptId = crypto.randomUUID();
    await request(
      app,
      fixture.owner.spaceId,
      "/activity-followup-attempts",
      fixture.owner.cookie,
      {
        schemaVersion: 1,
        attemptId,
        followupRequestId: followupId,
        answer: "Race-safe answer",
      },
    );
    const first = request(
      app,
      fixture.owner.spaceId,
      "/activity-followup-grades",
      fixture.owner.cookie,
      {
        schemaVersion: 1,
        requestId: crypto.randomUUID(),
        attemptId,
      },
    );
    await vi.waitFor(() => expect(provider.calls).toHaveLength(1));
    const second = await request(
      app,
      fixture.owner.spaceId,
      "/activity-followup-grades",
      fixture.owner.cookie,
      {
        schemaVersion: 1,
        requestId: crypto.randomUUID(),
        attemptId,
      },
    );
    expect(second.status).toBe(409);
    release();
    expect((await first).status).toBe(201);
    expect(provider.calls).toHaveLength(1);
  });

  it("rejects flagged work and a changed originating grade", async () => {
    const { fixture, question, followupId, gradeId } = await readyFollowup();
    const provider = new InspectingProvider();
    const app = appWith(provider);
    await env.DB.prepare(
      "INSERT INTO activity_question_flags(user_id,space_id,pack_id,question_id,reason,created_at,updated_at) VALUES(?,?,?,?,?,?,?)",
    )
      .bind(
        fixture.owner.userId,
        fixture.owner.spaceId,
        fixture.pack.packId,
        question.id,
        "ambiguous",
        "2026-01-01T00:00:00.000Z",
        "2026-01-01T00:00:00.000Z",
      )
      .run();
    expect(
      (
        await request(
          app,
          fixture.owner.spaceId,
          "/activity-followup-attempts",
          fixture.owner.cookie,
          {
            schemaVersion: 1,
            attemptId: crypto.randomUUID(),
            followupRequestId: followupId,
            answer: "Blocked",
          },
        )
      ).status,
    ).toBe(404);
    expect(provider.calls).toHaveLength(0);
    await env.DB.prepare(
      "DELETE FROM activity_question_flags WHERE user_id=? AND space_id=? AND pack_id=? AND question_id=?",
    )
      .bind(
        fixture.owner.userId,
        fixture.owner.spaceId,
        fixture.pack.packId,
        question.id,
      )
      .run();
    const attemptId = crypto.randomUUID();
    await request(
      app,
      fixture.owner.spaceId,
      "/activity-followup-attempts",
      fixture.owner.cookie,
      {
        schemaVersion: 1,
        attemptId,
        followupRequestId: followupId,
        answer: "Saved before the grade changed",
      },
    );
    provider.beforeReturn = async () => {
      await env.DB.prepare(
        "UPDATE activity_rubric_requests SET response_json='{}' WHERE request_id=?",
      )
        .bind(gradeId)
        .run();
    };
    expect(
      (
        await request(
          app,
          fixture.owner.spaceId,
          "/activity-followup-grades",
          fixture.owner.cookie,
          {
            schemaVersion: 1,
            requestId: crypto.randomUUID(),
            attemptId,
          },
        )
      ).status,
    ).toBe(409);
  });

  it("keeps the answer after failed grading and requires a new grade ID", async () => {
    const { fixture, followupId } = await readyFollowup();
    const provider = new InspectingProvider();
    provider.invalidCitation = true;
    const app = appWith(provider);
    const attemptId = crypto.randomUUID();
    await request(
      app,
      fixture.owner.spaceId,
      "/activity-followup-attempts",
      fixture.owner.cookie,
      {
        schemaVersion: 1,
        attemptId,
        followupRequestId: followupId,
        answer: "Keep me",
      },
    );
    const failedId = crypto.randomUUID();
    expect(
      (
        await request(
          app,
          fixture.owner.spaceId,
          "/activity-followup-grades",
          fixture.owner.cookie,
          { schemaVersion: 1, requestId: failedId, attemptId },
        )
      ).status,
    ).toBe(503);
    provider.invalidCitation = false;
    expect(
      (
        await request(
          app,
          fixture.owner.spaceId,
          "/activity-followup-grades",
          fixture.owner.cookie,
          { schemaVersion: 1, requestId: failedId, attemptId },
        )
      ).status,
    ).toBe(409);
    expect(
      (
        await request(
          app,
          fixture.owner.spaceId,
          "/activity-followup-grades",
          fixture.owner.cookie,
          { schemaVersion: 1, requestId: crypto.randomUUID(), attemptId },
        )
      ).status,
    ).toBe(201);
    expect(provider.calls).toHaveLength(2);
  });
});
