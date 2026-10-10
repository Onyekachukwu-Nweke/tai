import type { AiQuotaCategory } from "../../../packages/contracts/ai-quota";
import type { Env } from "./env";

export interface AiQuotaConfig {
  enabled: boolean;
  total: number;
  categories: Record<AiQuotaCategory, number>;
}

const positiveInteger = (value: string | undefined) => {
  if (!value || !/^[1-9]\d*$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
};
const nonNegativeInteger = (value: string | undefined) => {
  if (!value || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
};

export function readAiQuotaConfig(env: Env): AiQuotaConfig | null {
  if (env.AI_CALLS_ENABLED !== "true" && env.AI_CALLS_ENABLED !== "false")
    return null;
  const total = positiveInteger(env.AI_DAILY_TOTAL_LIMIT);
  const concepts = nonNegativeInteger(env.AI_DAILY_CONCEPT_LIMIT);
  const packs = nonNegativeInteger(env.AI_DAILY_PACK_LIMIT);
  const grading = nonNegativeInteger(env.AI_DAILY_GRADING_LIMIT);
  const support = nonNegativeInteger(env.AI_DAILY_SUPPORT_LIMIT);
  const practical = nonNegativeInteger(env.AI_DAILY_PRACTICAL_LIMIT);
  if (
    !total ||
    concepts === null ||
    packs === null ||
    grading === null ||
    support === null ||
    practical === null
  )
    return null;
  return {
    enabled: env.AI_CALLS_ENABLED === "true",
    total,
    categories: { concepts, packs, grading, support, practical },
  };
}
