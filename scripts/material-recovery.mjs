// Local maintenance only. The caller must stop every Worker using this store first.
export function recoveryRequested(args) {
  if (
    args.length !== 2 ||
    !args.includes("--local") ||
    !args.includes("--confirm-worker-stopped")
  ) {
    throw new Error(
      "Stop Wrangler first, then pass --local --confirm-worker-stopped. Remote recovery is not supported.",
    );
  }
}

const quoted = (value) => {
  if (typeof value !== "string" || !value)
    throw new Error("Invalid recovery ledger.");
  return `'${value.replaceAll("'", "''")}'`;
};

export async function recoverMaterials(run) {
  const execute = (sql) =>
    run(["d1", "execute", "tai", "--local", "--json", "--command", sql]);
  const output = await execute(
    "SELECT user_id, space_id, object_key FROM material_imports WHERE state IN ('writing', 'cleanup', 'failed')",
  );
  const result = JSON.parse(output);
  if (
    !Array.isArray(result) ||
    result.length !== 1 ||
    result[0].success !== true ||
    !Array.isArray(result[0].results)
  ) {
    throw new Error("Unable to read the local recovery ledger.");
  }
  let recovered = 0;
  for (const row of result[0].results) {
    const scope = `user_id = ${quoted(row.user_id)} AND space_id = ${quoted(row.space_id)} AND object_key = ${quoted(row.object_key)} AND state IN ('writing', 'cleanup', 'failed')`;
    const prefix = `users/${encodeURIComponent(row.user_id)}/spaces/${row.space_id}/materials/`;
    if (!row.object_key.startsWith(prefix))
      throw new Error("Invalid owner-scoped original key.");
    // Do not settle a row when R2 deletion fails. Keep the key for the next explicit run.
    await run([
      "r2",
      "object",
      "delete",
      `tai-originals/${row.object_key}`,
      "--local",
      "--force",
    ]);
    const updated = JSON.parse(
      await execute(
        `UPDATE material_imports SET state = 'failed' WHERE ${scope}`,
      ),
    );
    if (
      !Array.isArray(updated) ||
      updated.some((entry) => entry.success !== true)
    )
      throw new Error("Recovery state could not be confirmed.");
    recovered++;
  }
  return recovered;
}
