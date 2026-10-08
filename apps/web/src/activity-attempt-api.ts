import {
  activityAttemptResponseSchema,
  activityStateSchema,
  type ActivityAttemptRequest,
} from "../../../packages/contracts/activity-attempts";

export async function saveActivityAttempt(
  spaceId: string,
  input: ActivityAttemptRequest,
) {
  const response = await fetch(
    `/api/study-spaces/${encodeURIComponent(spaceId)}/activity-attempts`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok)
    throw new Error(
      typeof body === "object" &&
        body &&
        "error" in body &&
        typeof body.error === "string"
        ? body.error
        : "Your response could not be saved. Retry explicitly.",
    );
  return activityAttemptResponseSchema.parse(body);
}

export async function loadActivityState(
  spaceId: string,
  packId: string,
  signal?: AbortSignal,
) {
  const response = await fetch(
    `/api/study-spaces/${encodeURIComponent(spaceId)}/activity-attempts?packId=${encodeURIComponent(packId)}`,
    { signal },
  );
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok)
    throw new Error("Saved practice state could not be loaded.");
  return activityStateSchema.parse(body);
}

export async function saveActivityFlag(
  spaceId: string,
  input: {
    schemaVersion: 1;
    packId: string;
    questionId: string;
    reason: "incorrect" | "ambiguous";
  },
) {
  const response = await fetch(
    `/api/study-spaces/${encodeURIComponent(spaceId)}/activity-flags`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok)
    throw new Error(
      typeof body === "object" &&
        body &&
        "error" in body &&
        typeof body.error === "string"
        ? body.error
        : "The flag could not be saved.",
    );
  return body as { questionId: string; reason: "incorrect" | "ambiguous" };
}
