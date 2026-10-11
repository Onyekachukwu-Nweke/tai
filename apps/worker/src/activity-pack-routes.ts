import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { ActivityPackProvider } from "../../../packages/adapters/fake-activity-packs";
import { generateActivityPackSchema } from "../../../packages/contracts/activity-packs";
import type { Env, Variables } from "./env";
import { loadLearnerPack } from "./activity-pack-store";
import {
  ActivityPackFailure,
  generateActivityPack,
} from "./activity-pack-service";
import { activeSpace } from "./material-store";
import { aiCallErrorResponse } from "./ai-quota-http";
import type { Clock } from "../../../packages/domain/concept-progress";
import { activityPackProviderForEnv } from "./activity-pack-provider";

export function activityPackRoutes(
  provider: ActivityPackProvider | undefined,
  clock: Clock,
) {
  const routes = new Hono<{ Bindings: Env; Variables: Variables }>();
  routes.use(
    "/:id/activity-pack/*",
    bodyLimit({
      maxSize: 1_024,
      onError: (c) => c.json({ error: "Request is too large." }, 413),
    }),
  );
  routes.onError((error, c) => {
    const quota = aiCallErrorResponse(c, error);
    if (quota) return quota;
    return error instanceof ActivityPackFailure
      ? c.json({ error: error.message }, error.status)
      : c.json(
          {
            error:
              "The activity request could not be completed. Retry explicitly.",
          },
          503,
        );
  });
  routes.get("/:id/activity-pack", async (c) => {
    const userId = c.get("user").id,
      spaceId = c.req.param("id");
    if (!(await activeSpace(c.env, userId, spaceId)))
      throw new ActivityPackFailure(404, "Study space not found.");
    return c.json(await loadLearnerPack(c.env, userId, spaceId));
  });
  routes.post("/:id/activity-pack/generate", async (c) => {
    if (c.req.header("origin") !== c.env.APP_ORIGIN)
      throw new ActivityPackFailure(403, "Request origin is not allowed.");
    if (
      c.req.header("content-type")?.split(";")[0]?.trim() !== "application/json"
    )
      throw new ActivityPackFailure(400, "Use a JSON request.");
    const parsed = generateActivityPackSchema.safeParse(
      await c.req.json().catch(() => null),
    );
    if (!parsed.success)
      throw new ActivityPackFailure(400, "Provide a valid request ID.");
    return c.json(
      await generateActivityPack(
        c.env,
        provider ?? activityPackProviderForEnv(c.env),
        c.get("user").id,
        c.req.param("id"),
        parsed.data.requestId,
        clock,
      ),
    );
  });
  return routes;
}
