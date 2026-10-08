import assert from "node:assert/strict";
import test from "node:test";
import {
  recoverMaterials,
  recoveryRequested,
} from "../../scripts/material-recovery.mjs";

const row = {
  user_id: "learner",
  space_id: "space",
  object_key: "users/learner/spaces/space/materials/doc/attempt",
};
const listing = (rows) => JSON.stringify([{ success: true, results: rows }]);

test("recovery requires explicit local mode and stopped-worker acknowledgement", () => {
  assert.throws(() => recoveryRequested([]));
  assert.throws(() =>
    recoveryRequested(["--remote", "--confirm-worker-stopped"]),
  );
  assert.throws(() => recoveryRequested(["--local"]));
  assert.doesNotThrow(() =>
    recoveryRequested(["--local", "--confirm-worker-stopped"]),
  );
});

test("deletes tracked local originals before settling exact owner-scoped keys", async () => {
  const calls = [];
  const count = await recoverMaterials(async (args) => {
    calls.push(args);
    return calls.length === 1 ? listing([row]) : listing([]);
  });
  assert.equal(count, 1);
  assert.match(calls[0].at(-1), /state IN \('writing', 'cleanup', 'failed'\)/);
  assert.deepEqual(calls[1], [
    "r2",
    "object",
    "delete",
    `tai-originals/${row.object_key}`,
    "--local",
    "--force",
  ]);
  assert.match(
    calls[2].at(-1),
    /user_id = 'learner' AND space_id = 'space' AND object_key =/,
  );
  assert.ok(
    calls.every(
      (args) => args.includes("--local") && !args.includes("--remote"),
    ),
  );
});

test("failed R2 cleanup retains the ledger rather than marking recovery complete", async () => {
  let calls = 0;
  await assert.rejects(
    recoverMaterials(async () => {
      if (++calls === 1) return listing([row]);
      throw new Error("Synthetic R2 failure");
    }),
  );
  assert.equal(calls, 2);
});

test("rejects unscoped keys before object deletion", async () => {
  let calls = 0;
  await assert.rejects(
    recoverMaterials(async () => {
      calls++;
      return listing([{ ...row, object_key: "another-owner/private" }]);
    }),
  );
  assert.equal(calls, 1);
});
