import { Hono, type Context } from "hono";
import { bodyLimit } from "hono/body-limit";
import { z } from "zod";
import type { ActivityFollowupGradeProvider } from "../../../packages/adapters/fake-activity-followup-grade";
import {
  followupAttemptRequestSchema,
  followupGradeRequestSchema,
  followupGradeStateSchema,
} from "../../../packages/contracts/activity-followup-grade";
import type { Clock } from "../../../packages/domain/concept-progress";
import { currentPackExists } from "./activity-attempt-store";
import {
  FollowupGradeFailure,
  gradeFollowup,
  saveFollowupAttempt,
} from "./activity-followup-grade-service";
import { loadFollowupGradeState } from "./activity-followup-grade-store";
import type { Env, Variables } from "./env";
import { aiCallErrorResponse } from "./ai-quota-http";

export const activityFollowupGradeRoutes = (
  provider: ActivityFollowupGradeProvider,
  clock: Clock,
) => {
  const routes = new Hono<{ Bindings: Env; Variables: Variables }>();
  routes.use(
    "/:id/activity-followup-*/*",
    bodyLimit({
      maxSize: 12_000,
      onError: (c) => c.json({ error: "Request is too large." }, 413),
    }),
  );
  routes.onError((error, c) => {
    const quota = aiCallErrorResponse(c, error);
    if (quota) return quota;
    return error instanceof FollowupGradeFailure
      ? c.json({ error: error.message }, error.status)
      : c.json({ error: "Follow-up feedback could not be completed." }, 503);
  });
  const parse = async <T>(
    c: Context<{ Bindings: Env; Variables: Variables }>,
    schema: {
      safeParse: (
        value: unknown,
      ) => { success: true; data: T } | { success: false };
    },
  ) => {
    if (c.req.header("origin") !== c.env.APP_ORIGIN)
      throw new FollowupGradeFailure(403, "Request origin is not allowed.");
    if (
      c.req.header("content-type")?.split(";")[0]?.trim() !== "application/json"
    )
      throw new FollowupGradeFailure(400, "Use a JSON request.");
    const result = schema.safeParse(await c.req.json().catch(() => null));
    if (!result.success)
      throw new FollowupGradeFailure(
        400,
        "Provide a valid follow-up grading request.",
      );
    return result.data;
  };
  routes.get("/:id/activity-followup-grades", async (c) => {
    const packId = z.string().uuid().safeParse(c.req.query("packId"));
    if (!packId.success)
      throw new FollowupGradeFailure(400, "Provide a valid pack ID.");
    const userId = c.get("user").id;
    const spaceId = c.req.param("id");
    if (!(await currentPackExists(c.env, userId, spaceId, packId.data)))
      throw new FollowupGradeFailure(
        404,
        "The current activity pack was not found.",
      );
    return c.json(
      followupGradeStateSchema.parse({
        schemaVersion: 1,
        packId: packId.data,
        ...(await loadFollowupGradeState(c.env, userId, spaceId, packId.data)),
      }),
    );
  });
  routes.post("/:id/activity-followup-attempts", async (c) =>
    c.json(
      await saveFollowupAttempt(
        c.env,
        c.get("user").id,
        c.req.param("id"),
        await parse(c, followupAttemptRequestSchema),
        clock,
      ),
      201,
    ),
  );
  routes.post("/:id/activity-followup-grades", async (c) =>
    c.json(
      await gradeFollowup(
        c.env,
        provider,
        c.get("user").id,
        c.req.param("id"),
        await parse(c, followupGradeRequestSchema),
        clock,
      ),
      201,
    ),
  );
  return routes;
};
