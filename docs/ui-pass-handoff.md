# UI pass handoff

**Functional checkpoint; visual target unfinished — 13 October 2026:** the goal was
“proceed with the UI work until you achive the visual target”. The earlier
functional completion did not establish visual acceptance. Read
[the current pass](visual-target-pass.md) first: it records the composed shop,
four compact offers with effect iconography, clinic redesign, registered arena
scenery, material-specific gear, current evidence and outstanding work. The
full verification checkpoint is private RUN **1.8.16**. Unit/build, twelve-size
browser coverage, actual 125%/200% local zoom and normal/200% hosted persistence
checks pass for that checkpoint. The visual completion claim was subsequently withdrawn: framing,
workshop integration, pixel scale/typography and phone readability remain.
Daniel explicitly rejects persistent game branding. Private **1.8.17** removes
the title/banner and retains a compact run HUD. Its production build and local
phone/desktop captures pass; the full checks above belong to 1.8.16.
The Playground grant is revoked.
Latest private runtime: **1.8.20** (14 October), with front-only headwear and
direct graft joins. Decorative shoulder/hip/neck circles are removed from
rendering, the runtime library and the generator; registered roots/pivots stay
unchanged. Build and actual phone/desktop/material/swing captures pass.
Daniel explicitly rejects backs, interiors and hollow rings for headwear.
The two new RUN sprites use one overlay after the head and a seat inside the
front material; no rear layer was added. Build and actual-renderer phone/desktop/six-head-material review
pass; the full suite/hosted checks still refer to 1.8.16. See the asset workflow
for `crownSeat` registration and `headwear-front-prompts.json`. The earlier
1.8.18 full-ring art/placement did not satisfy the worn-headwear brief.
Use `git log -1` and the
working tree to identify the actual checkpoint; do not treat the historical
version statements below as current. This pass has a source/assets/docs commit;
no Git push or public release is authorized. Further work should start from
specific feedback on these actual captures, not the earlier task-tab prototype.

Recorded **11 October 2026**, Australia/Brisbane. This is an unfinished implementation checkpoint for resuming on another machine.

**13 October continuation:** the UI pass was resumed from commit `a657cd8`.
The stock/equipment short-height issues, touch widths and display bounds were
corrected and privately uploaded as RUN **1.8.14**. Unit/build/browser, actual
125%/200% zoom, Playground and private hosted checks passed. The temporary
Playground grant was revoked. Read [the updated review](ui-review.md) for the
current evidence and the hosted automation setup; the remainder of this document
records the earlier handoff and its then-outstanding work.

## Goal and agreed direction

Goal: **apply the new UI expectations to the full application**. At the 11 October
checkpoint the goal service reported **paused**. Daniel resumed it on 13 October.
The earlier checkpoint alone was not completion evidence; use the updated review.

Read these before making changes:

1. [Project instructions](../AGENTS.md).
2. [UI expectations](ui-expectations.md), the detailed acceptance brief.
3. [Visual direction](visual-direction.txt), [design](design.txt) and [architecture](architecture.md).
4. [Implementation evidence](ui-review.md) and [actual game captures](../output/art-direction/ui-pass/review/).

Daniel's illustrated quartermaster mockup is the visual target: a dungeon with wood, iron, parchment and irregular frame edges, a prominent assembled creature, equipment, stock and persistent actions. The goal includes the rest of the application. Phone identity and vitals must remain compact.

Core views must fit without page or panel scrolling, including expanded equipment, item inspection, surgery and reference views. Use tabs and pages for overflow. The combat transcript is the explicit scrolling exception. Preserve the active task on resize and account for all four RUN safe-area insets. The provisional satchel capacity is eight; validate complete transfers and displaced surgery equipment before any mutation.

Retain grotesque cartoon creature art. Parts may have any material, texture or colour; mismatches are intentional. Asymmetry is optional. Continue the accepted modular assembly framework, bounded parts and capped one/two-step torso tapers. Crown-style headwear replaces wrapping hoods.

## Repository checkpoint and permissions

- Branch: `main`. Previous committed base: `da74a42` (`Preserve creature detail and render canvases at display density`).
- The handoff commit contains the UI implementation, art experiments, review captures and this document. Identify its revision with `git log -1 --oneline`; this document cannot embed its own commit hash.
- Daniel previously authorized commits. **This checkpoint is not pushed.** Do not infer push permission from commit permission.
- Author and committer must be `Daniel Andersen <zedar@zedar.org>`. GitHub SSH, when needed, uses `~/.ssh/github.key` with `IdentitiesOnly=yes`.
- Private/unlisted development uploads are authorized. **Public publishing and jam submission require Daniel's explicit permission.** Never use `rundot deploy --public` or `rundot game set-public` without it.
- Credentials, private share links, `.env.local`, generated builds and test results are excluded from Git. Do not copy credentials into this document or the bundle.

## Implemented so far

### Navigation and layout

- Desktop shop: patient/equipment, creature, and four stock offers in three columns. Compact shop: Patient, Stock, Gear and Services views.
- Single-row phone wordmark/floor/gold/Settings header. Additional shortcuts live in Settings. Compact patient name/circulation and HP/MP strip.
- One bounded equipment workspace with category selection, paged sockets, satchel and tap actions to equip, swap, combine, sell and move. Stable ordinal slot labels; no nested transfer dialogs.
- Measured text and grid pages keep full content available. Help, history, achievements, catalogue, build inspection and reports use sections/pages.
- Surgery has exact Current/Proposed anatomy previews, Changes/Procedure/Patient views, game-derived costs and persistent actions.
- Item inspection separates Rules/Signature/About and supports direct destination selection for purchase.
- Compact arena HUD, pause/speed and inspection; bounded death, completion, retirement and checkpoint screens.
- Bounded recovery UI with explicit two-step permanent reset. Focus trapping, Escape, restoration to the opener and keyboard guards are implemented.

### Game rules and persistence

- Eight-space satchel enforced in game rules, purchase and transfer validation, surgery and save validation.
- Inventory transfers validate the final state atomically. Full-bag purchases may go directly to a compatible empty slot; rejected purchases/transfers leave state unchanged.
- Surgery preview and execution share limb removal selection and account for displaced equipment before charging.
- Combining an equipped HP donor into an item in the bag now clamps HP against the completed build.
- Ruleset is `frankentower-3`. Incompatible development saves reset; **do not add migrations**.
- Shared deterministic combat and declarative ability vocabulary remain intact. Production persistence remains the RUN SDK; development-only offline storage stays excluded from production.

### Art integration

- Five runtime PNGs in `public/ui/`: dungeon scene, parchment frame, iron frame, stone display stage and timber button texture.
- `src/ui-materials.css`, imported after the base stylesheet, applies adaptive nine-slice frames and live controls over textures. Text, prices and meters remain HTML/canvas.
- Display-density canvases and nearest-neighbour sampling preserve source detail. Dressing-room fitting uses resting-pose bounds; combat retains the complete attack envelope.
- Plinth placement uses actual display dimensions and the creature ground line.
- Inventory cleaver/crown icons now match accepted assembly silhouettes. This does not constitute new art for every chest/organ/headgear item.

### Most recent changes, still absent from the private deployment

The RUN web toolbar removes 48 CSS pixels from the available game height. A browser at 844×390 therefore exposed an **844×342 game frame**. Earlier fit checks missed overlapping fields even when element bounds fit.

The local implementation now includes:

- A 132-pixel vertical shop navigation strip in short landscape, giving stock cards usable height.
- Stock state and offer paging sharing a top row; readable purchased positions and item fields.
- Short Services rows, inspection actions beside rules, surgery selectors beside changes, a smaller starter row and a single-row recovery action layout.
- Additional card-field overlap assertions, 844×342 arena/recovery checks and a blocked full-satchel purchase/inspection/destination fixture in the existing browser checks.

## Verification and deployment state

| Check                                           | Last known result                                                                                         | What remains                                                                                                                                                                                     |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm test`                                      | 61/61 passed before the final short-height adjustments                                                    | Run against the handoff revision                                                                                                                                                                 |
| `npm run build`                                 | Passed, including production storage boundary checks, before the final short-height adjustments           | Run against the handoff revision                                                                                                                                                                 |
| `npm run test:browser`                          | Earlier complete run passed browser, arena, puppet and reliability checks after the short-landscape fixes | Latest rerun added the blocked full-bag fixture; its completion output was not retained across the handoff. Process handle is unavailable. **Treat this final rerun as unconfirmed**, not passed |
| Actual RUN Playground                           | Passed initialization, identity, cloud write/read/reload and all four safe-area fields                    | Recheck latest source with fresh machine authorization                                                                                                                                           |
| Private hosted smoke, version `1.8.12`          | Passed boot, buy/equip, cloud acknowledgment/reload, combat, next floor and saved 4× speed                | Latest local source is not deployed                                                                                                                                                              |
| Expanded private hosted check, version `1.8.12` | **Failed** at effective 844×342 due to purchased-stock layout                                             | Local fixes passed an earlier local suite; upload them and rerun the expanded hosted check                                                                                                       |

Viewport coverage in the local suite: **360×640, 390×844, 844×390, 844×342, 1280×720, 1440×900, 768×1024, 1024×576 and 320×568**. Compact layout applies below width 1100 or height 620; further arrangements apply below height 500.

Fixtures cover extreme anatomy (42 hands, 26 feet, seven heads/hearts), headless control, full satchel, long level-three descriptions, complete paged text, safe areas, rotation/task preservation and keyboard focus. Existing puppet checks cover eight anatomies, three poses and both attack directions. These checks are presentation/behaviour evidence, not a native-device performance certification.

### RUN versions and IDs

- Production game: `mjkCVhrId815cvHaoaqj` (`game.config.prod.json`).
- Playground: `UDHTAwV2l8ruKrXvCV4H` (`game.config.playground.json`).
- Last uploaded production version: **`1.8.12`, private**. Version `1.8.11` is the preceding rollback reference.
- **Handoff source is newer than `1.8.12`.** Do not describe the hosted game as containing the latest fixes.
- CLI used here: 7.17.0. SDK locked in the repository: 5.29.1.
- Ignored original-machine files: `test-results/ui-pass/deploy-result.txt` and `private-preview-url.txt`. The latter contains the private share key; obtain a fresh private link through authorized RUN tooling on the next machine.

## Where to work

| Path                                                                    | Responsibility                                           |
| ----------------------------------------------------------------------- | -------------------------------------------------------- |
| `src/App.tsx`                                                           | Screen flow, records, inspection and combat controls     |
| `src/ui/Shop.tsx`, `Equipment.tsx`, `Surgery.tsx`, `Reference.tsx`      | Core responsive workspaces                               |
| `src/ui/Paging.tsx`                                                     | Measured text/grid pagination and stable page navigation |
| `src/ui/Modal.tsx`                                                      | Workspace focus and close behaviour                      |
| `src/ui/PatientSummary.tsx`, `ItemDetails.tsx`                          | Complete build/item information                          |
| `src/styles.css`, `src/ui-materials.css`                                | Layout geometry and generated material application       |
| `src/ui/Icon.tsx`, `src/art/puppet.ts`, `modular-puppet.ts`             | Canvas density and creature fitting                      |
| `src/game/inventory.ts`, `surgery.ts`, `save-validation.ts`             | Atomic capacity rules, preview and save boundaries       |
| `scripts/browser-check.mjs`, `arena-check.mjs`, `reliability-check.mjs` | Existing automated layout/interaction checks             |
| `scripts/playground-check.mjs`, `hosted-check.mjs`                      | Real RUN persistence, safe areas and host layout checks  |

## Art generation decisions and durable artifacts

Daniel has 100,000 free RUN credits from the jam and asked to use RUN generation where useful. Prefer RUN for future asset generation; query an estimate first and retain prompts, model/seed metadata and accepted versions.

- [UI material workflow](../output/art-direction/ui-pass/README.md): exact RUN manifests, runners, metadata, accepted materials and actual game captures. RUN stage plus timber cost 285 credits. Earlier scene/frame assets used built-in generation; complete original frame prompts were not retained, and provenance records that gap.
- [RUN body study](../output/art-direction/run-generation-study/README.md): 1,230 credits spent in trials. Providing the target part produced near duplicates. The repeatable candidate pipeline supplies one full-resolution **style-only** reference and explicit geometry, then measures registration/clipping and reviews the actual renderer.
- The trial crustacean arm exceeds its geometry envelope; goat leg has unwanted guide lines; study background is flatter than the target. **Do not promote these to production.** Finer head retry is a candidate, not an accepted replacement.
- Do not blindly run the old study `generate.mjs`: it includes an unstarted job. New UI runners skip existing accepted outputs and accept `RUNDOT_EXECUTABLE`; new assets require new versioned manifests/filenames.
- Keep CLI JSON sidecars outside `public/`, under the art metadata directory. Runtime text generation stays disabled.

Review captures are actual game screens, not concept art. The retained 844×342 stock, Services, item and surgery captures show the recent local layout fixes. Earlier captures document other views; all captures do not certify the newest source revision. Runtime UI PNGs total about 9.5 MB on disk; lower-end decode/startup performance is unmeasured.

## Set up on another machine

Use Node **22** (`.nvmrc`; original machine used Node 24.14.0). Install dependencies from the lockfile:

```sh
npm ci
npx playwright install chromium
npm run dev:offline
```

`npm run test:browser` starts and cleans up its own offline Vite server. It does not need the original machine's ports. If using an installed browser, set `FRANKENTOWER_BROWSER_EXECUTABLE` to its local executable path; otherwise leave it unset for Playwright Chromium.

For actual RUN checks, install/authorize the RUN CLI using the supported account setup, confirm the checked-in game configs and launch `npm run dev`. The previous machine used `rundot.exe` at `C:/Users/msn/AppData/Local/Programs/Rundot/rundot.exe`; this path is not portable. Use `rundot` on PATH or `RUNDOT_EXECUTABLE` for generation runners.

A one-day headless Playground grant was created in the original machine's ignored `.env.local` for a disposable profile (`ui_review_1011`). Revocation has not been confirmed at handoff; expiry is 12 October 2026. **Do not transfer that credential.** Create your own short-lived grant if needed and revoke it when checks finish:

```sh
rundot playground grant-access --game-id mjkCVhrId815cvHaoaqj --expires-in-days 1
# Start the real Playground Vite server in another terminal.
# Set FRANKENTOWER_PLAYGROUND_URL to its URL with a new disposable rundotPlayer.
node scripts/playground-check.mjs
rundot playground revoke-access
```

The current CLI requires the **production game ID** when minting the headless
grant. The Vite Playground still runs the different ID in
`game.config.playground.json`; supplying that Playground ID to grant-access
returns 404. This was verified during the 13 October continuation.

Original process handles and servers (offline port 5175 and Playground port 5177) are machine-local; do not rely on them. `test-results/`, `.env.local`, `dist/` and installed dependencies are not part of the checkpoint. Portable evidence is under `output/art-direction/`.

### Transfer without pushing

A Git bundle can transfer the checkpoint without contacting GitHub. The handoff bundle is placed in ignored `test-results/ui-pass/frankentower-ui-handoff.bundle`; copy it separately. It contains commits after `da74a42`, so the receiving repository must already have that base (clone/fetch the existing repository first if needed).

In the receiving repository, with a clean working tree:

```sh
git bundle verify /path/to/frankentower-ui-handoff.bundle
git fetch /path/to/frankentower-ui-handoff.bundle main
git switch -c resume-ui-pass FETCH_HEAD
```

## First work when resumed

1. Read this handoff and the UI expectations; confirm the checkpoint revision. Resume the goal explicitly. Do not restart the implementation or regenerate accepted artwork.
2. Run `npm test`, `npm run build` and `npm run test:browser` on the checkpoint. Capture results durably. The newest blocked-full-bag fixture has **unconfirmed** results; fix any failures before claiming the final local suite passed.
3. Review actual game captures, especially 844×342 stock/inspection/surgery/recovery and small-phone headers. Preserve live item fields and 44-pixel actions. Update evidence after any changes.
4. Check the current RUN version/visibility, then upload the validated source **privately**, with a Patch bump and `docs/release-notes.md`. Do not use public flags or skip preflight checks:

   ```sh
   rundot deploy --bump Patch --changelog-file docs/release-notes.md --json
   ```

5. Store the private share URL in an ignored file. Set `FRANKENTOWER_PREVIEW_URL_FILE` to that file and run `npm run test:hosted`. Use its disposable browser context; do not overwrite Daniel's existing run. The expanded script verifies effective iframe sizes, DPR, all safe areas and real persistence. The old `1.8.12` failure must be replaced with evidence from the new upload.
6. Recheck actual Playground initialization/save/reload with fresh authorization. Revoke the temporary grant afterwards. Confirm production contains no offline-storage adapter or credential files.
7. Update `docs/ui-review.md` with exact revisions, hosted version and results. Audit all UI expectations before deciding whether this goal is complete. Physical phone performance, native host chrome, battery use and human playtests remain separate release-roadmap work.
8. Commit as authorized. Push only if Daniel authorizes it. Keep visibility private; community features remain deferred.

Suggested continuation instruction:

> Resume the full UI expectations goal from docs/ui-pass-handoff.md. Keep the shop mockup as the visual target, use RUN asset generation as needed, finish local and private-host verification of the short-landscape fixes, and keep publishing private. Do not push without permission.
