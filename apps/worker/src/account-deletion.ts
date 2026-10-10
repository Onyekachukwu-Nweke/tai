import type { Env } from "./env";

type StoredOriginal = {
  space_id: string;
  object_key: string;
  state: string;
};

export async function deleteAccountData(
  env: Env,
  userId: string,
): Promise<boolean> {
  const deletedAt = new Date().toISOString();
  const fenced = await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO account_deletions(user_id,started_at) VALUES(?,?) ON CONFLICT(user_id) DO NOTHING",
    ).bind(userId, deletedAt),
    env.DB.prepare(
      "UPDATE study_spaces SET deleted_at=COALESCE(deleted_at,?), title='Deleted study space' WHERE user_id=?",
    ).bind(deletedAt, userId),
    env.DB.prepare(
      "UPDATE material_imports SET state='cleanup' WHERE user_id=? AND state='writing'",
    ).bind(userId),
  ]);
  if (fenced[2]?.meta.changes) return false;

  const imports = await env.DB.prepare(
    "SELECT space_id,object_key,state FROM material_imports WHERE user_id=? ORDER BY space_id",
  )
    .bind(userId)
    .all<StoredOriginal>();
  let cleanupPending = imports.results.some(
    (record) => record.state === "writing" || record.state === "cleanup",
  );

  for (const record of imports.results) {
    if (record.state === "writing" || record.state === "cleanup") continue;
    try {
      await env.ORIGINALS.delete(record.object_key);
      await env.DB.prepare(
        "DELETE FROM material_imports WHERE user_id=? AND space_id=? AND object_key=? AND state IN ('ready','failed')",
      )
        .bind(userId, record.space_id, record.object_key)
        .run();
    } catch {
      cleanupPending = true;
    }
  }

  if (cleanupPending) return false;
  const remaining = await env.DB.prepare(
    "SELECT 1 FROM material_imports WHERE user_id=? LIMIT 1",
  )
    .bind(userId)
    .first();
  if (remaining) return false;

  await env.DB.prepare("DELETE FROM user WHERE id=?").bind(userId).run();
  return true;
}
