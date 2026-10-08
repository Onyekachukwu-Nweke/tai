import type { Env } from "./env";
import { MaterialFailure, readMaterial } from "./material-input";
import {
  activeSpace,
  commitImport,
  getImport,
  getMaterial,
  reserveImport,
  type ImportRecord,
} from "./material-store";

async function settleFailure(
  env: Env,
  userId: string,
  spaceId: string,
  record: ImportRecord,
): Promise<void> {
  // The writer has finished its put; retain the immutable key until deletion is confirmed.
  await env.DB.prepare(
    "UPDATE material_imports SET state = 'cleanup' WHERE user_id = ? AND space_id = ? AND object_key = ?",
  )
    .bind(userId, spaceId, record.object_key)
    .run();
  await env.ORIGINALS.delete(record.object_key);
  await env.DB.prepare(
    "UPDATE material_imports SET state = 'failed' WHERE user_id = ? AND space_id = ? AND object_key = ? AND state = 'cleanup'",
  )
    .bind(userId, spaceId, record.object_key)
    .run();
}

export async function uploadMaterial(
  env: Env,
  userId: string,
  spaceId: string,
  request: Request,
) {
  if (!(await activeSpace(env, userId, spaceId)))
    throw new MaterialFailure(404, "Study space not found.");
  const { preview, bytes, fingerprint } = await readMaterial(request);
  const record = await reserveImport(
    env,
    userId,
    spaceId,
    preview,
    fingerprint,
  );
  if (record.state === "ready") {
    const saved = await getMaterial(env, userId, spaceId);
    return { material: saved, created: false };
  }
  try {
    await env.ORIGINALS.put(record.object_key, bytes, {
      httpMetadata: {
        contentType:
          preview.format === "pdf"
            ? "application/pdf"
            : "text/plain; charset=utf-8",
      },
    });
    await commitImport(env, userId, spaceId, record, preview);
    return { material: preview, created: true };
  } catch {
    // A failed response does not prove the D1 commit failed. Never remove a
    // committed object (or an object whose commit status cannot be resolved).
    const current = await getImport(env, userId, spaceId);
    if (
      current?.state === "ready" &&
      current.object_key === record.object_key &&
      (await activeSpace(env, userId, spaceId))
    ) {
      return {
        material: await getMaterial(env, userId, spaceId),
        created: false,
      };
    }
    await settleFailure(env, userId, spaceId, record);
    throw new MaterialFailure(
      503,
      "The material was not saved. Keep this preview and retry explicitly.",
    );
  }
}
