import { describe, expect, it } from "vitest";
import { resourceCatalog } from "../packages/content/resource-catalog";
import { matchResources } from "../packages/domain/resource-matcher";

const concept = (label: string, description = "") => ({
  id: crypto.randomUUID(),
  label,
  title: label,
  description,
});

describe("checked resource matching", () => {
  it("matches exact keyphrases across supported demo subjects", () => {
    const result = matchResources(
      [
        concept("IT Project Management"),
        concept("Critical analysis"),
        concept("Standard deviation"),
        concept("JavaScript functions"),
      ],
      resourceCatalog,
    );
    expect(result.recommendations.map(({ id }) => id)).toEqual([
      "openlearn-project-management",
      "openlearn-critical-reader",
      "openstax-introductory-statistics",
      "mdn-javascript-guide",
    ]);
    expect(result.unmatchedConcepts).toEqual([]);
  });

  it("uses word boundaries and reports concepts with no checked match", () => {
    const unsupported = concept("Objectivity", "A subjective analysis");
    const result = matchResources([unsupported], resourceCatalog);
    expect(result.recommendations).toEqual([]);
    expect(result.unmatchedConcepts).toEqual([
      { id: unsupported.id, label: "Objectivity" },
    ]);
  });

  it("does not confuse generic biology terms with programming", () => {
    const result = matchResources(
      [concept("Cell functions", "Objects interact in biological systems")],
      resourceCatalog,
    );
    expect(result.recommendations).toEqual([]);
    expect(result.unmatchedConcepts).toHaveLength(1);
  });

  it("deduplicates one catalog resource across matching concepts", () => {
    const result = matchResources(
      [concept("JavaScript"), concept("JavaScript modules")],
      resourceCatalog,
    );
    expect(result.recommendations).toHaveLength(1);
    expect(result.unmatchedConcepts).toEqual([]);
  });

  it("exposes only validated HTTPS entries with the actual review date", () => {
    expect(resourceCatalog).toHaveLength(6);
    expect(resourceCatalog.some(({ format }) => format === "video")).toBe(true);
    for (const entry of resourceCatalog) {
      expect(entry.url).toMatch(/^https:\/\//);
      expect(entry.checkedAt).toBe("2026-10-12");
      expect(entry.accessConditions.toLowerCase()).toContain("free");
    }
  });
});
