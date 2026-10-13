import { mkdir, writeFile } from "node:fs/promises";

// Synthetic PDF 1.4 fixtures; offsets and stream lengths are byte-exact ASCII.
const directory = new URL("../tests/fixtures/materials/", import.meta.url);
await mkdir(directory, { recursive: true });
function pdf(pages, encrypted = false, outline = []) {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  const references = [];
  for (const lines of pages) {
    const pageId = objects.length + 1;
    references.push(`${pageId} 0 R`);
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${pageId + 1} 0 R >>`,
    );
    const escape = (line) => line.replace(/[\\()]/g, "\\$&");
    const stream = lines.length
      ? `BT /F1 12 Tf 50 740 Td ${lines.map((line, index) => `${index ? "0 -20 Td " : ""}(${escape(line)}) Tj`).join("\n")} ET`
      : "";
    objects.push(
      `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    );
  }
  objects[1] = `<< /Type /Pages /Kids [${references.join(" ")}] /Count ${pages.length} >>`;
  if (outline.length) {
    // Top-level bookmarks: { title, page } with 1-based page numbers.
    const root = objects.length + 1;
    const first = root + 1;
    const last = root + outline.length;
    objects.push(
      `<< /Type /Outlines /First ${first} 0 R /Last ${last} 0 R /Count ${outline.length} >>`,
    );
    outline.forEach(({ title, page }, index) => {
      const own = first + index;
      const links = [
        index > 0 ? `/Prev ${own - 1} 0 R` : "",
        index < outline.length - 1 ? `/Next ${own + 1} 0 R` : "",
      ].join(" ");
      objects.push(
        `<< /Title (${title}) /Parent ${root} 0 R ${links} /Dest [${references[page - 1]} /XYZ 0 792 0] >>`,
      );
    });
    objects[0] = `<< /Type /Catalog /Pages 2 0 R /Outlines ${root} 0 R >>`;
  }
  if (encrypted)
    objects.push(
      "<< /Filter /Standard /V 1 /R 2 /Length 40 /O <0000000000000000000000000000000000000000000000000000000000000000> /U <0000000000000000000000000000000000000000000000000000000000000000> /P -4 >>",
    );
  let output = "%PDF-1.4\n";
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(output.length);
    output += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }
  const xref = output.length;
  output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  output += offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
    .join("");
  output += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R${encrypted ? ` /Encrypt ${objects.length} 0 R /ID [<00112233445566778899aabbccddeeff00><00112233445566778899aabbccddeeff00>]` : ""} >>\nstartxref\n${xref}\n%%EOF\n`;
  return output;
}
const fixtures = {
  "two-page.pdf": [
    ["Photosynthesis uses light energy."],
    ["Plants produce glucose and oxygen."],
  ],
  "fifty-pages.pdf": Array.from({ length: 50 }, (_, index) => [
    `Synthetic page ${index + 1}.`,
  ]),
  "fifty-one-pages.pdf": Array.from({ length: 51 }, (_, index) => [
    `Synthetic page ${index + 1}.`,
  ]),
  "blank.pdf": [[]],
  "mixed.pdf": [["Readable first page."], []],
  "equation.pdf": [
    [
      "Force = mass x acceleration",
      "F = m a; 2 kg x 3 m/s^2 = 6 N",
      "Check symbols against the original.",
    ],
  ],
};
for (const [filename, pages] of Object.entries(fixtures))
  await writeFile(new URL(filename, directory), pdf(pages));
// Deliberately unavailable password verifier: tests the encrypted-document rejection,
// not successful decryption (password entry is outside TAI's supported input scope).
await writeFile(
  new URL("password.pdf", directory),
  pdf([["Protected synthetic content."]], true),
);
const chapterText = (topic) =>
  Array.from(
    { length: 8 },
    (_, line) => `${topic} synthetic study line ${line + 1} with enough words.`,
  );
await writeFile(
  new URL("chapters.pdf", directory),
  pdf(
    [
      ["Synthetic Course Notes"],
      ["Contents"],
      chapterText("Cells"),
      chapterText("Cells continued"),
      chapterText("Energy"),
      chapterText("Energy continued"),
    ],
    false,
    [
      { title: "Chapter 1: Cells", page: 3 },
      { title: "Chapter 2: Energy", page: 5 },
    ],
  ),
);
await writeFile(
  new URL("malformed.pdf", directory),
  "%PDF-1.4\nnot a valid document\n",
);
await writeFile(
  new URL("notes.txt", directory),
  "Synthetic study notes.\nPlants use light energy.\n",
);
