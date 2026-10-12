import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import {
  FakePracticalTaskProvider,
  type PracticalTaskProvider,
} from "../packages/adapters/fake-practical-tasks";
import {
  practicalTaskStateSchema,
  type PracticalContext,
} from "../packages/contracts/practical-tasks";
import { createApp } from "../apps/worker/src/index";
import { learner, material, upload } from "./material-fixtures";

async function seed(id = `learner-${crypto.randomUUID()}`) {
  const owner = await learner(id);
  const preview = material(
    "Plants use light energy to make food safely at a desk.",
  );
  await upload(owner.spaceId, owner.cookie, preview);
  const conceptRequestId = crypto.randomUUID(),
    ids = [crypto.randomUUID(), crypto.randomUUID()];
  await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO concept_requests(user_id,space_id,request_id,document_id,location,state) VALUES(?,?,?,?,1,'ready')",
    ).bind(owner.userId, owner.spaceId, conceptRequestId, preview.documentId),
    ...ids.map((id, index) =>
      env.DB.prepare(
        "INSERT INTO concepts(user_id,space_id,id,request_id,title,label,description,selected) VALUES(?,?,?,?,?,?,?,1)",
      ).bind(
        owner.userId,
        owner.spaceId,
        id,
        conceptRequestId,
        `Concept ${index}`,
        `Concept ${index}`,
        "Safe synthetic concept",
      ),
    ),
    ...ids.map((id) =>
      env.DB.prepare(
        "INSERT INTO concept_sources(user_id,space_id,concept_id,chunk_id) VALUES(?,?,?,?)",
      ).bind(owner.userId, owner.spaceId, id, preview.chunks[0]!.id),
    ),
  ]);
  return { ...owner, preview, ids };
}
function app(provider: PracticalTaskProvider) {
  return createApp(
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    provider,
  );
}
function call(
  owner: Awaited<ReturnType<typeof seed>>,
  provider: PracticalTaskProvider,
  path = "/generate",
  init: RequestInit = {},
) {
  const headers = new Headers(init.headers);
  headers.set("cookie", owner.cookie);
  headers.set("origin", env.APP_ORIGIN);
  headers.set("content-type", "application/json");
  return app(provider).request(
    `http://localhost:8787/api/study-spaces/${owner.spaceId}/practical-task${path}`,
    {
      method: path ? "POST" : "GET",
      body: path
        ? JSON.stringify({
            schemaVersion: 1,
            requestId: "77777777-7777-4777-8777-777777777777",
            conceptIds: [owner.ids[0]],
          })
        : undefined,
      ...init,
      headers,
    },
    env,
  );
}
class RecordingProvider extends FakePracticalTaskProvider {
  calls = 0;
  context?: PracticalContext;
  override async generate(context: PracticalContext) {
    this.calls++;
    this.context = context;
    return super.generate(context);
  }
}

describe("source-grounded practical tasks", () => {
  it("saves a full task, replays exactly, and persists completion separately", async () => {
    const owner = await seed(),
      provider = new RecordingProvider();
    const first = practicalTaskStateSchema.parse(
      await (await call(owner, provider)).json(),
    );
    expect(first.status).toBe("ready");
    expect(first.task).toMatchObject({
      completed: false,
      conceptIds: [owner.ids[0]],
    });
    expect(first.task?.task).toMatchObject({
      modality: "written_analysis",
      connectivity: { requirement: "none" },
      cost: { kind: "none" },
    });
    expect(first.task?.simpler).not.toBeNull();
    expect(first.task?.freeAlternative).not.toBeNull();
    expect(provider.context?.materialId).toBe(owner.preview.documentId);
    expect(
      await env.DB.prepare(
        "SELECT provider||':'||coalesce(model,'null')||':'||prompt_version||':'||output_schema_version value FROM practical_task_requests WHERE user_id=?",
      )
        .bind(owner.userId)
        .first("value"),
    ).toBe("fake:null:deterministic-fake-v1:1");
    expect((await call(owner, provider)).status).toBe(200);
    expect(provider.calls).toBe(1);
    expect(
      await env.DB.prepare(
        "SELECT COUNT(*) count FROM ai_call_ledger WHERE user_id=? AND task_kind='practical'",
      )
        .bind(owner.userId)
        .first("count"),
    ).toBe(1);
    const completed = await call(
      owner,
      provider,
      `/${first.task!.id}/completion`,
      {
        method: "PUT",
        body: JSON.stringify({ schemaVersion: 1, completed: true }),
      },
    );
    expect(
      practicalTaskStateSchema.parse(await completed.json()).task?.completed,
    ).toBe(true);
    const evidenceCounts = async () =>
      Promise.all(
        ["activity_attempts", "concept_progress", "study_sessions"].map(
          (table) =>
            env.DB.prepare(
              `SELECT COUNT(*) count FROM ${table} WHERE user_id=?`,
            )
              .bind(owner.userId)
              .first<number>("count"),
        ),
      );
    expect(await evidenceCounts()).toEqual([0, 0, 0]);
    expect(
      practicalTaskStateSchema.parse(
        await (await call(owner, provider, "")).json(),
      ).task?.completed,
    ).toBe(true);
    const undone = await call(
      owner,
      provider,
      `/${first.task!.id}/completion`,
      {
        method: "PUT",
        body: JSON.stringify({ schemaVersion: 1, completed: false }),
      },
    );
    expect(
      practicalTaskStateSchema.parse(await undone.json()).task?.completed,
    ).toBe(false);
    expect(await evidenceCounts()).toEqual([0, 0, 0]);
  });

  it("rejects hazards and URLs in every variant and consumes one provider credit", async () => {
    for (const field of ["task", "simpler", "freeAlternative"] as const) {
      const owner = await seed();
      const unsafe: PracticalTaskProvider = {
        generate: async (context) => {
          const result = await new FakePracticalTaskProvider().generate(
            context,
          );
          result[field]!.instructions = [
            field === "task"
              ? "Use boiling heat at a height, climb during a medical ingestion task with medication and biological material, operate machinery and power tools near a vehicle in a lab, then handle electrical chemicals and weapons without supervision."
              : "Open https://unsafe.example.",
          ];
          return result;
        },
      };
      expect((await call(owner, unsafe)).status).toBe(503);
      expect(
        await env.DB.prepare(
          "SELECT COUNT(*) count FROM practical_tasks WHERE user_id=?",
        )
          .bind(owner.userId)
          .first("count"),
      ).toBe(0);
      expect(
        await env.DB.prepare(
          "SELECT state FROM ai_call_ledger WHERE user_id=? AND task_kind='practical'",
        )
          .bind(owner.userId)
          .first("state"),
      ).toBe("failed");
    }
  });

  it("rejects a paid free alternative and a non-allowlisted modality", async () => {
    for (const invalid of ["paid", "modality"] as const) {
      const owner = await seed();
      const provider: PracticalTaskProvider = {
        generate: async (context) => {
          const result = await new FakePracticalTaskProvider().generate(
            context,
          );
          return invalid === "paid"
            ? {
                ...result,
                freeAlternative: {
                  ...result.freeAlternative!,
                  cost: { kind: "disclosed", disclosure: "Pay a fee." },
                },
              }
            : {
                ...result,
                task: { ...result.task!, modality: "field_work" },
              };
        },
      };
      expect((await call(owner, provider)).status).toBe(503);
    }
  });

  it("durably records not-suitable output without exposing a task", async () => {
    const owner = await seed();
    const provider: PracticalTaskProvider = {
      generate: async (context) => ({
        schemaVersion: 1,
        suitable: false,
        reason:
          "The source describes flame and medication, so no safe desk-based application is suitable.",
        conceptIds: context.concepts.map((c) => c.id),
        sourceIds: context.concepts
          .flatMap((c) => c.sources.map((s) => s.id))
          .filter((id, i, all) => all.indexOf(id) === i),
        task: null,
        simpler: null,
        freeAlternative: null,
      }),
    };
    const state = practicalTaskStateSchema.parse(
      await (await call(owner, provider)).json(),
    );
    expect(state).toMatchObject({
      status: "notSuitable",
      task: null,
      reason:
        "The source describes flame and medication, so no safe desk-based application is suitable.",
    });
    expect(
      await env.DB.prepare(
        "SELECT state FROM practical_task_requests WHERE user_id=?",
      )
        .bind(owner.userId)
        .first("state"),
    ).toBe("notSuitable");
  });

  it("requires explicit currently selected IDs and rejects a late revision change", async () => {
    const owner = await seed();
    const invalid = await call(
      owner,
      new FakePracticalTaskProvider(),
      "/generate",
      {
        body: JSON.stringify({
          schemaVersion: 1,
          requestId: crypto.randomUUID(),
          conceptIds: [crypto.randomUUID()],
        }),
      },
    );
    expect(invalid.status).toBe(409);
    expect(
      await env.DB.prepare(
        "SELECT COUNT(*) count FROM ai_call_ledger WHERE user_id=?",
      )
        .bind(owner.userId)
        .first("count"),
    ).toBe(0);
    const changing: PracticalTaskProvider = {
      generate: async (context) => {
        await env.DB.prepare(
          "UPDATE material_imports SET document_id=? WHERE user_id=? AND space_id=?",
        )
          .bind(crypto.randomUUID(), owner.userId, owner.spaceId)
          .run();
        return new FakePracticalTaskProvider().generate(context);
      },
    };
    const late = await call(owner, changing, "/generate", {
      body: JSON.stringify({
        schemaVersion: 1,
        requestId: crypto.randomUUID(),
        conceptIds: [owner.ids[0]],
      }),
    });
    expect(late.status).toBe(409);
    expect(
      await env.DB.prepare(
        "SELECT COUNT(*) count FROM practical_tasks WHERE user_id=?",
      )
        .bind(owner.userId)
        .first("count"),
    ).toBe(0);
  });

  it("rejects late saves after space or account deletion fences", async () => {
    for (const fence of ["space", "account"] as const) {
      const owner = await seed();
      const provider: PracticalTaskProvider = {
        generate: async (context) => {
          if (fence === "space")
            await env.DB.prepare(
              "UPDATE study_spaces SET deleted_at=? WHERE user_id=? AND id=?",
            )
              .bind(new Date().toISOString(), owner.userId, owner.spaceId)
              .run();
          else
            await env.DB.prepare(
              "INSERT INTO account_deletions(user_id,started_at) VALUES(?,?)",
            )
              .bind(owner.userId, new Date().toISOString())
              .run();
          return new FakePracticalTaskProvider().generate(context);
        },
      };
      expect((await call(owner, provider)).status).toBe(409);
      expect(
        await env.DB.prepare(
          "SELECT COUNT(*) count FROM practical_tasks WHERE user_id=?",
        )
          .bind(owner.userId)
          .first("count"),
      ).toBe(0);
    }
  });
});
