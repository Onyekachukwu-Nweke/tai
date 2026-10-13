import type { PDFDocumentProxy } from "pdfjs-dist";
import type { OutlineEntry } from "./types";

const MAX_ENTRIES = 30;

function cleanTitle(title: string): string {
  return Array.from(title, (character) => {
    const code = character.charCodeAt(0);
    return code < 32 || (code >= 127 && code <= 159) ? " " : character;
  })
    .join("")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

async function pageOf(
  document: PDFDocumentProxy,
  dest: string | unknown[] | null,
): Promise<number | null> {
  const resolved =
    typeof dest === "string" ? await document.getDestination(dest) : dest;
  const target = resolved?.[0];
  if (typeof target === "number") return target + 1;
  if (target && typeof target === "object" && "num" in target)
    return (
      (await document.getPageIndex(target as { num: number; gen: number })) + 1
    );
  return null;
}

/** Top-level PDF bookmarks become chapter starts; anything unresolvable is skipped. */
export async function readOutline(
  document: PDFDocumentProxy,
): Promise<OutlineEntry[]> {
  const items = await document.getOutline().catch(() => null);
  if (!items?.length) return [];
  const entries: OutlineEntry[] = [];
  for (const item of items.slice(0, MAX_ENTRIES * 2)) {
    const title = cleanTitle(item.title ?? "");
    const location = await pageOf(document, item.dest).catch(() => null);
    if (title && location && location <= document.numPages)
      entries.push({ title, location });
  }
  return entries
    .sort((a, b) => a.location - b.location)
    .filter(
      (entry, index, all) =>
        index === 0 || entry.location > all[index - 1]!.location,
    )
    .slice(0, MAX_ENTRIES);
}
