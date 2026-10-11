import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { createApp } from "../apps/worker/src/index";
import {
  FakeActivityPackProvider,
  type ActivityPackProvider,
} from "../packages/adapters/fake-activity-packs";
import { learnerActivityPackSchema } from "../packages/contracts/activity-packs";
import type { ActivityContext } from "../packages/contracts/activity-packs";
import { learner, material, upload } from "./material-fixtures";

async function seed() {
  const owner = await learner();
  const preview = material("Plants use light. Roots absorb water.");
  await upload(owner.spaceId, owner.cookie, preview);
  const requestId = crypto.randomUUID();
  const conceptIds = [crypto.randomUUID(), crypto.randomUUID()];
  await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO concept_requests(user_id,space_id,request_id,document_id,location,state) VALUES(?,?,?,?,1,'ready')",
    ).bind(owner.userId, owner.spaceId, requestId, preview.documentId),
    ...conceptIds.map((id, index) =>
      env.DB.prepare(
        "INSERT INTO concepts(user_id,space_id,id,request_id,title,label,description,selected) VALUES(?,?,?,?,?,?,?,1)",
      ).bind(
        owner.userId,
        owner.spaceId,
        id,
        requestId,
        `Concept ${index}`,
        `Concept ${index}`,
        "Synthetic description",
      ),
    ),
    ...conceptIds.map((id) =>
      env.DB.prepare(
        "INSERT INTO concept_sources(user_id,space_id,concept_id,chunk_id) VALUES(?,?,?,?)",
      ).bind(owner.userId, owner.spaceId, id, preview.chunks[0]!.id),
    ),
  ]);
  return owner;
}

function generate(
  spaceId: string,
  cookie: string,
  provider: ActivityPackProvider,
) {
  return createApp(undefined, provider).request(
    `http://localhost:8787/api/study-spaces/${spaceId}/activity-pack/generate`,
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
      }),
    },
    env,
  );
}

class LiveMetadataProvider implements ActivityPackProvider {
  readonly metadata = {
    provider: "workers_ai" as const,
    model: "@cf/example/model",
    promptVersion: "activity-pack-v1",
    schemaVersion: 1 as const,
  };

  generate(context: ActivityContext) {
    return new FakeActivityPackProvider().generate(context);
  }
}

describe("activity-pack provider provenance", () => {
  it("retains successful provenance after a failed retry", async () => {
    const owner = await seed();
    const ready = learnerActivityPackSchema.parse(
      await (
        await generate(owner.spaceId, owner.cookie, new LiveMetadataProvider())
      ).json(),
    );
    expect(ready.provider).toBe("workers_ai");
    expect(
      await env.DB.prepare(
        "SELECT provider,model,prompt_version FROM activity_pack_requests WHERE user_id=? AND space_id=?",
      )
        .bind(owner.userId, owner.spaceId)
        .first<Record<string, string>>(),
    ).toMatchObject({
      provider: "workers_ai",
      model: "@cf/example/model",
      prompt_version: "activity-pack-v1",
    });

    const failing: ActivityPackProvider = {
      metadata: new FakeActivityPackProvider().metadata,
      generate: async () => {
        throw new Error("provider unavailable");
      },
    };
    expect((await generate(owner.spaceId, owner.cookie, failing)).status).toBe(
      503,
    );
    const reloaded = learnerActivityPackSchema.parse(
      await (
        await createApp(undefined, failing).request(
          `http://localhost:8787/api/study-spaces/${owner.spaceId}/activity-pack`,
          { headers: { cookie: owner.cookie } },
          env,
        )
      ).json(),
    );
    expect(reloaded).toMatchObject({
      provider: "workers_ai",
      status: "failed",
    });
    expect(reloaded.questions).toHaveLength(ready.questions.length);
  });
});
