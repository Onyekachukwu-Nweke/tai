import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { createApp } from "../apps/worker/src/index";
import { resourceCatalog } from "../packages/content/resource-catalog";
import { matchResources } from "../packages/domain/resource-matcher";
import { learner, material, upload } from "./material-fixtures";

const concept = (label: string, description = "") => ({
  id: crypto.randomUUID(),
  label,
  title: label,
  description,
});

async function request(spaceId: string, cookie: string) {
  return createApp().request(
    `http://localhost:8787/api/study-spaces/${spaceId}/resources`,
    { headers: { cookie } },
    env,
  );
}

async function seedCurrentConcept(
  userId: string,
  spaceId: string,
  cookie: string,
  state: "pending" | "ready",
  selected: boolean,
) {
  expect(
    (await upload(spaceId, cookie, material("Project management basics")))
      .status,
  ).toBe(201);
  const requestId = crypto.randomUUID();
  await env.DB.prepare(
    "INSERT INTO concept_requests(user_id,space_id,request_id,document_id,location,state) VALUES(?,?,?,?,1,?)",
  )
    .bind(userId, spaceId, requestId, crypto.randomUUID(), state)
    .run();
  await env.DB.prepare(
    "INSERT INTO concepts(user_id,space_id,id,request_id,title,label,description,selected) VALUES(?,?,?,?,?,?,?,?)",
  )
    .bind(
      userId,
      spaceId,
      crypto.randomUUID(),
      requestId,
      "Project management",
      "Project management",
      "Planning a project",
      Number(selected),
    )
    .run();
}

describe("resource catalog boundaries", () => {
  it("has unique stable IDs and URLs with safe HTTPS destinations", () => {
    const ids = resourceCatalog.map(({ id }) => id);
    const urls = resourceCatalog.map(({ url }) => url);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(urls).size).toBe(urls.length);
    for (const value of urls) {
      const url = new URL(value);
      expect(url.protocol).toBe("https:");
      expect(url.username).toBe("");
      expect(url.password).toBe("");
      expect(url.hostname).not.toBe("");
    }
  });

  it("normalizes Unicode and punctuation without partial-word matches", () => {
    const result = matchResources(
      [concept("ＪＡＶＡＳＣＲＩＰＴ—functions"), concept("Probabilities")],
      resourceCatalog,
    );
    expect(result.recommendations.map(({ id }) => id)).toEqual([
      "mdn-javascript-guide",
    ]);
    expect(result.unmatchedConcepts).toHaveLength(1);
  });

  it("returns resources only for selected concepts in a ready request", async () => {
    const ready = await learner("ready-resource-owner");
    await seedCurrentConcept(
      "ready-resource-owner",
      ready.spaceId,
      ready.cookie,
      "ready",
      false,
    );
    expect(
      await (await request(ready.spaceId, ready.cookie)).json(),
    ).toMatchObject({ recommendations: [], unmatchedConcepts: [] });

    const pending = await learner("pending-resource-owner");
    await seedCurrentConcept(
      "pending-resource-owner",
      pending.spaceId,
      pending.cookie,
      "pending",
      true,
    );
    expect(
      await (await request(pending.spaceId, pending.cookie)).json(),
    ).toMatchObject({ recommendations: [], unmatchedConcepts: [] });
  });

  it("treats a soft-deleted owner space as absent", async () => {
    const owner = await learner("deleted-resource-owner");
    await env.DB.prepare(
      "UPDATE study_spaces SET deleted_at=? WHERE user_id=? AND id=?",
    )
      .bind(new Date().toISOString(), "deleted-resource-owner", owner.spaceId)
      .run();
    expect((await request(owner.spaceId, owner.cookie)).status).toBe(404);
  });
});
