import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import {
  InspectingProvider,
  appWith,
  readyFollowup,
  request,
} from "./followup-grade-fixture";

async function preparedAttempt(updatedAt: string) {
  const { fixture, followupId, followup } = await readyFollowup();
  const attemptId = crypto.randomUUID();
  const app = appWith(new InspectingProvider());
  await request(
    app,
    fixture.owner.spaceId,
    "/activity-followup-attempts",
    fixture.owner.cookie,
    {
      schemaVersion: 1,
      attemptId,
      followupRequestId: followupId,
      answer: "Saved follow-up answer",
    },
  );
  const pendingId = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO activity_followup_grade_requests(
      user_id,space_id,request_id,attempt_id,followup_request_id,pack_id,
      question_id,followup_response_json,request_hash,state,response_json,error,
      created_at,updated_at)
     VALUES(?,?,?,?,?,?,?,?,?,'pending',NULL,NULL,?,?)`,
  )
    .bind(
      fixture.owner.userId,
      fixture.owner.spaceId,
      pendingId,
      attemptId,
      followupId,
      fixture.pack.packId,
      followup.questionId,
      JSON.stringify(followup),
      "orphaned-request",
      updatedAt,
      updatedAt,
    )
    .run();
  return { fixture, attemptId, pendingId };
}

describe("follow-up grade reservation lease", () => {
  it("expires a stale pending reservation before one explicit retry", async () => {
    const { fixture, attemptId, pendingId } = await preparedAttempt(
      "2000-01-01T00:00:00.000Z",
    );
    const provider = new InspectingProvider();
    const app = appWith(provider);
    const response = await request(
      app,
      fixture.owner.spaceId,
      "/activity-followup-grades",
      fixture.owner.cookie,
      { schemaVersion: 1, requestId: crypto.randomUUID(), attemptId },
    );
    expect(response.status).toBe(201);
    expect(provider.calls).toHaveLength(1);
    const rows = await env.DB.prepare(
      "SELECT request_id,state FROM activity_followup_grade_requests WHERE user_id=? AND space_id=? AND attempt_id=? ORDER BY created_at,rowid",
    )
      .bind(fixture.owner.userId, fixture.owner.spaceId, attemptId)
      .all<{ request_id: string; state: string }>();
    expect(rows.results).toEqual([
      { request_id: pendingId, state: "failed" },
      expect.objectContaining({ state: "ready" }),
    ]);
  });

  it("keeps a fresh pending reservation and makes no provider call", async () => {
    const { fixture, attemptId } = await preparedAttempt(
      "2999-01-01T00:00:00.000Z",
    );
    const provider = new InspectingProvider();
    const response = await request(
      appWith(provider),
      fixture.owner.spaceId,
      "/activity-followup-grades",
      fixture.owner.cookie,
      { schemaVersion: 1, requestId: crypto.randomUUID(), attemptId },
    );
    expect(response.status).toBe(409);
    expect(provider.calls).toHaveLength(0);
  });
});
