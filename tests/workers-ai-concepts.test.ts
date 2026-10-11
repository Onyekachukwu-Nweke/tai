import { describe, expect, it } from "vitest";
import { WorkersAiConceptProvider } from "../packages/adapters/workers-ai-concepts";
import type { WorkersAiRunner } from "../packages/adapters/workers-ai-json";
import { conceptProviderForEnv } from "../apps/worker/src/concept-provider";
import type { Env } from "../apps/worker/src/env";
import type { SourceContext } from "../packages/contracts/concepts";

const context: SourceContext = {
  studySpaceId: "11111111-1111-4111-8111-111111111111",
  materialId: "22222222-2222-4222-8222-222222222222",
  location: 1,
  chunks: [
    {
      id: "source-1",
      studySpaceId: "11111111-1111-4111-8111-111111111111",
      materialId: "22222222-2222-4222-8222-222222222222",
      location: 1,
      start: 0,
      end: 25,
      text: "Plants turn light to food",
    },
  ],
};

class RecordingAi implements WorkersAiRunner {
  call?: {
    model: string;
    input: Record<string, unknown>;
    options: Record<string, unknown>;
  };
  response: unknown = {
    response: JSON.stringify({
      schemaVersion: 1,
      concepts: [
        {
          title: "Photosynthesis",
          description: "Plants use light to create stored chemical energy.",
          sourceIds: ["source-1"],
        },
      ],
      relations: [],
    }),
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

describe("Workers AI concept provider", () => {
  it("uses bounded schema generation through a non-logging uncached gateway call", async () => {
    const ai = new RecordingAi();
    const result = await new WorkersAiConceptProvider(ai, {
      gatewayId: "tai",
      model: "@cf/example/model",
    }).generate(context);
    expect(result.concepts[0]?.sourceIds).toEqual(["source-1"]);
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

  it("rejects citations outside the supplied source context", async () => {
    const ai = new RecordingAi();
    ai.response = {
      response: JSON.stringify({
        schemaVersion: 1,
        concepts: [
          {
            title: "Unsupported",
            description: "No evidence",
            sourceIds: ["invented"],
          },
        ],
        relations: [],
      }),
    };
    await expect(
      new WorkersAiConceptProvider(ai, {
        gatewayId: "tai",
        model: "@cf/example/model",
      }).generate(context),
    ).rejects.toThrow("Invalid concept references");
  });

  it("rejects malformed JSON and inference failures", async () => {
    const ai = new RecordingAi();
    const provider = new WorkersAiConceptProvider(ai, {
      gatewayId: "tai",
      model: "@cf/example/model",
    });
    ai.response = { response: "not JSON" };
    await expect(provider.generate(context)).rejects.toBeInstanceOf(
      SyntaxError,
    );
    ai.run = async () => {
      throw new Error("inference unavailable");
    };
    await expect(provider.generate(context)).rejects.toThrow(
      "inference unavailable",
    );
  });

  it("exposes exact persisted provenance metadata", () => {
    expect(
      new WorkersAiConceptProvider(new RecordingAi(), {
        gatewayId: "tai",
        model: "@cf/example/model",
      }).metadata,
    ).toEqual({
      provider: "workers_ai",
      model: "@cf/example/model",
      promptVersion: "concept-organization-v1",
      schemaVersion: 1,
    });
  });

  it("fails closed for incomplete live configuration and defaults to fake", () => {
    expect(conceptProviderForEnv({ AI_PROVIDER: "fake" } as Env)).toBeDefined();
    expect(() =>
      conceptProviderForEnv({ AI_PROVIDER: "workers_ai" } as Env),
    ).toThrow("Workers AI is not configured");
    expect(() =>
      conceptProviderForEnv({ AI_PROVIDER: "unknown" } as Env),
    ).toThrow("Invalid AI provider configuration");
  });
});
