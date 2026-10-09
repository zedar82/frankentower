# Production-readiness roadmap

Reviewed 9 October 2026 against the current working tree, including uncommitted changes.

## Assessment and evidence

FRANKENTOWER has a substantial playable foundation. Preserve its deterministic shared combat engine, declarative equipment/limb/set abilities, spatial combat, and RUN persistence. The main remaining work is reliability, achievable progression, player comprehension, presentation, and repeatable release validation.

- `npm test`: 50 tests passed.
- `npm run build`: TypeScript and production build passed.
- `npm run balance`: 64 campaigns; zero completions and zero simulation-budget failures. Median ending floors: Blood 40, Arcane 40, Bulwark 43, Venom 43. Overall range: floors 6–56.
- The bot is intentionally simple. These results warrant investigation; they do not prove that human players cannot win. Prepared late-game builds passing tests does not prove those builds are obtainable through normal purchases and surgery.
- Production creature assets total about 4.7 MB; rat/bone PNG sheets account for about 3.1 MB.
- Browser, device, Playground, and hosted checks were inspected but not executed. Their release gates remain unverified.
- No deployment, publication, commit, or push was performed.

## 1. Protect progress and recover from failures — release blocker

Evidence: `src/platform.ts`, `src/main.tsx`, `src/App.tsx`, `src/game/combat.ts`.

- Validate saves at the platform boundary before casting them to Save. Current validation only checks selected fields. Cover nested run/build structures, phases, finite numbers and bounds, settings, anatomy variants, item levels and identities, stash/offers, and legacy/record builds.
- Distinguish invalid data from connection failure. Boot currently offers Reconnect, which rereads the same malformed save. Provide explicit development-save reset recovery. Continue resetting incompatible rulesets; do not add migrations.
- Retain and retry the latest failed write with bounded backoff, host-resume retry, and a manual retry route. Currently persist catches failures and waits for another action. Coalesce obsolete queued snapshots without losing the final state. Keep hosted writes on RUN appStorage.
- Define close/sleep behavior and flush pending writes where supported. Show unsaved progress honestly; asynchronous unload writes cannot be guaranteed.
- Separate simulation-budget failure from legitimate death. Combat.failure currently ends combat and App calls finishFight with combat.won, potentially recording an engine error as defeat. Preserve pre-fight progress and provide useful recovery and diagnostic context.
- Add a React error boundary and handling for combat-loop/runtime errors outside React. The startup load catch does not cover these failures.

Exit gate: focused tests and host checks demonstrate recovery from malformed saves, temporary write failures, rapid purchases, reload, sleep/resume, and engine failure. No silent loss of accepted progress or engine failure recorded as player death. Preserve intentional pre-fight replay when closing during combat.

## 2. Automate release validation — release blocker

Evidence: `package.json`, `scripts/*-check.mjs`, `README.md`. No `.github` workflow directory is present in this checkout.

- Establish clean-install CI: npm ci, npm test, npm run build, then existing offline browser/arena/puppet checks with managed Vite startup, readiness, and cleanup.
- Finish browser-script portability. Browser/arena scripts have improvements in the working tree; Playground and hosted checks still hardcode macOS Chrome and /private/tmp. Use configurable browser selection and platform-neutral artifact paths. Align documentation/selectors with current UI flow.
- Separate offline CI from hosted/Playground checks. Use a dedicated test profile, ignored credentials, and private preview links; do not overwrite real development progress.
- Add targeted persistence validation/retry tests. Current gameplay coverage is strong but there is no dedicated platform reliability test file.
- Assert that the development offline-storage module is excluded from production. Check the app adapter rather than banning all localStorage references, since SDK code may use browser storage internally.
- Document the exact revision/artifact, toolchain, commands, required results, private smoke check, credentials, and rollback procedure.

Exit gate: fresh checkout runs offline gates unattended; private hosted validation proves boot, purchase, fight completion, and cloud reload. Failures retain usable logs/screenshots; credentials stay out of source control.

## 3. Prove progression can be earned — release blocker

Evidence: `scripts/balance.ts`, `tests/buildcraft.test.ts`, `src/game/shop.ts`, `src/game/encounters.ts`, `src/game/run.ts`.

- Diagnose repeated floor-40 losses and early floor-6–12 deaths. Record acquired equipment, shop tier, spending, circulation, encounter composition, duration, and loss cause; separate bot mistakes from difficulty spikes.
- Improve diagnostic purchasing strategies and expand seeds before setting a bot benchmark. Compare all starters and campaigns with and without personal Legacy guardians.
- Begin private human playtests: new players for learning, skilled players for viable build diversity. Observe first purchase/surgery, overload, combining, retirement, and understanding of defeat.
- Tune encounters, guardian spikes, economy, recovery costs, shop tiers, item availability, and procedures together. Winning builds should be obtainable through the normal campaign.
- Agree targets for first-session progress, run length, completion difficulty, and build diversity before numerical tuning. Add meaningful seeded regressions for diagnosed bugs; do not require every bot to win.

Exit gate: new players understand the loop; skilled players can complete the tower with several earned builds. Evidence explains difficulty spikes and demonstrates meaningful circulation trade-offs.

## 4. Finish presentation and interaction — release blocker

Evidence: `docs/visual-direction.txt`, `docs/art-prototype.md`, `src/ui/Arena.tsx`, `src/art/puppet.ts`, `src/ui/Modal.tsx`, `src/App.tsx`.

- Resolve the provisional creature-art direction before expanding assets. Preserve pixel-art arenas and arena-first composition; validate the illustrated creature treatment in that setting.
- Verify wide, many-limbed, headless, rat/bone, overloaded, and extreme builds in arena and equipment views. Preserve visible socket ownership and distinct weapon cadence; retain existing composition checks.
- Give failed/slow asset decoding a verified fallback/retry path. Puppet initialization currently uses a combined decode promise and logs failures.
- Improve contextual teaching from playtest observations. A help modal exists; verify combining, freeze, circulation, Mana-fed hearts, reaction chains, and retirement can be understood in play. Explain actionable loss causes without filling combat with dashboards.
- Audit touch, keyboard, focus, text readability, reduced motion, and non-color status cues. Existing focus trapping and reduced-motion support are useful foundations.
- Test portrait/landscape phones, small screens, tablet, desktop, safe areas, rotation, rapid clicks/drags, and overlays during pause/resume.

Exit gate: users complete the loop on supported devices, understand why fights resolve as they do, and inspect/equip extreme builds without clipping or blocked controls.

## 5. Measure performance and make failures diagnosable — release blocker

Evidence: build output, `src/ui/Arena.tsx`, `src/art/puppet.ts`, `src/App.tsx`, `src/platform.ts`.

- Select target devices and measure startup, decode time, frame time, memory, and battery on a lower-end phone. Stress many limbs/enemies and dense reactions at every combat speed.
- Optimize measured bottlenecks: evaluate oversized art crops, rat/bone compression or atlases, and repeated drawing work. Verify hidden/paused-host behavior of cosmetic animation loops. Preserve simulation determinism.
- Set measurable startup/frame-time budgets after choosing devices. A successful build is not evidence of mobile performance.
- Extend existing RUN analytics with save/load failures, runtime/simulation errors, and startup/art failures. Include build/ruleset, seed, floor, and reproduction context within host limits. Telemetry remains nonfatal; exclude credentials/private links.
- Verify reports can identify where players stop, dominant builds, loss causes, and release regressions. Review actual data collection and any required release disclosures.

Exit gate: device sessions meet agreed performance budgets and reported failures can be tied to a release and reproduced.

## 6. Validate a private release candidate

- Consolidate outstanding working-tree changes into a reviewable revision; update the stale README architecture map to match docs/architecture.md.
- Confirm art/audio provenance and distribution rights; finish thumbnail, description, controls, credits, and release notes.
- Upload a private/unlisted candidate and run hosted/device soak checks covering long runs, retirement, guardian reuse, completion, defeat, and reloads between phases.
- Rehearse rollback to a known good build. Incompatible development saves may reset; establish a public save policy before release instead of adding migrations now.
- Obtain Daniel's explicit permission before public publication or jam submission. Readiness work does not authorize either action.

Exit gate: earlier milestones have recorded evidence, no unresolved critical bugs, a known good rollback artifact, and an explicit publication decision.

## Recommended order and scope

Start with save validation/recovery and write retries, then simulation/runtime recovery, portable browser checks and CI. Diagnose campaign progression while beginning private playtests. Complete presentation and measured device fixes before the private candidate soak.

Balance, presentation, and device work can overlap once progress is safe. Estimate implementation time after the first human/device pass; these remain the largest uncertainties.

Community publishing, Fame, public reactions, and shared bosses remain deferred. Unique room layouts, obstacle/pathfinding systems, save migrations, a second combat engine, and a broad architecture rewrite are not prerequisites. Extract independent App screens/controllers when useful; retain rules in the existing pure game modules.
