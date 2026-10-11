import { practicalTaskStateSchema } from "../../../packages/contracts/practical-tasks";
import { api } from "./api";

const path = (spaceId: string) =>
  `/api/study-spaces/${encodeURIComponent(spaceId)}/practical-task`;
export const loadPracticalTask = (spaceId: string, signal?: AbortSignal) =>
  api(path(spaceId), practicalTaskStateSchema, { signal });
export const generatePracticalTask = (spaceId: string, conceptIds: string[]) =>
  api(`${path(spaceId)}/generate`, practicalTaskStateSchema, {
    method: "POST",
    body: JSON.stringify({
      schemaVersion: 1,
      requestId: crypto.randomUUID(),
      conceptIds,
    }),
  });
export const savePracticalCompletion = (
  spaceId: string,
  taskId: string,
  completed: boolean,
) =>
  api(
    `${path(spaceId)}/${encodeURIComponent(taskId)}/completion`,
    practicalTaskStateSchema,
    {
      method: "PUT",
      body: JSON.stringify({ schemaVersion: 1, completed }),
    },
  );
