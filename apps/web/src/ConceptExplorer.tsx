import { useEffect, useState } from "react";
import type { ConceptCollection } from "../../../packages/contracts/concepts";
import { generateConcepts, loadConcepts, updateConcept } from "./concept-api";
import { ActivityPack } from "./ActivityPack";
import { PracticalTask } from "./PracticalTask";
import { SupplementaryResources } from "./SupplementaryResources";

type Source = ConceptCollection["concepts"][number]["sources"][number];
export function ConceptExplorer({
  spaceId,
  userId,
  location,
  onSource,
}: {
  spaceId: string;
  userId: string;
  location: number;
  onSource: (source: Source) => void;
}) {
  const [collection, setCollection] = useState<ConceptCollection | null>(null);
  const [mode, setMode] = useState<"list" | "map">("list");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    loadConcepts(spaceId, controller.signal)
      .then(setCollection)
      .catch(() =>
        setLoadError(
          "Saved concepts could not be loaded. Generate explicitly when ready.",
        ),
      );
    return () => controller.abort();
  }, [spaceId]);
  async function generate() {
    setBusy(true);
    setError("");
    try {
      setCollection(
        await generateConcepts(spaceId, location, crypto.randomUUID()),
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Concepts could not be prepared. Retry explicitly.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function change(
    conceptId: string,
    update: { label?: string; selected?: boolean },
  ) {
    setError("");
    try {
      setCollection(await updateConcept(spaceId, conceptId, update));
    } catch {
      setError(
        "That change was not saved. Your previous saved concepts are still shown.",
      );
    }
  }
  const concepts = collection?.concepts ?? [];
  return (
    <section className="concept-explorer" aria-labelledby="concept-heading">
      <h3 id="concept-heading">Concept explorer</h3>
      <p className="notice">
        {collection === null
          ? "Concept generation details will appear after saved concepts load."
          : collection.provider === "workers_ai"
            ? "Cloudflare Workers AI produced the concepts below. They have not been reviewed for teaching quality. Selected source excerpts are sent only when generation is requested."
            : "Development preview: concepts below come from a deterministic fake provider and have not been reviewed for teaching quality. Selected source excerpts are sent only when generation is requested."}
      </p>
      <button type="button" disabled={busy} onClick={() => void generate()}>
        {busy
          ? "Preparing concepts…"
          : collection?.status === "ready"
            ? `Generate again from section ${location}`
            : `Generate concepts from section ${location}`}
      </button>
      {collection?.status === "failed" && (
        <p>Previous generation failed. Use the button to retry explicitly.</p>
      )}
      {loadError && <p role="status">{loadError}</p>}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {concepts.length > 0 && (
        <>
          <div
            className="preview-actions"
            role="group"
            aria-label="Concept view"
          >
            <button
              type="button"
              className={mode === "list" ? "" : "secondary"}
              onClick={() => setMode("list")}
            >
              List
            </button>
            <button
              type="button"
              className={mode === "map" ? "" : "secondary"}
              onClick={() => setMode("map")}
            >
              Map
            </button>
          </div>
          <p className="fine-print">
            Suggested relationships are ideas to inspect. They never lock
            concepts or study order.
          </p>
          <ul
            className={mode === "map" ? "concept-map" : "concept-list"}
            aria-label={`${mode === "map" ? "Map" : "List"} of concepts`}
          >
            {concepts.map((concept) => (
              <li key={concept.id} className="concept-card">
                <label className="concept-toggle">
                  <input
                    type="checkbox"
                    checked={concept.selected}
                    onChange={(event) =>
                      void change(concept.id, {
                        selected: event.target.checked,
                      })
                    }
                  />
                  Include {concept.label}
                </label>
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    const data = new FormData(event.currentTarget);
                    void change(concept.id, {
                      label: String(data.get("label")),
                    });
                  }}
                >
                  <label>
                    Concept label
                    <input
                      name="label"
                      defaultValue={concept.label}
                      maxLength={120}
                    />
                  </label>
                  <button type="submit" className="secondary">
                    Save label
                  </button>
                </form>
                <p>{concept.description}</p>
                <ul aria-label={`Sources for ${concept.label}`}>
                  {concept.sources.map((source) => (
                    <li key={source.id}>
                      <button
                        type="button"
                        className="source-link"
                        onClick={() => onSource(source)}
                      >
                        Open source section {source.location}:{" "}
                        {source.text.slice(0, 80)}
                      </button>
                    </li>
                  ))}
                </ul>
                {collection?.relations
                  .filter((relation) => relation.fromId === concept.id)
                  .map((relation) => (
                    <p className="suggestion" key={relation.toId}>
                      Suggested connection →{" "}
                      {
                        concepts.find((item) => item.id === relation.toId)
                          ?.label
                      }
                    </p>
                  ))}
              </li>
            ))}
          </ul>
        </>
      )}
      {concepts.length > 0 && (
        <>
          <ActivityPack
            userId={userId}
            spaceId={spaceId}
            selectedCount={
              concepts.filter((concept) => concept.selected).length
            }
            concepts={concepts
              .filter((concept) => concept.selected)
              .map(({ id, label }) => ({ id, label }))}
            onSource={onSource}
          />
          <PracticalTask
            spaceId={spaceId}
            conceptIds={concepts
              .filter((concept) => concept.selected)
              .map((concept) => concept.id)}
            sources={concepts.flatMap((concept) => concept.sources)}
            onSource={onSource}
          />
          <SupplementaryResources
            spaceId={spaceId}
            selectedConceptKey={JSON.stringify({
              revision: collection?.requestId,
              concepts: concepts
                .filter((concept) => concept.selected)
                .map(({ id, label }) => ({ id, label }))
                .sort((left, right) => left.id.localeCompare(right.id)),
            })}
          />
        </>
      )}
    </section>
  );
}
