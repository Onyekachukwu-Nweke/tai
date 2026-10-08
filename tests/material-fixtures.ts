import { env } from "cloudflare:test";
import app from "../apps/worker/src/index";
import type { Env } from "../apps/worker/src/env";
import { materialPreviewSchema } from "../packages/contracts/materials";
import { buildChunks } from "../apps/web/src/material/chunks";
import { seedSession } from "./auth-fixtures";

export async function learner(id = "alice") {
  const cookie = await seedSession(id);
  const spaceId = crypto.randomUUID();
  await env.DB.prepare(
    "INSERT INTO study_spaces (id,user_id,title,created_at) VALUES (?, ?, 'Synthetic study', ?)",
  )
    .bind(spaceId, id, new Date().toISOString())
    .run();
  return { cookie, spaceId, userId: id };
}
export function material(
  text = "Plants use light energy.",
  documentId: string = crypto.randomUUID(),
) {
  const sections = [{ location: 1, text }];
  return materialPreviewSchema.parse({
    schemaVersion: 1,
    documentId,
    filename: "notes.txt",
    format: "txt",
    sections,
    chunks: buildChunks(documentId, sections),
    warnings: [],
  });
}
export function multipart(
  preview: unknown,
  file = new File(["Plants use light energy."], "notes.txt", {
    type: "text/plain",
  }),
) {
  const form = new FormData();
  form.set("original", file);
  form.set("preview", JSON.stringify(preview));
  return form;
}
export function call(
  path: string,
  cookie: string,
  init: RequestInit = {},
  bindings: Env = env,
) {
  const headers = new Headers(init.headers);
  headers.set("cookie", cookie);
  if (!headers.has("origin")) headers.set("origin", env.APP_ORIGIN);
  return app.request(
    `http://localhost:8787/api/study-spaces${path}`,
    { ...init, headers },
    bindings,
  );
}
export function upload(
  spaceId: string,
  cookie: string,
  preview = material(),
  bindings: Env = env,
) {
  return call(
    `/${spaceId}/material`,
    cookie,
    {
      method: "POST",
      body: multipart(
        preview,
        new File([preview.sections[0]!.text], preview.filename, {
          type: "text/plain",
        }),
      ),
    },
    bindings,
  );
}
export function withBucket(overrides: Partial<R2Bucket>): Env {
  return {
    ...env,
    ORIGINALS: new Proxy(env.ORIGINALS, {
      get(target, property) {
        if (Object.hasOwn(overrides, property))
          return Reflect.get(overrides, property);
        const value: unknown = Reflect.get(target, property, target);
        return typeof value === "function" ? value.bind(target) : value;
      },
    }),
  };
}
export function withDatabase(overrides: Partial<D1Database>): Env {
  return {
    ...env,
    DB: new Proxy(env.DB, {
      get(target, property) {
        if (Object.hasOwn(overrides, property))
          return Reflect.get(overrides, property);
        const value: unknown = Reflect.get(target, property, target);
        return typeof value === "function" ? value.bind(target) : value;
      },
    }),
  };
}
