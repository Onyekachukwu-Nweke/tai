import type { ActivityContext } from "../packages/contracts/activity-packs";
import type { SourceContext } from "../packages/contracts/concepts";

const studySpaceId = "11111111-1111-4111-8111-111111111111";
const materialId = "22222222-2222-4222-8222-222222222222";
const conceptRequestId = "33333333-3333-4333-8333-333333333333";

const sources = [
  {
    id: "synthetic-speed-source",
    location: 1,
    start: 0,
    text: "A cyclist travels 150 metres in 30 seconds. Average speed is distance divided by time, so the cyclist's average speed is 5 metres per second.",
  },
  {
    id: "synthetic-risk-source",
    location: 1,
    start: 200,
    text: "A project risk is an uncertain event that may affect an objective. A useful response names the risk, estimates its likelihood and impact, assigns an owner, and states a mitigation.",
  },
].map((source) => ({
  id: source.id,
  location: source.location,
  start: source.start,
  end: source.start + source.text.length,
  text: source.text,
}));

export const liveConceptFixture: SourceContext = {
  studySpaceId,
  materialId,
  startLocation: 1,
  endLocation: 1,
  chunks: sources.map((source) => ({
    ...source,
    studySpaceId,
    materialId,
  })),
};

export const liveActivityFixture: ActivityContext = {
  studySpaceId,
  materialId,
  conceptRequestId,
  concepts: [
    {
      id: "44444444-4444-4444-8444-444444444444",
      label: "Average speed",
      sources: [sources[0]!],
    },
    {
      id: "55555555-5555-4555-8555-555555555555",
      label: "Project risk responses",
      sources: [sources[1]!],
    },
  ],
};

export const liveFixtureMetadata = {
  fixtureId: "synthetic-speed-and-project-risk-v1",
  sourceIds: sources.map((source) => source.id),
  independentChecks: [
    "150 metres / 30 seconds = 5 metres per second",
    "The project-risk excerpt explicitly lists likelihood, impact, owner, and mitigation",
  ],
} as const;
