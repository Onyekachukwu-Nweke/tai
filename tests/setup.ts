import { applyD1Migrations, env } from "cloudflare:test";
import { beforeEach } from "vitest";

await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);

beforeEach(async () => {
  const objects = await env.ORIGINALS.list();
  if (objects.objects.length)
    await env.ORIGINALS.delete(objects.objects.map((object) => object.key));
  await env.DB.batch([
    env.DB.prepare("DELETE FROM study_session_items"),
    env.DB.prepare("DELETE FROM study_sessions"),
    env.DB.prepare("DELETE FROM concept_progress"),
    env.DB.prepare("DELETE FROM activity_question_flags"),
    env.DB.prepare("DELETE FROM activity_attempts"),
    env.DB.prepare("DELETE FROM activity_question_concepts"),
    env.DB.prepare("DELETE FROM activity_packs"),
    env.DB.prepare("DELETE FROM activity_pack_requests"),
    env.DB.prepare("DELETE FROM concept_relations"),
    env.DB.prepare("DELETE FROM concept_sources"),
    env.DB.prepare("DELETE FROM concepts"),
    env.DB.prepare("DELETE FROM concept_requests"),
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
