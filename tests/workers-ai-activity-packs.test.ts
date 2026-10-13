import { describe, expect, it } from "vitest";
import { activityPackProviderForEnv } from "../apps/worker/src/activity-pack-provider";
import type { Env } from "../apps/worker/src/env";
import { WorkersAiActivityPackProvider } from "../packages/adapters/workers-ai-activity-packs";
import type { WorkersAiRunner } from "../packages/adapters/workers-ai-json";
import type { ActivityContext } from "../packages/contracts/activity-packs";

const conceptIds = [
  "11111111-1111-4111-8111-111111111111",
  "22222222-2222-4222-8222-222222222222",
];
const context: ActivityContext = {
  studySpaceId: "33333333-3333-4333-8333-333333333333",
  materialId: "44444444-4444-4444-8444-444444444444",
  conceptRequestId: "55555555-5555-4555-8555-555555555555",
  concepts: conceptIds.map((id, index) => {
    const text = `Source excerpt ${index + 1}`;
    const start = index * 20;
    return {
      id,
      label: `Concept ${index + 1}`,
      sources: [
        {
          id: `source-${index + 1}`,
          location: 1,
          start,
          end: start + text.length,
          text,
        },
      ],
    };
  }),
};

function validResponse() {
  return {
    schemaVersion: 1,
    questions: [
      {
        draftId: "q1",
        type: "recall",
        conceptIds: [conceptIds[0]],
        sourceIds: ["source-1"],
        prompt: "Recall the first concept.",
        estimatedMinutes: 2,
        supportedAnswer: "Source excerpt 1",
      },
      {
        draftId: "q2",
        type: "explain",
        conceptIds: [conceptIds[1]],
        sourceIds: ["source-2"],
        prompt: "Explain the second concept.",
        estimatedMinutes: 3,
        rubric: ["Uses the cited excerpt"],
      },
      {
        draftId: "q3",
        type: "mcq",
        conceptIds,
        sourceIds: ["source-1", "source-2"],
        prompt: "Which statement is supported?",
        estimatedMinutes: 2,
        options: [
          { draftId: "a", text: "First" },
          { draftId: "b", text: "Second" },
          { draftId: "c", text: "Both" },
        ],
        correctOptionDraftId: "c",
        answerExplanation: "Both excerpts support the answer.",
      },
    ],
  };
}

class RecordingAi implements WorkersAiRunner {
  call?: {
    model: string;
    input: Record<string, unknown>;
    options: Record<string, unknown>;
  };
  response: unknown = { response: JSON.stringify(validResponse()) };
  async run(
    model: string,
    input: Record<string, unknown>,
    options: Record<string, unknown>,
  ) {
    this.call = { model, input, options };
    return this.response;
  }
}

describe("Workers AI activity-pack provider", () => {
  it("generates a validated source-backed pack through the private gateway path", async () => {
    const ai = new RecordingAi();
    const provider = new WorkersAiActivityPackProvider(ai, {
      gatewayId: "tai",
      model: "@cf/example/model",
    });
    const pack = await provider.generate(context);
    expect(pack.questions).toHaveLength(3);
    expect(pack.questions[2]).toMatchObject({
      type: "mcq",
      conceptIds,
      sources: context.concepts.flatMap((concept) => concept.sources),
    });
    expect(ai.call).toMatchObject({
      model: "@cf/example/model",
      input: {
        max_tokens: 1_800,
        temperature: 0.2,
        response_format: { type: "json_schema" },
      },
      options: { gateway: { id: "tai", skipCache: true, collectLog: false } },
    });
  });

  it("rejects invented references and ambiguous draft identifiers", async () => {
    const ai = new RecordingAi();
    const provider = new WorkersAiActivityPackProvider(ai, {
      gatewayId: "tai",
      model: "@cf/example/model",
    });
    const invented = validResponse();
    invented.questions[0]!.sourceIds = ["invented"];
    ai.response = { response: JSON.stringify(invented) };
    await expect(provider.generate(context)).rejects.toThrow();

    const duplicate = validResponse();
    const options = (
      duplicate.questions[2] as {
        options: Array<{ draftId: string; text: string }>;
      }
    ).options;
    options[1]!.draftId = options[0]!.draftId;
    ai.response = { response: JSON.stringify(duplicate) };
    await expect(provider.generate(context)).rejects.toThrow(
      "Duplicate MCQ option draft ID",
    );
  });

  it("rejects malformed responses and fails closed for incomplete live configuration", async () => {
    const ai = new RecordingAi();
    const provider = new WorkersAiActivityPackProvider(ai, {
      gatewayId: "tai",
      model: "@cf/example/model",
    });
    ai.response = { response: "not JSON" };
    await expect(provider.generate(context)).rejects.toBeInstanceOf(
      SyntaxError,
    );
    expect(
      activityPackProviderForEnv({ AI_PROVIDER: "fake" } as Env),
    ).toBeDefined();
    expect(() =>
      activityPackProviderForEnv({ AI_PROVIDER: "workers_ai" } as Env),
    ).toThrow("Workers AI is not configured");
    expect(() =>
      activityPackProviderForEnv({ AI_PROVIDER: "unknown" } as Env),
    ).toThrow("Invalid AI provider configuration");
  });

  it("rejects a pack containing only one question type", async () => {
    const ai = new RecordingAi();
    const provider = new WorkersAiActivityPackProvider(ai, {
      gatewayId: "tai",
      model: "@cf/example/model",
    });
    const oneType = validResponse();
    oneType.questions = oneType.questions.map((question, index) => ({
      draftId: `recall-${index}`,
      type: "recall" as const,
      conceptIds: question.conceptIds,
      sourceIds: question.sourceIds,
      prompt: question.prompt,
      estimatedMinutes: question.estimatedMinutes,
      supportedAnswer: "Supported by the cited excerpt.",
    }));
    ai.response = { response: JSON.stringify(oneType) };
    await expect(provider.generate(context)).rejects.toThrow(
      "at least two question types",
    );
  });

  it("exposes exact provenance metadata", () => {
    expect(
      new WorkersAiActivityPackProvider(new RecordingAi(), {
        gatewayId: "tai",
        model: "@cf/example/model",
      }).metadata,
    ).toEqual({
      provider: "workers_ai",
      model: "@cf/example/model",
      promptVersion: "activity-pack-v2",
      schemaVersion: 1,
    });
  });
});
