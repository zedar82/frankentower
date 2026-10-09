# Release checks and recovery

Use Node 22 (see `.nvmrc`) and the committed lockfile.

## Offline gate

```sh
npm ci
npx playwright install chromium
npm test
npm run build
npm run test:browser
```

On Linux CI install the browser OS dependencies with `npx playwright install --with-deps chromium`.
The runner selects a free localhost port, waits for Vite readiness, runs the existing browser/arena/puppet checks plus the reliability check, and stops the server on completion/failure. Screenshots are written to ignored `test-results/` by default. Browser selection and artifact paths are configurable; no macOS executable paths are required.

`.github/workflows/checks.yml` runs these gates on pushes, pull requests, and manual dispatch. It does not deploy or publish anything.

The production build fails if the development storage module enters its module graph. Building with `--mode offline` is deliberately rejected: offline mode is for the local development server only.

## Private hosted gate

Build with `npm run build`, then upload privately with the existing RUN configuration and `rundot deploy --bump Patch --changelog-file docs/release-notes.md`. Do not add `--public` or submit to a jam.

Supply the private URL using `FRANKENTOWER_PREVIEW_URL`, or put the link in a git-ignored file and point `FRANKENTOWER_PREVIEW_URL_FILE` at it. Run:

```sh
npm run test:hosted
```

The test normalizes w.run links to the web catalog while preserving the private key. It requires `tag=private` and the share key, creates a fresh browser context rather than reusing the developer's profile, and refuses to overwrite a profile with a run already in progress. It buys/equips an item, waits for cloud acknowledgement, reloads and checks that item, completes floor 1, advances to floor 2, and reloads/checks the cloud state again.

This changes only the disposable test profile. If RUN requires an interactive login and does not open the game in that context, obtain a dedicated test-profile session before running the gate; do not substitute the developer's real save.

`.github/workflows/hosted-check.yml` is manual only. Configure the `FRANKENTOWER_PREVIEW_URL` secret in its `private-playtest` GitHub environment before dispatching. This workflow tests an already deployed private version; it neither deploys nor changes visibility. Keep preview keys, RUN session files, and browser authentication state out of source control and logs.

## Save behavior

Missing records start a new save. Incompatible development rulesets reset without migration. Malformed current-version records stop at a recovery screen; reconnect does not overwrite them. An explicit two-step reset confirmation is required to replace damaged records, including guardians/history/settings. Connection failures offer reconnect without destructive reset.

Writes are serialized. Rapid actions coalesce to the newest immutable snapshot while an older write is in flight. Failed writes retain pending progress and retry after 1, 2, 4, 8, 16, then at most 30 seconds between attempts. New actions, Retry save, network reconnection, visibility changes, and host pause/resume can flush pending progress immediately. Acknowledgement of an old snapshot never marks a newer snapshot saved.

Closing/sleeping the page attempts to flush pending progress. A browser unload warning is requested when progress remains unsaved; browsers/hosts may suppress it. Asynchronous unload writes are not guaranteed. Do not equate a local action with a cloud acknowledgement.

## Failure behavior

A simulation-budget error or a thrown simulation step returns to the shop with pre-fight HP, equipment, gold, and progression intact. It does not award a victory or record a death. The interrupted floor can be attempted again or the build changed.

A React rendering failure, uncaught browser error, or rejected asynchronous operation shows a recovery screen and stops the game UI. Reconnect loads acknowledged records. A save interrupted in combat returns to its pre-fight build phase and deterministic encounter seed; pending unsaved actions may need repeating. The recovery flow does not persist potentially damaged runtime state.

Telemetry reports load/write/runtime/simulation failures without interrupting gameplay. Diagnostic events include ruleset and, for combat, seed/floor.

## Regression evidence

The reliability browser check injects malformed storage, transient write exceptions, simulation-budget failures, thrown simulation steps, global errors, rejected promises, and a real React render failure. It verifies reset confirmation, automatic/manual retry, preserved purchased state, and recovery without a false death. Unit tests cover nested validation and all campaign enemy compositions, single-flight ordering, coalescing, stale failed writes, and backoff limits.

Before declaring a release ready, record the tested revision/build, unit/build/browser results, private version and hosted results. Retain a known good private version for rollback. Public publication and jam submission still require Daniel's explicit permission.
