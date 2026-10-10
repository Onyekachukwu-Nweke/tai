import {
  materialPreviewSchema,
  type MaterialPreview,
} from "../../../packages/contracts/materials";
import type { Env } from "./env";
import { MaterialFailure } from "./material-input";

export interface ImportRecord {
  document_id: string;
  fingerprint: string;
  object_key: string;
  state: "writing" | "ready" | "failed" | "cleanup";
  filename: string;
  format: "pdf" | "txt";
  warnings_json: string;
}

export async function activeSpace(
  env: Env,
  userId: string,
  spaceId: string,
): Promise<boolean> {
  return Boolean(
    await env.DB.prepare(
      "SELECT id FROM study_spaces WHERE user_id = ? AND id = ? AND deleted_at IS NULL",
    )
      .bind(userId, spaceId)
      .first(),
  );
}
export function getImport(
  env: Env,
  userId: string,
  spaceId: string,
): Promise<ImportRecord | null> {
  return env.DB.prepare(
    "SELECT document_id, fingerprint, object_key, state, filename, format, warnings_json FROM material_imports WHERE user_id = ? AND space_id = ?",
  )
    .bind(userId, spaceId)
    .first<ImportRecord>();
}

export async function getMaterial(
  env: Env,
  userId: string,
  spaceId: string,
): Promise<MaterialPreview | null> {
  const record = await getImport(env, userId, spaceId);
  if (record?.state !== "ready") return null;
  const [sections, chunks] = await Promise.all([
    env.DB.prepare(
      "SELECT location, text FROM material_sections WHERE user_id = ? AND space_id = ? ORDER BY location",
    )
      .bind(userId, spaceId)
      .all(),
    env.DB.prepare(
      "SELECT id, document_id AS documentId, location, start_offset AS start, end_offset AS end, text FROM material_chunks WHERE user_id = ? AND space_id = ? ORDER BY location, start_offset",
    )
      .bind(userId, spaceId)
      .all(),
  ]);
  if (!(await activeSpace(env, userId, spaceId)))
    throw new MaterialFailure(404, "Study space not found.");
  return materialPreviewSchema.parse({
    schemaVersion: 1,
    documentId: record.document_id,
    filename: record.filename,
    format: record.format,
    warnings: JSON.parse(record.warnings_json),
    sections: sections.results,
    chunks: chunks.results,
  });
}

export async function reserveImport(
  env: Env,
  userId: string,
  spaceId: string,
  preview: MaterialPreview,
  fingerprint: string,
): Promise<ImportRecord> {
  let previous = await getImport(env, userId, spaceId);
  if (
    previous &&
    (previous.fingerprint !== fingerprint ||
      previous.document_id !== preview.documentId)
  )
    throw new MaterialFailure(
      409,
      "This study space already has a different material. Create another study space.",
    );
  if (previous?.state === "ready") return previous;
  if (previous?.state === "cleanup") {
    await env.ORIGINALS.delete(previous.object_key);
    await env.DB.prepare(
      "UPDATE material_imports SET state = 'failed' WHERE user_id = ? AND space_id = ? AND object_key = ? AND state = 'cleanup'",
    )
      .bind(userId, spaceId, previous.object_key)
      .run();
    previous = await getImport(env, userId, spaceId);
  }
  const key = `users/${encodeURIComponent(userId)}/spaces/${spaceId}/materials/${preview.documentId}/${crypto.randomUUID()}`;
  try {
    if (previous?.state === "failed") {
      await env.DB.prepare(
        "UPDATE material_imports SET state = 'writing', object_key = ? WHERE user_id = ? AND space_id = ? AND object_key = ? AND state = 'failed' AND EXISTS (SELECT 1 FROM study_spaces WHERE user_id = ? AND id = ? AND deleted_at IS NULL) AND NOT EXISTS (SELECT 1 FROM account_deletions WHERE user_id = ?)",
      )
        .bind(
          key,
          userId,
          spaceId,
          previous.object_key,
          userId,
          spaceId,
          userId,
        )
        .run();
    } else {
      await env.DB.prepare(
        "INSERT INTO material_imports (user_id, space_id, document_id, fingerprint, object_key, state, filename, format, warnings_json) SELECT ?, ?, ?, ?, ?, 'writing', ?, ?, ? WHERE EXISTS (SELECT 1 FROM study_spaces WHERE user_id = ? AND id = ? AND deleted_at IS NULL) AND NOT EXISTS (SELECT 1 FROM account_deletions WHERE user_id = ?) ON CONFLICT DO NOTHING",
      )
        .bind(
          userId,
          spaceId,
          preview.documentId,
          fingerprint,
          key,
          preview.filename,
          preview.format,
          JSON.stringify(preview.warnings),
          userId,
          spaceId,
          userId,
        )
        .run();
    }
  } catch {
    // A lost D1 acknowledgement may still have reserved our exact immutable key.
    // The read below distinguishes that case before any R2 side effect.
  }
  let record: ImportRecord | null;
  try {
    record = await getImport(env, userId, spaceId);
  } catch {
    // No R2 write has started. Only this exact reservation can be released;
    // if D1 stays unavailable the durable ledger remains for reconciliation.
    await env.DB.prepare(
      "DELETE FROM material_imports WHERE user_id = ? AND space_id = ? AND object_key = ? AND state = 'writing'",
    )
      .bind(userId, spaceId, key)
      .run();
    throw new MaterialFailure(
      503,
      "The material reservation could not be confirmed. Retry explicitly.",
    );
  }
  if (record?.object_key !== key)
    throw new MaterialFailure(
      409,
      "An import is already pending or this space was deleted. Retry after the pending import finishes.",
    );
  return record;
}

export async function commitImport(
  env: Env,
  userId: string,
  spaceId: string,
  record: ImportRecord,
  preview: MaterialPreview,
): Promise<void> {
  const gate =
    "EXISTS (SELECT 1 FROM material_imports m JOIN study_spaces s ON s.id = m.space_id AND s.user_id = m.user_id WHERE m.user_id = ? AND m.space_id = ? AND m.object_key = ? AND m.state = 'writing' AND s.deleted_at IS NULL)";
  const scoped = [userId, spaceId, record.object_key];
  const statements = [
    ...preview.sections.map((section) =>
      env.DB.prepare(
        `INSERT INTO material_sections (user_id, space_id, location, text) SELECT ?, ?, ?, ? WHERE ${gate}`,
      ).bind(userId, spaceId, section.location, section.text, ...scoped),
    ),
    ...preview.chunks.map((chunk) =>
      env.DB.prepare(
        `INSERT INTO material_chunks (user_id, space_id, id, document_id, location, start_offset, end_offset, text) SELECT ?, ?, ?, ?, ?, ?, ?, ? WHERE ${gate}`,
      ).bind(
        userId,
        spaceId,
        chunk.id,
        preview.documentId,
        chunk.location,
        chunk.start,
        chunk.end,
        chunk.text,
        ...scoped,
      ),
    ),
    env.DB.prepare(
      `UPDATE material_imports SET state = 'ready' WHERE user_id = ? AND space_id = ? AND object_key = ? AND ${gate}`,
    ).bind(...scoped, ...scoped),
  ];
  await env.DB.batch(statements);
  const current = await getImport(env, userId, spaceId);
  if (
    current?.state !== "ready" ||
    current.object_key !== record.object_key ||
    !(await activeSpace(env, userId, spaceId))
  )
    throw new MaterialFailure(
      409,
      "The study space was deleted before the import finished.",
    );
}
