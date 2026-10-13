import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { createApp } from "../apps/worker/src/index";
import { resourceRecommendationsSchema } from "../packages/contracts/resources";
import { learner, material, upload } from "./material-fixtures";

async function seedConcept(
  userId: string,
  spaceId: string,
  cookie: string,
  label: string,
  selected = true,
) {
  const preview = material(`Introduction to ${label}`);
  expect((await upload(spaceId, cookie, preview)).status).toBe(201);
  const requestId = crypto.randomUUID();
  await env.DB.prepare(
    "INSERT INTO concept_requests(user_id,space_id,request_id,document_id,location,state) VALUES(?,?,?,?,1,'ready')",
  )
    .bind(userId, spaceId, requestId, preview.documentId)
    .run();
  await env.DB.prepare(
    "INSERT INTO concepts(user_id,space_id,id,request_id,title,label,description,selected) VALUES(?,?,?,?,?,?,?,?)",
  )
    .bind(
      userId,
      spaceId,
      crypto.randomUUID(),
      requestId,
      label,
      label,
      `Introduction to ${label}`,
      Number(selected),
    )
    .run();
}

const request = (spaceId: string, cookie?: string) =>
  createApp().request(
    `http://localhost:8787/api/study-spaces/${spaceId}/resources`,
    { headers: cookie ? { cookie } : undefined },
    env,
  );

describe("supplementary resource route", () => {
  it("matches only the signed-in learner's currently selected concepts", async () => {
    const alice = await learner("alice");
    await seedConcept(
      "alice",
      alice.spaceId,
      alice.cookie,
      "Project management",
    );
    const ignoredSpace = await learner("bob");
    await seedConcept(
      "bob",
      ignoredSpace.spaceId,
      ignoredSpace.cookie,
      "JavaScript",
    );

    const response = await request(alice.spaceId, alice.cookie);
    expect(response.status).toBe(200);
    const result = resourceRecommendationsSchema.parse(await response.json());
    expect(result.recommendations).toHaveLength(1);
    expect(result.recommendations[0]).toMatchObject({
      id: "openlearn-project-management",
      supportedConcept: { label: "Project management" },
    });
  });

  it("returns honest no-match and blocks unauthenticated or cross-user reads", async () => {
    const alice = await learner("alice");
    const bob = await learner("bob");
    await seedConcept("alice", alice.spaceId, alice.cookie, "Medieval poetry");
    const result = resourceRecommendationsSchema.parse(
      await (await request(alice.spaceId, alice.cookie)).json(),
    );
    expect(result.recommendations).toEqual([]);
    expect(result.unmatchedConcepts[0]?.label).toBe("Medieval poetry");
    expect((await request(alice.spaceId, bob.cookie)).status).toBe(404);
    expect((await request(alice.spaceId)).status).toBe(401);
  });

  it.each(["pending", "failed"])(
    "returns no concepts while the current request is %s",
    async (state) => {
      const owner = await learner(`resource-${state}`);
      await seedConcept(
        owner.userId,
        owner.spaceId,
        owner.cookie,
        "Project management",
      );
      await env.DB.prepare(
        "UPDATE concept_requests SET state=? WHERE user_id=? AND space_id=?",
      )
        .bind(state, owner.userId, owner.spaceId)
        .run();
      expect(
        await (await request(owner.spaceId, owner.cookie)).json(),
      ).toMatchObject({ recommendations: [], unmatchedConcepts: [] });
    },
  );

  it("excludes deselected, stale-request and wrong-material concepts", async () => {
    const owner = await learner("resource-boundaries");
    await seedConcept(
      owner.userId,
      owner.spaceId,
      owner.cookie,
      "Project management",
      false,
    );
    const empty = async () =>
      expect(
        await (await request(owner.spaceId, owner.cookie)).json(),
      ).toMatchObject({ recommendations: [], unmatchedConcepts: [] });
    await empty();
    await env.DB.prepare(
      "UPDATE concepts SET selected=1,request_id=? WHERE user_id=? AND space_id=?",
    )
      .bind(crypto.randomUUID(), owner.userId, owner.spaceId)
      .run();
    await empty();
    await env.DB.prepare(
      "UPDATE concepts SET request_id=(SELECT request_id FROM concept_requests WHERE user_id=? AND space_id=?) WHERE user_id=? AND space_id=?",
    )
      .bind(owner.userId, owner.spaceId, owner.userId, owner.spaceId)
      .run();
    await env.DB.prepare(
      "UPDATE concept_requests SET document_id=? WHERE user_id=? AND space_id=?",
    )
      .bind(crypto.randomUUID(), owner.userId, owner.spaceId)
      .run();
    await empty();
  });
});
