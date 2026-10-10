import { Hono } from "hono";
import type { Env, Variables } from "./env";
import { deleteAccountData } from "./account-deletion";

export const accountRoutes = new Hono<{
  Bindings: Env;
  Variables: Variables;
}>();

accountRoutes.delete("/", async (c) => {
  if (c.req.header("origin") !== c.env.APP_ORIGIN)
    return c.json({ error: "Request origin is not allowed." }, 403);
  const complete = await deleteAccountData(c.env, c.get("user").id);
  return complete
    ? c.body(null, 204)
    : c.json({ schemaVersion: 1, cleanupPending: true }, 202);
});
