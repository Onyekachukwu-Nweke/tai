import {
  activityFollowupResponseSchema,
  activityFollowupStateSchema,
} from "../../../packages/contracts/activity-followup";

async function bodyOrError(response: Response) {
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok)
    throw new Error(
      typeof body === "object" &&
        body &&
        "error" in body &&
        typeof body.error === "string"
        ? body.error
        : "Follow-up could not be prepared. Retry explicitly.",
    );
  return body;
}

export async function requestActivityFollowup(
  spaceId: string,
  requestId: string,
  attemptId: string,
) {
  const response = await fetch(
    `/api/study-spaces/${encodeURIComponent(spaceId)}/activity-followup`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schemaVersion: 1, requestId, attemptId }),
    },
  );
  return activityFollowupResponseSchema.parse(await bodyOrError(response));
}

export async function loadActivityFollowups(
  spaceId: string,
  packId: string,
  signal?: AbortSignal,
) {
  const response = await fetch(
    `/api/study-spaces/${encodeURIComponent(spaceId)}/activity-followup?packId=${encodeURIComponent(packId)}`,
    { signal },
  );
  return activityFollowupStateSchema.parse(await bodyOrError(response));
}
