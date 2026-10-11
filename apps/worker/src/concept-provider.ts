import {
  FakeConceptProvider,
  type ConceptProvider,
} from "../../../packages/adapters/fake-concepts";
import { WorkersAiConceptProvider } from "../../../packages/adapters/workers-ai-concepts";
import type { Env } from "./env";

const defaultModel = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

export type ConceptProviderName = "fake" | "workers_ai";

export function conceptProviderName(env: Env): ConceptProviderName {
  if (env.AI_PROVIDER === undefined || env.AI_PROVIDER === "fake")
    return "fake";
  if (env.AI_PROVIDER === "workers_ai") return "workers_ai";
  throw new Error("Invalid AI provider configuration");
}

export function conceptProviderForEnv(env: Env): ConceptProvider {
  if (conceptProviderName(env) === "fake") return new FakeConceptProvider();
  const gatewayId = env.AI_GATEWAY_ID?.trim();
  const model = env.WORKERS_AI_MODEL?.trim() || defaultModel;
  if (!env.AI || !gatewayId || !/^[a-zA-Z0-9_-]{1,64}$/.test(gatewayId))
    throw new Error("Workers AI is not configured");
  if (!model.startsWith("@cf/") || model.length > 160)
    throw new Error("Invalid Workers AI model configuration");
  return new WorkersAiConceptProvider(env.AI, { gatewayId, model });
}
