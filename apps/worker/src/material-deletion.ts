import type { Env } from "./env";
import { MaterialFailure } from "./material-input";
import { getImport } from "./material-store";

export async function deleteSpace(
  env: Env,
  userId: string,
  spaceId: string,
): Promise<boolean> {
  const owner = await env.DB.prepare(
    "SELECT id FROM study_spaces WHERE user_id = ? AND id = ?",
  )
    .bind(userId, spaceId)
    .first();
  if (!owner) throw new MaterialFailure(404, "Study space not found.");
  await env.DB.batch([
    env.DB.prepare(
      "UPDATE study_spaces SET deleted_at = COALESCE(deleted_at, ?), title = 'Deleted study space' WHERE user_id = ? AND id = ?",
    ).bind(new Date().toISOString(), userId, spaceId),
    env.DB.prepare(
      "DELETE FROM material_chunks WHERE user_id = ? AND space_id = ?",
    ).bind(userId, spaceId),
    env.DB.prepare(
      "DELETE FROM material_sections WHERE user_id = ? AND space_id = ?",
    ).bind(userId, spaceId),
  ]);
  const record = await getImport(env, userId, spaceId);
  if (!record) return true;
  try {
    await env.ORIGINALS.delete(record.object_key);
  } catch {
    return false;
  }
  // A put can finish after this delete. Its writer must settle before cleanup
  // can be acknowledged; hard-terminated writers require operational review.
  if (record.state === "writing") return false;
  await env.DB.prepare(
    "DELETE FROM material_imports WHERE user_id = ? AND space_id = ? AND object_key = ? AND state != 'writing'",
  )
    .bind(userId, spaceId, record.object_key)
    .run();
  return !(await getImport(env, userId, spaceId));
}
