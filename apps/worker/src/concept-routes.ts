import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { ConceptProvider } from "../../../packages/adapters/fake-concepts";
import {
  generateConceptsSchema,
  updateConceptSchema,
} from "../../../packages/contracts/concepts";
import type { Env, Variables } from "./env";
import { loadConcepts } from "./concept-store";
import { ConceptFailure, generateConcepts } from "./concept-service";
import { activeSpace } from "./material-store";
import { aiCallErrorResponse } from "./ai-quota-http";
import type { Clock } from "../../../packages/domain/concept-progress";
import { conceptProviderForEnv } from "./concept-provider";

export function conceptRoutes(
  provider: ConceptProvider | undefined,
  clock: Clock,
) {
  const routes = new Hono<{ Bindings: Env; Variables: Variables }>();
  routes.use(
    "/:id/concepts/*",
    bodyLimit({
      maxSize: 2_048,
      onError: (c) => c.json({ error: "Request is too large." }, 413),
    }),
  );
  routes.onError((error, c) => {
    const quota = aiCallErrorResponse(c, error);
    if (quota) return quota;
    return error instanceof ConceptFailure
      ? c.json({ error: error.message }, error.status)
      : c.json(
          {
            error:
              "The concept request could not be completed. Retry explicitly.",
          },
          503,
        );
  });
  routes.get("/:id/concepts", async (c) => {
    const userId = c.get("user").id,
      spaceId = c.req.param("id");
    if (!(await activeSpace(c.env, userId, spaceId)))
      throw new ConceptFailure(404, "Study space not found.");
    return c.json(await loadConcepts(c.env, userId, spaceId));
  });
  routes.post("/:id/concepts/generate", async (c) => {
    if (c.req.header("origin") !== c.env.APP_ORIGIN)
      throw new ConceptFailure(403, "Request origin is not allowed.");
    if (c.req.header("content-type")?.split(";")[0] !== "application/json")
      throw new ConceptFailure(400, "Use a JSON request.");
    const parsed = generateConceptsSchema.safeParse(
      await c.req.json().catch(() => null),
    );
    if (!parsed.success)
      throw new ConceptFailure(
        400,
        "Provide a request ID and a saved page range.",
      );
    const { requestId, selection } = parsed.data;
    return c.json(
      await generateConcepts(
        c.env,
        provider ?? conceptProviderForEnv(c.env),
        c.get("user").id,
        c.req.param("id"),
        requestId,
        selection,
        clock,
      ),
    );
  });
  routes.patch("/:id/concepts/:conceptId", async (c) => {
    if (c.req.header("origin") !== c.env.APP_ORIGIN)
      throw new ConceptFailure(403, "Request origin is not allowed.");
    if (
      c.req.header("content-type")?.split(";")[0]?.trim() !== "application/json"
    )
      throw new ConceptFailure(400, "Use a JSON request.");
    const parsed = updateConceptSchema.safeParse(
      await c.req.json().catch(() => null),
    );
    if (!parsed.success)
      throw new ConceptFailure(400, "Provide a valid label or selection.");
    const userId = c.get("user").id,
      spaceId = c.req.param("id"),
      conceptId = c.req.param("conceptId");
    const result = await c.env.DB.prepare(
      "UPDATE concepts SET label=COALESCE(?,label),selected=COALESCE(?,selected) WHERE user_id=? AND space_id=? AND id=? AND EXISTS(SELECT 1 FROM study_spaces WHERE user_id=? AND id=? AND deleted_at IS NULL)",
    )
      .bind(
        parsed.data.label ?? null,
        parsed.data.selected === undefined
          ? null
          : Number(parsed.data.selected),
        userId,
        spaceId,
        conceptId,
        userId,
        spaceId,
      )
      .run();
    if (!result.meta.changes)
      throw new ConceptFailure(404, "Concept not found.");
    return c.json(await loadConcepts(c.env, userId, spaceId));
  });
  return routes;
}
