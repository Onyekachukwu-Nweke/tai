import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { FakePracticalTaskProvider } from "../packages/adapters/fake-practical-tasks";
import {
  practicalTaskStateSchema,
  type PracticalContext,
} from "../packages/contracts/practical-tasks";
import { createApp } from "../apps/worker/src/index";
import type { Env } from "../apps/worker/src/env";
import { learner, material, upload } from "./material-fixtures";

async function seed() {
  const owner = await learner(`boundary-${crypto.randomUUID()}`),
    preview = material();
  await upload(owner.spaceId, owner.cookie, preview);
  const conceptRequestId = crypto.randomUUID(),
    conceptId = crypto.randomUUID();
  await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO concept_requests(user_id,space_id,request_id,document_id,location,state) VALUES(?,?,?,?,1,'ready')",
    ).bind(owner.userId, owner.spaceId, conceptRequestId, preview.documentId),
    env.DB.prepare(
      "INSERT INTO concepts(user_id,space_id,id,request_id,title,label,description,selected) VALUES(?,?,?,?,?,?,?,1)",
    ).bind(
      owner.userId,
      owner.spaceId,
      conceptId,
      conceptRequestId,
      "Concept",
      "Concept",
      "Synthetic",
    ),
    env.DB.prepare(
      "INSERT INTO concept_sources(user_id,space_id,concept_id,chunk_id) VALUES(?,?,?,?)",
    ).bind(owner.userId, owner.spaceId, conceptId, preview.chunks[0]!.id),
  ]);
  return { ...owner, preview, conceptId };
}
class RecordingProvider extends FakePracticalTaskProvider {
  calls = 0;
  override async generate(context: PracticalContext) {
    this.calls += 1;
    return super.generate(context);
  }
}
function request(
  spaceId: string,
  cookie: string,
  conceptId: string,
  provider: FakePracticalTaskProvider,
  path = "/generate",
  bindings: Env = env,
  init: RequestInit = {},
) {
  const headers = new Headers(init.headers);
  headers.set("cookie", cookie);
  headers.set("origin", env.APP_ORIGIN);
  headers.set("content-type", "application/json");
  const app = createApp(
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    provider,
  );
  return app.request(
    `http://localhost:8787/api/study-spaces/${spaceId}/practical-task${path}`,
    {
      method: path ? "POST" : "GET",
      body: path
        ? JSON.stringify({
            schemaVersion: 1,
            requestId: crypto.randomUUID(),
            conceptIds: [conceptId],
          })
        : undefined,
      ...init,
      headers,
    },
    bindings,
  );
}

describe("practical task boundaries", () => {
  it("rejects an invented source reference", async () => {
    const owner = await seed();
    class InventingProvider extends RecordingProvider {
      override async generate(context: PracticalContext) {
        this.calls += 1;
        const draft = await new FakePracticalTaskProvider().generate(context);
        return { ...draft, sourceIds: ["invented-source"] };
      }
    }
    const provider = new InventingProvider();
    expect(
      (await request(owner.spaceId, owner.cookie, owner.conceptId, provider))
        .status,
    ).toBe(503);
    expect(provider.calls).toBe(1);
    expect(
      await env.DB.prepare(
        "SELECT COUNT(*) count FROM practical_tasks WHERE user_id=?",
      )
        .bind(owner.userId)
        .first("count"),
    ).toBe(0);
  });

  it("denies cross-owner reads and completion", async () => {
    const owner = await seed(),
      provider = new RecordingProvider();
    const ready = practicalTaskStateSchema.parse(
      await (
        await request(owner.spaceId, owner.cookie, owner.conceptId, provider)
      ).json(),
    );
    const other = await learner(`other-${crypto.randomUUID()}`);
    expect(
      (
        await request(
          owner.spaceId,
          other.cookie,
          owner.conceptId,
          provider,
          "",
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await request(
          owner.spaceId,
          other.cookie,
          owner.conceptId,
          provider,
          `/${ready.task!.id}/completion`,
          env,
          {
            method: "PUT",
            body: JSON.stringify({ schemaVersion: 1, completed: true }),
          },
        )
      ).status,
    ).toBe(404);
  });

  it("cascades practical data for space and account deletion", async () => {
    for (const deletion of ["space", "account"] as const) {
      const owner = await seed(),
        provider = new RecordingProvider();
      expect(
        (await request(owner.spaceId, owner.cookie, owner.conceptId, provider))
          .status,
      ).toBe(200);
      await env.DB.prepare(
        deletion === "space"
          ? "DELETE FROM study_spaces WHERE user_id=? AND id=?"
          : "DELETE FROM user WHERE id=?",
      )
        .bind(
          ...(deletion === "space"
            ? [owner.userId, owner.spaceId]
            : [owner.userId]),
        )
        .run();
      for (const table of ["practical_task_requests", "practical_tasks"])
        expect(
          await env.DB.prepare(
            `SELECT COUNT(*) count FROM ${table} WHERE user_id=?`,
          )
            .bind(owner.userId)
            .first("count"),
        ).toBe(0);
    }
  });

  it("blocks disabled and exhausted practical quotas before provider use", async () => {
    for (const mode of ["disabled", "exhausted"] as const) {
      const owner = await seed(),
        provider = new RecordingProvider();
      const bindings: Env = {
        ...env,
        AI_CALLS_ENABLED: mode === "disabled" ? "false" : "true",
        AI_DAILY_PRACTICAL_LIMIT:
          mode === "exhausted" ? "0" : env.AI_DAILY_PRACTICAL_LIMIT,
      };
      const response = await request(
        owner.spaceId,
        owner.cookie,
        owner.conceptId,
        provider,
        "/generate",
        bindings,
      );
      expect(response.status).toBe(mode === "disabled" ? 503 : 429);
      expect(provider.calls).toBe(0);
    }
  });
});
