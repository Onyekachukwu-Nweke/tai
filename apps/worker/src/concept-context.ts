export const CONCEPT_CONTEXT_LIMITS = {
  chunks: 16,
  characters: 24_000,
  thinPageCharacters: 200,
} as const;

type Chunk = { location: number; start: number; text: string };

function evenlySpaced<T>(items: T[], count: number): T[] {
  if (items.length <= count) return items;
  return Array.from(
    { length: count },
    (_, index) =>
      items[Math.round((index * (items.length - 1)) / (count - 1))]!,
  );
}

/**
 * Picks a bounded, representative set of chunks from a page range: pages with
 * almost no text (title pages, blank pages) are skipped unless nothing else
 * exists, and the budget is spread across pages rather than spent on the first.
 */
export function selectContextChunks<T extends Chunk>(chunks: T[]): T[] {
  const pages = new Map<number, T[]>();
  for (const chunk of [...chunks].sort(
    (a, b) => a.location - b.location || a.start - b.start,
  ))
    pages.set(chunk.location, [...(pages.get(chunk.location) ?? []), chunk]);
  const all = [...pages.values()];
  const substantial = all.filter(
    (page) =>
      page.reduce((total, chunk) => total + chunk.text.trim().length, 0) >=
      CONCEPT_CONTEXT_LIMITS.thinPageCharacters,
  );
  const usable = evenlySpaced(
    substantial.length ? substantial : all,
    CONCEPT_CONTEXT_LIMITS.chunks,
  );
  const picked: T[] = [];
  let characters = 0;
  for (let round = 0; picked.length < CONCEPT_CONTEXT_LIMITS.chunks; round++) {
    let added = false;
    for (const page of usable) {
      const chunk = page[round];
      if (!chunk || picked.length >= CONCEPT_CONTEXT_LIMITS.chunks) continue;
      if (characters + chunk.text.length > CONCEPT_CONTEXT_LIMITS.characters)
        continue;
      picked.push(chunk);
      characters += chunk.text.length;
      added = true;
    }
    if (!added) break;
  }
  return picked.sort((a, b) => a.location - b.location || a.start - b.start);
}
