const storageKey = (spaceId: string) => `tai:concept-self-ratings:${spaceId}`;

/** Private per-browser notes; never sent to the server or used as recall evidence. */
export function loadSelfRatings(spaceId: string): Record<string, number> {
  try {
    const parsed: unknown = JSON.parse(
      localStorage.getItem(storageKey(spaceId)) ?? "{}",
    );
    if (!parsed || typeof parsed !== "object") return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(
        ([, value]) =>
          Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 5,
      ),
    ) as Record<string, number>;
  } catch {
    return {};
  }
}

export function saveSelfRating(
  spaceId: string,
  conceptId: string,
  value: number,
): Record<string, number> {
  const next = { ...loadSelfRatings(spaceId), [conceptId]: value };
  try {
    localStorage.setItem(storageKey(spaceId), JSON.stringify(next));
  } catch {
    /* The rating remains available for this view. */
  }
  return next;
}
