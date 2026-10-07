import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import {
  createStudySpaceSchema,
  type StudySpace,
} from "../../../packages/contracts/study-spaces";
import type { Env, Variables } from "./env";

export const studySpaces = new Hono<{ Bindings: Env; Variables: Variables }>();

studySpaces.get("/", async (c) => {
  const rows = await c.env.DB.prepare(
    "SELECT id, title, created_at AS createdAt FROM study_spaces WHERE user_id = ? AND deleted_at IS NULL ORDER BY created_at DESC, id DESC",
  )
    .bind(c.get("user").id)
    .all<StudySpace>();
  return c.json({ schemaVersion: 1, spaces: rows.results });
});

studySpaces.get("/:id", async (c) => {
  const space = await c.env.DB.prepare(
    "SELECT id, title, created_at AS createdAt FROM study_spaces WHERE id = ? AND user_id = ? AND deleted_at IS NULL",
  )
    .bind(c.req.param("id"), c.get("user").id)
    .first<StudySpace>();
  if (!space) return c.json({ error: "Study space not found." }, 404);
  return c.json({ schemaVersion: 1, space });
});

studySpaces.post(
  "/",
  bodyLimit({
    maxSize: 2048,
    onError: (c) => c.json({ error: "Request is too large." }, 413),
  }),
  async (c) => {
    if (c.req.header("origin") !== c.env.APP_ORIGIN) {
      return c.json({ error: "Request origin is not allowed." }, 403);
    }
    if (
      c.req.header("content-type")?.split(";")[0]?.trim() !== "application/json"
    ) {
      return c.json({ error: "Use a JSON request." }, 415);
    }
    let input: unknown;
    try {
      input = await c.req.json();
    } catch {
      return c.json({ error: "Invalid JSON." }, 400);
    }
    const parsed = createStudySpaceSchema.safeParse(input);
    if (!parsed.success)
      return c.json(
        {
          error:
            "Provide a title between 1 and 120 characters and schemaVersion 1.",
        },
        400,
      );
    const space = {
      id: crypto.randomUUID(),
      title: parsed.data.title,
      createdAt: new Date().toISOString(),
    };
    await c.env.DB.prepare(
      "INSERT INTO study_spaces (id, user_id, title, created_at, schema_version) VALUES (?, ?, ?, ?, 1)",
    )
      .bind(space.id, c.get("user").id, space.title, space.createdAt)
      .run();
    return c.json({ schemaVersion: 1, space }, 201);
  },
);
