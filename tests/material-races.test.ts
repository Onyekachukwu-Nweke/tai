import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import {
  call,
  learner,
  material,
  upload,
  withBucket,
  withDatabase,
} from "./material-fixtures";

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe("material failure and race recovery", () => {
  it("does not duplicate an in-flight put and rejects late commit after deletion", async () => {
    const { cookie, spaceId } = await learner();
    const preview = material();
    const entered = deferred();
    const release = deferred();
    const bindings = withBucket({
      put: async (...args: Parameters<R2Bucket["put"]>) => {
        entered.resolve();
        await release.promise;
        return env.ORIGINALS.put(...args);
      },
    });
    const saving = upload(spaceId, cookie, preview, bindings);
    await entered.promise;
    expect((await upload(spaceId, cookie, preview)).status).toBe(409);
    expect(
      (await call(`/${spaceId}`, cookie, { method: "DELETE" })).status,
    ).toBe(202);
    expect(await (await call("", cookie)).json()).toMatchObject({
      spaces: [{ id: spaceId, deletionPending: true }],
    });
    release.resolve();
    expect((await saving).status).toBe(503);
    expect((await env.ORIGINALS.list()).objects).toHaveLength(0);
    expect(
      (await call(`/${spaceId}`, cookie, { method: "DELETE" })).status,
    ).toBe(204);
    expect(await (await call("", cookie)).json()).toEqual({
      schemaVersion: 1,
      spaces: [],
    });
  });

  it("retains cleanup evidence on R2 failure and completes explicit delete retry", async () => {
    const { cookie, spaceId } = await learner();
    await upload(spaceId, cookie);
    const bindings = withBucket({
      delete: async () => {
        throw new Error("Synthetic R2 outage");
      },
    });
    expect(
      (await call(`/${spaceId}`, cookie, { method: "DELETE" }, bindings))
        .status,
    ).toBe(202);
    expect((await call(`/${spaceId}/material`, cookie)).status).toBe(404);
    expect((await env.ORIGINALS.list()).objects).toHaveLength(1);
    expect(
      (await call(`/${spaceId}`, cookie, { method: "DELETE" })).status,
    ).toBe(204);
    expect((await env.ORIGINALS.list()).objects).toHaveLength(0);
  });

  it("cleans uncommitted R2 data after D1 failure and allows same-payload retry", async () => {
    const { cookie, spaceId } = await learner();
    const preview = material();
    const bindings = withDatabase({
      batch: async () => {
        throw new Error("Synthetic D1 outage");
      },
    });
    expect((await upload(spaceId, cookie, preview, bindings)).status).toBe(503);
    expect((await env.ORIGINALS.list()).objects).toHaveLength(0);
    expect(
      await env.DB.prepare(
        "SELECT state FROM material_imports WHERE user_id = ? AND space_id = ?",
      )
        .bind("alice", spaceId)
        .first("state"),
    ).toBe("failed");
    expect((await upload(spaceId, cookie, preview)).status).toBe(201);
  });

  it("does not delete a committed object after a lost D1 commit acknowledgement", async () => {
    const { cookie, spaceId } = await learner();
    const preview = material();
    const bindings = withDatabase({
      batch: async (statements) => {
        await env.DB.batch(statements);
        throw new Error("Synthetic lost acknowledgement");
      },
    });
    expect((await upload(spaceId, cookie, preview, bindings)).status).toBe(200);
    expect((await env.ORIGINALS.list()).objects).toHaveLength(1);
    expect(await (await call(`/${spaceId}/material`, cookie)).json()).toEqual({
      schemaVersion: 1,
      material: preview,
    });
  });

  it("reconciles a reserved write whose acknowledgement was lost before R2 put", async () => {
    const { cookie, spaceId } = await learner();
    const bindings = withDatabase({
      prepare(sql) {
        const statement = env.DB.prepare(sql);
        if (!sql.startsWith("INSERT INTO material_imports")) return statement;
        return new Proxy(statement, {
          get(target, property) {
            if (property === "bind")
              return (...values: unknown[]) => {
                const bound = target.bind(...values);
                return new Proxy(bound, {
                  get(inner, key) {
                    if (key === "run")
                      return async () => {
                        await inner.run();
                        throw new Error(
                          "Synthetic lost reserve acknowledgement",
                        );
                      };
                    const value: unknown = Reflect.get(inner, key, inner);
                    return typeof value === "function"
                      ? value.bind(inner)
                      : value;
                  },
                });
              };
            const value: unknown = Reflect.get(target, property, target);
            return typeof value === "function" ? value.bind(target) : value;
          },
        });
      },
    });
    expect((await upload(spaceId, cookie, material(), bindings)).status).toBe(
      201,
    );
    expect((await env.ORIGINALS.list()).objects).toHaveLength(1);
  });
  it("releases only its own reservation when confirmation fails before put", async () => {
    const { cookie, spaceId } = await learner();
    const preview = material();
    let importReads = 0;
    const bindings = withDatabase({
      prepare(sql) {
        const statement = env.DB.prepare(sql);
        if (!sql.startsWith("SELECT document_id")) return statement;
        return new Proxy(statement, {
          get(target, property) {
            if (property === "bind")
              return (...values: unknown[]) => {
                const bound = target.bind(...values);
                return new Proxy(bound, {
                  get(inner, key) {
                    if (key === "first")
                      return async () => {
                        if (++importReads === 2)
                          throw new Error(
                            "Synthetic confirmation read failure",
                          );
                        return inner.first();
                      };
                    const value: unknown = Reflect.get(inner, key, inner);
                    return typeof value === "function"
                      ? value.bind(inner)
                      : value;
                  },
                });
              };
            const value: unknown = Reflect.get(target, property, target);
            return typeof value === "function" ? value.bind(target) : value;
          },
        });
      },
    });
    expect((await upload(spaceId, cookie, preview, bindings)).status).toBe(503);
    expect((await env.ORIGINALS.list()).objects).toHaveLength(0);
    expect(
      await env.DB.prepare(
        "SELECT count(*) AS count FROM material_imports WHERE user_id = ? AND space_id = ?",
      )
        .bind("alice", spaceId)
        .first("count"),
    ).toBe(0);
    expect((await upload(spaceId, cookie, preview)).status).toBe(201);
  });
});
