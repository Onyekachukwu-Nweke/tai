import { describe, expect, it } from "vitest";
import {
  CONCEPT_CONTEXT_LIMITS,
  selectContextChunks,
} from "../apps/worker/src/concept-context";

const chunk = (location: number, start: number, length: number) => ({
  id: `doc:${location}:${start}`,
  location,
  start,
  text: "x".repeat(length),
});

describe("concept context selection", () => {
  it("skips thin pages such as a title page when richer pages exist", () => {
    const picked = selectContextChunks([
      chunk(1, 0, 40),
      chunk(2, 0, 1500),
      chunk(3, 0, 1500),
    ]);
    expect(picked.map((item) => item.location)).toEqual([2, 3]);
  });

  it("keeps thin pages when the whole range is thin", () => {
    const picked = selectContextChunks([chunk(1, 0, 40), chunk(2, 0, 60)]);
    expect(picked.map((item) => item.location)).toEqual([1, 2]);
  });

  it("spreads a long document across its pages instead of the first ones", () => {
    const chunks = Array.from({ length: 50 }, (_, index) =>
      chunk(index + 1, 0, 1000),
    );
    const pages = selectContextChunks(chunks).map((item) => item.location);
    expect(pages).toHaveLength(CONCEPT_CONTEXT_LIMITS.chunks);
    expect(pages[0]).toBe(1);
    expect(pages.at(-1)).toBe(50);
    expect(new Set(pages).size).toBe(pages.length);
  });

  it("stays within the chunk and character budget and keeps reading order", () => {
    const chunks = [1, 2, 3].flatMap((location) =>
      [0, 2000, 4000, 6000, 8000, 10000].map((start) =>
        chunk(location, start, 2000),
      ),
    );
    const picked = selectContextChunks(chunks);
    const characters = picked.reduce(
      (total, item) => total + item.text.length,
      0,
    );
    expect(picked.length).toBeLessThanOrEqual(CONCEPT_CONTEXT_LIMITS.chunks);
    expect(characters).toBeLessThanOrEqual(CONCEPT_CONTEXT_LIMITS.characters);
    expect(new Set(picked.map((item) => item.location))).toEqual(
      new Set([1, 2, 3]),
    );
    const order = picked.map((item) => item.location * 100000 + item.start);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });
});
