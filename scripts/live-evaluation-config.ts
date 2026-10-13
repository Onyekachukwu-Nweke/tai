export const LIVE_EVAL_CONSENT = "I_ACCEPT_LIVE_AI_COST";
export const DEFAULT_LIVE_MODELS = [
  "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
  "@cf/meta/llama-3.1-8b-instruct-fast",
] as const;

export type LiveEvaluationConfig = {
  accountId: string;
  apiToken: string;
  gatewayId: string;
  models: [string, string];
};

function required(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name]?.trim();
  if (!value) throw new Error(`Live evaluation requires ${name}`);
  return value;
}

export function readLiveEvaluationConfig(
  env: NodeJS.ProcessEnv,
): LiveEvaluationConfig {
  if (env.TAI_LIVE_EVAL_ENABLED !== LIVE_EVAL_CONSENT)
    throw new Error(
      "Live evaluation refused: explicit cost consent is missing",
    );
  if (env.AI_CALLS_ENABLED !== "true")
    throw new Error(
      "Live evaluation refused: AI_CALLS_ENABLED must equal true",
    );

  const rawModels =
    env.TAI_LIVE_EVAL_MODELS?.trim() || DEFAULT_LIVE_MODELS.join(",");
  const models = rawModels.split(",").map((model) => model.trim());
  if (
    models.length !== 2 ||
    new Set(models).size !== 2 ||
    models.some((model) => !model.startsWith("@cf/"))
  )
    throw new Error("Live evaluation requires exactly two distinct @cf models");

  return {
    accountId: required(env, "CLOUDFLARE_ACCOUNT_ID"),
    apiToken: required(env, "CLOUDFLARE_API_TOKEN"),
    gatewayId: required(env, "AI_GATEWAY_ID"),
    models: models as [string, string],
  };
}
