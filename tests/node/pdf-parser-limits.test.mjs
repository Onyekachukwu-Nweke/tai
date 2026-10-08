import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
import { TextEncoder } from "node:util";

const require = createRequire(import.meta.url);
const {
  decodePDFRawStream,
  PDFContext,
  PDFName,
  PDFObjectParser,
  PDFObjectStreamParser,
  PDFParser,
  PDFRawStream,
  PDFXRefStreamParser,
} = require("pdf-lib/cjs/core");
const bytes = (value) => new TextEncoder().encode(value);
const complexity = /Unsupported PDF complexity\./;

function rawStream(context, entries, contents = new Uint8Array()) {
  return PDFRawStream.of(context.obj(entries), contents);
}

test("bounds total parsed objects and nested object depth", async () => {
  const objects = Array.from(
    { length: 10_001 },
    (_, index) => `${index + 1} 0 obj\nnull\nendobj\n`,
  ).join("");
  const parser = PDFParser.forBytesWithOptions(
    bytes(`%PDF-1.7\n${objects}%%EOF`),
    Infinity,
    true,
    false,
  );
  await assert.rejects(parser.parseDocument(), complexity);

  const nested = `${"[".repeat(65)}null${"]".repeat(65)}`;
  assert.throws(
    () =>
      PDFObjectParser.forBytes(
        bytes(nested),
        PDFContext.create(),
      ).parseObject(),
    complexity,
  );
});

test("bounds literal, hex and name tokens without logging their values", () => {
  const original = {
    warn: console.warn,
    error: console.error,
    log: console.log,
  };
  const calls = [];
  console.warn = console.error = console.log = (...args) => calls.push(args);
  try {
    for (const input of [
      `(${"s".repeat(65_537)})`,
      `<${"a".repeat(65_537)}>`,
      `/${"private".repeat(171)}`,
    ])
      assert.throws(
        () =>
          PDFObjectParser.forBytes(
            bytes(input),
            PDFContext.create(),
          ).parseObject(),
        complexity,
      );
    assert.deepEqual(calls, []);
  } finally {
    Object.assign(console, original);
  }
});

test("rejects unsafe object-stream counts, first offsets and entry offsets", async () => {
  const cases = [
    rawStream(PDFContext.create(), { N: 10_001, First: 0 }),
    rawStream(PDFContext.create(), { N: 1, First: 99 }, bytes("1 0 null")),
  ];
  for (const stream of cases)
    assert.throws(() => PDFObjectStreamParser.forStream(stream), complexity);

  const context = PDFContext.create();
  const badOffset = rawStream(context, { N: 1, First: 5 }, bytes("1 99 null"));
  await assert.rejects(
    PDFObjectStreamParser.forStream(badOffset).parseIntoContext(),
    complexity,
  );
});

test("rejects unsafe xref widths, ranges and cumulative entry counts", () => {
  const cases = [
    { Size: 1, W: [9, 1, 1] },
    { Size: 10_001, W: [1, 1, 1] },
    { Size: 1, Index: [-1, 1], W: [1, 1, 1] },
  ];
  for (const entries of cases) {
    const stream = rawStream(PDFContext.create(), entries, bytes("\0\0\0"));
    assert.throws(
      () => PDFXRefStreamParser.forStream(stream).parseIntoContext(),
      complexity,
    );
  }
});

test("bounds filter chains, individual streams and cumulative decoded bytes", () => {
  const filter = PDFName.of("ASCIIHexDecode");
  const filters = Array.from({ length: 5 }, () => filter);
  assert.throws(
    () =>
      decodePDFRawStream(
        rawStream(PDFContext.create(), { Filter: filters }, bytes("00>")),
      ),
    complexity,
  );
  assert.throws(
    () =>
      decodePDFRawStream(
        rawStream(PDFContext.create(), {}, new Uint8Array(2_097_153)),
      ),
    complexity,
  );

  const context = PDFContext.create();
  for (let index = 0; index < 4; index++)
    assert.doesNotThrow(() =>
      decodePDFRawStream(rawStream(context, {}, new Uint8Array(2_097_152))),
    );
  assert.throws(
    () => decodePDFRawStream(rawStream(context, {}, new Uint8Array(1))),
    complexity,
  );
});
