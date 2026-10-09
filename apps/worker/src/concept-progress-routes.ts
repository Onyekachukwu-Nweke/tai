import { Hono } from "hono";
import { conceptProgressResponseSchema } from "../../../packages/contracts/concept-progress";
import type { Clock } from "../../../packages/domain/concept-progress";
import type { Env, Variables } from "./env";
import { loadConceptProgress } from "./concept-progress-store";

export const conceptProgressRoutes = (clock: Clock) =>
  new Hono<{ Bindings: Env; Variables: Variables }>().get(
    "/:id/concept-progress",
    async (c) => {
      const asOf = clock.now();
      const concepts = await loadConceptProgress(
        c.env,
        c.get("user").id,
        c.req.param("id"),
        { now: () => asOf },
      );
      if (!concepts.length)
        return c.json({ error: "Current concepts were not found." }, 404);
      return c.json(
        conceptProgressResponseSchema.parse({
          schemaVersion: 1,
          asOf: asOf.toISOString(),
          policy: "heuristic",
          disclosure:
            "Review timing is a simple study heuristic, not a validated prediction of memory.",
          concepts,
        }),
      );
    },
  );
