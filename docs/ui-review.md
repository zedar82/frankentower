# UI implementation review

13 October 2026: **functional checkpoint; visual target unfinished**. Comparing the mobile
shop with Daniel's reference exposed composition and density shortfalls despite
passing functional checks. The earlier completion claim was too strong.
See [the visual target pass](visual-target-pass.md). The command results below
record the earlier `b73b618` / private RUN `1.8.14` functional checkpoint;
they do not certify the newer source. Current acceptance evidence follows.

## Current visual pass — 13 October, late evening

Private RUN **1.8.16** now contains the composed shop and clinic, four compact
offers with rule-derived symbols, new scenery/material-specific gear, smaller
phone record, responsive focus return and container-sized equipment fallback.
See [the current visual review](visual-target-pass.md#visual-review) and
[actual captures](../output/art-direction/visual-target-pass/review/).

Current unit tests (61), production build and existing browser/arena/puppet/
reliability checks pass. Browser coverage now includes twelve sizes, with
390×796, 360×750 and 360×700 added to the earlier matrix. Scene-region overlap
is checked explicitly. Actual 125%/200% local Chrome zoom checks also pass.
Private **1.8.16** passes normal and actual 200% zoom hosted boot, purchase/cloud
reload, SDK safe areas, display-density rendering, footer input after resize,
combat, saved speed and floor-two/cloud reload. The composed UI also passed
real RUN Playground persistence/safe-area verification; its grant is revoked.

The checkpoint implements:
one composed ordinary shop, prominent real creature, compact patient record,
separate equipment rail, eight-cell satchel, four content-sized offer tiles,
corner costs/timers, and live effect iconography. Clinic, arena, outcomes and
focused workspaces share those materials. Follow-up comparison finds that
framing, integration into the workshop, pixel scale/typography and phone
readability still need work; the visual completion claim is withdrawn.
Daniel also rejects persistent game branding during play. Private **1.8.17** now
removes the FRANKENTOWER title and banner, keeping run state and controls.
The production build passes and the revised HUD has local phone/desktop captures.
The full browser/hosted results above remain evidence for 1.8.16.
Private **1.8.18** subsequently attempted to correct circlet seating with measured source
landmarks. Production build passes; both hats have actual-renderer review on
all six head materials and phone/desktop captures. These are visual attachment
changes and do not establish full visual acceptance.
Private **1.8.19** replaces the hollow-ring sprites with the visible front
material alone, following Daniel's direction that no headwear needs a back.
Build and actual-renderer phone/desktop/all-six-head-material review pass.
The shared renderer still draws one overlay after the head; no back layer or
face-specific code was introduced. Historical ring captures are superseded
by `headwear-front-*` captures.
On 14 October, private **1.8.20** removes circular connector overlays at
shoulders, hips and necks, with original graft roots and native seams retained.
The fifteen unused images/geometry records are removed and the generator now
emits 80 assets. Build and actual-renderer phone/desktop/material/swing review
pass; full-suite/hosted evidence remains the 1.8.16 checkpoint.
Refer to the portable screenshots;
the historical results below must not be used in place of current evidence.

## Historical functional checkpoint

This records implementation evidence against [UI expectations](ui-expectations.md).
The shop mockup remains the visual target. The pass replaces the former dashboard
presentation with dungeon, timber, iron and parchment materials across live views.

## Scope and evidence

| Expectation                        | Implementation and evidence                                                                                                                                                                                                                                                                                                |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Phone and desktop compositions     | Desktop shop places patient/equipment, creature and stock beside one another. Compact views separate Patient, Stock, Gear and Services. Short desktop records shrink before equipment controls do.                                                                                                                         |
| Compact phone identity/vitals      | A single-row wordmark/floor/gold/Settings shell; Patient uses a small name/circulation and HP/MP strip. Header shortcuts remain available through Settings.                                                                                                                                                                |
| Core views without scrolling       | Existing browser check measures document and every visible element for content overflow and off-screen controls across nine viewport sizes, plus stock-field overlap. It covers starter, shop, equipment, inspection, surgery, outcomes and reference dialogs.                                                             |
| Full information remains reachable | Measured wrapped text uses explicit pages; grids use available rows/columns. The check reconstructs complete long item rules and level-three signatures from all text pages.                                                                                                                                               |
| Equipment expansion                | One bounded workspace with persistent Done, category selection, slot pages, satchel, item details and touch actions. Counts come from actual anatomy. No nested transfer dialogs.                                                                                                                                          |
| Large/repeated anatomy             | Fixtures include 42 hands, 26 feet, seven heads/hearts, and headless control. Category pages keep stable ordinal slot labels. Existing puppet check verifies eight anatomies, three poses and both attack directions.                                                                                                      |
| Limited satchel                    | Eight spaces enforced in game rules and validation. Unit tests verify full-bag swaps/direct empty-slot purchase, rejected transfers without mutation, and displaced surgery equipment before payment.                                                                                                                      |
| Exact surgery preview              | Preview and execution share removal selection; shows slots, HP, Mana, circulation, capacity/load, movement and displaced equipment. Current/Proposed renderer previews use that exact build.                                                                                                                               |
| Stock state and actual costs       | Four desktop offers, explicit phone offer pages, sold positions retained, free freeze and game-derived service prices. Browser checks exercise buying, freeze, reload and next-floor stock.                                                                                                                                |
| Tap, pointer and keyboard          | Browser flows exercise purchase/equip/unequip/combine/sell through actual controls. Visible buttons/selects are measured against the approximately 44-pixel target (two-pixel allowance). Expanded workspaces trap focus; thirty Tab presses remain inside, Escape restores the opener. Pointer dragging remains optional. |
| Resize and safe areas              | Layouts account for all four RUN safe-area fields. Browser checks add nonzero insets, rotate and return, preserving workspace/category/page and saved state. Playground check compares CSS insets with the actual SDK values.                                                                                              |
| Compact arena and outcomes         | Arena remains dominant; compact vitals, pause/speed, opponent inspection and bounded outcome actions. Existing arena check verifies spatial movement, pause/resume, inspection and desktop/mobile composition.                                                                                                             |
| Reference and recovery             | Help, history, achievements, catalogue, build inspection and reports use sections/pages. Damage recovery and two-step destructive reset fit portrait, landscape and small phone.                                                                                                                                           |
| Scrolling exception                | Only `.combat-transcript` has a bounded scrolling reader; Close and report navigation remain outside it. Hidden measurement probes are excluded from fit checks, not live content.                                                                                                                                         |
| Artwork and rendering quality      | Adaptive nine-slice frames, RUN plinth/timber, display-density icons, and resting-pose creature fitting. Inventory cleaver/crown art matches assembly. Actual screenshots are retained below.                                                                                                                              |
| Engine and persistence boundaries  | React handles navigation; inventory/surgery own capacity. Shared combat/ability engine retained. Production build enforces exclusion of development-only storage; hosted persistence remains RUN appStorage.                                                                                                               |

Review sizes, in CSS pixels: **360×640, 390×844, 844×390, 844×342, 1280×720,
1440×900, 768×1024, 1024×576 and 320×568**. The compact breakpoint is width
below 1100 or height below 620; additional short-height arrangements apply below 500. These are the verified effective viewport range, not a device whitelist.

## Commands and results

- `npm test`: **61/61 passed** on the final runtime source, 13 October.
- `npm run build`: **passed**, including the production storage boundary check.
- `npm run test:browser`: **passed** browser, arena, puppet and reliability checks
  on the final runtime source. Includes blocked-full-bag stock, inspection and
  destinations, short-height layouts, field overlap, touch targets and native
  footer hit geometry after phone-to-desktop rotation.
- The existing browser check also **passed at actual 125% and 200% Chrome zoom**
  across all nine effective CSS viewport sizes. Physical windows are scaled to
  retain the specified effective dimensions; the test verifies those dimensions.
  This exercises zoom/density rendering as well as the smaller layouts covered
  by the normal suite. It does not claim arbitrary minimum-size support.
- `node scripts/playground-check.mjs`: passed actual RUN initialization, identity,
  cloud writes, reload/read and four-field safe areas using disposable profile
  `ui_review_1013`. The one-day grant was **revoked** after the final check.
- Private RUN version **`1.8.14`** contains the final runtime source. Actual-zoom
  hosted verification **passed** boot, purchase/equipment cloud reload, frame fit,
  all four SDK safe areas, canvas density, footer hit geometry, combat, floor two,
  a second cloud reload and saved 4× speed in a disposable profile.
- The normal-density hosted check **also passed** those checks, including the
  live resize-to-interaction path using the corrected capture method below.

The prior `1.8.12` short-landscape stock failure is fixed. Blocked stock places
its explanation beside the price; equipment selection uses a compact grid and
leaves room inside the frame. Shop canvases are constrained to their scene and
do not receive pointer input. Buttons/selects retain a 44-pixel minimum width.

### Host measurements and automation limitation

The RUN web toolbar takes 48 CSS pixels. Verified game frames were **390×796,
844×342, 360×592 and 1440×912**, from browser sizes 390×844, 844×390, 360×640 and
1440×960. Canvas backing dimensions are checked against the **game frame's actual
reported DPR**, not an assumed outer-window density. The normal host reported
DPR 1; actual 200% Chrome zoom reported DPR 1.5 in the RUN frame.

An outer `deviceScaleFactor: 2` setting did not propagate to the RUN frame.
Playwright's element/full-page screenshot path also cropped actual browser-zoom
output and left the resized iframe without pointer/click delivery despite
correct DOM hit geometry; a capture listener confirmed no event reached the
game. Capturing the rendered viewport directly with CDP, without resizing for
the screenshot, resolved the capture/input discrepancy. Both normal and actual
zoom checks retain the live resize-to-interaction path. Native handset input
remains part of the physical-device release review.

To repeat actual zoom checks with installed Chrome, set
`FRANKENTOWER_BROWSER_ZOOM=1.25` or `2`. For the local suite, set
`FRANKENTOWER_CHECKS=browser` to repeat just its UI portion. Zoom checks use an
isolated temporary persistent Chrome profile and its actual zoom setting; the
developer's browser/profile is not changed. Default checks use the ordinary
isolated context. Credentials and private share URLs remain ignored.

## Completion audit against the implementation brief

| Brief section              | Evidence reviewed                                                                                                                                                                                                                                  |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Fit the viewport        | Nine-size browser fit/overlap/control measurements for starter, shop, expanded gear, inspection, surgery, outcomes, references and recovery; complete rules/signature page reconstruction. Only the bounded transcript scrolls.                    |
| 2. Phone and desktop       | Separate compact/desktop layout code, actual phone/desktop/short-landscape captures, tablet/intermediate sizes, real zoom runs, local rotation/state preservation and actual RUN iframe/safe-area measurements.                                    |
| 3. Shared visual language  | Live rendered dungeon scene, adaptive parchment/iron frames, timber controls, compact phone vitals and prominent creature; arena captures retain combat emphasis. Labels/prices are live elements.                                                 |
| 4. Shop                    | Four offers and sold positions, inspection sections, actual engine costs, paged compact stock, freeze/service flows and cloud-preserved purchases.                                                                                                 |
| 5. Equipment expansion     | Actual anatomy counts, empty/filled/inactive labels, stable slot pages, extreme/headless fixtures, touch-style transfer/combine/sell controls, category/context retention and focus/close checks.                                                  |
| 6. Limited satchel         | Capacity eight in rules and save validation; atomic purchase/swap/surgery/combine tests; full-bag UI destinations and contextual blocked explanations.                                                                                             |
| 7. Screen compositions     | Existing checks cover build, surgery, spatial combat/pause, all four outcome types, build/item inspection, history/help/settings/catalogue/reports and recovery. Captures reviewed from the live renderer.                                         |
| 8. Interaction/readability | Measured approximately 44-pixel targets, visible focus and labels, Tab/Escape/opener tests, non-colour state text, complete paged descriptions and reduced-motion code; actual 125%/200% zoom runs.                                                |
| 9. Acceptance evidence     | Final unit/build/full browser checks, real SDK persistence checks, private hosted checks and retained screenshots. No runtime offline storage or public publishing; physical-device/performance/playtest release gates remain explicitly separate. |

Local verification uses installed Chrome through `FRANKENTOWER_BROWSER_EXECUTABLE`.
The environment has Node 24.14.0; clean CI continues using the repository's Node 22
configuration. Credentials and private links remain in ignored files.

## Actual in-game captures

See [the retained review captures](../output/art-direction/ui-pass/review/) and
[art provenance / exact RUN prompts](../output/art-direction/ui-pass/README.md).
These are rendered screens from the app, not concept images.

The 13 October captures include updated desktop/phone shops, short landscape
blocked purchases/destinations and surgery. Hosted captures show the actual RUN
browser viewport, including its toolbar. They do not include the private share
URL or credentials. Zoomed captures were visually reviewed for full visibility,
not accepted solely from DOM measurements.

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
