import {
  followupAttemptSchema,
  followupGradeResponseSchema,
  followupGradeStateSchema,
  type FollowupAttemptRequest,
} from "../../../packages/contracts/activity-followup-grade";

async function bodyOrError(response: Response) {
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok)
    throw new Error(
      typeof body === "object" &&
        body &&
        "error" in body &&
        typeof body.error === "string"
        ? body.error
        : "Follow-up feedback could not be completed. Retry explicitly.",
    );
  return body;
}
export async function saveFollowupAnswer(
  spaceId: string,
  input: FollowupAttemptRequest,
) {
  const response = await fetch(
    `/api/study-spaces/${encodeURIComponent(spaceId)}/activity-followup-attempts`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
  return followupAttemptSchema.parse(await bodyOrError(response));
}
export async function gradeFollowupAnswer(
  spaceId: string,
  requestId: string,
  attemptId: string,
) {
  const response = await fetch(
    `/api/study-spaces/${encodeURIComponent(spaceId)}/activity-followup-grades`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schemaVersion: 1, requestId, attemptId }),
    },
  );
  return followupGradeResponseSchema.parse(await bodyOrError(response));
}
export async function loadFollowupGrades(
  spaceId: string,
  packId: string,
  signal?: AbortSignal,
) {
  const response = await fetch(
    `/api/study-spaces/${encodeURIComponent(spaceId)}/activity-followup-grades?packId=${encodeURIComponent(packId)}`,
    { signal },
  );
  return followupGradeStateSchema.parse(await bodyOrError(response));
}
