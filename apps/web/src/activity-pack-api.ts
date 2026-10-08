import {
  learnerActivityPackSchema,
  type LearnerActivityPack,
} from "../../../packages/contracts/activity-packs";

async function request(
  path: string,
  init?: RequestInit,
): Promise<LearnerActivityPack> {
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
        : "The activity request could not be completed. Retry explicitly.",
    );
  return learnerActivityPackSchema.parse(body);
}
const path = (spaceId: string) =>
  `/api/study-spaces/${encodeURIComponent(spaceId)}/activity-pack`;
export const loadActivityPack = (spaceId: string, signal?: AbortSignal) =>
  request(path(spaceId), { signal });
export const generateActivityPack = (spaceId: string, requestId: string) =>
  request(`${path(spaceId)}/generate`, {
    method: "POST",
    body: JSON.stringify({ schemaVersion: 1, requestId }),
  });
