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

class StubAi implements WorkersAiRunner {
  input?: Record<string, unknown>;
  constructor(private readonly value: unknown) {}
  async run(
    _model: string,
    input: Record<string, unknown>,
    options: Record<string, unknown>,
  ) {
    void options;
    this.input = input;
    return { response: JSON.stringify(this.value) };
  }
}

const source = {
  id: "source-1",
  location: 1,
  start: 0,
  end: 25,
  text: "Grounded source evidence.",
};
const generation: FollowupContext = {
  requestId: "10000000-0000-4000-8000-000000000001",
  attemptId: "10000000-0000-4000-8000-000000000002",
  packId: "10000000-0000-4000-8000-000000000003",
  questionId: "10000000-0000-4000-8000-000000000004",
  originalPrompt: "Explain the evidence.",
  savedAnswer: "private answer",
  targetedCriterion: "Connect evidence and conclusion",
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
  prompt: "Connect the evidence.",
  answer: "A bounded learner response.",
  targetedCriterion: generation.targetedCriterion,
  sources: [source],
};
const config = { gatewayId: "tai", model: "@cf/example/model" };

describe("Workers AI targeted follow-up boundaries", () => {
  it.each([
    {
      schemaVersion: 1,
      prompt: "Question",
      sourceIds: [source.id],
      extra: true,
    },
    { schemaVersion: 1, prompt: "x".repeat(1_001), sourceIds: [source.id] },
    { schemaVersion: 1, prompt: "Question", sourceIds: [source.id, source.id] },
  ])("rejects malformed generation output", async (value) => {
    await expect(
      new WorkersAiActivityFollowupProvider(new StubAi(value), config).generate(
        generation,
      ),
    ).rejects.toThrow();
  });

  it.each([
    {
      schemaVersion: 1,
      outcome: "partial",
      feedback: "x".repeat(1_201),
      sourceIds: [source.id],
    },
    {
      schemaVersion: 1,
      outcome: "partial",
      feedback: "Try again.",
      sourceIds: ["unknown"],
    },
    {
      schemaVersion: 1,
      outcome: "invalid",
      feedback: "Try again.",
      sourceIds: [source.id],
    },
  ])("rejects malformed grading output", async (value) => {
    await expect(
      new WorkersAiActivityFollowupGradeProvider(
        new StubAi(value),
        config,
      ).grade(grading),
    ).rejects.toThrow();
  });

  it("omits all application identifiers and prior answers from provider payloads", async () => {
    const generationAi = new StubAi({
      schemaVersion: 1,
      prompt: "Question",
      sourceIds: [source.id],
    });
    await new WorkersAiActivityFollowupProvider(generationAi, config).generate(
      generation,
    );
    const generationPayload = JSON.stringify(generationAi.input);
    for (const secret of [
      generation.requestId,
      generation.attemptId,
      generation.packId,
      generation.questionId,
      generation.conceptIds[0]!,
      generation.savedAnswer,
    ])
      expect(generationPayload).not.toContain(secret);

    const gradeAi = new StubAi({
      schemaVersion: 1,
      outcome: "partial",
      feedback: "Try again.",
      sourceIds: [source.id],
    });
    await new WorkersAiActivityFollowupGradeProvider(gradeAi, config).grade(
      grading,
    );
    const gradePayload = JSON.stringify(gradeAi.input);
    for (const secret of [
      grading.requestId,
      grading.attemptId,
      grading.followupRequestId,
      grading.packId,
      grading.questionId,
    ])
      expect(gradePayload).not.toContain(secret);
  });

  it("resolves both live providers with configured provenance", () => {
    const ai = new StubAi({}) as unknown as Env["AI"];
    const env = {
      AI_PROVIDER: "workers_ai",
      AI_GATEWAY_ID: "tai",
      WORKERS_AI_MODEL: config.model,
      AI: ai,
    } as Env;
    expect(activityFollowupProviderForEnv(env).metadata).toMatchObject({
      provider: "workers_ai",
      model: config.model,
    });
    expect(activityFollowupGradeProviderForEnv(env).metadata).toMatchObject({
      provider: "workers_ai",
      model: config.model,
    });
  });
});
