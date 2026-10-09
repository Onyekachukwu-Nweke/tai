import {
  studySessionSchema,
  type CreateStudySession,
} from "../../../packages/contracts/study-sessions";

const path = (spaceId: string) =>
  `/api/study-spaces/${encodeURIComponent(spaceId)}/study-session`;
async function request(spaceId: string, init?: RequestInit) {
  const response = await fetch(path(spaceId), {
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
        : "The session request could not be completed. Retry explicitly.",
    );
  return studySessionSchema.parse(body);
}
export const loadStudySession = (spaceId: string, signal?: AbortSignal) =>
  request(spaceId, { signal });
export const createStudySession = (
  spaceId: string,
  input: CreateStudySession,
) => request(spaceId, { method: "POST", body: JSON.stringify(input) });
