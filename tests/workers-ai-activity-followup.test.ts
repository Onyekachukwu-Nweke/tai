import { describe, expect, it } from "vitest";
import {
  activityFollowupGradeProviderForEnv,
  activityFollowupProviderForEnv,
} from "../apps/worker/src/activity-followup-provider";
import type { Env } from "../apps/worker/src/env";
import { WorkersAiActivityFollowupProvider } from "../packages/adapters/workers-ai-activity-followup";
import { WorkersAiActivityFollowupGradeProvider } from "../packages/adapters/workers-ai-activity-followup-grade";
import type { WorkersAiRunner } from "../packages/adapters/workers-ai-json";
import type { FollowupContext } from "../packages/contracts/activity-followup";
import type { FollowupGradeContext } from "../packages/contracts/activity-followup-grade";

class RecordingAi implements WorkersAiRunner {
  response: unknown;
  call?: {
    model: string;
    input: Record<string, unknown>;
    options: Record<string, unknown>;
  };
  constructor(response: unknown) {
    this.response = { response: JSON.stringify(response) };
  }
  async run(
    model: string,
    input: Record<string, unknown>,
    options: Record<string, unknown>,
  ) {
    this.call = { model, input, options };
    return this.response;
  }
}
const source = {
  id: "source-1",
  location: 2,
  start: 10,
  end: 26,
  text: "A grounded fact.",
};
const generation: FollowupContext = {
  requestId: "10000000-0000-4000-8000-000000000001",
  attemptId: "10000000-0000-4000-8000-000000000002",
  packId: "10000000-0000-4000-8000-000000000003",
  questionId: "10000000-0000-4000-8000-000000000004",
  originalPrompt: "Explain the fact.",
  savedAnswer: "private learner draft",
  targetedCriterion: "Connect the fact to the result",
  gapOutcome: "partial",
  criterionFeedback: "The connection is incomplete.",
  conceptIds: ["10000000-0000-4000-8000-000000000005"],
  sources: [source],
};
const grading: FollowupGradeContext = {
  requestId: "20000000-0000-4000-8000-000000000001",
  attemptId: generation.attemptId,
  followupRequestId: generation.requestId,
  packId: generation.packId,
  questionId: generation.questionId,
  prompt: "How does the fact connect to the result?",
  answer: "It connects because...",
  targetedCriterion: generation.targetedCriterion,
  sources: [source],
};
const config = { gatewayId: "tai", model: "@cf/example/model" };

describe("Workers AI targeted follow-up providers", () => {
  it("generates from minimized evidence and reconstructs trusted fields", async () => {
    const ai = new RecordingAi({
      schemaVersion: 1,
      prompt: "Apply the fact to a new example.",
      sourceIds: [source.id],
    });
    const result = await new WorkersAiActivityFollowupProvider(
      ai,
      config,
    ).generate(generation);
    expect(result).toMatchObject({
      requestId: generation.requestId,
      targetedCriterion: generation.targetedCriterion,
      conceptIds: generation.conceptIds,
      sources: [source],
    });
    const messages = JSON.stringify(ai.call?.input.messages);
    expect(messages).not.toContain(generation.savedAnswer);
    expect(messages).not.toContain(generation.requestId);
    expect(messages).not.toContain(generation.conceptIds[0]);
    expect(ai.call?.options).toEqual({
      gateway: {
        id: "tai",
        skipCache: true,
        collectLog: false,
        requestTimeoutMs: 30_000,
      },
    });
  });

  it("grades only the targeted criterion and rebuilds immutable fields", async () => {
    const ai = new RecordingAi({
      schemaVersion: 1,
      outcome: "partial",
      feedback: "Add the missing connection.",
      sourceIds: [source.id],
    });
    const result = await new WorkersAiActivityFollowupGradeProvider(
      ai,
      config,
    ).grade(grading);
    expect(result).toMatchObject({
      requestId: grading.requestId,
      followupRequestId: grading.followupRequestId,
      outcome: "partial",
      targetedCriterion: grading.targetedCriterion,
      sources: [source],
    });
    const messages = JSON.stringify(ai.call?.input.messages);
    expect(messages).toContain(grading.answer);
    expect(messages).not.toContain(grading.requestId);
    expect(messages).not.toContain(grading.packId);
  });

  it("rejects invented and repeated sources", async () => {
    const invented = new RecordingAi({
      schemaVersion: 1,
      prompt: "Question",
      sourceIds: ["invented"],
    });
    await expect(
      new WorkersAiActivityFollowupProvider(invented, config).generate(
        generation,
      ),
    ).rejects.toThrow("invalid source");
    const repeated = new RecordingAi({
      schemaVersion: 1,
      outcome: "supported",
      feedback: "Good",
      sourceIds: [source.id, source.id],
    });
    await expect(
      new WorkersAiActivityFollowupGradeProvider(repeated, config).grade(
        grading,
      ),
    ).rejects.toThrow("repeated a source");
  });

  it("exposes provenance and fails closed when live bindings are absent", () => {
    expect(
      new WorkersAiActivityFollowupProvider(new RecordingAi({}), config)
        .metadata,
    ).toMatchObject({
      provider: "workers_ai",
      promptVersion: "activity-followup-v1",
    });
    expect(
      new WorkersAiActivityFollowupGradeProvider(new RecordingAi({}), config)
        .metadata,
    ).toMatchObject({
      provider: "workers_ai",
      promptVersion: "activity-followup-grade-v1",
    });
    expect(
      activityFollowupProviderForEnv({ AI_PROVIDER: "fake" } as Env),
    ).toBeDefined();
    expect(() =>
      activityFollowupProviderForEnv({ AI_PROVIDER: "workers_ai" } as Env),
    ).toThrow("Workers AI is not configured");
    expect(() =>
      activityFollowupGradeProviderForEnv({ AI_PROVIDER: "invalid" } as Env),
    ).toThrow("Invalid AI provider configuration");
  });
});
