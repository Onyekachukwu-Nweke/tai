import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import app from "../apps/worker/src/index";
import { seedSession } from "./auth-fixtures";

function request(path: string, cookie?: string, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  if (cookie) headers.set("cookie", cookie);
  return app.request(`http://localhost:8787${path}`, { ...init, headers }, env);
}

function create(
  cookie: string,
  body: unknown = { schemaVersion: 1, title: " Biology " },
  origin = env.APP_ORIGIN,
) {
  return request("/api/study-spaces", cookie, {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("Worker foundation", () => {
  it("reports health without requiring credentials", async () => {
    const result = await app.request(
      "/api/health",
      {},
      { ...env, BETTER_AUTH_SECRET: undefined },
    );
    expect(result.status).toBe(200);
    expect(result.headers.get("cache-control")).toBe("no-store");
  });

  it("fails closed when auth configuration is missing", async () => {
    const result = await app.request(
      "/api/study-spaces",
      {},
      { ...env, GOOGLE_CLIENT_SECRET: undefined },
    );
    expect(result.status).toBe(503);
  });

  it("rejects unauthenticated access and returns a nullable session", async () => {
    expect((await request("/api/study-spaces")).status).toBe(401);
    expect(
      (await request("/api/study-spaces", undefined, { method: "POST" }))
        .status,
    ).toBe(401);
    expect(await (await request("/api/session")).json()).toEqual({
      schemaVersion: 1,
      user: null,
    });
  });

  it("uses real stored sessions and exposes only the projected identity", async () => {
    const cookie = await seedSession("alice");
    const result = await request("/api/session", cookie);
    expect(await result.json()).toEqual({
      schemaVersion: 1,
      user: { id: "alice", name: "Learner alice", email: "alice@example.test" },
    });
    expect(
      (await request("/api/study-spaces", `${cookie}tampered`)).status,
    ).toBe(401);
    expect(
      (await request("/api/study-spaces", await seedSession("expired", true)))
        .status,
    ).toBe(401);
  });

  it("persists owned spaces and hides another learner’s IDs", async () => {
    const alice = await seedSession("alice");
    const bob = await seedSession("bob");
    const created = await create(alice);
    expect(created.status).toBe(201);
    const body = (await created.json()) as {
      space: { id: string; title: string };
    };
    expect(body.space.title).toBe("Biology");
    expect(await (await request("/api/study-spaces", bob)).json()).toEqual({
      schemaVersion: 1,
      spaces: [],
    });
    expect(
      (await request(`/api/study-spaces/${body.space.id}`, bob)).status,
    ).toBe(404);
    expect(
      (await request(`/api/study-spaces/${body.space.id}`, alice)).status,
    ).toBe(200);
    const list = (await (await request("/api/study-spaces", alice)).json()) as {
      spaces: unknown[];
    };
    expect(list.spaces).toHaveLength(1);
    await env.DB.prepare(
      "UPDATE study_spaces SET deleted_at = ? WHERE id = ? AND user_id = ?",
    )
      .bind(new Date().toISOString(), body.space.id, "alice")
      .run();
    expect(
      (await request(`/api/study-spaces/${body.space.id}`, alice)).status,
    ).toBe(404);
    expect(await (await request("/api/study-spaces", alice)).json()).toEqual({
      schemaVersion: 1,
      spaces: [],
    });
  });

  it("rejects cross-origin, missing-origin, malformed and excessive input without writing", async () => {
    const cookie = await seedSession("alice");
    expect(
      (await create(cookie, undefined, "https://evil.example")).status,
    ).toBe(403);
    expect((await create(cookie, undefined, "")).status).toBe(403);
    for (const body of [
      { schemaVersion: 1, title: " " },
      { schemaVersion: 1, title: "a".repeat(121) },
      { schemaVersion: 1, title: "A", userId: "bob" },
      { schemaVersion: 2, title: "A" },
    ]) {
      expect((await create(cookie, body)).status).toBe(400);
    }
    expect(
      (
        await request("/api/study-spaces", cookie, {
          method: "POST",
          headers: {
            origin: env.APP_ORIGIN,
            "content-type": "application/json",
          },
          body: "{",
        })
      ).status,
    ).toBe(400);
    expect(
      (await create(cookie, { schemaVersion: 1, title: "a".repeat(3000) }))
        .status,
    ).toBe(413);
    expect(
      (
        await request("/api/study-spaces", cookie, {
          method: "POST",
          headers: { origin: env.APP_ORIGIN },
          body: "title=A",
        })
      ).status,
    ).toBe(415);
    expect(await (await request("/api/study-spaces", cookie)).json()).toEqual({
      schemaVersion: 1,
      spaces: [],
    });
  });
});
