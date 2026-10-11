import {
  FakeActivityRubricProvider,
  type ActivityRubricProvider,
} from "../../../packages/adapters/fake-activity-rubric";
import { WorkersAiActivityRubricProvider } from "../../../packages/adapters/workers-ai-activity-rubric";
import type { Env } from "./env";

const defaultModel = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

export function activityRubricProviderForEnv(env: Env): ActivityRubricProvider {
  if (env.AI_PROVIDER === undefined || env.AI_PROVIDER === "fake")
    return new FakeActivityRubricProvider();
  if (env.AI_PROVIDER !== "workers_ai")
    throw new Error("Invalid AI provider configuration");
  const gatewayId = env.AI_GATEWAY_ID?.trim();
  const model = env.WORKERS_AI_MODEL?.trim() || defaultModel;
  if (!env.AI || !gatewayId || !/^[a-zA-Z0-9_-]{1,64}$/.test(gatewayId))
    throw new Error("Workers AI is not configured");
  if (!model.startsWith("@cf/") || model.length > 160)
    throw new Error("Invalid Workers AI model configuration");
  return new WorkersAiActivityRubricProvider(env.AI, { gatewayId, model });
}
