import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import {
  createStudySpaceSchema,
  type StudySpace,
} from "../../../packages/contracts/study-spaces";
import type { Env, Variables } from "./env";
import { materialRoutes } from "./material-routes";
import type { ConceptProvider } from "../../../packages/adapters/fake-concepts";
import { conceptRoutes } from "./concept-routes";
import type { ActivityPackProvider } from "../../../packages/adapters/fake-activity-packs";
import { activityPackRoutes } from "./activity-pack-routes";
import { activityAttemptRoutes } from "./activity-attempt-routes";
import type { Clock } from "../../../packages/domain/concept-progress";
import { conceptProgressRoutes } from "./concept-progress-routes";
import { studySessionRoutes } from "./study-session-routes";
import { recoverySessionRoutes } from "./recovery-session-routes";

export function createStudySpaces(
  provider: ConceptProvider,
  activityProvider: ActivityPackProvider,
  clock: Clock,
) {
  const studySpaces = new Hono<{ Bindings: Env; Variables: Variables }>();

  studySpaces.get("/", async (c) => {
    const rows = await c.env.DB.prepare(
      "SELECT id, title, created_at AS createdAt, deleted_at FROM study_spaces WHERE user_id = ? AND (deleted_at IS NULL OR EXISTS (SELECT 1 FROM material_imports m WHERE m.user_id = study_spaces.user_id AND m.space_id = study_spaces.id)) ORDER BY created_at DESC, id DESC",
    )
      .bind(c.get("user").id)
      .all<StudySpace & { deleted_at: string | null }>();
    return c.json({
      schemaVersion: 1,
      spaces: rows.results.map(({ deleted_at, ...space }) =>
        deleted_at ? { ...space, deletionPending: true } : space,
      ),
    });
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
        c.req.header("content-type")?.split(";")[0]?.trim() !==
        "application/json"
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

  studySpaces.route("/", materialRoutes);
  studySpaces.route("/", conceptRoutes(provider));
  studySpaces.route("/", activityPackRoutes(activityProvider));
  studySpaces.route("/", activityAttemptRoutes(clock));
  studySpaces.route("/", conceptProgressRoutes(clock));
  studySpaces.route("/", studySessionRoutes(clock));
  studySpaces.route("/", recoverySessionRoutes(clock));
  return studySpaces;
}
