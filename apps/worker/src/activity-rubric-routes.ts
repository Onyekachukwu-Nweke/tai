import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { z } from "zod";
import type { ActivityRubricProvider } from "../../../packages/adapters/fake-activity-rubric";
import {
  activityRubricRequestSchema,
  activityRubricStateSchema,
} from "../../../packages/contracts/activity-rubric";
import type { Clock } from "../../../packages/domain/concept-progress";
import { currentPackExists } from "./activity-attempt-store";
import { gradeExplanation, RubricFailure } from "./activity-rubric-service";
import { loadRubricState } from "./activity-rubric-store";
import type { Env, Variables } from "./env";

export const activityRubricRoutes = (
  provider: ActivityRubricProvider,
  clock: Clock,
) =>
  new Hono<{ Bindings: Env; Variables: Variables }>()
    .use(
      "/:id/activity-rubric/*",
      bodyLimit({
        maxSize: 2_048,
        onError: (c) => c.json({ error: "Request is too large." }, 413),
      }),
    )
    .onError((error, c) =>
      error instanceof RubricFailure
        ? c.json({ error: error.message }, error.status)
        : c.json(
            {
              error: "Rubric feedback could not be prepared. Retry explicitly.",
            },
            503,
          ),
    )
    .get("/:id/activity-rubric", async (c) => {
      const packId = z.string().uuid().safeParse(c.req.query("packId"));
      if (!packId.success)
        throw new RubricFailure(400, "Provide a valid pack ID.");
      if (
        !(await currentPackExists(
          c.env,
          c.get("user").id,
          c.req.param("id"),
          packId.data,
        ))
      )
        throw new RubricFailure(
          404,
          "The current activity pack was not found.",
        );
      return c.json(
        activityRubricStateSchema.parse({
          schemaVersion: 1,
          packId: packId.data,
          grades: await loadRubricState(
            c.env,
            c.get("user").id,
            c.req.param("id"),
            packId.data,
          ),
        }),
      );
    })
    .post("/:id/activity-rubric", async (c) => {
      if (c.req.header("origin") !== c.env.APP_ORIGIN)
        throw new RubricFailure(403, "Request origin is not allowed.");
      if (
        c.req.header("content-type")?.split(";")[0]?.trim() !==
        "application/json"
      )
        throw new RubricFailure(400, "Use a JSON request.");
      const parsed = activityRubricRequestSchema.safeParse(
        await c.req.json().catch(() => null),
      );
      if (!parsed.success)
        throw new RubricFailure(400, "Provide a valid grading request.");
      return c.json(
        await gradeExplanation(
          c.env,
          provider,
          c.get("user").id,
          c.req.param("id"),
          parsed.data,
          clock,
        ),
        201,
      );
    });
