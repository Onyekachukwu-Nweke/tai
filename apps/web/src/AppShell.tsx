import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon";
export type AppView = "home" | "spaces" | "practice" | "settings";
const items: Array<{ view: AppView; icon: IconName; label: string }> = [
  { view: "home", icon: "home", label: "Home" },
  { view: "spaces", icon: "book-open", label: "Study Space" },
  { view: "practice", icon: "play", label: "Practice" },
  { view: "settings", icon: "settings", label: "Settings" },
];
export function AppShell({
  view,
  signedIn,
  onView,
  onSignOut,
  busy,
  children,
}: {
  view: AppView;
  signedIn: boolean;
  onView: (view: AppView) => void;
  onSignOut: () => void;
  busy: boolean;
  children: ReactNode;
}) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="wordmark" href="/" aria-label="TAI home">
          TAI
        </a>
        {signedIn && (
          <nav aria-label="Main navigation">
            {items.map((item) => (
              <button
                key={item.view}
                className={view === item.view ? "nav-item active" : "nav-item"}
                aria-current={view === item.view ? "page" : undefined}
                onClick={() => onView(item.view)}
              >
                <Icon className="icon" name={item.icon} />
                <span className="nav-label">{item.label}</span>
              </button>
            ))}
          </nav>
        )}
        <div className="sidebar-spacer" />
        {signedIn && (
          <button className="ghost signout" disabled={busy} onClick={onSignOut}>
            <Icon className="icon" name="log-out" />
            <span className="nav-label">Sign out</span>
          </button>
        )}
      </aside>
      <div className="page">
        <main id="main">{children}</main>
        <footer>One step at a time.</footer>
      </div>
    </div>
  );
}
