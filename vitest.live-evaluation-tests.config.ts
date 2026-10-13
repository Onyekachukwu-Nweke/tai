import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: [
      "tests/live-evaluation.test.ts",
      "tests/live-evaluation-boundaries.test.ts",
    ],
    fileParallelism: false,
  },
});
