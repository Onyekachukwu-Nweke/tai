import { createAuthClient } from "better-auth/client";
import type { ZodType } from "zod";
import { aiCallErrorSchema } from "../../../packages/contracts/ai-quota";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export const authClient = createAuthClient();

export async function api<T>(
  path: string,
  schema: ZodType<T>,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) {
    const body = await response
      .clone()
      .json()
      .catch(() => null);
    const quota = aiCallErrorSchema.safeParse(body);
    if (quota.success && quota.data.code === "ai_quota_exhausted")
      throw new ApiError(
        `Your ${quota.data.category ?? "AI"} request limit has been reached. Retry after ${quota.data.resetAt ? new Date(quota.data.resetAt).toLocaleString() : "the daily reset"}.`,
        response.status,
      );
    if (quota.success && quota.data.code === "ai_disabled")
      throw new ApiError(
        "AI features are temporarily unavailable. Your saved work is still available.",
        response.status,
      );
    if (response.status === 503)
      throw new Error(
        "Sign-in is not available yet. Please try again after setup is complete.",
      );
    if (response.status === 401)
      throw new ApiError(
        "Your session has ended. Sign in again to continue.",
        401,
      );
    throw new Error("The request could not be completed. Please try again.");
  }
  return schema.parse(await response.json());
}
