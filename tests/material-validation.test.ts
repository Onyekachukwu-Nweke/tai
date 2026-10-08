import { env } from "cloudflare:test";
import { PDFArray, PDFDict, PDFDocument, PDFName, PDFNumber } from "pdf-lib";
import { afterEach, describe, expect, it, vi } from "vitest";
import { call, learner, material, multipart } from "./material-fixtures";
import { buildChunks } from "../apps/web/src/material/chunks";
import { materialPreviewSchema } from "../packages/contracts/materials";
import { countPdfPages } from "../apps/worker/src/pdf-limits";

async function pdfMaterial(pages: number) {
  const document = await PDFDocument.create();
  for (let index = 0; index < pages; index++)
    document.addPage().drawText(`Synthetic page ${index + 1}`);
  const documentId = crypto.randomUUID();
  const sections = Array.from({ length: Math.min(pages, 50) }, (_, index) => ({
    location: index + 1,
    text: `Synthetic page ${index + 1}`,
  }));
  const preview = {
    schemaVersion: 1,
    documentId,
    filename: "notes.pdf",
    format: "pdf",
    sections,
    chunks: buildChunks(documentId, sections),
    warnings: [],
  };
  return { document, preview };
}
afterEach(() => vi.restoreAllMocks());

describe("server material validation", () => {
  it("rejects forged source offsets, associations, excess text, and TXT content mismatches", async () => {
    const { cookie, spaceId } = await learner();
    const preview = material();
    const invalid = [
      { ...preview, schemaVersion: 2 },
      { ...preview, documentId: "not-a-uuid" },
      { ...preview, chunks: [{ ...preview.chunks[0], start: 1 }] },
      {
        ...preview,
        chunks: [{ ...preview.chunks[0], documentId: crypto.randomUUID() }],
      },
      {
        ...preview,
        sections: [{ location: 2, text: preview.sections[0]!.text }],
      },
      { ...preview, sections: [{ location: 1, text: "a".repeat(500_001) }] },
      {
        ...preview,
        chunks: Array.from({ length: 501 }, () => preview.chunks[0]),
      },
      material("Forged original text."),
    ];
    for (const value of invalid)
      expect(
        (
          await call(`/${spaceId}/material`, cookie, {
            method: "POST",
            body: multipart(value),
          })
        ).status,
      ).toBe(400);
    expect((await env.ORIGINALS.list()).objects).toHaveLength(0);
    expect(
      materialPreviewSchema.safeParse({ ...preview, chunks: [] }).success,
    ).toBe(false);
  });

  it("rejects malformed multipart, renamed binary files and both upload size limits", async () => {
    const { cookie, spaceId } = await learner();
    const path = `/${spaceId}/material`;
    expect(
      (await call(path, cookie, { method: "POST", body: "not multipart" }))
        .status,
    ).toBe(415);
    expect(
      (
        await call(path, cookie, {
          method: "POST",
          headers: { "content-type": "multipart/form-data; boundary=x" },
          body: "invalid",
        })
      ).status,
    ).toBe(400);
    const duplicate = multipart(material());
    duplicate.append("original", new File(["A"], "notes.txt"));
    expect(
      (await call(path, cookie, { method: "POST", body: duplicate })).status,
    ).toBe(400);
    for (const text of ["%PDF-1.7", "a\u0000b"])
      expect(
        (
          await call(path, cookie, {
            method: "POST",
            body: multipart(material(), new File([text], "notes.txt")),
          })
        ).status,
      ).toBe(400);
    expect(
      (
        await call(path, cookie, {
          method: "POST",
          body: multipart(
            material(),
            new File([new Uint8Array(10_000_001)], "notes.txt"),
          ),
        })
      ).status,
    ).toBe(413);
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        for (let index = 0; index < 25; index++)
          controller.enqueue(new Uint8Array(1_000_000));
        controller.close();
      },
    });
    expect(
      (
        await call(path, cookie, {
          method: "POST",
          headers: { "content-type": "multipart/form-data; boundary=x" },
          body,
        })
      ).status,
    ).toBe(413);
  });

  it("accepts an original exactly at the 10 MB boundary", async () => {
    const { cookie, spaceId } = await learner();
    const { document, preview } = await pdfMaterial(1);
    const pdf = new Uint8Array(await document.save());
    const padding = new Uint8Array(10_000_000 - pdf.length);
    const response = await call(`/${spaceId}/material`, cookie, {
      method: "POST",
      body: multipart(
        preview,
        new File([pdf, padding], "notes.pdf", { type: "application/pdf" }),
      ),
    });
    expect(response.status).toBe(201);
  });

  it("validates actual PDF page count, accepts object streams, and rejects over-limit or malformed documents", async () => {
    const { cookie, spaceId } = await learner();
    const path = `/${spaceId}/material`;
    const excessive = await pdfMaterial(51);
    const badFile = new File(
      [new Uint8Array(await excessive.document.save())],
      "notes.pdf",
      {
        type: "application/pdf",
      },
    );
    expect(
      (
        await call(path, cookie, {
          method: "POST",
          body: multipart(excessive.preview, badFile),
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await call(path, cookie, {
          method: "POST",
          body: multipart(
            excessive.preview,
            new File(["%PDF-1.7\ninvalid"], "notes.pdf"),
          ),
        })
      ).status,
    ).toBe(400);
    const accepted = await pdfMaterial(2);
    const file = new File(
      [
        new Uint8Array(
          await accepted.document.save({ useObjectStreams: true }),
        ),
      ],
      "notes.pdf",
      { type: "application/pdf" },
    );
    expect(
      (
        await call(path, cookie, {
          method: "POST",
          body: multipart(accepted.preview, file),
        })
      ).status,
    ).toBe(201);
    expect(await (await call(path, cookie)).json()).toEqual({
      schemaVersion: 1,
      material: accepted.preview,
    });
  });

  it("rejects oversized numeric tokens in real PDFs without logging uploaded values", async () => {
    const { cookie, spaceId } = await learner();
    const { document, preview } = await pdfMaterial(1);
    document.catalog.set(
      PDFName.of("SyntheticNumber"),
      PDFNumber.of(Number.MAX_SAFE_INTEGER * 100),
    );
    const file = new File(
      [new Uint8Array(await document.save({ useObjectStreams: false }))],
      "notes.pdf",
      { type: "application/pdf" },
    );
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const error = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const response = await call(`/${spaceId}/material`, cookie, {
      method: "POST",
      body: multipart(preview, file),
    });
    expect(response.status).toBe(400);
    expect(await response.text()).not.toContain("999999");
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();
  });
  it("accepts exactly fifty PDF pages with persisted page associations", async () => {
    const { cookie, spaceId } = await learner();
    const { document, preview } = await pdfMaterial(50);
    const file = new File(
      [new Uint8Array(await document.save())],
      "notes.pdf",
      { type: "application/pdf" },
    );
    expect(
      (
        await call(`/${spaceId}/material`, cookie, {
          method: "POST",
          body: multipart(preview, file),
        })
      ).status,
    ).toBe(201);
    expect(await (await call(`/${spaceId}/material`, cookie)).json()).toEqual({
      schemaVersion: 1,
      material: preview,
    });
  });
});

function pageTreeDocument(kind: "cycle" | "deep" | "wide") {
  const document = PDFDocument.create();
  return document.then((pdf) => {
    const context = pdf.context;
    const page = context.register(
      context.obj({ Type: "Page", MediaBox: [0, 0, 10, 10] }),
    );
    if (kind === "wide") {
      const root = context.register(
        context.obj({ Type: "Pages", Kids: Array(257).fill(page), Count: 257 }),
      );
      pdf.catalog.set(PDFName.of("Pages"), root);
      return pdf;
    }
    let child = page;
    for (let depth = 0; depth < 34; depth++)
      child = context.register(
        context.obj({ Type: "Pages", Kids: [child], Count: 1 }),
      );
    if (kind === "cycle") {
      const node = PDFDict.withContext(context);
      const ref = context.register(node);
      node.set(PDFName.of("Type"), PDFName.of("Pages"));
      node.set(PDFName.of("Kids"), PDFArray.withContext(context));
      node.lookup(PDFName.of("Kids"), PDFArray).push(ref);
      child = ref;
    }
    pdf.catalog.set(PDFName.of("Pages"), child);
    return pdf;
  });
}

describe("bounded PDF page trees", () => {
  it.each(["cycle", "deep", "wide"] as const)(
    "rejects %s page trees with a fixed error",
    async (kind) => {
      const document = await pageTreeDocument(kind);
      expect(() => countPdfPages(document)).toThrow(
        "Unsupported PDF page tree.",
      );
    },
  );
});
