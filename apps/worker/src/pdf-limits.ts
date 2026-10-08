import { PDFArray, PDFDict, PDFDocument, PDFName } from "pdf-lib";

/** Count leaves without invoking pdf-lib's recursive page-tree traversal. */
export function countPdfPages(document: PDFDocument): number {
  const pending = [
    { object: document.catalog.get(PDFName.of("Pages")), depth: 0 },
  ];
  const seen = new Set<PDFDict>();
  let pages = 0;
  while (pending.length) {
    const { object, depth } = pending.pop()!;
    const node = document.context.lookup(object);
    if (
      !(node instanceof PDFDict) ||
      seen.has(node) ||
      depth > 32 ||
      seen.size >= 256
    )
      throw new Error("Unsupported PDF page tree.");
    seen.add(node);
    const type = node.get(PDFName.of("Type"));
    if (type === PDFName.of("Page")) {
      if (++pages > 50) throw new Error("PDF page limit exceeded.");
    } else if (type === PDFName.of("Pages")) {
      const kids = document.context.lookup(node.get(PDFName.of("Kids")));
      if (
        !(kids instanceof PDFArray) ||
        kids.size() > 256 ||
        pending.length + kids.size() > 256
      )
        throw new Error("Unsupported PDF page tree.");
      for (let index = 0; index < kids.size(); index++)
        pending.push({ object: kids.get(index), depth: depth + 1 });
    } else throw new Error("Unsupported PDF page tree.");
  }
  if (!pages) throw new Error("PDF contains no pages.");
  return pages;
}
