import { accountCleanupPendingSchema } from "../../../packages/contracts/account";
import { ApiError } from "./api";

export async function deleteAccount(): Promise<"deleted" | "pending"> {
  const response = await fetch("/api/account", { method: "DELETE" });
  if (response.status === 204) return "deleted";
  if (response.status === 202) {
    accountCleanupPendingSchema.parse(await response.json());
    return "pending";
  }
  if (response.status === 401)
    throw new ApiError(
      "Your session has ended. Sign in again to continue.",
      401,
    );
  throw new ApiError(
    "Account deletion could not be completed. Your account is retained so you can retry.",
    response.status,
  );
}
