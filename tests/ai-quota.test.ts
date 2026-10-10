import { env } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import type { Env } from "../apps/worker/src/env";
import {
  AiCallFailure,
  completeAiCall,
  failAiCall,
  reserveAiCall,
} from "../apps/worker/src/ai-quota-service";

const configured = (overrides: Partial<Env> = {}): Env => ({
  ...env,
  AI_CALLS_ENABLED: "true",
  AI_DAILY_TOTAL_LIMIT: "3",
  AI_DAILY_CONCEPT_LIMIT: "2",
  AI_DAILY_PACK_LIMIT: "2",
  AI_DAILY_GRADING_LIMIT: "2",
  AI_DAILY_SUPPORT_LIMIT: "2",
  AI_DAILY_PRACTICAL_LIMIT: "2",
  ...overrides,
});
const at = (iso: string) => ({ now: () => new Date(iso) });
const call = (
  target: Env,
  user: string,
  operation: string,
  clock = at("2026-10-10T12:00:00.000Z"),
) => reserveAiCall(target, user, operation, "support", "hint", clock);

describe("per-user AI quota", () => {
  beforeEach(async () => {
    await env.DB.batch(
      ["user-a", "user-b"].map((id) =>
        env.DB.prepare(
          "INSERT INTO user(id,name,email,emailVerified,createdAt,updatedAt) VALUES(?,?,?,1,?,?)",
        ).bind(
          id,
          id,
          `${id}@example.test`,
          "2026-10-10T00:00:00.000Z",
          "2026-10-10T00:00:00.000Z",
        ),
      ),
    );
  });
  it("atomically admits only the configured category limit", async () => {
    const target = configured({ AI_DAILY_SUPPORT_LIMIT: "1" });
    const results = await Promise.allSettled([
      call(target, "user-a", "hint:a"),
      call(target, "user-a", "hint:b"),
    ]);
    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    const rejected = results.find((result) => result.status === "rejected");
    expect((rejected as PromiseRejectedResult).reason).toMatchObject({
      status: 429,
      code: "ai_quota_exhausted",
      category: "support",
      resetAt: "2026-10-11T00:00:00.000Z",
    });
    expect(
      await env.DB.prepare(
        "SELECT COUNT(*) AS count FROM ai_call_ledger WHERE user_id='user-a'",
      ).first<{ count: number }>(),
    ).toEqual({ count: 1 });
  });

  it("enforces total limits while isolating users", async () => {
    const target = configured({ AI_DAILY_TOTAL_LIMIT: "1" });
    await call(target, "user-a", "hint:a");
    await expect(call(target, "user-a", "hint:b")).rejects.toMatchObject({
      status: 429,
    });
    await expect(call(target, "user-b", "hint:a")).resolves.toBeUndefined();
  });

  it("resets counts at the UTC-day boundary and reports Retry-After", async () => {
    const target = configured({ AI_DAILY_TOTAL_LIMIT: "1" });
    await call(target, "user-a", "hint:a", at("2026-10-10T23:59:58.000Z"));
    await expect(
      call(target, "user-a", "hint:b", at("2026-10-10T23:59:59.000Z")),
    ).rejects.toMatchObject({
      status: 429,
      retryAfterSeconds: 1,
      category: "support",
      resetAt: "2026-10-11T00:00:00.000Z",
    });
    await expect(
      call(target, "user-a", "hint:c", at("2026-10-11T00:00:00.000Z")),
    ).resolves.toBeUndefined();
  });

  it("fails closed for the kill switch and malformed limits", async () => {
    await expect(
      call(configured({ AI_CALLS_ENABLED: "false" }), "user-a", "hint:a"),
    ).rejects.toMatchObject({ status: 503, code: "ai_disabled" });
    await expect(
      call(configured({ AI_DAILY_TOTAL_LIMIT: "0" }), "user-a", "hint:b"),
    ).rejects.toMatchObject({ status: 503, code: "ai_disabled" });
  });

  it("accepts zero as a valid category limit and denies without a ledger row", async () => {
    await expect(
      call(configured({ AI_DAILY_SUPPORT_LIMIT: "0" }), "user-a", "zero"),
    ).rejects.toMatchObject({ status: 429, category: "support" });
    expect(
      await env.DB.prepare(
        "SELECT COUNT(*) AS count FROM ai_call_ledger WHERE user_id=?",
      )
        .bind("user-a")
        .first(),
    ).toEqual({ count: 0 });
  });

  it("uses task kind as part of operation identity and records outcomes", async () => {
    const target = configured();
    const clock = at("2026-10-10T12:00:00.000Z");
    await reserveAiCall(target, "user-a", "same", "support", "hint", clock);
    await completeAiCall(target, "user-a", "same", "hint", clock);
    await reserveAiCall(
      target,
      "user-a",
      "same",
      "support",
      "explain_again",
      clock,
    );
    await failAiCall(target, "user-a", "same", "explain_again", clock);
    expect(
      await env.DB.prepare(
        "SELECT task_kind,state FROM ai_call_ledger WHERE user_id=? AND operation_id=? ORDER BY task_kind",
      )
        .bind("user-a", "same")
        .all(),
    ).toMatchObject({
      results: [
        { task_kind: "explain_again", state: "failed" },
        { task_kind: "hint", state: "completed" },
      ],
    });
  });

  it("charges an operation once and never reuses a stale pending ID", async () => {
    const target = configured();
    await call(target, "user-a", "hint:a");
    await expect(call(target, "user-a", "hint:a")).rejects.toBeInstanceOf(
      AiCallFailure,
    );
    await env.DB.prepare(
      "INSERT INTO ai_call_ledger VALUES(?,?,?,?,?,'pending',?,?)",
    )
      .bind(
        "user-a",
        "hint:stale",
        "2026-10-10",
        "support",
        "hint",
        "2026-10-10T11:00:00.000Z",
        "2026-10-10T11:00:00.000Z",
      )
      .run();
    await expect(call(target, "user-a", "hint:stale")).rejects.toMatchObject({
      status: 409,
      code: "ai_operation_reused",
    });
    expect(
      await env.DB.prepare(
        "SELECT state FROM ai_call_ledger WHERE user_id=? AND task_kind=? AND operation_id=?",
      )
        .bind("user-a", "hint", "hint:stale")
        .first(),
    ).toEqual({ state: "failed" });
  });

  it("removes private ledger metadata with the learner account", async () => {
    const target = configured();
    await call(target, "user-a", "hint:a");
    await env.DB.prepare("DELETE FROM user WHERE id=?").bind("user-a").run();
    expect(
      await env.DB.prepare(
        "SELECT COUNT(*) AS count FROM ai_call_ledger WHERE user_id=?",
      )
        .bind("user-a")
        .first(),
    ).toEqual({ count: 0 });
  });
});
