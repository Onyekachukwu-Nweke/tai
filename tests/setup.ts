import { applyD1Migrations, env } from "cloudflare:test";
import { beforeEach } from "vitest";

await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);

beforeEach(async () => {
  const objects = await env.ORIGINALS.list();
  if (objects.objects.length)
    await env.ORIGINALS.delete(objects.objects.map((object) => object.key));
  await env.DB.batch([
    env.DB.prepare("DELETE FROM material_chunks"),
    env.DB.prepare("DELETE FROM material_sections"),
    env.DB.prepare("DELETE FROM material_imports"),
    env.DB.prepare("DELETE FROM study_spaces"),
    env.DB.prepare("DELETE FROM session"),
    env.DB.prepare("DELETE FROM account"),
    env.DB.prepare("DELETE FROM verification"),
    env.DB.prepare("DELETE FROM user"),
  ]);
});
