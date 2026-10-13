import {
  resourceRecommendationsSchema,
  type ResourceRecommendations,
} from "../../../packages/contracts/resources";

export async function loadResources(
  spaceId: string,
  signal?: AbortSignal,
): Promise<ResourceRecommendations> {
  const response = await fetch(
    `/api/study-spaces/${encodeURIComponent(spaceId)}/resources`,
    { signal },
  );
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok)
    throw new Error(
      typeof body === "object" &&
        body &&
        "error" in body &&
        typeof body.error === "string"
        ? body.error
        : "Supplementary resources could not be loaded.",
    );
  return resourceRecommendationsSchema.parse(body);
}
