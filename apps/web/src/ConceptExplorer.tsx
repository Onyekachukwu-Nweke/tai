import { useEffect, useState } from "react";
import type { ConceptCollection } from "../../../packages/contracts/concepts";
import { generateConcepts, loadConcepts, updateConcept } from "./concept-api";
import { ActivityPack } from "./ActivityPack";
import { PracticalTask } from "./PracticalTask";
import { SupplementaryResources } from "./SupplementaryResources";
import { ConceptCard } from "./ConceptCard";
import { ConceptMap } from "./ConceptMap";
import type { ConceptScope } from "./concept-scopes";

type Source = ConceptCollection["concepts"][number]["sources"][number];
export function ConceptExplorer({
  spaceId,
  userId,
  scopes,
  onSource,
  practiceOnly = false,
}: {
  spaceId: string;
  userId: string;
  scopes: ConceptScope[];
  onSource: (source: Source) => void;
  practiceOnly?: boolean;
}) {
  const [collection, setCollection] = useState<ConceptCollection | null>(null);
  const [mode, setMode] = useState<"list" | "map">("list");
  const [scopeId, setScopeId] = useState("document");
  const scope = scopes.find((item) => item.id === scopeId) ?? scopes[0]!;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    loadConcepts(spaceId, controller.signal)
      .then(setCollection)
      .catch(() => {
        if (!controller.signal.aborted)
          setLoadError(
            "Saved concepts could not be loaded. Generate explicitly when ready.",
          );
      });
    return () => controller.abort();
  }, [spaceId]);
  async function generate() {
    setBusy(true);
    setError("");
    try {
      setCollection(
        await generateConcepts(
          spaceId,
          {
            startLocation: scope.startLocation,
            endLocation: scope.endLocation,
          },
          crypto.randomUUID(),
        ),
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
  if (practiceOnly)
    return (
      <section className="concept-explorer" aria-label="Practice">
        <p className="fine-print">
          Practice uses your saved selected concepts and source references.
        </p>
        {loadError && (
          <p role="alert" className="error">
            {loadError}
          </p>
        )}
        {concepts.length > 0 ? (
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
        ) : (
          <p role="status">
            No saved concepts are ready. Open the Study Space view to prepare
            concepts first.
          </p>
        )}
        {concepts.length > 0 && (
          <PracticalTask
            spaceId={spaceId}
            concepts={concepts
              .filter((concept) => concept.selected)
              .map(({ id, label }) => ({ id, label }))}
            sources={concepts.flatMap((concept) => concept.sources)}
            onSource={onSource}
          />
        )}
      </section>
    );
  return (
    <section className="concept-explorer" aria-labelledby="concept-heading">
      <div className="section-header">
        <h3 id="concept-heading">Concepts</h3>
        <button
          type="button"
          className={concepts.length > 0 ? "secondary small" : "small"}
          disabled={busy}
          onClick={() => void generate()}
        >
          {busy
            ? "Preparing…"
            : concepts.length > 0
              ? "Regenerate concepts"
              : "Generate concepts"}
        </button>
      </div>
      {scopes.length > 1 ? (
        <label className="compact-field">
          Generate from
          <select
            value={scope.id}
            disabled={busy}
            onChange={(event) => setScopeId(event.target.value)}
          >
            {scopes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <p className="fine-print">From the {scope.label.toLowerCase()}</p>
      )}
      <details className="disclosure">
        <summary>How are concepts generated?</summary>
        <p>
          {collection === null
            ? "Generation details appear after concepts load."
            : collection.provider === "workers_ai"
              ? "Cloudflare Workers AI produced these source-backed suggestions. They have not been reviewed for teaching quality. Suggested relationships never lock concepts or study order."
              : "A deterministic development provider produced these source-backed suggestions."}
        </p>
      </details>
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
        <div className="segmented small" role="group" aria-label="Concept view">
          <button
            type="button"
            aria-pressed={mode === "list"}
            onClick={() => setMode("list")}
          >
            List
          </button>
          <button
            type="button"
            aria-pressed={mode === "map"}
            onClick={() => setMode("map")}
          >
            Map
          </button>
        </div>
      )}
      {concepts.length > 0 && mode === "map" && (
        <ConceptMap
          concepts={concepts}
          relations={collection?.relations ?? []}
          onSource={onSource}
        />
      )}
      {concepts.length > 0 && mode === "list" && (
        <ul className="concept-list" aria-label="List of concepts">
          {concepts.map((concept) => (
            <ConceptCard
              key={concept.id}
              concept={concept}
              relations={collection?.relations ?? []}
              allConcepts={concepts}
              onChange={(id, update) => void change(id, update)}
              onSource={onSource}
            />
          ))}
        </ul>
      )}
      {concepts.length > 0 && (
        <>
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
