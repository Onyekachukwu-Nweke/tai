import {
  activityRubricResponseSchema,
  activityRubricStateSchema,
} from "../../../packages/contracts/activity-rubric";

async function bodyOrError(response: Response) {
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok)
    throw new Error(
      typeof body === "object" &&
        body &&
        "error" in body &&
        typeof body.error === "string"
        ? body.error
        : "Rubric feedback could not be prepared. Retry explicitly.",
    );
  return body;
}

export async function requestRubricGrade(
  spaceId: string,
  requestId: string,
  attemptId: string,
) {
  const response = await fetch(
    `/api/study-spaces/${encodeURIComponent(spaceId)}/activity-rubric`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schemaVersion: 1, requestId, attemptId }),
    },
  );
  return activityRubricResponseSchema.parse(await bodyOrError(response));
}

export async function loadRubricState(
  spaceId: string,
  packId: string,
  signal?: AbortSignal,
) {
  const response = await fetch(
    `/api/study-spaces/${encodeURIComponent(spaceId)}/activity-rubric?packId=${encodeURIComponent(packId)}`,
    { signal },
  );
  return activityRubricStateSchema.parse(await bodyOrError(response));
}
