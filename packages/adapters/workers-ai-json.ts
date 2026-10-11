export interface WorkersAiRunner {
  run(
    model: string,
    input: Record<string, unknown>,
    options: Record<string, unknown>,
  ): Promise<unknown>;
}

export async function runWorkersAiJson(
  ai: WorkersAiRunner,
  model: string,
  gatewayId: string,
  messages: Array<{ role: "system" | "user"; content: string }>,
  schema: Record<string, unknown>,
): Promise<unknown> {
  const output = await ai.run(
    model,
    {
      messages,
      max_tokens: 1_800,
      temperature: 0.2,
      response_format: { type: "json_schema", json_schema: schema },
    },
    {
      gateway: {
        id: gatewayId,
        skipCache: true,
        collectLog: false,
        requestTimeoutMs: 30_000,
      },
    },
  );
  if (!output || typeof output !== "object" || !("response" in output))
    throw new Error("Workers AI returned no JSON response");
  const response = (output as { response?: unknown }).response;
  if (typeof response === "string") return JSON.parse(response);
  if (response && typeof response === "object") return response;
  throw new Error("Workers AI returned no JSON response");
}
