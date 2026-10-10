import type { Context } from "hono";
import { AiCallFailure } from "./ai-quota-service";

export function aiCallErrorResponse(c: Context, error: unknown) {
  if (!(error instanceof AiCallFailure)) return null;
  if (error.retryAfterSeconds)
    c.header("Retry-After", String(error.retryAfterSeconds));
  return c.json(
    {
      error: error.message,
      ...(error.code ? { code: error.code } : {}),
      ...(error.category ? { category: error.category } : {}),
      ...(error.resetAt ? { resetAt: error.resetAt } : {}),
      ...(error.retryAfterSeconds
        ? { retryAfterSeconds: error.retryAfterSeconds }
        : {}),
    },
    error.status,
  );
}
