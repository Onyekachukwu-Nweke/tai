import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

// Exact-source patches for pdf-lib 1.17.1. Budgets belong to each PDF context;
// no shared mutable counters or global logging overrides are used.
const root = new URL("../node_modules/pdf-lib/", import.meta.url);
const metadata = JSON.parse(
  await readFile(new URL("package.json", root), "utf8"),
);
if (metadata.version !== "1.17.1")
  throw new Error("Review PDF parser patches for this dependency version.");
const hashes = {
  "parser/BaseParser": [
    "0a2ec79996a8549978eb28fe636897fc942870eec7a9ec2757da417ae6b2458d",
    "3677ea41c521058d7fcb036cfed2118abfe22becd6114e13f011aa1d82ee3ae0",
  ],
  "parser/PDFParser": [
    "9b5f5cca51c6ed6456c2743229fee2961a5108585073d4779bf75de137feba88",
    "390fc8e6464b2938e9e8726b3ae23649514dc157beed55f333e58a0bc6899c58",
  ],
  "parser/PDFObjectParser": [
    "e113a887611dc37a276e01df6d4b459cfd3c27b281afc2f9cfed79dac6055b15",
    "627b964fae4377458e0eaff03862aba6994747b0d49a5dfccd85fb71ae3d4547",
  ],
  "parser/PDFObjectStreamParser": [
    "08793bf0e6e44d40cc0c07b82c81e7d7adeec5a113ea483bc1582ffb9f9ef242",
    "55a12aa6d4ccc5af18286abc9e264e0b219e90129404f83645d248badbf3fb7a",
  ],
  "parser/PDFXRefStreamParser": [
    "da4193954e502cf67d3c82adf311714453ef66f73775c4a5ceeef225c5d3b9ba",
    "3bfc5d5afd99549c4739ac788b7465c753625fe6f53b972ab4832d33eab1342b",
  ],
  "streams/DecodeStream": [
    "8fc3de152661a751f94fb060146049a99b11bad9b86ac158650cffe611b989a9",
    "666dc30139cceee5ef849a09a990d761c2de801e0aaa264178b93cf99640adcb",
  ],
  "streams/decode": [
    "390f9f113ff018b1d02204220f6241546c62aa9c6eecfdf274054da55d8e43ed",
    "d9a689fe9004122c9b96c5e331defa1a22a7c27f2591f42033ccdcb562e1d689",
  ],
};
const fail = 'throw new Error("Unsupported PDF complexity.");';
function edits(path, kind) {
  const name = (value) => (kind === "es" ? value : `${value}_1.default`);
  switch (path) {
    case "parser/BaseParser":
      return [
        [
          "console.warn(msg);",
          'throw new Error("Unsupported PDF numeric value.");',
        ],
      ];
    case "parser/PDFParser":
      return [
        [
          "_this.parsedObjects += 1;",
          `_this.parsedObjects += 1;\n            if (_this.parsedObjects > 10000) { ${fail} }`,
        ],
        ["console.warn('Removing parsed object: 0 0 R');", fail],
      ];
    case "parser/PDFObjectParser":
      return [
        [
          "PDFObjectParser.prototype.parseObject = function () {",
          `PDFObjectParser.prototype.parseObject = function () {
        var context = this.context;
        context.taiObjects = (context.taiObjects || 0) + 1;
        context.taiDepth = (context.taiDepth || 0) + 1;
        if (context.taiObjects > 100000 || context.taiDepth > 64) { ${fail} }
        try { return this.taiParseObject(); }
        finally { context.taiDepth -= 1; }
    };
    PDFObjectParser.prototype.taiParseObject = function () {`,
        ],
        [
          "value +=",
          `if (value.length >= 65536) { ${fail} }\n            value +=`,
        ],
        [
          "name +=",
          `if (name.length >= 1024) { ${fail} }\n            name +=`,
        ],
      ];
    case "parser/PDFObjectStreamParser":
      return [
        [
          "return _this;",
          `if (!Number.isSafeInteger(_this.objectCount) || _this.objectCount < 0 || _this.objectCount > 10000 ||
            !Number.isSafeInteger(_this.firstOffset) || _this.firstOffset < 0 || _this.firstOffset > _this.bytes.length) { ${fail} }
        return _this;`,
        ],
        [
          "this.bytes.moveTo(this.firstOffset + offset);",
          `if (!Number.isSafeInteger(objectNumber) || objectNumber < 1 || !Number.isSafeInteger(offset) ||
                            offset < 0 || this.firstOffset + offset >= this.bytes.length) { ${fail} }
                        this.bytes.moveTo(this.firstOffset + offset);`,
        ],
      ];
    case "parser/PDFXRefStreamParser":
      return [
        [
          "var entries = [];",
          `var entries = [];
        var total = 0;
        if (this.byteWidths.length !== 3 || this.byteWidths.some(function (width) {
            return !Number.isSafeInteger(width) || width < 0 || width > 8;
        })) { ${fail} }
        for (var i = 0; i < this.subsections.length; i++) {
            var part = this.subsections[i];
            if (!Number.isSafeInteger(part.firstObjectNumber) || part.firstObjectNumber < 0 ||
                !Number.isSafeInteger(part.length) || part.length < 0) { ${fail} }
            total += part.length;
            if (total > 10000) { ${fail} }
        }`,
        ],
      ];
    case "streams/DecodeStream":
      return [
        [
          "var buffer = this.buffer;",
          `if (!Number.isSafeInteger(requested) || requested < 0 || requested > 2097152) { ${fail} }
        var buffer = this.buffer;`,
        ],
        [
          "var buffer2 = new Uint8Array(size);",
          `if (this.taiBudget) {
            this.taiBudget.allocated += size;
            if (this.taiBudget.allocated > 8388608) { ${fail} }
        }
        var buffer2 = new Uint8Array(size);`,
        ],
      ];
    case "streams/decode": {
      const constructors = [
        ["FlateStream", "stream"],
        ["LZWStream", "stream, undefined, earlyChange"],
        ["Ascii85Stream", "stream"],
        ["AsciiHexStream", "stream"],
        ["RunLengthStream", "stream"],
      ];
      return [
        [
          "function (stream, encoding, params) {",
          `function (stream, encoding, params, budget) {
    var bounded = function (decoder) { decoder.taiBudget = budget; return decoder; };`,
        ],
        ...constructors.map(([type, args]) => [
          `return new ${name(type)}(${args});`,
          `return bounded(new ${name(type)}(${args}));`,
        ]),
        [
          "var dict = _a.dict, contents = _a.contents;",
          `var dict = _a.dict, contents = _a.contents;
    var budget = dict.context.taiDecodeBudget || (dict.context.taiDecodeBudget = { allocated: 0 });
    budget.allocated += contents.length;
    if (contents.length > 2097152 || budget.allocated > 8388608) { ${fail} }`,
        ],
        [
          "decodeStream(stream, Filter, DecodeParms)",
          "decodeStream(stream, Filter, DecodeParms, budget)",
        ],
        [
          "for (var idx = 0, len = Filter.size(); idx < len; idx++) {",
          `if (Filter.size() > 4) { ${fail} }
        for (var idx = 0, len = Filter.size(); idx < len; idx++) {`,
        ],
        [
          `DecodeParms && DecodeParms.lookupMaybe(idx, ${name("PDFDict")}));`,
          `DecodeParms && DecodeParms.lookupMaybe(idx, ${name("PDFDict")}), budget);`,
        ],
      ];
    }
  }
  throw new Error("Unknown parser patch.");
}

// Reverse exact substitutions first, so repeated postinstall/build/test runs
// validate the pristine source hash and cannot accumulate patches.
const outputs = [];
for (const [path, expected] of Object.entries(hashes)) {
  for (const [index, kind] of ["es", "cjs"].entries()) {
    const file = new URL(`${kind}/core/${path}.js`, root);
    let source = await readFile(file, "utf8");
    const changes = edits(path, kind);
    for (const [before, after] of [...changes].sort(
      (a, b) => b[1].length - a[1].length,
    ))
      source = source.replaceAll(after, before);
    if (createHash("sha256").update(source).digest("hex") !== expected[index])
      throw new Error(
        `PDF parser source changed: ${kind}/${path}. Review patches.`,
      );
    for (const [before, after] of changes) {
      if (!source.includes(before))
        throw new Error(`Missing PDF patch anchor: ${path}`);
      source = source.replaceAll(before, after);
    }
    outputs.push([file, source]);
  }
}
for (const [file, source] of outputs) await writeFile(file, source);
console.log("Applied pinned PDF privacy and resource-limit patches.");
