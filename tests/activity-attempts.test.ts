import { env } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import { FakeActivityPackProvider } from "../packages/adapters/fake-activity-packs";
import {
  learnerActivityPackSchema,
  type LearnerActivityPack,
} from "../packages/contracts/activity-packs";
import { activityAttemptResponseSchema } from "../packages/contracts/activity-attempts";
import { createApp } from "../apps/worker/src/index";
import { learner, material, upload } from "./material-fixtures";

let owner: Awaited<ReturnType<typeof learner>>, pack: LearnerActivityPack;
async function seed() {
  owner = await learner();
  const preview = material("Plants use light energy. Roots absorb water.");
  await upload(owner.spaceId, owner.cookie, preview);
  const request = crypto.randomUUID(),
    ids = [crypto.randomUUID(), crypto.randomUUID()];
  const extra = ["Water supports plants.", "Roots anchor plants."].map(
    (text, index) => ({
      id: `${preview.documentId}:1:${100 + index * 100}`,
      text,
      start: 100 + index * 100,
    }),
  );
  await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO concept_requests(user_id,space_id,request_id,document_id,location,state) VALUES(?,?,?,?,1,'ready')",
    ).bind(owner.userId, owner.spaceId, request, preview.documentId),
    ...ids.map((id, index) =>
      env.DB.prepare(
        "INSERT INTO concepts(user_id,space_id,id,request_id,title,label,description,selected) VALUES(?,?,?,?,?,?,?,1)",
      ).bind(
        owner.userId,
        owner.spaceId,
        id,
        request,
        `C${index}`,
        `C${index}`,
        "Synthetic",
      ),
    ),
    ...extra.map((item) =>
      env.DB.prepare(
        "INSERT INTO material_chunks(user_id,space_id,id,document_id,location,start_offset,end_offset,text) VALUES(?,?,?,?,1,?,?,?)",
      ).bind(
        owner.userId,
        owner.spaceId,
        item.id,
        preview.documentId,
        item.start,
        item.start + item.text.length,
        item.text,
      ),
    ),
    env.DB.prepare(
      "INSERT INTO concept_sources(user_id,space_id,concept_id,chunk_id) VALUES(?,?,?,?)",
    ).bind(owner.userId, owner.spaceId, ids[0], preview.chunks[0]!.id),
    env.DB.prepare(
      "INSERT INTO concept_sources(user_id,space_id,concept_id,chunk_id) VALUES(?,?,?,?)",
    ).bind(owner.userId, owner.spaceId, ids[0], extra[0]!.id),
    env.DB.prepare(
      "INSERT INTO concept_sources(user_id,space_id,concept_id,chunk_id) VALUES(?,?,?,?)",
    ).bind(owner.userId, owner.spaceId, ids[1], extra[1]!.id),
  ]);
  const generated = await call(`/activity-pack/generate`, {
    schemaVersion: 1,
    requestId: crypto.randomUUID(),
  });
  pack = learnerActivityPackSchema.parse(await generated.json());
}
function call(
  path: string,
  body?: unknown,
  cookie = owner?.cookie,
  headers: Record<string, string> = {},
) {
  return createApp(undefined, new FakeActivityPackProvider()).request(
    `http://localhost:8787/api/study-spaces/${owner?.spaceId}${path}`,
    {
      method: body ? "POST" : "GET",
      body: body ? JSON.stringify(body) : undefined,
      headers: {
        ...(cookie ? { cookie } : {}),
        origin: env.APP_ORIGIN,
        "content-type": "application/json",
        ...headers,
      },
    },
    env,
  );
}
const base = (questionId: string, attemptId = crypto.randomUUID()) => ({
  schemaVersion: 1,
  attemptId,
  packId: pack.packId!,
  questionId,
  confidence: "medium" as const,
});

beforeEach(seed);
describe("activity attempts", () => {
  it("enforces interaction invariants in D1 and keeps flags out of attempt rows", async () => {
    const columns = await env.DB.prepare(
      "PRAGMA table_info(activity_attempts)",
    ).all<{ name: string }>();
    expect(columns.results.map((item) => item.name)).not.toEqual(
      expect.arrayContaining(["flag_reason", "excluded_from_scoring"]),
    );
    await expect(
      env.DB.prepare(
        "INSERT INTO activity_attempts(user_id,space_id,id,pack_id,question_id,request_hash,interaction,confidence,correctness,revealed,skipped,hint_used,response_json,created_at) VALUES(?,?,?,?,?,?,'skip',NULL,'correct',0,1,0,'{}',?)",
      )
        .bind(
          owner.userId,
          owner.spaceId,
          crypto.randomUUID(),
          pack.packId,
          pack.questions[0]!.id,
          "hash",
          new Date().toISOString(),
        )
        .run(),
    ).rejects.toThrow();
  });
  it("grades MCQ deterministically, replays one immutable row and conflicts on changed payload", async () => {
    const question = pack.questions.find((item) => item.type === "mcq")!;
    if (question.type !== "mcq") throw new Error("fixture mismatch");
    const attemptId = crypto.randomUUID(),
      input = {
        ...base(question.id, attemptId),
        interaction: "mcq_submit" as const,
        selectedOptionId: question.review.correctOptionId,
      };
    const [first, duplicate] = await Promise.all([
      call("/activity-attempts", input),
      call("/activity-attempts", input),
    ]);
    expect([first.status, duplicate.status]).toEqual([201, 201]);
    expect(
      activityAttemptResponseSchema.parse(await first.json()),
    ).toMatchObject({
      correctness: "correct",
      hintUsed: false,
      supportedByMaterial: true,
    });
    expect(
      await env.DB.prepare(
        "SELECT count(*) AS count FROM activity_attempts WHERE user_id=? AND space_id=? AND id=?",
      )
        .bind(owner.userId, owner.spaceId, attemptId)
        .first("count"),
    ).toBe(1);
    expect(
      (
        await call("/activity-attempts", {
          ...input,
          selectedOptionId: question.options.find(
            (item) => item.id !== question.review.correctOptionId,
          )!.id,
        })
      ).status,
    ).toBe(409);
  });

  it("keeps self-check, ungraded explanation, reveal, skip, confidence and flags distinct", async () => {
    const recall = pack.questions.find((item) => item.type === "recall")!;
    const explain = pack.questions.find((item) => item.type === "explain")!;
    const self = activityAttemptResponseSchema.parse(
      await (
        await call("/activity-attempts", {
          ...base(recall.id),
          interaction: "recall_self_check",
          answer: "My recall",
          selfAssessment: "partial",
        })
      ).json(),
    );
    expect(self).toMatchObject({
      correctness: null,
      selfAssessment: "partial",
      confidence: "medium",
      revealed: true,
    });
    expect(self.answer).toBe(
      recall.type === "recall" ? recall.review.supportedAnswer : "",
    );
    const ungraded = activityAttemptResponseSchema.parse(
      await (
        await call("/activity-attempts", {
          ...base(explain.id),
          interaction: "explain_submit",
          answer: "My explanation",
        })
      ).json(),
    );
    expect(ungraded).toMatchObject({
      correctness: null,
      supportedByMaterial: false,
    });
    for (const interaction of ["reveal", "skip"] as const) {
      const result = activityAttemptResponseSchema.parse(
        await (
          await call("/activity-attempts", { ...base(recall.id), interaction })
        ).json(),
      );
      expect(result.correctness).toBeNull();
      expect(result.revealed).toBe(interaction === "reveal");
      expect(result.skipped).toBe(interaction === "skip");
    }
    const mcq = pack.questions.find((item) => item.type === "mcq")!;
    if (mcq.type !== "mcq") throw new Error("fixture mismatch");
    const flag = await call("/activity-flags", {
      schemaVersion: 1,
      packId: pack.packId,
      questionId: mcq.id,
      reason: "ambiguous",
    });
    expect(await flag.json()).toEqual({
      questionId: mcq.id,
      reason: "ambiguous",
    });
    expect(
      (
        await call("/activity-attempts", {
          ...base(mcq.id),
          interaction: "mcq_submit",
          selectedOptionId: mcq.review.correctOptionId,
        })
      ).status,
    ).toBe(409);
    const state = (await (
      await call(`/activity-attempts?packId=${pack.packId}`)
    ).json()) as { attempts: unknown[]; flags: unknown[] };
    expect(state.attempts).toHaveLength(2);
    expect(state.flags).toEqual([{ questionId: mcq.id, reason: "ambiguous" }]);
  });

  it("enforces auth, origin, type, ownership, current revision and deletion cascade", async () => {
    const question = pack.questions[0]!;
    const input = { ...base(question.id), interaction: "skip" as const };
    expect((await call("/activity-attempts", input, "")).status).toBe(401);
    expect(
      (
        await call("/activity-attempts", input, owner.cookie, {
          origin: "https://evil.example",
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await call("/activity-attempts", input, owner.cookie, {
          "content-type": "text/plain",
        })
      ).status,
    ).toBe(400);
    const other = await learner("other");
    expect((await call("/activity-attempts", input, other.cookie)).status).toBe(
      404,
    );
    await env.DB.prepare(
      "UPDATE activity_pack_requests SET selection_key='stale' WHERE user_id=? AND space_id=?",
    )
      .bind(owner.userId, owner.spaceId)
      .run();
    expect((await call("/activity-attempts", input)).status).toBe(404);
    await env.DB.prepare(
      "UPDATE activity_pack_requests SET selection_key=(SELECT selection_key FROM activity_packs WHERE user_id=? AND space_id=? LIMIT 1) WHERE user_id=? AND space_id=?",
    )
      .bind(owner.userId, owner.spaceId, owner.userId, owner.spaceId)
      .run();
    expect((await call("/activity-attempts", input)).status).toBe(201);
    await env.DB.prepare("DELETE FROM study_spaces WHERE user_id=? AND id=?")
      .bind(owner.userId, owner.spaceId)
      .run();
    expect(
      await env.DB.prepare(
        "SELECT count(*) AS count FROM activity_attempts WHERE user_id=?",
      )
        .bind(owner.userId)
        .first("count"),
    ).toBe(0);
  });
});
