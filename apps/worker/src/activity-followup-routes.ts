import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { z } from "zod";
import type { ActivityFollowupProvider } from "../../../packages/adapters/fake-activity-followup";
import {
  activityFollowupRequestSchema,
  activityFollowupStateSchema,
} from "../../../packages/contracts/activity-followup";
import type { Clock } from "../../../packages/domain/concept-progress";
import { currentPackExists } from "./activity-attempt-store";
import { generateFollowup, FollowupFailure } from "./activity-followup-service";
import { loadFollowupState } from "./activity-followup-store";
import type { Env, Variables } from "./env";
import { aiCallErrorResponse } from "./ai-quota-http";

export const activityFollowupRoutes = (
  provider: ActivityFollowupProvider,
  clock: Clock,
) =>
  new Hono<{ Bindings: Env; Variables: Variables }>()
    .use(
      "/:id/activity-followup/*",
      bodyLimit({
        maxSize: 2_048,
        onError: (c) => c.json({ error: "Request is too large." }, 413),
      }),
    )
    .onError((error, c) => {
      const quota = aiCallErrorResponse(c, error);
      if (quota) return quota;
      return error instanceof FollowupFailure
        ? c.json({ error: error.message }, error.status)
        : c.json(
            { error: "Follow-up could not be prepared. Retry explicitly." },
            503,
          );
    })
    .get("/:id/activity-followup", async (c) => {
      const packId = z.string().uuid().safeParse(c.req.query("packId"));
      if (!packId.success)
        throw new FollowupFailure(400, "Provide a valid pack ID.");
      if (
        !(await currentPackExists(
          c.env,
          c.get("user").id,
          c.req.param("id"),
          packId.data,
        ))
      )
        throw new FollowupFailure(
          404,
          "The current activity pack was not found.",
        );
      return c.json(
        activityFollowupStateSchema.parse({
          schemaVersion: 1,
          packId: packId.data,
          followups: await loadFollowupState(
            c.env,
            c.get("user").id,
            c.req.param("id"),
            packId.data,
          ),
        }),
      );
    })
    .post("/:id/activity-followup", async (c) => {
      if (c.req.header("origin") !== c.env.APP_ORIGIN)
        throw new FollowupFailure(403, "Request origin is not allowed.");
      if (
        c.req.header("content-type")?.split(";")[0]?.trim() !==
        "application/json"
      )
        throw new FollowupFailure(400, "Use a JSON request.");
      const parsed = activityFollowupRequestSchema.safeParse(
        await c.req.json().catch(() => null),
      );
      if (!parsed.success)
        throw new FollowupFailure(400, "Provide a valid follow-up request.");
      return c.json(
        await generateFollowup(
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
