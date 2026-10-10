import type {
  AiQuotaCategory,
  AiTaskKind,
} from "../../../packages/contracts/ai-quota";
import type { Clock } from "../../../packages/domain/concept-progress";
import type { Env } from "./env";
import { readAiQuotaConfig } from "./ai-quota-config";

export class AiCallFailure extends Error {
  constructor(
    public status: 409 | 429 | 503,
    message: string,
    public code?: "ai_quota_exhausted" | "ai_disabled" | "ai_operation_reused",
    public retryAfterSeconds?: number,
    public category?: AiQuotaCategory,
    public resetAt?: string,
  ) {
    super(message);
  }
}

const utcDay = (date: Date) => date.toISOString().slice(0, 10);
const nextUtcDay = (date: Date) =>
  new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1),
  );

export async function reserveAiCall(
  env: Env,
  userId: string,
  operationId: string,
  category: AiQuotaCategory,
  taskKind: AiTaskKind,
  clock: Clock,
) {
  const config = readAiQuotaConfig(env);
  if (!config || !config.enabled)
    throw new AiCallFailure(
      503,
      config
        ? "AI help is temporarily disabled. Saved learning remains available."
        : "AI help is unavailable because its limits are not configured.",
      "ai_disabled",
    );
  const now = clock.now();
  const nowIso = now.toISOString();
  const stale = new Date(now.getTime() - 5 * 60_000).toISOString();
  await env.DB.prepare(
    "UPDATE ai_call_ledger SET state='failed',updated_at=? WHERE user_id=? AND state='pending' AND updated_at<=?",
  )
    .bind(nowIso, userId, stale)
    .run();
  const result = await env.DB.prepare(
    `INSERT INTO ai_call_ledger(user_id,operation_id,utc_day,category,task_kind,state,created_at,updated_at)
     SELECT ?,?,?,?,?,'pending',?,?
     WHERE (SELECT COUNT(*) FROM ai_call_ledger WHERE user_id=? AND utc_day=?) < ?
       AND (SELECT COUNT(*) FROM ai_call_ledger WHERE user_id=? AND utc_day=? AND category=?) < ?
     ON CONFLICT(user_id,task_kind,operation_id) DO NOTHING`,
  )
    .bind(
      userId,
      operationId,
      utcDay(now),
      category,
      taskKind,
      nowIso,
      nowIso,
      userId,
      utcDay(now),
      config.total,
      userId,
      utcDay(now),
      category,
      config.categories[category],
    )
    .run();
  if (result.meta.changes !== 1) {
    const prior = await env.DB.prepare(
      "SELECT 1 FROM ai_call_ledger WHERE user_id=? AND task_kind=? AND operation_id=?",
    )
      .bind(userId, taskKind, operationId)
      .first();
    if (prior)
      throw new AiCallFailure(
        409,
        "This AI operation was already used. Retry explicitly with a new request ID.",
        "ai_operation_reused",
      );
    const reset = nextUtcDay(now);
    throw new AiCallFailure(
      429,
      "Your daily AI limit has been reached. Saved learning remains available.",
      "ai_quota_exhausted",
      Math.max(1, Math.ceil((reset.getTime() - now.getTime()) / 1000)),
      category,
      reset.toISOString(),
    );
  }
}

async function settleAiCall(
  env: Env,
  userId: string,
  operationId: string,
  taskKind: AiTaskKind,
  state: "completed" | "failed",
  clock: Clock,
) {
  await env.DB.prepare(
    "UPDATE ai_call_ledger SET state=?,updated_at=? WHERE user_id=? AND task_kind=? AND operation_id=? AND state='pending'",
  )
    .bind(state, clock.now().toISOString(), userId, taskKind, operationId)
    .run();
}

export const completeAiCall = (
  env: Env,
  userId: string,
  operationId: string,
  taskKind: AiTaskKind,
  clock: Clock,
) => settleAiCall(env, userId, operationId, taskKind, "completed", clock);

export const failAiCall = (
  env: Env,
  userId: string,
  operationId: string,
  taskKind: AiTaskKind,
  clock: Clock,
) => settleAiCall(env, userId, operationId, taskKind, "failed", clock);
