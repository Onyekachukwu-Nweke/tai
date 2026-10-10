import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import type { ConceptProvider } from "../packages/adapters/fake-concepts";
import type { SourceContext } from "../packages/contracts/concepts";
import { createApp } from "../apps/worker/src/index";
import { learner, material, upload } from "./material-fixtures";

class RecordingProvider implements ConceptProvider {
  calls = 0;
  async generate(context: SourceContext) {
    this.calls += 1;
    return {
      schemaVersion: 1 as const,
      concepts: [
        {
          title: "Light",
          description: "Plants use light.",
          sourceIds: [context.chunks[0]!.id],
        },
      ],
      relations: [],
    };
  }
}

async function generate(limit: "disabled" | "zero") {
  const { cookie, spaceId, userId } = await learner();
  await upload(spaceId, cookie, material());
  const provider = new RecordingProvider();
  const response = await createApp(provider).request(
    `http://localhost:8787/api/study-spaces/${spaceId}/concepts/generate`,
    {
      method: "POST",
      headers: {
        cookie,
        origin: env.APP_ORIGIN,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        schemaVersion: 1,
        requestId: crypto.randomUUID(),
        selection: { location: 1 },
      }),
    },
    {
      ...env,
      ...(limit === "disabled"
        ? { AI_CALLS_ENABLED: "false" }
        : { AI_DAILY_CONCEPT_LIMIT: "0" }),
    },
  );
  return { response, provider, spaceId, userId };
}

describe("AI quota HTTP behavior", () => {
  it("fails the domain request without invoking the provider when disabled", async () => {
    const { response, provider, spaceId, userId } = await generate("disabled");
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ code: "ai_disabled" });
    expect(provider.calls).toBe(0);
    expect(
      await env.DB.prepare(
        "SELECT state FROM concept_requests WHERE user_id=? AND space_id=?",
      )
        .bind(userId, spaceId)
        .first(),
    ).toEqual({ state: "failed" });
  });

  it("returns category, UTC reset, and Retry-After without a ledger row", async () => {
    const { response, provider } = await generate("zero");
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toMatch(/^\d+$/);
    expect(await response.json()).toMatchObject({
      code: "ai_quota_exhausted",
      category: "concepts",
      resetAt: expect.stringMatching(/T00:00:00\.000Z$/),
    });
    expect(provider.calls).toBe(0);
    expect(
      await env.DB.prepare(
        "SELECT COUNT(*) AS count FROM ai_call_ledger",
      ).first(),
    ).toEqual({ count: 0 });
  });
});
