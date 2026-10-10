import { env } from "cloudflare:test";
import type { ActivityFollowupGradeProvider } from "../packages/adapters/fake-activity-followup-grade";
import type { FollowupGradeContext } from "../packages/contracts/activity-followup-grade";
import { createApp } from "../apps/worker/src/index";
import { createActivityFixture } from "./activity-fixture";

export class InspectingProvider implements ActivityFollowupGradeProvider {
  calls: FollowupGradeContext[] = [];
  invalidCitation = false;
  wait: Promise<void> | null = null;
  beforeReturn: (() => Promise<void>) | null = null;
  async grade(context: FollowupGradeContext) {
    this.calls.push(context);
    if (this.wait) await this.wait;
    if (this.beforeReturn) await this.beforeReturn();
    return {
      schemaVersion: 1,
      requestId: context.requestId,
      attemptId: context.attemptId,
      followupRequestId: context.followupRequestId,
      packId: context.packId,
      questionId: context.questionId,
      targetedCriterion: context.targetedCriterion,
      outcome: "partial" as const,
      feedback: "Connect the response more directly to the cited point.",
      sources: [
        {
          ...context.sources[0]!,
          ...(this.invalidCitation ? { text: "invented" } : {}),
        },
      ],
    };
  }
}

export async function readyFollowup() {
  const fixture = await createActivityFixture();
  const question = fixture.pack.questions.find(
    (item) => item.type === "scenario",
  )!;
  const originalAttemptId = crypto.randomUUID();
  await fixture.call("/activity-attempts", {
    ...fixture.base(question.id, originalAttemptId),
    interaction: "explain_submit",
    answer: "Original answer",
  });
  const now = "2026-01-01T00:00:00.000Z";
  const gradeId = crypto.randomUUID();
  const canonical = await env.DB.prepare(
    "SELECT canonical_json FROM activity_packs WHERE id=?",
  )
    .bind(fixture.pack.packId)
    .first<{ canonical_json: string }>();
  const privateQuestion = JSON.parse(canonical!.canonical_json).questions.find(
    (item: { id: string }) => item.id === question.id,
  );
  const grade = {
    schemaVersion: 1,
    requestId: gradeId,
    attemptId: originalAttemptId,
    packId: fixture.pack.packId,
    questionId: question.id,
    outcome: "partial",
    feedback: "Add the effect.",
    elements: privateQuestion.rubric.map((criterion: string) => ({
      criterion,
      outcome: "partial",
      feedback: "Add the effect.",
    })),
    sources: question.sources,
  };
  await env.DB.prepare(
    "INSERT INTO activity_rubric_requests(user_id,space_id,request_id,attempt_id,pack_id,question_id,request_hash,state,response_json,error,created_at,updated_at) VALUES(?,?,?,?,?,?,?,'ready',?,NULL,?,?)",
  )
    .bind(
      fixture.owner.userId,
      fixture.owner.spaceId,
      gradeId,
      originalAttemptId,
      fixture.pack.packId,
      question.id,
      "grade",
      JSON.stringify(grade),
      now,
      now,
    )
    .run();
  const followupId = crypto.randomUUID();
  const followup = {
    schemaVersion: 1,
    requestId: followupId,
    attemptId: originalAttemptId,
    packId: fixture.pack.packId,
    questionId: question.id,
    targetedCriterion: privateQuestion.rubric[0],
    gapOutcome: "partial",
    conceptIds: question.conceptIds,
    prompt: "Apply this point to a new example.",
    sources: question.sources,
  };
  await env.DB.prepare(
    "INSERT INTO activity_followup_requests(user_id,space_id,request_id,attempt_id,pack_id,question_id,grade_request_id,grade_response_json,request_hash,state,response_json,error,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,'ready',?,NULL,?,?)",
  )
    .bind(
      fixture.owner.userId,
      fixture.owner.spaceId,
      followupId,
      originalAttemptId,
      fixture.pack.packId,
      question.id,
      gradeId,
      JSON.stringify(grade),
      "followup",
      JSON.stringify(followup),
      now,
      now,
    )
    .run();
  return { fixture, question, followupId, followup, gradeId };
}

export function appWith(provider: ActivityFollowupGradeProvider) {
  return createApp(
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    provider,
  );
}
export function request(
  app: ReturnType<typeof createApp>,
  spaceId: string,
  path: string,
  cookie: string,
  body?: unknown,
) {
  return app.request(
    `http://localhost:8787/api/study-spaces/${spaceId}${path}`,
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
}
