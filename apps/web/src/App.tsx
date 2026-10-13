import { useEffect, useState } from "react";
import { sessionSchema } from "../../../packages/contracts/study-spaces";
import { api, authClient } from "./api";
import { StudySpaces } from "./StudySpaces";
import { DeleteAccount } from "./DeleteAccount";
import { AccessibilitySettings } from "./AccessibilitySettings";
import { AppShell, type AppView } from "./AppShell";

type User = { id: string; name: string; email: string };

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [view, setView] = useState<AppView>("home");
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
      if (result.error) throw new Error();
      setUser(null);
      setView("home");
    } catch {
      setError("Sign-out failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  const content = loading ? (
    <p role="status">Checking your session…</p>
  ) : user ? (
    view === "settings" ? (
      <>
        <AccessibilitySettings />
        <DeleteAccount
          userId={user.id}
          onDeleted={(warning) => {
            setUser(null);
            setError(
              warning ||
                "Your account and application-controlled data were deleted.",
            );
          }}
        />
      </>
    ) : view === "home" ? (
      <section className="welcome">
        <p className="eyebrow">Your learning companion</p>
        <h1>Welcome, {user.name}.</h1>
        <p className="intro">
          Pick up where you left off, or make room for something new.
        </p>
        <button onClick={() => setView("spaces")}>View study spaces</button>
      </section>
    ) : (
      <StudySpaces
        key={user.id}
        userId={user.id}
        initialPractice={view === "practice"}
        onViewChange={setView}
      />
    )
  ) : (
    <section className="card signin" aria-labelledby="signin-title">
      <h1 id="signin-title">Make room for understanding.</h1>
      <p>Bring your own material and take the next small step.</p>
      <button disabled={busy} onClick={signIn}>
        {busy ? "Connecting…" : "Continue with Google"}
      </button>
      <p className="fine-print">
        TAI uses your Google identity, email, and display name for sign-in. This
        preview supports English.
      </p>
    </section>
  );
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <AppShell
        view={view}
        signedIn={Boolean(user)}
        onView={setView}
        onSignOut={signOut}
        busy={busy}
      >
        <span className="preview-badge">Early development preview</span>
        {error && (
          <div className="error" role="alert">
            <p>{error}</p>
            <button className="secondary" onClick={() => setRetry(retry + 1)}>
              Retry session check
            </button>
          </div>
        )}
        {content}
      </AppShell>
    </>
  );
}
