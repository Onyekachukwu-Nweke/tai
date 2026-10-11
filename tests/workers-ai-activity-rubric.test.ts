import { describe, expect, it } from "vitest";
import { activityRubricProviderForEnv } from "../apps/worker/src/activity-rubric-provider";
import type { Env } from "../apps/worker/src/env";
import { WorkersAiActivityRubricProvider } from "../packages/adapters/workers-ai-activity-rubric";
import type { WorkersAiRunner } from "../packages/adapters/workers-ai-json";
import type { RubricContext } from "../packages/contracts/activity-rubric";

const context: RubricContext = {
  requestId: "10000000-0000-4000-8000-000000000001",
  attemptId: "10000000-0000-4000-8000-000000000002",
  packId: "10000000-0000-4000-8000-000000000003",
  questionId: "10000000-0000-4000-8000-000000000004",
  prompt: "Explain the process.",
  answer: "The learner cites the first fact.",
  rubric: ["Uses the first fact", "Connects it to the conclusion"],
  sources: [
    { id: "source-1", location: 1, start: 0, end: 10, text: "First fact" },
    {
      id: "source-2",
      location: 1,
      start: 11,
      end: 22,
      text: "Second fact",
    },
  ],
};

const valid = () => ({
  schemaVersion: 1,
  feedback: "The first point is supported; explain the connection.",
  elements: [
    {
      criterionIndex: 0,
      outcome: "supported",
      feedback: "The first fact is present.",
    },
    {
      criterionIndex: 1,
      outcome: "partial",
      feedback: "The connection needs more detail.",
    },
  ],
  sourceIds: ["source-1"],
});

class RecordingAi implements WorkersAiRunner {
  response: unknown = { response: JSON.stringify(valid()) };
  call?: {
    model: string;
    input: Record<string, unknown>;
    options: Record<string, unknown>;
  };
  async run(
    model: string,
    input: Record<string, unknown>,
    options: Record<string, unknown>,
  ) {
    this.call = { model, input, options };
    return this.response;
  }
}

const provider = (ai: RecordingAi) =>
  new WorkersAiActivityRubricProvider(ai, {
    gatewayId: "tai",
    model: "@cf/example/model",
  });

describe("Workers AI activity rubric provider", () => {
  it("grades every reviewed criterion and reconstructs trusted fields", async () => {
    const ai = new RecordingAi();
    const result = await provider(ai).grade(context);
    expect(result).toMatchObject({
      requestId: context.requestId,
      attemptId: context.attemptId,
      packId: context.packId,
      questionId: context.questionId,
      outcome: "partial",
      elements: context.rubric.map((criterion) => ({ criterion })),
      sources: [context.sources[0]],
    });
    expect(ai.call).toMatchObject({
      model: "@cf/example/model",
      input: {
        max_tokens: 1_800,
        temperature: 0.2,
        response_format: { type: "json_schema" },
      },
      options: {
        gateway: { id: "tai", skipCache: true, collectLog: false },
      },
    });
  });

  it("rejects changed rubric cardinality and invalid or repeated sources", async () => {
    const ai = new RecordingAi();
    const changed = valid();
    changed.elements.pop();
    ai.response = { response: JSON.stringify(changed) };
    await expect(provider(ai).grade(context)).rejects.toThrow(
      "changed the reviewed rubric",
    );
    const reordered = valid();
    reordered.elements[1]!.criterionIndex = 0;
    ai.response = { response: JSON.stringify(reordered) };
    await expect(provider(ai).grade(context)).rejects.toThrow(
      "changed the reviewed rubric",
    );
    ai.response = {
      response: JSON.stringify({ ...valid(), sourceIds: ["invented"] }),
    };
    await expect(provider(ai).grade(context)).rejects.toThrow(
      "cited an invalid source",
    );
    ai.response = {
      response: JSON.stringify({
        ...valid(),
        sourceIds: ["source-1", "source-1"],
      }),
    };
    await expect(provider(ai).grade(context)).rejects.toThrow(
      "repeated a source",
    );
  });

  it("rejects malformed output and fails closed for live configuration", async () => {
    const ai = new RecordingAi();
    ai.response = { response: "not JSON" };
    await expect(provider(ai).grade(context)).rejects.toBeInstanceOf(
      SyntaxError,
    );
    expect(
      activityRubricProviderForEnv({ AI_PROVIDER: "fake" } as Env),
    ).toBeDefined();
    expect(() =>
      activityRubricProviderForEnv({ AI_PROVIDER: "workers_ai" } as Env),
    ).toThrow("Workers AI is not configured");
    expect(() =>
      activityRubricProviderForEnv({ AI_PROVIDER: "invalid" } as Env),
    ).toThrow("Invalid AI provider configuration");
  });

  it("exposes exact provenance metadata", () => {
    expect(provider(new RecordingAi()).metadata).toEqual({
      provider: "workers_ai",
      model: "@cf/example/model",
      promptVersion: "activity-rubric-v1",
      schemaVersion: 1,
    });
  });

  it("derives an internally consistent overall outcome", async () => {
    const ai = new RecordingAi();
    const supported = valid();
    supported.elements[1]!.outcome = "supported";
    ai.response = { response: JSON.stringify(supported) };
    expect((await provider(ai).grade(context)).outcome).toBe("supported");

    const uncertain = valid();
    uncertain.elements[1]!.outcome = "uncertain";
    ai.response = { response: JSON.stringify(uncertain) };
    expect((await provider(ai).grade(context)).outcome).toBe("uncertain");
  });
});
