import {
  conceptProgressResponseSchema,
  type ConceptProgressResponse,
} from "../../../packages/contracts/concept-progress";

export async function loadConceptProgress(
  spaceId: string,
  signal?: AbortSignal,
): Promise<ConceptProgressResponse> {
  const response = await fetch(
    `/api/study-spaces/${encodeURIComponent(spaceId)}/concept-progress`,
    { signal },
  );
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok)
    throw new Error("Saved concept progress could not be loaded.");
  return conceptProgressResponseSchema.parse(body);
}
