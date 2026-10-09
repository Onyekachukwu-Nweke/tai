import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import {
  createStudySessionSchema,
  studySessionSchema,
} from "../../../packages/contracts/study-sessions";
import type { Clock } from "../../../packages/domain/concept-progress";
import type { Env, Variables } from "./env";
import {
  prepareStudySession,
  StudySessionFailure,
} from "./study-session-service";
import { loadLatestSession } from "./study-session-store";

export const studySessionRoutes = (clock: Clock) =>
  new Hono<{ Bindings: Env; Variables: Variables }>()
    .use(
      "/:id/study-session/*",
      bodyLimit({
        maxSize: 1_024,
        onError: (c) => c.json({ error: "Request is too large." }, 413),
      }),
    )
    .onError((error, c) =>
      error instanceof StudySessionFailure
        ? c.json({ error: error.message }, error.status)
        : c.json(
            { error: "The session could not be prepared. Retry explicitly." },
            503,
          ),
    )
    .get("/:id/study-session", async (c) =>
      c.json(
        studySessionSchema.parse(
          await loadLatestSession(c.env, c.get("user").id, c.req.param("id")),
        ),
      ),
    )
    .post("/:id/study-session", async (c) => {
      if (c.req.header("origin") !== c.env.APP_ORIGIN)
        throw new StudySessionFailure(403, "Request origin is not allowed.");
      if (
        c.req.header("content-type")?.split(";")[0]?.trim() !==
        "application/json"
      )
        throw new StudySessionFailure(400, "Use a JSON request.");
      const input = createStudySessionSchema.safeParse(
        await c.req.json().catch(() => null),
      );
      if (!input.success)
        throw new StudySessionFailure(400, "Choose a valid session setup.");
      return c.json(
        studySessionSchema.parse(
          await prepareStudySession(
            c.env,
            c.get("user").id,
            c.req.param("id"),
            input.data,
            clock,
          ),
        ),
        201,
      );
    });
