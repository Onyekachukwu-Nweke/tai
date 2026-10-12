import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { z } from "zod";
import type { ActivityTutorProvider } from "../../../packages/adapters/fake-activity-tutor";
import {
  activityTutorRequestSchema,
  activityTutorStateSchema,
} from "../../../packages/contracts/activity-tutor";
import type { Clock } from "../../../packages/domain/concept-progress";
import { currentPackExists } from "./activity-attempt-store";
import type { Env, Variables } from "./env";
import { requestTutorHelp, TutorFailure } from "./activity-tutor-service";
import { loadTutorState } from "./activity-tutor-store";
import { aiCallErrorResponse } from "./ai-quota-http";
import { activityTutorProviderForEnv } from "./activity-tutor-provider";

export const activityTutorRoutes = (
  provider: ActivityTutorProvider | undefined,
  clock: Clock,
) =>
  new Hono<{ Bindings: Env; Variables: Variables }>()
    .use(
      "/:id/activity-tutor/*",
      bodyLimit({
        maxSize: 2_048,
        onError: (c) => c.json({ error: "Request is too large." }, 413),
      }),
    )
    .onError((error, c) => {
      const quota = aiCallErrorResponse(c, error);
      if (quota) return quota;
      return error instanceof TutorFailure
        ? c.json({ error: error.message }, error.status)
        : c.json(
            { error: "Tutor help could not be prepared. Retry explicitly." },
            503,
          );
    })
    .get("/:id/activity-tutor", async (c) => {
      const packId = z.string().uuid().safeParse(c.req.query("packId"));
      if (!packId.success)
        throw new TutorFailure(400, "Provide a valid pack ID.");
      if (
        !(await currentPackExists(
          c.env,
          c.get("user").id,
          c.req.param("id"),
          packId.data,
        ))
      )
        throw new TutorFailure(404, "The current activity pack was not found.");
      return c.json(
        activityTutorStateSchema.parse({
          schemaVersion: 1,
          packId: packId.data,
          interactions: await loadTutorState(
            c.env,
            c.get("user").id,
            c.req.param("id"),
            packId.data,
          ),
        }),
      );
    })
    .post("/:id/activity-tutor", async (c) => {
      if (c.req.header("origin") !== c.env.APP_ORIGIN)
        throw new TutorFailure(403, "Request origin is not allowed.");
      if (
        c.req.header("content-type")?.split(";")[0]?.trim() !==
        "application/json"
      )
        throw new TutorFailure(400, "Use a JSON request.");
      const parsed = activityTutorRequestSchema.safeParse(
        await c.req.json().catch(() => null),
      );
      if (!parsed.success)
        throw new TutorFailure(400, "Provide a valid tutor request.");
      return c.json(
        await requestTutorHelp(
          c.env,
          provider ?? activityTutorProviderForEnv(c.env),
          c.get("user").id,
          c.req.param("id"),
          parsed.data,
          clock,
        ),
        201,
      );
    });
