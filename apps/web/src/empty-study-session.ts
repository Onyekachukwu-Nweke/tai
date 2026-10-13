import type { StudySession } from "../../../packages/contracts/study-sessions";
export const emptyStudySession: StudySession = {
  schemaVersion: 1,
  status: "empty",
  sessionId: null,
  packId: null,
  budgetMinutes: null,
  estimatedMinutes: 0,
  mode: null,
  kind: null,
  conceptId: null,
  items: [],
  createdAt: null,
  completedAt: null,
};
