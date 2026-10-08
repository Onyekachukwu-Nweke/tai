import { materialEnvelopeSchema } from "../../../packages/contracts/materials";
import type { MaterialPreview } from "./material/types";
import { ApiError } from "./api";

export function materialPath(spaceId: string) {
  return `/api/study-spaces/${encodeURIComponent(spaceId)}/material`;
}

async function checked(response: Response) {
  if (response.ok) return response;
  if (response.status === 401)
    throw new ApiError(
      "Your session has ended. Sign in again to continue.",
      401,
    );
  if (response.status === 409)
    throw new ApiError(
      "This space already has a material or a save is still in progress. Reload the saved material before retrying.",
      409,
    );
  if (response.status === 404 || response.status === 410)
    throw new ApiError(
      "This study space is no longer available. Return to your study spaces.",
      response.status,
    );
  if (
    response.status === 400 ||
    response.status === 413 ||
    response.status === 422
  )
    throw new ApiError(
      "The material could not be validated. Check its format, size, and extracted text, then try again.",
      response.status,
    );
  throw new ApiError(
    "The request could not be completed. Your local preview is still available; retry when ready.",
    response.status,
  );
}

export async function loadMaterial(spaceId: string, signal: AbortSignal) {
  const response = await checked(
    await fetch(materialPath(spaceId), { signal }),
  );
  return materialEnvelopeSchema.parse(await response.json()).material;
}

export async function fetchOriginal(spaceId: string, signal: AbortSignal) {
  const response = await checked(
    await fetch(`${materialPath(spaceId)}/original`, { signal }),
  );
  return new Uint8Array(await response.arrayBuffer());
}

export async function saveMaterial(
  spaceId: string,
  preview: MaterialPreview,
  file: File,
  signal: AbortSignal,
) {
  const body = new FormData();
  body.set("original", file);
  body.set("preview", JSON.stringify(preview));
  const response = await checked(
    await fetch(materialPath(spaceId), { method: "POST", body, signal }),
  );
  const result = materialEnvelopeSchema.parse(await response.json()).material;
  if (!result)
    throw new Error(
      "The server did not confirm a saved material. Reload before retrying.",
    );
  return result;
}

export async function deleteSpace(spaceId: string) {
  const response = await checked(
    await fetch(`/api/study-spaces/${encodeURIComponent(spaceId)}`, {
      method: "DELETE",
    }),
  );
  if (response.status === 202)
    throw new Error(
      "An upload is still finishing. Retry deletion to complete cleanup.",
    );
}
