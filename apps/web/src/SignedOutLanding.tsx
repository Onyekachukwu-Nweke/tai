export function SignedOutLanding({
  busy,
  loading,
  error,
  onSignIn,
  onRetry,
}: {
  busy: boolean;
  loading: boolean;
  error: string;
  onSignIn: () => void;
  onRetry: () => void;
}) {
  return (
    <div className="landing-shell">
      <header className="landing-header">
        <a className="landing-wordmark" href="/" aria-label="TAI home">
          TAI
        </a>
        <span className="preview-badge">Early preview</span>
      </header>
      <main id="main" className="landing-main">
        <section className="landing-copy" aria-labelledby="landing-title">
          <p className="eyebrow">Learning from what you already have</p>
          <h1 id="landing-title">
            Turn your course material into understanding.
          </h1>
          <p className="landing-intro">
            Bring a PDF or text file. TAI finds the ideas that matter, turns
            them into focused practice, and keeps every practice question
            connected to its source.
          </p>
          {error && (
            <div className="error" role="alert">
              <p>{error}</p>
              <button className="secondary small" onClick={onRetry}>
                Retry session check
              </button>
            </div>
          )}
          {loading ? (
            <p role="status">Checking your session…</p>
          ) : (
            <button className="landing-cta" disabled={busy} onClick={onSignIn}>
              {busy ? "Connecting…" : "Continue with Google"}
            </button>
          )}
          <p className="landing-privacy">
            Your original file stays private. TAI uses your Google identity,
            email, and display name for sign-in. English materials are supported
            in this preview.
          </p>
        </section>
        <LearningVignette />
      </main>
      <footer className="landing-footer">
        <span>One step at a time.</span>
        <span>Built for focused, source-grounded learning.</span>
      </footer>
    </div>
  );
}

function LearningVignette() {
  return (
    <section className="learning-vignette" aria-label="How TAI works">
      <div className="vignette-glow" aria-hidden="true" />
      <article className="source-sheet">
        <span className="source-file" aria-hidden="true">
          <Icon className="icon" name="file-text" size={24} />
        </span>
        <div>
          <strong>Your material</strong>
          <p>Read in its original context</p>
        </div>
        <div className="source-lines" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
      </article>
      <div className="vignette-path" aria-hidden="true">
        <span />
        <span />
      </div>
      <article className="concept-sheet">
        <p className="vignette-label">Key concepts</p>
        <strong>See the structure</strong>
        <div className="concept-pills" aria-hidden="true">
          <span>Core idea</span>
          <span>Process</span>
          <span>Example</span>
        </div>
      </article>
      <article className="practice-sheet">
        <div className="practice-number" aria-hidden="true">
          01
        </div>
        <div>
          <p className="vignette-label">Focused practice</p>
          <strong>Explain it in your own words</strong>
          <p className="citation-mark control-with-icon">
            <Icon className="icon" name="external-link" size={14} /> Backed by
            page 4
          </p>
        </div>
      </article>
    </section>
  );
}
import { Icon } from "./Icon";
