# UI implementation review

11 October 2026. Status: unfinished implementation checkpoint; final verification
is outstanding. See [the cross-machine handoff](ui-pass-handoff.md) for precise
deployment state, setup and continuation steps.

This records implementation evidence against [UI expectations](ui-expectations.md).
The shop mockup remains the visual target. The pass replaces the former dashboard
presentation with dungeon, timber, iron and parchment materials across live views.

## Scope and evidence

| Expectation                        | Implementation and evidence                                                                                                                                                                                                                                    |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Phone and desktop compositions     | Desktop shop places patient/equipment, creature and stock beside one another. Compact views separate Patient, Stock, Gear and Services. Short desktop records shrink before equipment controls do.                                                             |
| Compact phone identity/vitals      | A single-row wordmark/floor/gold/Settings shell; Patient uses a small name/circulation and HP/MP strip. Header shortcuts remain available through Settings.                                                                                                    |
| Core views without scrolling       | Existing browser check measures document and every visible element for content overflow and off-screen controls across nine viewport sizes, plus stock-field overlap. It covers starter, shop, equipment, inspection, surgery, outcomes and reference dialogs. |
| Full information remains reachable | Measured wrapped text uses explicit pages; grids use available rows/columns. The check reconstructs complete long item rules and level-three signatures from all text pages.                                                                                   |
| Equipment expansion                | One bounded workspace with persistent Done, category selection, slot pages, satchel, item details and touch actions. Counts come from actual anatomy. No nested transfer dialogs.                                                                              |
| Large/repeated anatomy             | Fixtures include 42 hands, 26 feet, seven heads/hearts, and headless control. Category pages keep stable ordinal slot labels. Existing puppet check verifies eight anatomies, three poses and both attack directions.                                          |
| Limited satchel                    | Eight spaces enforced in game rules and validation. Unit tests verify full-bag swaps/direct empty-slot purchase, rejected transfers without mutation, and displaced surgery equipment before payment.                                                          |
| Exact surgery preview              | Preview and execution share removal selection; shows slots, HP, Mana, circulation, capacity/load, movement and displaced equipment. Current/Proposed renderer previews use that exact build.                                                                   |
| Stock state and actual costs       | Four desktop offers, explicit phone offer pages, sold positions retained, free freeze and game-derived service prices. Browser checks exercise buying, freeze, reload and next-floor stock.                                                                    |
| Tap, pointer and keyboard          | Browser flows exercise purchase/equip/unequip/combine/sell through actual controls. Expanded workspaces trap focus; thirty Tab presses remain inside, Escape restores the opener. Pointer dragging remains optional.                                           |
| Resize and safe areas              | Layouts account for all four RUN safe-area fields. Browser checks add nonzero insets, rotate and return, preserving workspace/category/page and saved state. Playground check compares CSS insets with the actual SDK values.                                  |
| Compact arena and outcomes         | Arena remains dominant; compact vitals, pause/speed, opponent inspection and bounded outcome actions. Existing arena check verifies spatial movement, pause/resume, inspection and desktop/mobile composition.                                                 |
| Reference and recovery             | Help, history, achievements, catalogue, build inspection and reports use sections/pages. Damage recovery and two-step destructive reset fit portrait, landscape and small phone.                                                                               |
| Scrolling exception                | Only `.combat-transcript` has a bounded scrolling reader; Close and report navigation remain outside it. Hidden measurement probes are excluded from fit checks, not live content.                                                                             |
| Artwork and rendering quality      | Adaptive nine-slice frames, RUN plinth/timber, display-density icons, and resting-pose creature fitting. Inventory cleaver/crown art matches assembly. Actual screenshots are retained below.                                                                  |
| Engine and persistence boundaries  | React handles navigation; inventory/surgery own capacity. Shared combat/ability engine retained. Production build enforces exclusion of development-only storage; hosted persistence remains RUN appStorage.                                                   |

Review sizes, in CSS pixels: **360×640, 390×844, 844×390, 844×342, 1280×720,
1440×900, 768×1024, 1024×576 and 320×568**. The compact breakpoint is width
below 1100 or height below 620; additional short-height arrangements apply below 500. These are the verified effective viewport range, not a device whitelist.

## Commands and results

- `npm test`: 61/61 passed before the last short-height changes; final run pending.
- `npm run build`: passed before the last short-height changes; final run pending.
- `npm run test:browser`: a complete run passed browser, arena, puppet and reliability
  checks after short-landscape fixes. The latest rerun added a blocked-full-bag
  fixture; its completion output was not retained and its result is unconfirmed.
- `node scripts/playground-check.mjs`: passed actual RUN initialization, identity,
  cloud writes, reload/read and four-field safe areas using a disposable profile.
- Private version `1.8.12`: basic persistence/combat smoke passed. The expanded
  hosted check failed at effective 844×342 with purchased-stock layout overflow.
  The working tree includes subsequent fixes, but these have not been uploaded
  or verified on the host. Final private upload and expanded host check pending.

Local verification uses installed Chrome through `FRANKENTOWER_BROWSER_EXECUTABLE`.
The environment has Node 24.14.0; clean CI continues using the repository's Node 22
configuration. Credentials and private links remain in ignored files.

## Actual in-game captures

See [the retained review captures](../output/art-direction/ui-pass/review/) and
[art provenance / exact RUN prompts](../output/art-direction/ui-pass/README.md).
These are rendered screens from the app, not concept images.

## Compatibility and remaining release work

The initial capacity is eight. This is a balance choice that can be changed
deliberately later, while preserving atomic final-occupancy validation. Ruleset
`frankentower-3` resets incompatible development saves without migration.

The UI implementation does not certify phone hardware performance, native host
chrome, battery use, or player comprehension. Physical handset testing and human
playtests remain release-roadmap tasks. Responsive browser captures and the real
RUN web host provide the presentation evidence for this pass. Generated UI PNGs
add roughly 9.5 MB uncompressed on disk; lower-end startup/decode measurements
remain part of the performance milestone.

Community publishing remains deferred. Public visibility and jam submission
require Daniel's explicit permission. Git push is not part of this pass.
