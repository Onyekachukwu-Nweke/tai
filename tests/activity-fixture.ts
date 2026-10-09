import { env } from "cloudflare:test";
import { FakeActivityPackProvider } from "../packages/adapters/fake-activity-packs";
import { learnerActivityPackSchema } from "../packages/contracts/activity-packs";
import { createApp } from "../apps/worker/src/index";
import { learner, material, upload } from "./material-fixtures";

export async function createActivityFixture() {
  const owner = await learner();
  const preview = material(
    "A cart travels 120 metres in 10 seconds. Speed equals distance divided by time.",
  );
  await upload(owner.spaceId, owner.cookie, preview);
  const request = crypto.randomUUID();
  const ids = [crypto.randomUUID(), crypto.randomUUID()];
  const extra = ["Water supports plants.", "Roots anchor plants."].map(
    (text, index) => ({
      id: `${preview.documentId}:1:${100 + index * 100}`,
      text,
      start: 100 + index * 100,
    }),
  );
  await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO concept_requests(user_id,space_id,request_id,document_id,location,state) VALUES(?,?,?,?,1,'ready')",
    ).bind(owner.userId, owner.spaceId, request, preview.documentId),
    ...ids.map((id, index) =>
      env.DB.prepare(
        "INSERT INTO concepts(user_id,space_id,id,request_id,title,label,description,selected) VALUES(?,?,?,?,?,?,?,1)",
      ).bind(
        owner.userId,
        owner.spaceId,
        id,
        request,
        `C${index}`,
        `C${index}`,
        "Synthetic",
      ),
    ),
    ...extra.map((item) =>
      env.DB.prepare(
        "INSERT INTO material_chunks(user_id,space_id,id,document_id,location,start_offset,end_offset,text) VALUES(?,?,?,?,1,?,?,?)",
      ).bind(
        owner.userId,
        owner.spaceId,
        item.id,
        preview.documentId,
        item.start,
        item.start + item.text.length,
        item.text,
      ),
    ),
    env.DB.prepare(
      "INSERT INTO concept_sources(user_id,space_id,concept_id,chunk_id) VALUES(?,?,?,?)",
    ).bind(owner.userId, owner.spaceId, ids[0], preview.chunks[0]!.id),
    env.DB.prepare(
      "INSERT INTO concept_sources(user_id,space_id,concept_id,chunk_id) VALUES(?,?,?,?)",
    ).bind(owner.userId, owner.spaceId, ids[0], extra[0]!.id),
    env.DB.prepare(
      "INSERT INTO concept_sources(user_id,space_id,concept_id,chunk_id) VALUES(?,?,?,?)",
    ).bind(owner.userId, owner.spaceId, ids[1], extra[1]!.id),
  ]);
  let now = new Date("2026-01-01T00:00:00.000Z");
  const call = (path: string, body?: unknown, cookie = owner.cookie) =>
    createApp(undefined, new FakeActivityPackProvider(), {
      now: () => now,
    }).request(
      `http://localhost:8787/api/study-spaces/${owner.spaceId}${path}`,
      {
        method: body ? "POST" : "GET",
        body: body ? JSON.stringify(body) : undefined,
        headers: {
          ...(cookie ? { cookie } : {}),
          origin: env.APP_ORIGIN,
          "content-type": "application/json",
        },
      },
      env,
    );
  const generated = await call("/activity-pack/generate", {
    schemaVersion: 1,
    requestId: crypto.randomUUID(),
  });
  const pack = learnerActivityPackSchema.parse(await generated.json());
  const base = (questionId: string, attemptId = crypto.randomUUID()) => ({
    schemaVersion: 1 as const,
    attemptId,
    packId: pack.packId!,
    questionId,
    confidence: "medium" as const,
  });
  return {
    owner,
    pack,
    base,
    call,
    setNow: (value: string) => {
      now = new Date(value);
    },
  };
}
