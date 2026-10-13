import type { WorkersAiRunner } from "../packages/adapters/workers-ai-json";

export type CallObservation = {
  httpStatus: number | null;
  latencyMs: number;
  usage: Record<string, number> | null;
  reportedCostUsd: number | null;
};

type FetchLike = typeof fetch;

function numericUsage(value: unknown): Record<string, number> | null {
  if (!value || typeof value !== "object") return null;
  const entries = Object.entries(value).filter(
    (entry): entry is [string, number] =>
      typeof entry[1] === "number" && Number.isFinite(entry[1]),
  );
  return entries.length ? Object.fromEntries(entries) : null;
}

export class CloudflareRestAiRunner implements WorkersAiRunner {
  readonly observations: CallObservation[] = [];
  private calls = 0;

  constructor(
    private readonly config: {
      accountId: string;
      apiToken: string;
      gatewayId: string;
    },
    private readonly fetcher: FetchLike = fetch,
    private readonly now: () => number = () => performance.now(),
  ) {}

  async run(
    model: string,
    input: Record<string, unknown>,
    options: Record<string, unknown>,
  ): Promise<unknown> {
    void options;
    this.calls += 1;
    if (this.calls > 4) throw new Error("Live evaluation call cap exceeded");
    const started = this.now();
    let status: number | null = null;
    try {
      const response = await this.fetcher(
        `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(this.config.accountId)}/ai/run`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.config.apiToken}`,
            "Content-Type": "application/json",
            "cf-aig-gateway-id": this.config.gatewayId,
            "cf-aig-skip-cache": "true",
            "cf-aig-collect-log": "false",
            "cf-aig-request-timeout": "30000",
            "cf-aig-max-attempts": "1",
          },
          body: JSON.stringify({ model, input }),
          signal: AbortSignal.timeout(30_000),
        },
      );
      status = response.status;
      if (!response.ok)
        throw new Error(`Cloudflare inference failed with status ${status}`);
      const envelope = (await response.json()) as {
        success?: boolean;
        result?: unknown;
        errors?: Array<{ code?: number }>;
      };
      if (envelope.success === false || !envelope.result)
        throw new Error(`Cloudflare inference failed with status ${status}`);
      const result = envelope.result as { usage?: unknown };
      this.observations.push({
        httpStatus: status,
        latencyMs: Math.round(this.now() - started),
        usage: numericUsage(result.usage),
        reportedCostUsd:
          typeof result.usage === "object" &&
          result.usage !== null &&
          "cost_usd" in result.usage &&
          typeof result.usage.cost_usd === "number" &&
          Number.isFinite(result.usage.cost_usd)
            ? result.usage.cost_usd
            : null,
      });
      return result;
    } catch (error) {
      this.observations.push({
        httpStatus: status,
        latencyMs: Math.round(this.now() - started),
        usage: null,
        reportedCostUsd: null,
      });
      throw error;
    }
  }
}
