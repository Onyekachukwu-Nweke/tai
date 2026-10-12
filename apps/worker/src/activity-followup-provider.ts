import {
  FakeActivityFollowupProvider,
  type ActivityFollowupProvider,
} from "../../../packages/adapters/fake-activity-followup";
import {
  FakeActivityFollowupGradeProvider,
  type ActivityFollowupGradeProvider,
} from "../../../packages/adapters/fake-activity-followup-grade";
import { WorkersAiActivityFollowupProvider } from "../../../packages/adapters/workers-ai-activity-followup";
import { WorkersAiActivityFollowupGradeProvider } from "../../../packages/adapters/workers-ai-activity-followup-grade";
import type { Env } from "./env";

const defaultModel = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
function config(env: Env) {
  if (env.AI_PROVIDER === undefined || env.AI_PROVIDER === "fake") return null;
  if (env.AI_PROVIDER !== "workers_ai")
    throw new Error("Invalid AI provider configuration");
  const gatewayId = env.AI_GATEWAY_ID?.trim();
  const model = env.WORKERS_AI_MODEL?.trim() || defaultModel;
  if (!env.AI || !gatewayId || !/^[a-zA-Z0-9_-]{1,64}$/.test(gatewayId))
    throw new Error("Workers AI is not configured");
  if (!model.startsWith("@cf/") || model.length > 160)
    throw new Error("Invalid Workers AI model configuration");
  return { ai: env.AI, gatewayId, model };
}
export function activityFollowupProviderForEnv(
  env: Env,
): ActivityFollowupProvider {
  const live = config(env);
  return live
    ? new WorkersAiActivityFollowupProvider(live.ai, live)
    : new FakeActivityFollowupProvider();
}
export function activityFollowupGradeProviderForEnv(
  env: Env,
): ActivityFollowupGradeProvider {
  const live = config(env);
  return live
    ? new WorkersAiActivityFollowupGradeProvider(live.ai, live)
    : new FakeActivityFollowupGradeProvider();
}
