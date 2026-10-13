import type { ResourceCatalogEntry } from "../content/resource-catalog";
import { resourceRecommendationsSchema } from "../contracts/resources";

export type ResourceConcept = {
  id: string;
  label: string;
  title: string;
  description: string;
};

function normalized(value: string): string {
  return ` ${value
    .normalize("NFKC")
    .toLocaleLowerCase("en")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()} `;
}

function matches(concept: ResourceConcept, entry: ResourceCatalogEntry) {
  const haystack = normalized(
    `${concept.label} ${concept.title} ${concept.description}`,
  );
  return entry.matchTerms.some((term) => haystack.includes(normalized(term)));
}

export function matchResources(
  concepts: ResourceConcept[],
  catalog: ResourceCatalogEntry[],
) {
  const recommendations = [];
  const unmatchedConcepts = [];
  const recommendedIds = new Set<string>();
  for (const concept of concepts) {
    const entry = catalog.find((candidate) => matches(concept, candidate));
    if (!entry) {
      unmatchedConcepts.push({ id: concept.id, label: concept.label });
      continue;
    }
    if (recommendedIds.has(entry.id)) continue;
    recommendedIds.add(entry.id);
    const { matchTerms, ...resource } = entry;
    void matchTerms;
    recommendations.push({
      ...resource,
      supportedConcept: { id: concept.id, label: concept.label },
    });
  }
  return resourceRecommendationsSchema.parse({
    schemaVersion: 1,
    recommendations,
    unmatchedConcepts,
  });
}
