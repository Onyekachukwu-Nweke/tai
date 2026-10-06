import type { D1Migration } from "cloudflare:test";
import type { Env as WorkerEnv } from "../apps/worker/src/env";

declare global {
  namespace Cloudflare {
    interface Env extends WorkerEnv {
      TEST_MIGRATIONS: D1Migration[];
    }
  }
}
