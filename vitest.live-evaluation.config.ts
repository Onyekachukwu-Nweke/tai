import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["scripts/live-evaluation.run.ts"],
    maxConcurrency: 1,
    fileParallelism: false,
  },
});
