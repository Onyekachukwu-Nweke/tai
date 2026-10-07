import { useEffect, useState } from "react";
import { sessionSchema } from "../../../packages/contracts/study-spaces";
import { api, authClient } from "./api";
import { StudySpaces } from "./StudySpaces";

type User = { id: string; name: string; email: string };

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    api("/api/session", sessionSchema)
      .then((session) => {
        if (active) setUser(session.user);
      })
      .catch((reason: unknown) => {
        if (active)
          setError(
            reason instanceof Error
              ? reason.message
              : "Unable to check your session.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [retry]);

  async function signIn() {
    setBusy(true);
    setError("");
    try {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: window.location.origin,
      });
      if (result.error)
        throw new Error("Google sign-in could not start. Please try again.");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to connect. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    setBusy(true);
    setError("");
    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error("Sign-out failed. Please try again.");
      setUser(null);
    } catch {
      setError("Sign-out failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="topbar">
        <a className="wordmark" href="/" aria-label="TAI home">
          TAI<span>Learning, at your pace.</span>
        </a>
        {user && (
          <button className="secondary" disabled={busy} onClick={signOut}>
            Sign out
          </button>
        )}
      </header>
      <main id="main">
        <p className="eyebrow">Your learning companion</p>
        <h1>
          {user ? `Welcome, ${user.name}.` : "Make room for understanding."}
        </h1>
        <p className="intro">
          A place for your materials, your questions, and your next small step.
        </p>
        <p className="notice">
          Early development preview · Study spaces and local material previews
          are available. Uploads and learning activities are coming next.
        </p>
        {error && (
          <div className="error" role="alert">
            <p>{error}</p>
            <button className="secondary" onClick={() => setRetry(retry + 1)}>
              Retry session check
            </button>
          </div>
        )}
        {loading ? (
          <p role="status">Checking your session…</p>
        ) : user ? (
          <StudySpaces key={user.id} />
        ) : (
          <section className="card" aria-labelledby="signin-title">
            <h2 id="signin-title">Start with your own space</h2>
            <p>
              Sign in with Google to keep your study spaces with your account
              and return from another device.
            </p>
            <button disabled={busy} onClick={signIn}>
              {busy ? "Connecting…" : "Continue with Google"}
            </button>
            <p className="fine-print">
              TAI uses your Google identity, email, and display name for
              sign-in. This preview supports English.
            </p>
          </section>
        )}
      </main>
      <footer>One step at a time.</footer>
    </>
  );
}
