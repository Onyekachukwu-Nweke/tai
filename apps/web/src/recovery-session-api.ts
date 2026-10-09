import {
  recoveryOfferSchema,
  studySessionSchema,
} from "../../../packages/contracts/study-sessions";

const base = (spaceId: string) =>
  `/api/study-spaces/${encodeURIComponent(spaceId)}`;

async function responseBody(response: Response) {
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok)
    throw new Error(
      typeof body === "object" &&
        body &&
        "error" in body &&
        typeof body.error === "string"
        ? body.error
        : "The recovery request could not be completed. Retry explicitly.",
    );
  return body;
}

export async function loadRecoveryOffer(spaceId: string, signal?: AbortSignal) {
  const response = await fetch(`${base(spaceId)}/recovery-offer`, { signal });
  return recoveryOfferSchema.parse(await responseBody(response));
}

export async function createRecoverySession(
  spaceId: string,
  sessionId: string,
) {
  const response = await fetch(`${base(spaceId)}/recovery-session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ schemaVersion: 1, sessionId }),
  });
  return studySessionSchema.parse(await responseBody(response));
}
