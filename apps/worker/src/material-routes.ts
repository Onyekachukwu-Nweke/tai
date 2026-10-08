import { Hono } from "hono";
import type { Env, Variables } from "./env";
import { deleteSpace } from "./material-deletion";
import { MaterialFailure } from "./material-input";
import { activeSpace, getImport, getMaterial } from "./material-store";
import { uploadMaterial } from "./material-upload";

export const materialRoutes = new Hono<{
  Bindings: Env;
  Variables: Variables;
}>();
materialRoutes.use("*", async (c, next) => {
  if (
    (c.req.method === "POST" || c.req.method === "DELETE") &&
    c.req.header("origin") !== c.env.APP_ORIGIN
  )
    return c.json({ error: "Request origin is not allowed." }, 403);
  await next();
});
materialRoutes.onError((error, c) => {
  if (error instanceof MaterialFailure)
    return c.json({ error: error.message }, error.status);
  return c.json(
    {
      error:
        "The material request could not be completed. Keep your preview and retry explicitly.",
    },
    503,
  );
});
materialRoutes.post("/:id/material", async (c) => {
  const result = await uploadMaterial(
    c.env,
    c.get("user").id,
    c.req.param("id"),
    c.req.raw,
  );
  return c.json(
    { schemaVersion: 1, material: result.material },
    result.created ? 201 : 200,
  );
});
materialRoutes.get("/:id/material", async (c) => {
  const userId = c.get("user").id;
  const spaceId = c.req.param("id");
  if (!(await activeSpace(c.env, userId, spaceId)))
    throw new MaterialFailure(404, "Study space not found.");
  return c.json({
    schemaVersion: 1,
    material: await getMaterial(c.env, userId, spaceId),
  });
});
materialRoutes.get("/:id/material/original", async (c) => {
  const userId = c.get("user").id;
  const spaceId = c.req.param("id");
  if (!(await activeSpace(c.env, userId, spaceId)))
    throw new MaterialFailure(404, "Study space not found.");
  const record = await getImport(c.env, userId, spaceId);
  if (record?.state !== "ready")
    throw new MaterialFailure(404, "No saved original is available.");
  const original = await c.env.ORIGINALS.get(record.object_key);
  if (!original || !(await activeSpace(c.env, userId, spaceId)))
    throw new MaterialFailure(404, "No saved original is available.");
  return new Response(original.body, {
    headers: {
      "Content-Type":
        record.format === "pdf"
          ? "application/pdf"
          : "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="material.${record.format}"; filename*=UTF-8''${encodeURIComponent(record.filename).replace(/['()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
});
materialRoutes.delete("/:id", async (c) => {
  const complete = await deleteSpace(
    c.env,
    c.get("user").id,
    c.req.param("id"),
  );
  return complete
    ? c.body(null, 204)
    : c.json({ schemaVersion: 1, cleanupPending: true }, 202);
});
