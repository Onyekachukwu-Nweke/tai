import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import {
  createRecoverySessionSchema,
  recoveryOfferSchema,
  studySessionSchema,
} from "../../../packages/contracts/study-sessions";
import type { Clock } from "../../../packages/domain/concept-progress";
import type { Env, Variables } from "./env";
import {
  prepareRecoverySession,
  recoveryOffer,
} from "./recovery-session-service";
import { StudySessionFailure } from "./study-session-service";

export const recoverySessionRoutes = (clock: Clock) =>
  new Hono<{ Bindings: Env; Variables: Variables }>()
    .use(
      "/:id/recovery-session/*",
      bodyLimit({
        maxSize: 512,
        onError: (c) => c.json({ error: "Request is too large." }, 413),
      }),
    )
    .onError((error, c) =>
      error instanceof StudySessionFailure
        ? c.json({ error: error.message }, error.status)
        : c.json(
            {
              error:
                "The recovery review could not be prepared. Retry explicitly.",
            },
            503,
          ),
    )
    .get("/:id/recovery-offer", async (c) =>
      c.json(
        recoveryOfferSchema.parse(
          await recoveryOffer(
            c.env,
            c.get("user").id,
            c.req.param("id"),
            clock,
          ),
        ),
      ),
    )
    .post("/:id/recovery-session", async (c) => {
      if (c.req.header("origin") !== c.env.APP_ORIGIN)
        throw new StudySessionFailure(403, "Request origin is not allowed.");
      if (
        c.req.header("content-type")?.split(";")[0]?.trim() !==
        "application/json"
      )
        throw new StudySessionFailure(400, "Use a JSON request.");
      const input = createRecoverySessionSchema.safeParse(
        await c.req.json().catch(() => null),
      );
      if (!input.success)
        throw new StudySessionFailure(400, "Use a valid recovery request.");
      return c.json(
        studySessionSchema.parse(
          await prepareRecoverySession(
            c.env,
            c.get("user").id,
            c.req.param("id"),
            input.data.sessionId,
            clock,
          ),
        ),
        201,
      );
    });
