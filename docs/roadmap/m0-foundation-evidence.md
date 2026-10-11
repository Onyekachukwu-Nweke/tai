# M0 foundation evidence — 6 October 2026

Scope: local foundation on `feat/m0-foundation`; evidence applies to the implementation in this changeset. M0 is in progress; this is not full milestone acceptance or deployed infrastructure.

## Implemented

- React/TypeScript/Vite client and Hono Worker serving static assets and API.
- Google-only Better Auth with native D1, required sessions, seven-day fixed expiry, minimal identity projection, and hooks removing optional profile/token metadata.
- One owner-scoped application table plus auth tables. Create, list, and read study spaces; reject malformed/oversized requests and cross-origin mutations.
- Versioned study-space/concept contracts and an internal fake concept adapter validating source associations. No live generation endpoint.
- Formatting, lint, TypeScript, authored-file length, local Markdown links, Workers tests, browser tests, builds, and CI configuration.

Exact package versions and resolved dependencies are recorded in `package.json` and `package-lock.json`. Local verification used Node 24.21.0 and npm 11.21.0, with Wrangler telemetry disabled. Sandbox verification required approved local socket access; Wrangler logs and downloaded Chromium were redirected to `/tmp`.

## Verification

| Command/check | Result |
| --- | --- |
| `npm run check` | Passed all configured static checks, test suites, and builds |
| `npm test` | 12 passed across 3 files in the Workers runtime |
| `npm run test:web` | 7 passed in Chromium, with mocked API responses |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed |
| `npm run format:check` | Passed |
| `npm run check:lines` | 28 authored code files within 350 lines |
| `npm run check:links` | Local Markdown file targets pass; anchors and remote URLs not checked |
| `npm run build` | Vite production build and Wrangler dry-run bundle passed |
| `npm run db:migrate` | Local D1 migration applied successfully |
| Local `wrangler dev` HTTP smoke | Web 200, health 200, unconfigured session 503 |
| Dependency installation audit | Zero reported vulnerabilities after the sharp 0.35.5 override |
| `git diff --check` | Passed |

Worker tests cover synthetic signed sessions through real Better Auth validation, expired/tampered/absent sessions, real auth adapter writes and privacy hooks, ownership isolation, source-reference validation, and request validation. New test-runner storage semantics required explicit per-test synthetic D1 cleanup; no production authorization bypass was introduced.

Browser tests cover sign-in presentation, explicit retry, create/reload, title retention on failed save, no reconnect replay, mobile width, pending-save protection, and expired-session sign-in recovery. These are mocked browser tests, not a full external OAuth journey.

Independent review found one session-expiry recovery issue; it was fixed and re-reviewed. No remaining blocking findings were reported. Reviewer inspected fixture cleanup without weakening ownership assertions.

## Open gates

Real Google OAuth needs owner-provided configuration and an actual callback walkthrough. Cloudflare remote D1/R2, AI Gateway, Workers AI access, spending controls, live generation, model quality/cost, and browser PDF extraction/device spikes remain unverified. No cloud resources were provisioned or deployed, and no live AI calls were made.

Uploads, file storage/deletion, learning activities, progress, quotas, and account deletion are not implemented in this preview. Study-space creation is not idempotent across ambiguous network failures; the UI retains the title and asks the learner to reload before retrying. This is separate from the future required idempotent activity-submission flow.

See [local setup](../developer-guide/setup.md) for commands and OAuth configuration.
