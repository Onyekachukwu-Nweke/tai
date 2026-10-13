import {
  activeStudySession,
  browserSource,
  emptyActivityPack as empty,
} from "./study-session-fixture";
export { empty };

export const spaceId = "11111111-1111-4111-8111-111111111111";
export const documentId = "22222222-2222-4222-8222-222222222222";
export const source = browserSource(documentId);
export const concepts = {
  schemaVersion: 1,
  status: "ready",
  requestId: "33333333-3333-4333-8333-333333333333",
  scope: { startLocation: 1, endLocation: 1 },
  error: null,
  provider: "fake",
  relations: [],
  concepts: ["Light", "Growth"].map((label, index) => ({
    id: `${index + 4}4444444-4444-4444-8444-444444444444`,
    title: label,
    label,
    description: `${label} concept`,
    selected: true,
    sources: [source],
  })),
};
export const ready = {
  ...empty,
  status: "ready" as const,
  requestId: "66666666-6666-4666-8666-666666666666",
  packId: "77777777-7777-4777-8777-777777777777",
  questions: [
    {
      id: "88888888-8888-4888-8888-888888888888",
      type: "recall" as const,
      conceptIds: concepts.concepts.map((item) => item.id),
      prompt: "Recall how plants grow.",
      estimatedMinutes: 2,
      sources: [source],
      review: { supportedAnswer: "Plants need light and water." },
    },
    {
      id: "99999999-9999-4999-8999-999999999999",
      type: "mcq" as const,
      conceptIds: concepts.concepts.map((item) => item.id),
      prompt: "What helps plants grow?",
      estimatedMinutes: 1,
      sources: [source],
      options: [
        { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", text: "Light" },
        { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", text: "Stone" },
        { id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", text: "Metal" },
      ],
      review: {
        correctOptionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        answerExplanation: "The material says plants use light.",
      },
    },
  ],
};
export const studySession = activeStudySession(ready.packId, ready.questions);
export const restoredHint = {
  schemaVersion: 1,
  requestId: "12121212-1212-4212-8212-121212121212",
  packId: ready.packId,
  questionId: ready.questions[0].id,
  kind: "hint",
  text: "Restored hint from this material.",
  sources: [source],
  supportedByMaterial: true,
} as const;
