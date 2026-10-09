import {
  activityTutorResponseSchema,
  activityTutorStateSchema,
  type ActivityTutorRequest,
} from "../../../packages/contracts/activity-tutor";

export async function requestTutorHelp(
  spaceId: string,
  input: ActivityTutorRequest,
) {
  const response = await fetch(
    `/api/study-spaces/${encodeURIComponent(spaceId)}/activity-tutor`,
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
        : "Tutor help could not be prepared. Retry explicitly.",
    );
  return activityTutorResponseSchema.parse(body);
}

export async function loadTutorState(
  spaceId: string,
  packId: string,
  signal?: AbortSignal,
) {
  const response = await fetch(
    `/api/study-spaces/${encodeURIComponent(spaceId)}/activity-tutor?packId=${encodeURIComponent(packId)}`,
    { signal },
  );
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new Error("Saved tutor help could not be loaded.");
  return activityTutorStateSchema.parse(body);
}
