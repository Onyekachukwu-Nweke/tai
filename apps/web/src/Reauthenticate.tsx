import { useState } from "react";
import { authClient } from "./api";

export function Reauthenticate() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function signIn() {
    setBusy(true);
    setError("");
    try {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: window.location.origin,
      });
      if (result.error) setError("Sign-in could not start. Please try again.");
    } catch {
      setError("Sign-in could not start. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <p>
        Signing in opens Google. If this page reloads, select any unsaved file
        again.
      </p>
      <button disabled={busy} onClick={signIn}>
        Sign in again
      </button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
