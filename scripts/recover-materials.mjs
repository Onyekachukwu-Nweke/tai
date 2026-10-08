import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { recoverMaterials, recoveryRequested } from "./material-recovery.mjs";

const args = process.argv.slice(2);
if (args.length === 1 && args[0] === "--help") {
  console.log(
    "Stop all Wrangler processes using this local store, then run: npm run materials:recover -- --local --confirm-worker-stopped\nDeletes unsettled local originals and releases reservations for manual retry. Never touches ready materials or remote storage.",
  );
} else {
  try {
    recoveryRequested(args);
    const execute = promisify(execFile);
    const wrangler = fileURLToPath(
      new URL("../node_modules/wrangler/bin/wrangler.js", import.meta.url),
    );
    const recovered = await recoverMaterials(async (command) => {
      const { stdout } = await execute(
        process.execPath,
        [wrangler, ...command],
        {
          cwd: fileURLToPath(new URL("../", import.meta.url)),
          env: { ...process.env, WRANGLER_SEND_METRICS: "false" },
          maxBuffer: 4 * 1024 * 1024,
        },
      );
      return stdout;
    });
    console.log(
      `Recovered ${recovered} unsettled local imports. Restart Wrangler, then retry the upload or deletion explicitly.`,
    );
  } catch {
    console.error(
      "Local recovery did not complete. Stop Wrangler and use --local --confirm-worker-stopped; retained ledger entries must be retried. No remote recovery is supported.",
    );
    process.exitCode = 1;
  }
}
