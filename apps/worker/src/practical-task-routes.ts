import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { PracticalTaskProvider } from "../../../packages/adapters/fake-practical-tasks";
import {
  generatePracticalTaskSchema,
  practicalCompletionSchema,
} from "../../../packages/contracts/practical-tasks";
import type { Clock } from "../../../packages/domain/concept-progress";
import { aiCallErrorResponse } from "./ai-quota-http";
import type { Env, Variables } from "./env";
import { activeSpace } from "./material-store";
import {
  PracticalTaskFailure,
  generatePracticalTask,
} from "./practical-task-service";
import { loadPracticalTask } from "./practical-task-store";
import { practicalTaskProviderForEnv } from "./practical-task-provider";

export function practicalTaskRoutes(
  provider: PracticalTaskProvider | undefined,
  clock: Clock,
) {
  const routes = new Hono<{ Bindings: Env; Variables: Variables }>();
  routes.use(
    "/:id/practical-task/*",
    bodyLimit({
      maxSize: 2_048,
      onError: (c) => c.json({ error: "Request is too large." }, 413),
    }),
  );
  routes.onError((error, c) => {
    const quota = aiCallErrorResponse(c, error);
    if (quota) return quota;
    return error instanceof PracticalTaskFailure
      ? c.json({ error: error.message }, error.status)
      : c.json(
          { error: "The practical-task request could not be completed." },
          503,
        );
  });
  routes.get("/:id/practical-task", async (c) => {
    const userId = c.get("user").id,
      spaceId = c.req.param("id");
    if (!(await activeSpace(c.env, userId, spaceId)))
      throw new PracticalTaskFailure(404, "Study space not found.");
    return c.json(await loadPracticalTask(c.env, userId, spaceId));
  });
  routes.post("/:id/practical-task/generate", async (c) => {
    if (c.req.header("origin") !== c.env.APP_ORIGIN)
      throw new PracticalTaskFailure(403, "Request origin is not allowed.");
    if (
      c.req.header("content-type")?.split(";")[0]?.trim() !== "application/json"
    )
      throw new PracticalTaskFailure(400, "Use a JSON request.");
    const parsed = generatePracticalTaskSchema.safeParse(
      await c.req.json().catch(() => null),
    );
    if (!parsed.success)
      throw new PracticalTaskFailure(
        400,
        "Provide a valid request and selected concept IDs.",
      );
    return c.json(
      await generatePracticalTask(
        c.env,
        provider ?? practicalTaskProviderForEnv(c.env),
        c.get("user").id,
        c.req.param("id"),
        parsed.data.requestId,
        parsed.data.conceptIds,
        clock,
      ),
    );
  });
  routes.put("/:id/practical-task/:taskId/completion", async (c) => {
    if (c.req.header("origin") !== c.env.APP_ORIGIN)
      throw new PracticalTaskFailure(403, "Request origin is not allowed.");
    const parsed = practicalCompletionSchema.safeParse(
      await c.req.json().catch(() => null),
    );
    if (!parsed.success)
      throw new PracticalTaskFailure(400, "Provide a valid completion choice.");
    const completedAt = parsed.data.completed
      ? clock.now().toISOString()
      : null;
    const result = await c.env.DB.prepare(
      "UPDATE practical_tasks SET completed_at=? WHERE user_id=? AND space_id=? AND id=? AND EXISTS(SELECT 1 FROM practical_task_requests r JOIN material_imports m ON m.user_id=r.user_id AND m.space_id=r.space_id JOIN concept_requests cr ON cr.user_id=r.user_id AND cr.space_id=r.space_id JOIN concepts c ON c.user_id=r.user_id AND c.space_id=r.space_id AND c.request_id=r.concept_request_id AND c.id=r.selection_key JOIN study_spaces s ON s.user_id=r.user_id AND s.id=r.space_id WHERE r.user_id=? AND r.space_id=? AND r.request_id=practical_tasks.request_id AND r.state='ready' AND r.document_id=m.document_id AND m.state='ready' AND r.concept_request_id=cr.request_id AND cr.state='ready' AND c.selected=1 AND s.deleted_at IS NULL AND NOT EXISTS(SELECT 1 FROM account_deletions d WHERE d.user_id=r.user_id))",
    )
      .bind(
        completedAt,
        c.get("user").id,
        c.req.param("id"),
        c.req.param("taskId"),
        c.get("user").id,
        c.req.param("id"),
      )
      .run();
    if (!result.meta.changes)
      throw new PracticalTaskFailure(404, "Practical task not found.");
    return c.json(
      await loadPracticalTask(c.env, c.get("user").id, c.req.param("id")),
    );
  });
  return routes;
}
