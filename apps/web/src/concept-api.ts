import {
  conceptCollectionSchema,
  updateConceptSchema,
  type ConceptCollection,
  type PageRange,
} from "../../../packages/contracts/concepts";

async function request(
  path: string,
  init?: RequestInit,
): Promise<ConceptCollection> {
  const response = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok)
    throw new Error(
      typeof body === "object" &&
        body &&
        "error" in body &&
        typeof body.error === "string"
        ? body.error
        : "The concept request could not be completed. Retry explicitly.",
    );
  const parsed = conceptCollectionSchema.safeParse(body);
  if (!parsed.success)
    throw new Error(
      "Saved concepts could not be read. Reload the page and retry explicitly.",
    );
  return parsed.data;
}
const path = (spaceId: string) =>
  `/api/study-spaces/${encodeURIComponent(spaceId)}/concepts`;
export const loadConcepts = (spaceId: string, signal?: AbortSignal) =>
  request(path(spaceId), { signal });
export const generateConcepts = (
  spaceId: string,
  selection: PageRange,
  requestId: string,
) =>
  request(`${path(spaceId)}/generate`, {
    method: "POST",
    body: JSON.stringify({
      schemaVersion: 1,
      requestId,
      selection,
    }),
  });
export const updateConcept = (
  spaceId: string,
  conceptId: string,
  update: { label?: string; selected?: boolean },
) =>
  request(`${path(spaceId)}/${encodeURIComponent(conceptId)}`, {
    method: "PATCH",
    body: JSON.stringify(
      updateConceptSchema.parse({ schemaVersion: 1, ...update }),
    ),
  });
