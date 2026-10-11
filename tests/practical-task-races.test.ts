import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { FakePracticalTaskProvider } from "../packages/adapters/fake-practical-tasks";
import {
  practicalTaskStateSchema,
  type PracticalContext,
} from "../packages/contracts/practical-tasks";
import { createApp } from "../apps/worker/src/index";
import { systemClock, type Clock } from "../packages/domain/concept-progress";
import { learner, material, upload } from "./material-fixtures";

async function seed() {
  const owner = await learner(`race-${crypto.randomUUID()}`),
    preview = material();
  await upload(owner.spaceId, owner.cookie, preview);
  const requestId = crypto.randomUUID(),
    conceptId = crypto.randomUUID();
  await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO concept_requests(user_id,space_id,request_id,document_id,location,state) VALUES(?,?,?,?,1,'ready')",
    ).bind(owner.userId, owner.spaceId, requestId, preview.documentId),
    env.DB.prepare(
      "INSERT INTO concepts(user_id,space_id,id,request_id,title,label,description,selected) VALUES(?,?,?,?,?,?,?,1)",
    ).bind(
      owner.userId,
      owner.spaceId,
      conceptId,
      requestId,
      "Concept",
      "Concept",
      "Synthetic",
    ),
    env.DB.prepare(
      "INSERT INTO concept_sources(user_id,space_id,concept_id,chunk_id) VALUES(?,?,?,?)",
    ).bind(owner.userId, owner.spaceId, conceptId, preview.chunks[0]!.id),
  ]);
  return { ...owner, conceptId };
}
function call(
  owner: Awaited<ReturnType<typeof seed>>,
  provider: FakePracticalTaskProvider,
  requestId = "77777777-7777-4777-8777-777777777777",
  path = "/generate",
  init: RequestInit = {},
  clock: Clock = systemClock,
) {
  const headers = new Headers(init.headers);
  headers.set("cookie", owner.cookie);
  headers.set("origin", env.APP_ORIGIN);
  headers.set("content-type", "application/json");
  const app = createApp(
    undefined,
    undefined,
    clock,
    undefined,
    undefined,
    undefined,
    undefined,
    provider,
  );
  return app.request(
    `http://localhost:8787/api/study-spaces/${owner.spaceId}/practical-task${path}`,
    {
      method: path ? "POST" : "GET",
      body: path
        ? JSON.stringify({
            schemaVersion: 1,
            requestId,
            conceptIds: [owner.conceptId],
          })
        : undefined,
      ...init,
      headers,
    },
    env,
  );
}

describe("practical task request ownership", () => {
  it("does not render or complete after the selected concept becomes stale", async () => {
    const owner = await seed(),
      provider = new FakePracticalTaskProvider();
    const ready = practicalTaskStateSchema.parse(
      await (await call(owner, provider)).json(),
    );
    await env.DB.prepare(
      "UPDATE concepts SET selected=0 WHERE user_id=? AND space_id=? AND id=?",
    )
      .bind(owner.userId, owner.spaceId, owner.conceptId)
      .run();
    expect(
      practicalTaskStateSchema.parse(
        await (await call(owner, provider, "ignored", "")).json(),
      ),
    ).toMatchObject({ status: "empty", task: null });
    expect(
      (
        await call(
          owner,
          provider,
          "ignored",
          `/${ready.task!.id}/completion`,
          {
            method: "PUT",
            body: JSON.stringify({ schemaVersion: 1, completed: true }),
          },
        )
      ).status,
    ).toBe(404);
  });

  it("replays same-ID pending work and conflicts a different ID", async () => {
    const owner = await seed();
    let release!: () => void,
      entered!: () => void,
      calls = 0;
    const started = new Promise<void>((resolve) => {
        entered = resolve;
      }),
      blocked = new Promise<void>((resolve) => {
        release = resolve;
      });
    class BlockedProvider extends FakePracticalTaskProvider {
      override async generate(context: PracticalContext) {
        calls++;
        entered();
        await blocked;
        return super.generate(context);
      }
    }
    const provider = new BlockedProvider(),
      first = call(owner, provider);
    await started;
    expect(
      practicalTaskStateSchema.parse(await (await call(owner, provider)).json())
        .status,
    ).toBe("pending");
    expect((await call(owner, provider, crypto.randomUUID())).status).toBe(409);
    expect(calls).toBe(1);
    release();
    expect((await first).status).toBe(200);
    expect(calls).toBe(1);
    expect(
      await env.DB.prepare(
        "SELECT COUNT(*) count FROM ai_call_ledger WHERE user_id=? AND task_kind='practical'",
      )
        .bind(owner.userId)
        .first("count"),
    ).toBe(1);
  });

  it("takes over a five-minute stale request and rejects its late result", async () => {
    const owner = await seed();
    let release!: () => void,
      entered!: () => void,
      calls = 0,
      now = new Date("2026-10-11T09:00:00.000Z");
    const clock: Clock = { now: () => new Date(now) };
    const started = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const blocked = new Promise<void>((resolve) => {
      release = resolve;
    });
    class TakeoverProvider extends FakePracticalTaskProvider {
      override async generate(context: PracticalContext) {
        calls += 1;
        if (calls === 1) {
          entered();
          await blocked;
        }
        return super.generate(context);
      }
    }
    const provider = new TakeoverProvider();
    const first = call(
      owner,
      provider,
      "77777777-7777-4777-8777-777777777777",
      "/generate",
      {},
      clock,
    );
    await started;
    now = new Date(now.getTime() + 5 * 60_000);
    const replacementId = crypto.randomUUID();
    expect(
      (await call(owner, provider, replacementId, "/generate", {}, clock))
        .status,
    ).toBe(200);
    expect(calls).toBe(2);
    release();
    expect((await first).status).toBe(409);
    expect(
      await env.DB.prepare(
        "SELECT request_id FROM practical_task_requests WHERE user_id=?",
      )
        .bind(owner.userId)
        .first("request_id"),
    ).toBe(replacementId);
    expect(
      await env.DB.prepare(
        "SELECT COUNT(*) count FROM practical_tasks WHERE user_id=?",
      )
        .bind(owner.userId)
        .first("count"),
    ).toBe(1);
    const ledger = await env.DB.prepare(
      "SELECT state FROM ai_call_ledger WHERE user_id=? AND task_kind='practical' ORDER BY created_at",
    )
      .bind(owner.userId)
      .all<{ state: string }>();
    expect(ledger.results.map(({ state }) => state).sort()).toEqual([
      "completed",
      "failed",
    ]);
  });
});
