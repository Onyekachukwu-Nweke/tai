import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { call, learner, material, multipart } from "./material-fixtures";
import { buildChunks } from "../apps/web/src/material/chunks";

async function pdfUpload(pages: number, outline?: unknown) {
  const document = await PDFDocument.create();
  for (let index = 0; index < pages; index++)
    document.addPage().drawText(`Synthetic page ${index + 1}`);
  const documentId = crypto.randomUUID();
  const sections = Array.from({ length: pages }, (_, index) => ({
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
    ...(outline === undefined ? {} : { outline }),
  };
  const file = new File([new Uint8Array(await document.save())], "notes.pdf", {
    type: "application/pdf",
  });
  return multipart(preview, file);
}

describe("material chapter outline", () => {
  it("persists a PDF outline and returns it with the saved material", async () => {
    const { cookie, spaceId } = await learner();
    const outline = [
      { title: "Chapter 1: Cells", location: 1 },
      { title: "Chapter 2: Energy", location: 3 },
    ];
    const saved = await call(`/${spaceId}/material`, cookie, {
      method: "POST",
      body: await pdfUpload(4, outline),
    });
    expect(saved.status).toBe(201);
    const loaded = await call(`/${spaceId}/material`, cookie);
    const body = (await loaded.json()) as { material: { outline?: unknown } };
    expect(body.material.outline).toEqual(outline);
  });

  it("omits the outline when the document has none", async () => {
    const { cookie, spaceId } = await learner();
    await call(`/${spaceId}/material`, cookie, {
      method: "POST",
      body: await pdfUpload(2),
    });
    const loaded = await call(`/${spaceId}/material`, cookie);
    const body = (await loaded.json()) as { material: object };
    expect(body.material).not.toHaveProperty("outline");
  });

  it("rejects outlines that point past the document, go backwards or carry control characters", async () => {
    const { cookie, spaceId } = await learner();
    const invalid = [
      [{ title: "Too far", location: 5 }],
      [
        { title: "Second", location: 3 },
        { title: "First", location: 1 },
      ],
      [{ title: "Bad\u0007title", location: 1 }],
      [],
      Array.from({ length: 31 }, (_, index) => ({
        title: `Part ${index}`,
        location: 1,
      })),
    ];
    for (const outline of invalid) {
      const response = await call(`/${spaceId}/material`, cookie, {
        method: "POST",
        body: await pdfUpload(4, outline),
      });
      expect(response.status).toBe(400);
    }
    const txt = { ...material(), outline: [{ title: "One", location: 1 }] };
    const response = await call(`/${spaceId}/material`, cookie, {
      method: "POST",
      body: multipart(txt),
    });
    expect(response.status).toBe(400);
  });
});
