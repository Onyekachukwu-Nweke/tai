import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import type { ConceptProvider } from "../packages/adapters/fake-concepts";
import type {
  ConceptDraftResult,
  SourceContext,
} from "../packages/contracts/concepts";
import { conceptCollectionSchema } from "../packages/contracts/concepts";
import { createApp } from "../apps/worker/src/index";
import { learner, material, upload } from "./material-fixtures";

const requestId = "33333333-3333-4333-8333-333333333333";
function conceptCall(
  provider: ConceptProvider,
  path: string,
  cookie: string,
  init: RequestInit = {},
  bindings = env,
) {
  const headers = new Headers(init.headers);
  headers.set("cookie", cookie);
  if (!headers.has("origin")) headers.set("origin", env.APP_ORIGIN);
  if (!headers.has("content-type"))
    headers.set("content-type", "application/json");
  return createApp(provider).request(
    `http://localhost:8787/api/study-spaces${path}`,
    { ...init, headers },
    bindings,
  );
}
class RecordingProvider implements ConceptProvider {
  calls = 0;
  context?: SourceContext;
  async generate(context: SourceContext): Promise<ConceptDraftResult> {
    this.calls += 1;
    this.context = context;
    return {
      schemaVersion: 1,
      concepts: [
        {
          title: "Light energy",
          description: "Plants use light energy.",
          sourceIds: [context.chunks[0]!.id],
        },
      ],
      relations: [],
    };
  }
}

describe("source-backed concept organization", () => {
  it("loads selected chunks server-side, persists UUID concepts and replays idempotently", async () => {
    const { cookie, spaceId } = await learner();
    const preview = material();
    await upload(spaceId, cookie, preview);
    const provider = new RecordingProvider();
    const body = JSON.stringify({
      schemaVersion: 1,
      requestId,
      selection: { startLocation: 1, endLocation: 1 },
    });
    const first = await conceptCall(
      provider,
      `/${spaceId}/concepts/generate`,
      cookie,
      { method: "POST", body },
    );
    expect(first.status).toBe(200);
    const result = conceptCollectionSchema.parse(await first.json());
    expect(provider.context?.chunks[0]?.text).toBe(preview.chunks[0]!.text);
    expect(result.concepts[0].id).toMatch(/^[0-9a-f-]{36}$/);
    expect(result.concepts[0].sources[0].id).toBe(preview.chunks[0]!.id);
    await conceptCall(provider, `/${spaceId}/concepts/generate`, cookie, {
      method: "POST",
      body,
    });
    expect(provider.calls).toBe(1);
    const updated = await conceptCall(
      provider,
      `/${spaceId}/concepts/${result.concepts[0].id}`,
      cookie,
      {
        method: "PATCH",
        body: JSON.stringify({
          schemaVersion: 1,
          label: "Photosynthesis",
          selected: false,
        }),
      },
    );
    expect(
      conceptCollectionSchema.parse(await updated.json()).concepts[0],
    ).toMatchObject({
      id: result.concepts[0].id,
      label: "Photosynthesis",
      selected: false,
    });
    const reloaded = await conceptCall(
      provider,
      `/${spaceId}/concepts`,
      cookie,
      {},
      { ...env, AI_PROVIDER: "workers_ai" },
    );
    const reloadedCollection = conceptCollectionSchema.parse(
      await reloaded.json(),
    );
    expect(reloadedCollection).toMatchObject({
      provider: "fake",
      concepts: [
        {
          id: result.concepts[0].id,
          label: "Photosynthesis",
          selected: false,
        },
      ],
    });
    expect(
      await env.DB.prepare(
        "SELECT provider,model,prompt_version,output_schema_version FROM concept_requests WHERE user_id=? AND space_id=?",
      )
        .bind("alice", spaceId)
        .first(),
    ).toEqual({
      provider: "fake",
      model: null,
      prompt_version: "injected-fake-v1",
      output_schema_version: 1,
    });
    const failedRegeneration = await conceptCall(
      {
        metadata: {
          provider: "workers_ai",
          model: "@cf/example/new-model",
          promptVersion: "concept-organization-v2",
          schemaVersion: 1,
        },
        generate: async () => {
          throw new Error("provider unavailable");
        },
      },
      `/${spaceId}/concepts/generate`,
      cookie,
      {
        method: "POST",
        body: JSON.stringify({
          schemaVersion: 1,
          requestId: "55555555-5555-4555-8555-555555555555",
          selection: { startLocation: 1, endLocation: 1 },
        }),
      },
    );
    expect(failedRegeneration.status).toBe(503);
    const retained = conceptCollectionSchema.parse(
      await (
        await conceptCall(provider, `/${spaceId}/concepts`, cookie)
      ).json(),
    );
    expect(retained).toMatchObject({
      status: "failed",
      provider: "fake",
      concepts: [
        { id: result.concepts[0].id, label: "Photosynthesis", selected: false },
      ],
    });
    expect(
      await env.DB.prepare(
        "SELECT COUNT(*) AS count FROM ai_call_ledger WHERE user_id=? AND category='concepts'",
      )
        .bind("alice")
        .first("count"),
    ).toBe(2);
    expect(
      await env.DB.prepare(
        "SELECT operation_id,state FROM ai_call_ledger WHERE user_id=? AND task_kind='concepts' ORDER BY operation_id",
      )
        .bind("alice")
        .all(),
    ).toMatchObject({
      results: [
        { operation_id: requestId, state: "completed" },
        {
          operation_id: "55555555-5555-4555-8555-555555555555",
          state: "failed",
        },
      ],
    });
    expect(
      (await conceptCall(provider, `/${spaceId}`, cookie, { method: "DELETE" }))
        .status,
    ).toBe(204);
    for (const table of [
      "concept_relations",
      "concept_sources",
      "concepts",
      "concept_requests",
    ])
      expect(
        await env.DB.prepare(
          `SELECT count(*) AS count FROM ${table} WHERE user_id=? AND space_id=?`,
        )
          .bind("alice", spaceId)
          .first("count"),
      ).toBe(0);
  });

  it("rejects invented citations, missing evidence, other learners and cross-origin writes", async () => {
    const alice = await learner();
    const bob = await learner("bob");
    await upload(alice.spaceId, alice.cookie, material());
    const invalid: ConceptProvider = {
      generate: async () => ({
        schemaVersion: 1,
        concepts: [
          {
            title: "Invented",
            description: "Unsupported",
            sourceIds: ["invented"],
          },
        ],
        relations: [],
      }),
    };
    const input = JSON.stringify({
      schemaVersion: 1,
      requestId,
      selection: { startLocation: 2, endLocation: 2 },
    });
    expect(
      (
        await conceptCall(
          invalid,
          `/${alice.spaceId}/concepts/generate`,
          alice.cookie,
          { method: "POST", body: input },
        )
      ).status,
    ).toBe(409);
    expect(
      (await conceptCall(invalid, `/${alice.spaceId}/concepts`, bob.cookie))
        .status,
    ).toBe(404);
    const response = await conceptCall(
      invalid,
      `/${alice.spaceId}/concepts/generate`,
      alice.cookie,
      {
        method: "POST",
        body: JSON.stringify({
          schemaVersion: 1,
          requestId,
          selection: { startLocation: 1, endLocation: 1 },
        }),
        headers: { origin: "https://evil.example" },
      },
    );
    expect(response.status).toBe(403);
    const nonJson = await conceptCall(
      invalid,
      `/${alice.spaceId}/concepts/not-a-concept`,
      alice.cookie,
      {
        method: "PATCH",
        body: "{}",
        headers: { "content-type": "text/plain" },
      },
    );
    expect(nonJson.status).toBe(400);
    expect(await nonJson.json()).toEqual({ error: "Use a JSON request." });
  });

  it("records provider failure without leaking details and rejects a result after deletion", async () => {
    const first = await learner();
    await upload(first.spaceId, first.cookie, material());
    const broken: ConceptProvider = {
      generate: async () => {
        throw new Error("private source contents");
      },
    };
    const body = JSON.stringify({
      schemaVersion: 1,
      requestId,
      selection: { startLocation: 1, endLocation: 1 },
    });
    const failed = await conceptCall(
      broken,
      `/${first.spaceId}/concepts/generate`,
      first.cookie,
      { method: "POST", body },
    );
    expect(failed.status).toBe(503);
    expect(await failed.text()).not.toContain("private source contents");
    const state = await conceptCall(
      broken,
      `/${first.spaceId}/concepts`,
      first.cookie,
    );
    expect(conceptCollectionSchema.parse(await state.json())).toMatchObject({
      status: "failed",
      concepts: [],
    });

    const second = await learner("second");
    await upload(second.spaceId, second.cookie, material());
    const deleting: ConceptProvider = {
      generate: async (context) => {
        await env.DB.prepare(
          "UPDATE study_spaces SET deleted_at=? WHERE user_id=? AND id=?",
        )
          .bind(new Date().toISOString(), "second", second.spaceId)
          .run();
        return {
          schemaVersion: 1,
          concepts: [
            {
              title: "Late",
              description: "Late result",
              sourceIds: [context.chunks[0]!.id],
            },
          ],
          relations: [],
        };
      },
    };
    const late = await conceptCall(
      deleting,
      `/${second.spaceId}/concepts/generate`,
      second.cookie,
      { method: "POST", body },
    );
    expect(late.status).toBe(409);
    expect(
      await env.DB.prepare(
        "SELECT count(*) AS count FROM concepts WHERE user_id=?",
      )
        .bind("second")
        .first("count"),
    ).toBe(0);
  });
});
