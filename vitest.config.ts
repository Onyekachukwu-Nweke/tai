import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

process.env.CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV = "false";

export default defineConfig({
  plugins: [
    cloudflareTest(async () => ({
      wrangler: { configPath: "./wrangler.test.toml" },
      miniflare: {
        bindings: {
          APP_ORIGIN: "http://localhost:8787",
          BETTER_AUTH_SECRET:
            "synthetic-test-secret-with-at-least-32-characters",
          GOOGLE_CLIENT_ID: "synthetic-client-id",
          GOOGLE_CLIENT_SECRET: "synthetic-client-secret",
          AI_PROVIDER: "fake",
          TEST_MIGRATIONS: await readD1Migrations("./migrations"),
        },
      },
    })),
  ],
  test: {
    include: ["tests/**/*.test.ts"],
    setupFiles: ["./tests/setup.ts"],
  },
});
