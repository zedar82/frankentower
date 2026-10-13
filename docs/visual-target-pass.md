# Visual target pass

13 October 2026. **Functional checkpoint; visual target unfinished.** Goal: proceed with UI work until the visual
target is achieved. The earlier functional checkpoint is commit `b73b618` / RUN
`1.8.14`. The composed UI is privately uploaded and verified as **RUN `1.8.16`**.
Use `git log -1` for the source checkpoint; no push has been performed.

The completion claim was premature and is withdrawn after the follow-up visual
comparison. Passing fit/persistence checks does not establish the visual brief.
The follow-up in private **RUN 1.8.17** removes the persistent FRANKENTOWER title and its full-width
banner. The HUD keeps floor, gold, settings and save state; phone settings retains
its 44px touch target. Production build and actual local phone/desktop captures
pass for the HUD update; the complete browser/hosted results below belong to
the preceding 1.8.16 checkpoint, not a rerun for 1.8.17.

Private **RUN 1.8.18** attempted to correct the circlets' floating appearance. Each asset
declares its original-pixel front-band seating point, which the shared renderer
aligns with the host's crown mount. Both circlets were reviewed on all six
existing head materials and in phone/desktop game captures; production build
passes. No source PNGs, anatomy contracts or gameplay rules were changed.

Daniel's follow-up rejects the hollow-ring viewpoint and any headwear back layer.
Private **RUN 1.8.19** replaces those sprites with opaque front-only material.
Both overlays use an authored seat inside the front material at (512,512),
aligned with the skull's crown line. Inventory and worn art share the new PNGs.
Production build and actual-renderer phone/desktop/six-head-material review pass;
the full suite/hosted checks remain the 1.8.16 checkpoint. The two RUN generations
cost 330 credits, bringing this pass to 1,920; prompts and originals are retained.

14 October: private **RUN 1.8.20** removes decorative shoulder/hip/neck circles.
Parts meet at their original registered roots with native stitched contours;
spacing, pivots and gameplay remain unchanged. Fifteen unused circle PNGs and
geometry records are removed, and the registration generator no longer emits
them. The modular runtime library now has 80 assets. Build passes, with actual
phone/desktop/material and both-direction weapon-swing captures retained.
No image generation was needed. Full suite/hosted checks remain the 1.8.16
checkpoint; these changes do not establish full visual acceptance.

14 October: private **RUN 1.8.21** replaces inventory-icon footwear placement
with three front-only runner/leather/iron archetypes. All ten foot items share
the sole/ankle interface. Source-pixel `soleSeat` aligns with the existing leg
ground anchor; native feet below the authored ankle plane are hidden while
equipped. Bare legs retain their complete source art. Walking uses the same
leg transform. Current fronts fit 26×30 pixels within the 28px leg pitch.
Six RUN generations cost 990 credits including three rejected opening/back
attempts; pass total is 2,910. Sources, sidecars, prompts and measurements remain
recorded. Build passes; actual renderer review covers six leg materials,
bare/equipped feet, idle/walking, all ten items on mixed anatomy and phone/desktop
shop views. Full suite/hosted checks remain historical 1.8.16 results. Individual
themed footwear illustrations remain a later content art pass.

## Reference and acceptance

Daniel's illustrated quartermaster reference is the composition target. Treat
its cohesive dungeon, prominent creature, tactile equipment and inventory,
compact stock cards, substantial artwork and integrated controls as requirements
for the visual review. Phone adaptation must preserve that hierarchy and useful
density. Adding textures to sparse oversized containers is insufficient.

The existing [UI expectations](ui-expectations.md) still apply: phone/desktop,
bounded core views, full information through inspection/pages, touch/keyboard,
actual anatomy counts, atomic eight-space satchel rules and real RUN persistence.
Body colours/materials remain unrestricted, with optional asymmetry.

Review starting and equipped creatures in the actual renderer. Compare actual
captures with the reference as well as measuring bounds. Passing viewport tests
alone is not completion evidence. Apply the shared visual direction to the rest
of the application after establishing the ordinary shop composition.

## Current changes

- Ordinary phone shopping is one scene: patient record, creature, equipment,
  all eight satchel cells and stock. Four separate full-page task tabs are removed.
- Equipment and services expand into focused workspaces. The satchel opens its
  own view directly. Complete item rules remain available through inspection.
- All four offers remain visible: two-by-two phone tiles and a desktop row.
  Tiles use content height, smaller art, corner price/timer, and rule-derived
  effect symbols. Reactions show event → effect; full rules remain in inspection.
  A paged icon guide explains the shared vocabulary. Short phone layouts use
  focused equipment/satchel expansion to preserve creature space and hit areas.
- Phone equipment uses compact rows and a two-by-four satchel. When the scene
  is too short for both, container sizing selects focused Gear/Satchel controls;
  this accounts for long offers and host chrome, not only a device breakpoint.
- Stock illustrations are compact, controls are accessible, and body text uses a
  heavier serif hierarchy. Live economy/rules remain unchanged.
- Duplicate status bands are removed; notices retain their own space when present.
- A RUN-generated shallow stone step replaces the three-tier pedestal in the
  dressing room. Source alpha bounds and the standing-plane landmark register
  it in the real renderer, preserving the body assembly framework.
- RUN portrait/landscape torchlit alcoves place the creature in an actual recess.
  Distinct iron breastplate and spiked cuirass inventory sprites improve item
  recognition.
- The clinic keeps Current/Proposed anatomy visible, with a compact parchment
  comparison and focused paged Changes/Procedure review. Its own medical alcoves
  replace the generic shop scenery. The arena now has a RUN-rendered chamber,
  registered to the existing world ellipse; simulation geometry is unchanged.
- Wooden Shield, Horned Helmet and Bandaged Cap now have distinct wood/iron,
  bone/iron and cloth sprites. Inventory and equipped appearance share these
  assets. Headwear contains only visible front material, drawn once over the
  head, with no rear rim, interior or hollow opening. Crowns fit the original 44×25 size and register a measured front-band
  seating point to the head's crown mount;
  shields retain the existing grip, axis, size and front-of-hand layering.
- Patient inspection now formats Crit in the engine's percentage units, fixing
  the display-only extra ×100. No equipment rules or combat effects changed.

## Asset provenance

`output/art-direction/visual-target-pass/` retains prompts, RUN estimates,
generation runners, original sources/sidecars and measured geometry. The step
uses one full-resolution **style-only** reference and cost **165 RUN credits**.
Accepted runtime PNG: `public/ui/display-step-v2.png`.

The eleven accepted assets cost **1,590 RUN credits**: step 165; two armour
sprites 330; two shop alcoves 240; two clinic alcoves and arena 360; shield and
two circlets 495. Every request used one style-only reference, not the intended
part as an input. Model: `gemini-3.1-flash-image-preview`; cutouts use RUN's
`birefnet` background removal. Rate-limited attempts stopped without producing
an asset; retries reused completed files rather than generating duplicates.
See [the repeatable workflow](../output/art-direction/visual-target-pass/README.md).

Measured source: 1264×848; visible alpha bounds `[64,303,1200,540]` (threshold 8).
Standing plane: source Y approximately 405. Runtime crops the source rectangle
when drawing; the original PNG is preserved. The thin step is a new asset,
not a rescaled or edited version of the old pedestal.

## Visual review

These are observations of the actual runtime, not Daniel's approval of a final
art treatment. The reference guides composition and materials; live layouts
adapt to usable height and width rather than reproducing its tall canvas.

| Reference expectation                   | Runtime review                                                                                                                                                                                                                                                 |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A cohesive dungeon workshop             | Stone alcove, torchlight, shallow step, timber controls, iron fittings and parchment form one scene. The previous full-page shopping task tabs are gone.                                                                                                       |
| Creature is the visual focus            | Bare human and a mixed two-head equipped build are reviewed at phone/desktop sizes. Equipment occupies a separate rail; the body remains unobstructed. Short phones trade the rail for explicit expansion controls.                                            |
| Compact identity/vitals                 | Phone uses a small patient strip or side record, with HP/Mana/circulation. There is no large persistent name/health header. Desktop uses a larger parchment record beside the creature.                                                                        |
| Eight satchel spaces and real anatomy   | Normal tall views show eight cells in two rows and five equipment categories. Counts reflect actual anatomy; overflow opens stable, paged slots. At 700px height, expansion replaces the rail before it can cover the bag.                                     |
| Four readable offers without dead space | Phone has a two-by-two grid; desktop and short landscape use a row. Tiles size to their name/effect content. Smaller art, separate corner purchase prices and timers, and effect symbols replace large illustration/paragraph areas.                           |
| Distinct objects/materials              | Wood/iron shield, bone/iron horns, cloth bandage, plate and spiked armour have distinct art. Inventory and equipped head/hand variants share accepted sprites. Bodies retain independent materials.                                                            |
| A consistent full application           | Clinic uses medical alcoves and a parchment comparison; combat uses a registered stone chamber and compact HUD. Outcomes frame the arena. Start, equipment, help, inspection and recovery retain the same serif/iron/timber vocabulary and bounded navigation. |

The pass does not create unique art for every catalogue entry or change the
modular anatomy framework. Some equipment continues to share family sprites.
Physical handset playtesting remains useful after automated phone/host review.

## Final verification

- `npm test`: **61/61 passed**; `npm run build`: passed, including the production
  development-storage exclusion check.
- `npm run test:browser`: existing browser, arena, puppet and reliability checks
  passed. The browser suite covers twelve usable viewport sizes, full rules,
  extreme anatomy, full-bag destinations, all outcome types, touch actions,
  focus trapping/return, safe areas and rotation.
- The same existing UI check passed at actual **125% and 200% Chrome zoom**.
  Windows scale to retain the specified effective CSS sizes; this does not
  claim support for arbitrary minimum dimensions.
- Private **RUN 1.8.16** passed normal and actual 200% zoom hosted checks:
  boot, purchase/cloud reload, four SDK safe-area fields, canvas density,
  footer input after resize, combat, saved speed and floor-two/cloud reload.
  Actual game frames were 390×796, 844×342, 360×592 and 1440×912.
- Real RUN Playground initialization, identity, cloud write/reload/read and
  safe areas passed for the composed UI; its temporary grant was revoked.

Ignored local logs: `test-results/visual-target/unit-current.log`,
`build-current.log`, `browser-current.log`, `zoom125-current.log`,
`zoom200-current-retry.log`, `hosted-current.log`, `hosted200-current.log` and
`playground-check.log`. Portable selected captures are committed below.

## Compact offer checkpoint

The current local build compiles. Actual-renderer captures show four visible
offers at 390×844, 360×640, 320×568, 844×342, 1280×720 and 1440×900. The
capture helper reported no content overflow in those ordinary-shop captures,
including separate Poison/Bleed/Mana-cost/reaction examples at three sizes.
The existing browser UI check now passes across all twelve review sizes, including
clinic review, complete item rules, expanded equipment, all outcome types,
reference screens, safe areas, rotation and keyboard focus return. Intermediate
sizes are 390×796, 360×750 and 360×700. The check now rejects overlapping scene
regions as well as stock fields. Existing attachment, reliability and arena
checks pass. Unit tests: **61 passed**; production build passed. These results
include the container sizing correction and current responsive focus return.

Private `1.8.15` was an intermediate hosted checkpoint. The final corrections
are in verified private `1.8.16`. One current 200% zoom attempt was interrupted
by `ERR_CONNECTION_REFUSED` from its temporary Vite server. Rerunning the same
existing check against the persistent offline server passed. The earlier
approval-service quota message also prevented a capture; the normal escalation
retry succeeded at 22:24 Brisbane time. Neither interruption was bypassed.

Accepted review captures are in `output/art-direction/visual-target-pass/review/`.
These use a local review save and the actual game renderer, not a generated UI
mockup. Follow-up review identifies remaining work in substantial timber/iron
framing, connecting panels into the workshop, consistent pixel scale/typography,
and phone gaps/readability. This is a tested functional checkpoint, not visual
acceptance. The persistent title banner has been removed following
Daniel's explicit direction; future UI passes must retain that decision.

No public publishing, jam submission or Git push is authorized by this pass.
Private uploads and commits remain allowed. Old checks and captures retain
historical value but cannot establish the new visual result.
