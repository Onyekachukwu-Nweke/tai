import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { call, learner, material, upload } from "./material-fixtures";

describe("private material persistence", () => {
  it("stores source references and original across requests with idempotent upload", async () => {
    const { cookie, spaceId } = await learner();
    const preview = material();
    expect(await (await call(`/${spaceId}/material`, cookie)).json()).toEqual({
      schemaVersion: 1,
      material: null,
    });
    expect((await upload(spaceId, cookie, preview)).status).toBe(201);
    expect(await (await call(`/${spaceId}/material`, cookie)).json()).toEqual({
      schemaVersion: 1,
      material: preview,
    });
    expect((await upload(spaceId, cookie, preview)).status).toBe(200);
    const original = await call(`/${spaceId}/material/original`, cookie);
    expect(original.status).toBe(200);
    expect(original.headers.get("content-disposition")).toContain(
      "attachment;",
    );
    expect(original.headers.get("cache-control")).toContain("no-store");
    expect(await original.text()).toBe(preview.sections[0]!.text);
    expect((await env.ORIGINALS.list()).objects).toHaveLength(1);
    expect(
      (
        await upload(
          spaceId,
          cookie,
          material("Different content", preview.documentId),
        )
      ).status,
    ).toBe(409);
    expect((await upload(spaceId, cookie, material())).status).toBe(409);
    expect((await env.ORIGINALS.list()).objects).toHaveLength(1);
  });

  it("rejects unauthenticated, cross-user and cross-origin operations", async () => {
    const alice = await learner();
    const bob = await learner("bob");
    expect((await upload(alice.spaceId, "", material())).status).toBe(401);
    expect((await upload(alice.spaceId, alice.cookie)).status).toBe(201);
    for (const suffix of ["/material", "/material/original"])
      expect(
        (await call(`/${alice.spaceId}${suffix}`, bob.cookie)).status,
      ).toBe(404);
    expect((await upload(alice.spaceId, bob.cookie)).status).toBe(404);
    expect(
      (await call(`/${alice.spaceId}`, bob.cookie, { method: "DELETE" }))
        .status,
    ).toBe(404);
    expect(
      (
        await call(`/${alice.spaceId}`, alice.cookie, {
          method: "DELETE",
          headers: { origin: "https://evil.example" },
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await call(`/${alice.spaceId}/material`, alice.cookie, {
          method: "POST",
          headers: { origin: "" },
        })
      ).status,
    ).toBe(403);
  });

  it("tombstones before cleanup and removes source rows and original idempotently", async () => {
    const { cookie, spaceId } = await learner();
    const preview = material();
    await upload(spaceId, cookie, preview);
    expect(
      (await call(`/${spaceId}`, cookie, { method: "DELETE" })).status,
    ).toBe(204);
    expect(
      (await call(`/${spaceId}`, cookie, { method: "DELETE" })).status,
    ).toBe(204);
    expect((await call(`/${spaceId}/material`, cookie)).status).toBe(404);
    expect((await call(`/${spaceId}/material/original`, cookie)).status).toBe(
      404,
    );
    expect((await upload(spaceId, cookie, preview)).status).toBe(404);
    expect((await env.ORIGINALS.list()).objects).toHaveLength(0);
    for (const table of [
      "material_chunks",
      "material_sections",
      "material_imports",
    ]) {
      expect(
        await env.DB.prepare(
          `SELECT count(*) AS count FROM ${table} WHERE user_id = ? AND space_id = ?`,
        )
          .bind("alice", spaceId)
          .first("count"),
      ).toBe(0);
    }
  });
});
