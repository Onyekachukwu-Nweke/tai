import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { z } from "zod";
import {
  activityAttemptRequestSchema,
  activityFlagRequestSchema,
  activityStateSchema,
} from "../../../packages/contracts/activity-attempts";
import type { Env, Variables } from "./env";
import { AttemptFailure, recordAttempt } from "./activity-attempt-service";
import {
  currentPackExists,
  loadActivityState,
  loadCurrentQuestion,
  saveQuestionFlag,
} from "./activity-attempt-store";
import type { Clock } from "../../../packages/domain/concept-progress";

export const activityAttemptRoutes = (clock: Clock) =>
  new Hono<{
    Bindings: Env;
    Variables: Variables;
  }>()
    .use(
      "/:id/activity-attempts/*",
      bodyLimit({
        maxSize: 12_000,
        onError: (c) => c.json({ error: "Request is too large." }, 413),
      }),
    )
    .use(
      "/:id/activity-flags/*",
      bodyLimit({
        maxSize: 1_024,
        onError: (c) => c.json({ error: "Request is too large." }, 413),
      }),
    )
    .onError((error, c) =>
      error instanceof AttemptFailure
        ? c.json({ error: error.message }, error.status)
        : c.json(
            { error: "The response could not be saved. Retry explicitly." },
            503,
          ),
    )
    .get("/:id/activity-attempts", async (c) => {
      const packId = z.string().uuid().safeParse(c.req.query("packId"));
      if (!packId.success)
        throw new AttemptFailure(400, "Provide a valid pack ID.");
      if (
        !(await currentPackExists(
          c.env,
          c.get("user").id,
          c.req.param("id"),
          packId.data,
        ))
      )
        throw new AttemptFailure(
          404,
          "The current activity pack was not found.",
        );
      const state = await loadActivityState(
        c.env,
        c.get("user").id,
        c.req.param("id"),
        packId.data,
      );
      return c.json(
        activityStateSchema.parse({
          schemaVersion: 1,
          packId: packId.data,
          ...state,
        }),
      );
    })
    .post("/:id/activity-attempts", async (c) => {
      if (c.req.header("origin") !== c.env.APP_ORIGIN)
        throw new AttemptFailure(403, "Request origin is not allowed.");
      if (
        c.req.header("content-type")?.split(";")[0]?.trim() !==
        "application/json"
      )
        throw new AttemptFailure(400, "Use a JSON request.");
      const parsed = activityAttemptRequestSchema.safeParse(
        await c.req.json().catch(() => null),
      );
      if (!parsed.success)
        throw new AttemptFailure(400, "Provide a valid activity response.");
      return c.json(
        await recordAttempt(
          c.env,
          c.get("user").id,
          c.req.param("id"),
          parsed.data,
          clock,
        ),
        201,
      );
    })
    .post("/:id/activity-flags", async (c) => {
      if (c.req.header("origin") !== c.env.APP_ORIGIN)
        throw new AttemptFailure(403, "Request origin is not allowed.");
      if (
        c.req.header("content-type")?.split(";")[0]?.trim() !==
        "application/json"
      )
        throw new AttemptFailure(400, "Use a JSON request.");
      const parsed = activityFlagRequestSchema.safeParse(
        await c.req.json().catch(() => null),
      );
      if (!parsed.success)
        throw new AttemptFailure(400, "Provide a valid question flag.");
      const { packId, questionId, reason } = parsed.data;
      if (
        !(await loadCurrentQuestion(
          c.env,
          c.get("user").id,
          c.req.param("id"),
          packId,
          questionId,
        ))
      )
        throw new AttemptFailure(
          404,
          "The current activity question was not found.",
        );
      return c.json(
        await saveQuestionFlag(
          c.env,
          c.get("user").id,
          c.req.param("id"),
          packId,
          questionId,
          reason,
          clock,
        ),
        201,
      );
    });
