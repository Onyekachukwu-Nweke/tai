import { Hono } from "hono";
import { authConfigured, createAuth } from "./auth";
import type { Env, Variables } from "./env";
import {
  FakeConceptProvider,
  type ConceptProvider,
} from "../../../packages/adapters/fake-concepts";
import { createStudySpaces } from "./study-spaces";
import {
  FakeActivityPackProvider,
  type ActivityPackProvider,
} from "../../../packages/adapters/fake-activity-packs";
import {
  systemClock,
  type Clock,
} from "../../../packages/domain/concept-progress";
import {
  FakeActivityTutorProvider,
  type ActivityTutorProvider,
} from "../../../packages/adapters/fake-activity-tutor";
import {
  FakeActivityRubricProvider,
  type ActivityRubricProvider,
} from "../../../packages/adapters/fake-activity-rubric";

export function createApp(
  provider: ConceptProvider = new FakeConceptProvider(),
  activityProvider: ActivityPackProvider = new FakeActivityPackProvider(),
  clock: Clock = systemClock,
  tutorProvider: ActivityTutorProvider = new FakeActivityTutorProvider(),
  rubricProvider: ActivityRubricProvider = new FakeActivityRubricProvider(),
) {
  const app = new Hono<{ Bindings: Env; Variables: Variables }>();

  app.use("/api/*", async (c, next) => {
    c.header("Cache-Control", "no-store");
    c.header("X-Content-Type-Options", "nosniff");
    await next();
  });

  app.get("/api/health", (c) =>
    c.json({ schemaVersion: 1, status: "ok", service: "tai" }),
  );

  app.use("/api/*", async (c, next) => {
    if (!authConfigured(c.env))
      return c.json({ error: "Google sign-in is not configured yet." }, 503);
    await next();
  });

  app.on(["GET", "POST"], "/api/auth/*", (c) =>
    createAuth(c.env).handler(c.req.raw),
  );

  app.get("/api/session", async (c) => {
    const session = await createAuth(c.env).api.getSession({
      headers: c.req.raw.headers,
    });
    const user = session
      ? {
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
        }
      : null;
    return c.json({ schemaVersion: 1, user });
  });

  app.use("/api/study-spaces/*", async (c, next) => {
    const session = await createAuth(c.env).api.getSession({
      headers: c.req.raw.headers,
    });
    if (!session)
      return c.json({ error: "Sign in with Google to continue." }, 401);
    c.set("user", {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
    });
    await next();
  });
  app.route(
    "/api/study-spaces",
    createStudySpaces(
      provider,
      activityProvider,
      clock,
      tutorProvider,
      rubricProvider,
    ),
  );

  app.notFound((c) => c.json({ error: "Not found." }, 404));
  app.onError((_error, c) =>
    c.json(
      { error: "The request could not be completed. Please try again." },
      500,
    ),
  );

  return app;
}
export default createApp();
