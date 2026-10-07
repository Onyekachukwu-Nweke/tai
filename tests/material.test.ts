import { describe, expect, it } from "vitest";
import { buildChunks } from "../apps/web/src/material/chunks";
import { extractMaterial } from "../apps/web/src/material/extract";
import { MATERIAL_LIMITS } from "../apps/web/src/material/types";
import {
  decodeText,
  normalizeText,
  validateFile,
} from "../apps/web/src/material/validation";

const encode = (text: string) => new TextEncoder().encode(text);
const options = { documentId: "material-a" };

describe("local material validation", () => {
  it("accepts exact file bounds and supported extension/MIME combinations", () => {
    expect(
      validateFile({
        name: "NOTES.TXT",
        size: MATERIAL_LIMITS.bytes,
        type: "",
      }),
    ).toBe("txt");
    expect(
      validateFile({ name: "notes.pdf", size: 1, type: "application/pdf" }),
    ).toBe("pdf");
    for (const file of [
      {
        name: "notes.txt",
        size: MATERIAL_LIMITS.bytes + 1,
        type: "text/plain",
      },
      { name: "notes.txt", size: 0, type: "text/plain" },
      { name: "notes.exe", size: 1, type: "text/plain" },
      { name: "notes.pdf", size: 1, type: "text/plain" },
      { name: "notes.txt", size: 1, type: "application/pdf" },
    ])
      expect(() => validateFile(file)).toThrow();
  });

  it("decodes UTF-8 BOM, normalizes line endings and composes characters", () => {
    expect(decodeText(encode("\uFEFFCafe\u0301\r\nline\rnext"))).toBe(
      "Café\nline\nnext",
    );
    expect(normalizeText("a\r\nb")).toBe("a\nb");
  });

  it("rejects invalid UTF-8, binary controls and renamed PDFs", () => {
    for (const bytes of [
      new Uint8Array([0xff]),
      encode("a\u0000b"),
      encode("a\u007fb"),
      encode("%PDF-1.4\n"),
    ]) {
      expect(() => decodeText(bytes)).toThrow();
    }
  });

  it("keeps source references stable and exact across normalized chunks", () => {
    const text = "a".repeat(1999) + "🌱" + "\n" + "b".repeat(2000);
    const sections = [{ location: 2, text }];
    const chunks = buildChunks("material-a", sections);
    expect(chunks).toEqual(buildChunks("material-a", sections));
    expect(chunks.map((chunk) => chunk.text).join("")).toBe(text);
    for (const chunk of chunks) {
      expect(chunk.documentId).toBe("material-a");
      expect(chunk.location).toBe(2);
      expect(chunk.text).toBe(text.slice(chunk.start, chunk.end));
      expect(chunk.text.length).toBeLessThanOrEqual(2000);
      expect(chunk.id).toBe(`material-a:2:${chunk.start}`);
    }
    expect(chunks[0]?.end).toBe(1999);
  });

  it("enforces text and chunk budgets and rejects textless materials", () => {
    expect(
      buildChunks("material-a", [{ location: 1, text: "a".repeat(500_000) }]),
    ).toHaveLength(250);
    expect(() =>
      buildChunks("material-a", [{ location: 1, text: "a".repeat(500_001) }]),
    ).toThrow(/too much text/);
    expect(() =>
      buildChunks(
        "material-a",
        Array.from({ length: 501 }, (_, index) => ({
          location: index + 1,
          text: "a",
        })),
      ),
    ).toThrow(/too many text sections/);
    expect(() =>
      buildChunks("material-a", [{ location: 1, text: " \n\t" }]),
    ).toThrow(/No readable text/);
  });

  it("extracts TXT locally with versioned offsets and progress", async () => {
    const progress: { completed: number; total: number }[] = [];
    const preview = await extractMaterial(
      new File(["\uFEFFFirst\r\nsecond"], "notes.txt", { type: "text/plain" }),
      { ...options, onProgress: (value) => progress.push(value) },
    );
    expect(preview.schemaVersion).toBe(1);
    expect(preview.sections).toEqual([{ location: 1, text: "First\nsecond" }]);
    expect(preview.chunks[0]).toMatchObject({
      documentId: "material-a",
      start: 0,
      end: 12,
      text: "First\nsecond",
    });
    expect(progress).toEqual([{ completed: 1, total: 1 }]);
  });

  it("rejects fake PDFs and preserves cancellation before and after file reading", async () => {
    await expect(
      extractMaterial(new File(["not PDF"], "bad.pdf"), options),
    ).rejects.toMatchObject({ code: "format" });
    const controller = new AbortController();
    controller.abort();
    await expect(
      extractMaterial(new File(["hello"], "notes.txt"), {
        ...options,
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({ code: "cancelled" });
    const duringRead = new AbortController();
    const file = new File(["hello"], "notes.txt");
    file.arrayBuffer = async () => {
      duringRead.abort();
      return encode("hello").buffer;
    };
    await expect(
      extractMaterial(file, { ...options, signal: duringRead.signal }),
    ).rejects.toMatchObject({ code: "cancelled" });
  });
});
