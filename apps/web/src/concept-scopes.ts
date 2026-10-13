import type { PageRange } from "../../../packages/contracts/concepts";
import type { MaterialPreview } from "./material/types";

export type ConceptScope = PageRange & { id: string; label: string };

export function conceptScopes(preview: MaterialPreview): ConceptScope[] {
  const last = preview.sections.length;
  const unit = preview.format === "pdf" ? "page" : "section";
  const whole: ConceptScope = {
    id: "document",
    label: `Whole document (${last} ${unit}${last === 1 ? "" : "s"})`,
    startLocation: 1,
    endLocation: last,
  };
  const chapters = (preview.outline ?? []).filter(
    (entry, index, all) =>
      entry.location <= last &&
      (index === 0 || entry.location > all[index - 1]!.location),
  );
  if (chapters.length < 2) return [whole];
  return [
    whole,
    ...chapters.map((entry, index) => {
      const end = (chapters[index + 1]?.location ?? last + 1) - 1;
      const pages =
        entry.location === end
          ? `p. ${entry.location}`
          : `pp. ${entry.location}–${end}`;
      return {
        id: `chapter-${index}`,
        label: `${entry.title} (${pages})`,
        startLocation: entry.location,
        endLocation: end,
      };
    }),
  ];
}
