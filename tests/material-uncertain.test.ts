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

describe("uncertain material side effects", () => {
  it("keeps a committed original if D1 status reads fail and resolves on explicit replay", async () => {
    const { cookie, spaceId } = await learner();
    const preview = material();
    let reads = 0;
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
                        if (++reads >= 3)
                          throw new Error("Synthetic status-read outage");
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
    expect((await env.ORIGINALS.list()).objects).toHaveLength(1);
    expect((await upload(spaceId, cookie, preview)).status).toBe(200);
    expect(await (await call(`/${spaceId}/material`, cookie)).json()).toEqual({
      schemaVersion: 1,
      material: preview,
    });
  });

  it("retains the cleanup ledger if both commit and object cleanup fail", async () => {
    const { cookie, spaceId } = await learner();
    const preview = material();
    const bucket = withBucket({
      delete: async () => {
        throw new Error("Synthetic delete failure");
      },
    });
    const database = withDatabase({
      batch: async () => {
        throw new Error("Synthetic commit failure");
      },
    });
    expect(
      (
        await upload(spaceId, cookie, preview, {
          ...database,
          ORIGINALS: bucket.ORIGINALS,
        })
      ).status,
    ).toBe(503);
    expect(
      await env.DB.prepare(
        "SELECT state FROM material_imports WHERE user_id = ? AND space_id = ?",
      )
        .bind("alice", spaceId)
        .first("state"),
    ).toBe("cleanup");
    expect((await env.ORIGINALS.list()).objects).toHaveLength(1);
    expect((await upload(spaceId, cookie, preview)).status).toBe(201);
    expect((await env.ORIGINALS.list()).objects).toHaveLength(1);
  });

  it("allows a fresh explicit retry after a failed original put", async () => {
    const { cookie, spaceId } = await learner();
    const preview = material();
    const bindings = withBucket({
      put: async () => {
        throw new Error("Synthetic upload failure");
      },
    });
    expect((await upload(spaceId, cookie, preview, bindings)).status).toBe(503);
    expect((await env.ORIGINALS.list()).objects).toHaveLength(0);
    expect((await upload(spaceId, cookie, preview)).status).toBe(201);
  });
});
