import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import type { ActivityPackProvider } from "../packages/adapters/fake-activity-packs";
import { FakeActivityPackProvider } from "../packages/adapters/fake-activity-packs";
import {
  learnerActivityPackSchema,
  type ActivityContext,
} from "../packages/contracts/activity-packs";
import { createApp } from "../apps/worker/src/index";
import { learner, material, upload } from "./material-fixtures";

const requestId = "55555555-5555-4555-8555-555555555555";
async function seed() {
  const owner = await learner();
  const preview = material("Plants use light energy. Roots absorb water.");
  await upload(owner.spaceId, owner.cookie, preview);
  const conceptRequest = crypto.randomUUID();
  const ids = [crypto.randomUUID(), crypto.randomUUID()];
  await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO concept_requests(user_id,space_id,request_id,document_id,location,state) VALUES(?,?,?,?,1,'ready')",
    ).bind(owner.userId, owner.spaceId, conceptRequest, preview.documentId),
    ...ids.map((id, index) =>
      env.DB.prepare(
        "INSERT INTO concepts(user_id,space_id,id,request_id,title,label,description,selected) VALUES(?,?,?,?,?,?,?,1)",
      ).bind(
        owner.userId,
        owner.spaceId,
        id,
        conceptRequest,
        `Concept ${index + 1}`,
        `Concept ${index + 1}`,
        "Synthetic description",
      ),
    ),
    ...ids.map((id) =>
      env.DB.prepare(
        "INSERT INTO concept_sources(user_id,space_id,concept_id,chunk_id) VALUES(?,?,?,?)",
      ).bind(owner.userId, owner.spaceId, id, preview.chunks[0]!.id),
    ),
  ]);
  return { ...owner, preview, ids, conceptRequest };
}
function call(
  spaceId: string,
  cookie: string,
  provider: ActivityPackProvider,
  path = "/generate",
  init: RequestInit = {},
) {
  const headers = new Headers(init.headers);
  headers.set("cookie", cookie);
  if (!headers.has("origin")) headers.set("origin", env.APP_ORIGIN);
  if (!headers.has("content-type"))
    headers.set("content-type", "application/json");
  return createApp(undefined, provider).request(
    `http://localhost:8787/api/study-spaces/${spaceId}/activity-pack${path}`,
    {
      method: path ? "POST" : "GET",
      body: path ? JSON.stringify({ schemaVersion: 1, requestId }) : undefined,
      ...init,
      headers,
    },
    env,
  );
}
class RecordingProvider implements ActivityPackProvider {
  calls = 0;
  context?: ActivityContext;
  async generate(context: ActivityContext) {
    this.calls += 1;
    this.context = context;
    return new FakeActivityPackProvider().generate(context);
  }
}

describe("source-backed activity packs", () => {
  it("loads selected concepts and chunks server-side, persists, reloads and replays", async () => {
    const owner = await seed(),
      provider = new RecordingProvider();
    const first = await call(owner.spaceId, owner.cookie, provider);
    expect(first.status).toBe(200);
    const raw = await first.text();
    expect(raw).not.toContain('"rubric"');
    const pack = learnerActivityPackSchema.parse(JSON.parse(raw));
    expect(pack.questions).toHaveLength(3);
    expect(pack.questions[0]).toMatchObject({
      type: "recall",
      review: { supportedAnswer: owner.preview.chunks[0]!.text },
    });
    expect(pack.questions[2]?.type).toBe("explain");
    expect(
      new Set(pack.questions.flatMap((question) => question.conceptIds)).size,
    ).toBe(2);
    expect(provider.context).toMatchObject({
      materialId: owner.preview.documentId,
      conceptRequestId: owner.conceptRequest,
    });
    expect(provider.context?.concepts[0]?.sources[0]).toEqual({
      id: owner.preview.chunks[0]!.id,
      location: 1,
      start: 0,
      end: owner.preview.chunks[0]!.text.length,
      text: owner.preview.chunks[0]!.text,
    });
    expect((await call(owner.spaceId, owner.cookie, provider)).status).toBe(
      200,
    );
    expect(provider.calls).toBe(1);
    const reloaded = await call(owner.spaceId, owner.cookie, provider, "");
    expect(learnerActivityPackSchema.parse(await reloaded.json()).packId).toBe(
      pack.packId,
    );
    const canonical = await env.DB.prepare(
      "SELECT canonical_json FROM activity_packs WHERE user_id=? AND space_id=?",
    )
      .bind(owner.userId, owner.spaceId)
      .first<string>("canonical_json");
    expect(canonical).toContain("supportedAnswer");
  });

  it("rejects malformed citations and preserves the last ready pack on explicit failed retry", async () => {
    const owner = await seed();
    expect(
      (await call(owner.spaceId, owner.cookie, new FakeActivityPackProvider()))
        .status,
    ).toBe(200);
    const invalid: ActivityPackProvider = {
      generate: async (context) => {
        const pack = await new FakeActivityPackProvider().generate(context);
        pack.questions[0]!.sources[0] = {
          ...pack.questions[0]!.sources[0]!,
          text: "invented",
        };
        return pack;
      },
    };
    const response = await call(
      owner.spaceId,
      owner.cookie,
      invalid,
      "/generate",
      {
        body: JSON.stringify({
          schemaVersion: 1,
          requestId: crypto.randomUUID(),
        }),
      },
    );
    expect(response.status).toBe(503);
    const state = learnerActivityPackSchema.parse(
      await (await call(owner.spaceId, owner.cookie, invalid, "")).json(),
    );
    expect(state.status).toBe("failed");
    expect(state.questions).toHaveLength(3);
  });

  it("requires two selections, scopes ownership and rejects late selection changes", async () => {
    const owner = await seed();
    await env.DB.prepare(
      "UPDATE concepts SET selected=0 WHERE user_id=? AND space_id=? AND id=?",
    )
      .bind(owner.userId, owner.spaceId, owner.ids[1])
      .run();
    expect(
      (await call(owner.spaceId, owner.cookie, new FakeActivityPackProvider()))
        .status,
    ).toBe(409);
    const bob = await learner("bob");
    expect(
      (
        await call(
          owner.spaceId,
          bob.cookie,
          new FakeActivityPackProvider(),
          "",
        )
      ).status,
    ).toBe(404);
    await env.DB.prepare(
      "UPDATE concepts SET selected=1 WHERE user_id=? AND space_id=?",
    )
      .bind(owner.userId, owner.spaceId)
      .run();
    const changing: ActivityPackProvider = {
      generate: async (context) => {
        await env.DB.prepare(
          "UPDATE concepts SET selected=0 WHERE user_id=? AND space_id=? AND id=?",
        )
          .bind(owner.userId, owner.spaceId, owner.ids[1])
          .run();
        return new FakeActivityPackProvider().generate(context);
      },
    };
    expect((await call(owner.spaceId, owner.cookie, changing)).status).toBe(
      409,
    );
    expect(
      await env.DB.prepare(
        "SELECT count(*) AS count FROM activity_packs WHERE user_id=? AND space_id=?",
      )
        .bind(owner.userId, owner.spaceId)
        .first("count"),
    ).toBe(0);
  });

  it("emits a three-option MCQ only with three distinct saved excerpts", async () => {
    const owner = await seed();
    const additions = [
      {
        id: `${owner.preview.documentId}:1:100`,
        text: "Water supports plants.",
      },
      { id: `${owner.preview.documentId}:1:200`, text: "Roots anchor plants." },
    ];
    await env.DB.batch([
      ...additions.map((item, index) =>
        env.DB.prepare(
          "INSERT INTO material_chunks(user_id,space_id,id,document_id,location,start_offset,end_offset,text) VALUES(?,?,?,?,1,?,?,?)",
        ).bind(
          owner.userId,
          owner.spaceId,
          item.id,
          owner.preview.documentId,
          100 + index * 100,
          100 + index * 100 + item.text.length,
          item.text,
        ),
      ),
      env.DB.prepare(
        "INSERT INTO concept_sources(user_id,space_id,concept_id,chunk_id) VALUES(?,?,?,?)",
      ).bind(owner.userId, owner.spaceId, owner.ids[0], additions[0]!.id),
      env.DB.prepare(
        "INSERT INTO concept_sources(user_id,space_id,concept_id,chunk_id) VALUES(?,?,?,?)",
      ).bind(owner.userId, owner.spaceId, owner.ids[1], additions[1]!.id),
    ]);
    const response = await call(
      owner.spaceId,
      owner.cookie,
      new FakeActivityPackProvider(),
    );
    expect(response.status).toBe(200);
    const pack = learnerActivityPackSchema.parse(await response.json());
    expect(pack.questions[2]).toMatchObject({ type: "mcq" });
    expect(
      pack.questions[2]?.type === "mcq" && pack.questions[2].options,
    ).toHaveLength(3);
  });

  it("enforces write origin and content type and cascades packs on deletion", async () => {
    const owner = await seed(),
      provider = new FakeActivityPackProvider();
    expect(
      (
        await call(owner.spaceId, owner.cookie, provider, "/generate", {
          headers: { origin: "https://evil.example" },
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await call(owner.spaceId, owner.cookie, provider, "/generate", {
          headers: { "content-type": "text/plain" },
        })
      ).status,
    ).toBe(400);
    expect((await call(owner.spaceId, owner.cookie, provider)).status).toBe(
      200,
    );
    const deleted = await createApp().request(
      `http://localhost:8787/api/study-spaces/${owner.spaceId}`,
      {
        method: "DELETE",
        headers: { cookie: owner.cookie, origin: env.APP_ORIGIN },
      },
      env,
    );
    expect([202, 204]).toContain(deleted.status);
    for (const table of ["activity_packs", "activity_pack_requests"])
      expect(
        await env.DB.prepare(
          `SELECT count(*) AS count FROM ${table} WHERE user_id=? AND space_id=?`,
        )
          .bind(owner.userId, owner.spaceId)
          .first("count"),
      ).toBe(0);
  });
});
