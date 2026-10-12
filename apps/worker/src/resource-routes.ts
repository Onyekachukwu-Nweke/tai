import { Hono } from "hono";
import { resourceCatalog } from "../../../packages/content/resource-catalog";
import { matchResources } from "../../../packages/domain/resource-matcher";
import type { Env, Variables } from "./env";
import { loadSelectedResourceConcepts } from "./resource-store";

export const resourceRoutes = new Hono<{
  Bindings: Env;
  Variables: Variables;
}>();

resourceRoutes.get("/:id/resources", async (c) => {
  const concepts = await loadSelectedResourceConcepts(
    c.env,
    c.get("user").id,
    c.req.param("id"),
  );
  if (!concepts) return c.json({ error: "Study space not found." }, 404);
  return c.json(matchResources(concepts, resourceCatalog));
});
