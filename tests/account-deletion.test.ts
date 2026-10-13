import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import type { ConceptProvider } from "../packages/adapters/fake-concepts";
import type { ConceptDraftResult } from "../packages/contracts/concepts";
import { createApp } from "../apps/worker/src/index";
import type { Env } from "../apps/worker/src/env";
import {
  learner,
  material,
  upload,
  withBucket,
  withDatabase,
} from "./material-fixtures";

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => (resolve = done));
  return { promise, resolve };
}

function accountCall(
  cookie?: string,
  bindings: Env = env,
  origin: string | null = env.APP_ORIGIN,
) {
  const headers = new Headers();
  if (origin) headers.set("origin", origin);
  if (cookie) headers.set("cookie", cookie);
  return createApp().request(
    "http://localhost:8787/api/account",
    { method: "DELETE", headers },
    bindings,
  );
}

function deferredProvider() {
  let release!: (result: ConceptDraftResult) => void;
  let entered!: () => void;
  const started = new Promise<void>((resolve) => (entered = resolve));
  const result = new Promise<ConceptDraftResult>(
    (resolve) => (release = resolve),
  );
  const provider: ConceptProvider = {
    async generate() {
      entered();
      return result;
    },
  };
  return { provider, started, release };
}

async function conceptRequest(
  provider: ConceptProvider,
  cookie: string,
  spaceId: string,
) {
  return createApp(provider).request(
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
        requestId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        selection: { startLocation: 1, endLocation: 1 },
      }),
    },
    env,
  );
}

describe("account data deletion", () => {
  it("rejects unauthenticated and cross-origin requests without changing data", async () => {
    const alice = await learner();
    expect((await accountCall()).status).toBe(401);
    expect(
      (await accountCall(alice.cookie, env, "https://evil.example")).status,
    ).toBe(403);
    expect((await accountCall(alice.cookie, env, null)).status).toBe(403);
    expect(
      await env.DB.prepare(
        "SELECT count(*) AS count FROM user WHERE id='alice'",
      ).first("count"),
    ).toBe(1);
  });

  it("deletes only the owner, their recorded original and dependent D1 rows", async () => {
    const alice = await learner();
    const bob = await learner("bob");
    const secondAliceSpace = crypto.randomUUID();
    await env.DB.prepare(
      "INSERT INTO study_spaces(id,user_id,title,created_at) VALUES(?,'alice','Second study',?)",
    )
      .bind(secondAliceSpace, new Date().toISOString())
      .run();
    await upload(alice.spaceId, alice.cookie);
    await upload(
      secondAliceSpace,
      alice.cookie,
      material("Alice owns another source."),
    );
    await upload(bob.spaceId, bob.cookie, material("Bob owns this."));
    const now = new Date().toISOString();
    await env.DB.prepare(
      "INSERT INTO account(id,accountId,providerId,userId,createdAt,updatedAt) VALUES('alice-google','alice-provider','google','alice',?,?)",
    )
      .bind(now, now)
      .run();
    await env.DB.prepare(
      "INSERT INTO ai_call_ledger(user_id,task_kind,operation_id,category,utc_day,state,created_at,updated_at) VALUES('alice','hint','op-a','support','2026-10-10','completed',?,?)",
    )
      .bind(new Date().toISOString(), new Date().toISOString())
      .run();

    expect((await accountCall(alice.cookie)).status).toBe(204);
    expect((await env.ORIGINALS.list()).objects).toHaveLength(1);
    for (const table of [
      "user",
      "session",
      "account",
      "study_spaces",
      "material_imports",
      "material_sections",
      "material_chunks",
      "ai_call_ledger",
      "account_deletions",
    ])
      expect(
        await env.DB.prepare(
          `SELECT count(*) AS count FROM ${table} WHERE ${table === "session" || table === "account" ? "userId" : table === "user" ? "id" : "user_id"}=?`,
        )
          .bind("alice")
          .first("count"),
      ).toBe(0);
    expect(
      await env.DB.prepare(
        "SELECT count(*) AS count FROM user WHERE id='bob'",
      ).first("count"),
    ).toBe(1);
    expect((await accountCall(alice.cookie)).status).toBe(401);
    expect((await accountCall(bob.cookie)).status).toBe(204);
  });

  it("retains identity for explicit retry after R2 failure", async () => {
    const alice = await learner();
    await upload(alice.spaceId, alice.cookie);
    const unavailable = withBucket({
      delete: async () => {
        throw new Error("Synthetic R2 outage");
      },
    });
    const pending = await accountCall(alice.cookie, unavailable);
    expect(pending.status).toBe(202);
    expect(await pending.json()).toEqual({
      schemaVersion: 1,
      cleanupPending: true,
    });
    expect(
      await env.DB.prepare("SELECT deleted_at FROM study_spaces WHERE id=?")
        .bind(alice.spaceId)
        .first("deleted_at"),
    ).toEqual(expect.any(String));
    expect(
      await env.DB.prepare(
        "SELECT count(*) AS count FROM user WHERE id='alice'",
      ).first("count"),
    ).toBe(1);
    expect((await accountCall(alice.cookie)).status).toBe(204);
  });

  it("fences an active writer and completes without manual reconciliation", async () => {
    const alice = await learner();
    const entered = deferred();
    const release = deferred();
    const bindings = withBucket({
      put: async (...args: Parameters<R2Bucket["put"]>) => {
        entered.resolve();
        await release.promise;
        return env.ORIGINALS.put(...args);
      },
    });
    const saving = upload(alice.spaceId, alice.cookie, material(), bindings);
    await entered.promise;
    expect((await accountCall(alice.cookie)).status).toBe(202);
    expect(
      await env.DB.prepare(
        "SELECT state FROM material_imports WHERE user_id='alice' AND space_id=?",
      )
        .bind(alice.spaceId)
        .first("state"),
    ).toBe("cleanup");
    expect((await accountCall(alice.cookie)).status).toBe(202);
    expect(
      await env.DB.prepare(
        "SELECT state FROM material_imports WHERE user_id='alice' AND space_id=?",
      )
        .bind(alice.spaceId)
        .first("state"),
    ).toBe("cleanup");
    expect(
      await env.DB.prepare(
        "SELECT count(*) AS count FROM user WHERE id='alice'",
      ).first("count"),
    ).toBe(1);
    release.resolve();
    expect((await saving).status).toBe(503);
    expect(
      await env.DB.prepare(
        "SELECT state FROM material_imports WHERE user_id='alice' AND space_id=?",
      )
        .bind(alice.spaceId)
        .first("state"),
    ).toBe("failed");
    expect((await env.ORIGINALS.list()).objects).toHaveLength(0);
    expect((await accountCall(alice.cookie)).status).toBe(204);
    expect((await env.ORIGINALS.list()).objects).toHaveLength(0);
  });

  it("atomically refuses space and material reservations after a fence race", async () => {
    const alice = await learner();
    let raced = false;
    const bindings = withDatabase({
      prepare(sql) {
        const statement = env.DB.prepare(sql);
        if (raced || sql !== "SELECT 1 FROM account_deletions WHERE user_id=?")
          return statement;
        return new Proxy(statement, {
          get(target, property) {
            if (property !== "bind")
              return Reflect.get(target, property, target);
            return (...values: unknown[]) => {
              const bound = target.bind(...values);
              return new Proxy(bound, {
                get(inner, key) {
                  if (key !== "first") return Reflect.get(inner, key, inner);
                  return async () => {
                    raced = true;
                    await env.DB.prepare(
                      "INSERT INTO account_deletions(user_id,started_at) VALUES(?,?)",
                    )
                      .bind("alice", new Date().toISOString())
                      .run();
                    return null;
                  };
                },
              });
            };
          },
        });
      },
    });
    const created = await createApp().request(
      "http://localhost:8787/api/study-spaces",
      {
        method: "POST",
        headers: {
          cookie: alice.cookie,
          origin: env.APP_ORIGIN,
          "content-type": "application/json",
        },
        body: JSON.stringify({ schemaVersion: 1, title: "Too late" }),
      },
      bindings,
    );
    expect(created.status).toBe(410);
    expect(
      await env.DB.prepare(
        "SELECT count(*) AS count FROM study_spaces WHERE user_id='alice'",
      ).first("count"),
    ).toBe(1);

    await env.DB.prepare(
      "DELETE FROM account_deletions WHERE user_id='alice'",
    ).run();
    raced = false;
    const reserved = await upload(
      alice.spaceId,
      alice.cookie,
      material(),
      bindings,
    );
    expect(reserved.status).toBe(409);
    expect(
      await env.DB.prepare(
        "SELECT count(*) AS count FROM material_imports WHERE user_id='alice'",
      ).first("count"),
    ).toBe(0);
    expect((await env.ORIGINALS.list()).objects).toHaveLength(0);
  });

  it("rejects a representative late AI result after account deletion", async () => {
    const alice = await learner();
    const preview = material();
    await upload(alice.spaceId, alice.cookie, preview);
    const pending = deferredProvider();
    const generation = conceptRequest(
      pending.provider,
      alice.cookie,
      alice.spaceId,
    );
    await pending.started;
    expect((await accountCall(alice.cookie)).status).toBe(204);
    pending.release({
      schemaVersion: 1,
      concepts: [
        {
          title: "Late concept",
          description: "Must not survive deletion.",
          sourceIds: [preview.chunks[0]!.id],
        },
      ],
      relations: [],
    });
    expect((await generation).status).toBe(409);
    expect(
      await env.DB.prepare(
        "SELECT count(*) AS count FROM concepts WHERE user_id='alice'",
      ).first("count"),
    ).toBe(0);
  });
});
