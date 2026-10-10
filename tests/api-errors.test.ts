import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { api, ApiError } from "../apps/web/src/api";

afterEach(() => vi.unstubAllGlobals());

describe("structured AI request errors", () => {
  it("maps quota exhaustion to an actionable category and reset message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json(
          {
            error: "limit",
            code: "ai_quota_exhausted",
            category: "grading",
            resetAt: "2026-10-11T00:00:00.000Z",
            retryAfterSeconds: 60,
          },
          { status: 429 },
        ),
      ),
    );
    await expect(api("/api/test", z.object({}))).rejects.toMatchObject({
      status: 429,
      message: expect.stringContaining("grading request limit"),
    } satisfies Partial<ApiError>);
  });

  it("maps the kill switch without exposing the server error", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json(
            { error: "private detail", code: "ai_disabled" },
            { status: 503 },
          ),
        ),
    );
    await expect(api("/api/test", z.object({}))).rejects.toMatchObject({
      status: 503,
      message:
        "AI features are temporarily unavailable. Your saved work is still available.",
    } satisfies Partial<ApiError>);
  });
});
