import {
  FakePracticalTaskProvider,
  type PracticalTaskProvider,
} from "../../../packages/adapters/fake-practical-tasks";
import { WorkersAiPracticalTaskProvider } from "../../../packages/adapters/workers-ai-practical-tasks";
import type { Env } from "./env";

const defaultModel = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

export function practicalTaskProviderForEnv(env: Env): PracticalTaskProvider {
  if (env.AI_PROVIDER === undefined || env.AI_PROVIDER === "fake")
    return new FakePracticalTaskProvider();
  if (env.AI_PROVIDER !== "workers_ai")
    throw new Error("Invalid AI provider configuration");
  const gatewayId = env.AI_GATEWAY_ID?.trim();
  const model = env.WORKERS_AI_MODEL?.trim() || defaultModel;
  if (!env.AI || !gatewayId || !/^[a-zA-Z0-9_-]{1,64}$/.test(gatewayId))
    throw new Error("Workers AI is not configured");
  if (!model.startsWith("@cf/") || model.length > 160)
    throw new Error("Invalid Workers AI model configuration");
  return new WorkersAiPracticalTaskProvider(env.AI, { gatewayId, model });
}
