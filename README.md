# FRANKENTOWER

A roguelite autobattler for RUN.world's October 2026 **Monster Mash** jam, built from [the design document](docs/design.txt). Created by Daniel Andersen. The current visual pass follows [the visual direction](docs/visual-direction.txt).

Start human. Equipment creates your combat engine; anatomy creates its sockets; circulation determines how quickly it operates. Climb 100 floors, retire at a checkpoint, and meet your previous successful builds as guardians in later runs.

## Play locally

```sh
npm ci
npm run dev
```

The default server uses the real RUN Playground, including platform identity and cloud saves. Sign in through the RUN toolbar. For unattended testing, `rundot playground grant-access --expires-in-days 7` creates a development-only credential in ignored `.env.local`. Never commit that file.

For development without a RUN account or network connection:

```sh
npm run dev:offline
```

Offline mode uses a separate local save. The browser-storage adapter is removed from production builds. Hosted games exclusively use `RundotGameAPI.appStorage`.

## Controls

- Choose a starting weapon. It is free; you begin with 28 gold for other equipment.
- Buy items to fill empty compatible sockets automatically. Further purchases need room in the eight-space satchel.
- Select equipped items to unequip or combine them. Two identical items at the same level make one item at the next level. Level 3 adds a signature effect.
- Expand equipment to equip, swap, combine, sell, or move items by tapping. Categories and extra slots use pages; Done returns to the shop.
- Surgery opens every five floors: preview one procedure per visit. Displaced equipment needs room in the satchel before surgery can proceed.
- After combat, optionally open the battle log. Visit the doctor on appointment floors, then the quartermaster before the next fight.
- Finish shopping to return directly to combat. There is no separate floor-climb step. Space starts the next fight or toggles combat pause.
- At floors 20, 40, 60, and 80, retire to replace the checkpoint guardian or risk continuing. Floor 100 preserves its champion automatically.

## Implemented first-pass scope

- Deterministic spatial combat shared by players, authored enemies, and saved guardians: positions, nearest-target acquisition, pursuit, orbiting, soft body separation, and a circular arena boundary.
- Melee strikes require reach; ready weapons wait while approaching. Ranged and magical attacks have longer reach, and ranged-only fighters retreat from nearby threats. Leg count determines physical movement speed.
- Pixel-art dungeon arena with an illustrated paper-puppet creature prototype: a growing stitched torso, a painted socket and matching joint pin for each graft, front-facing heads seated in the collar, visible limbs, and arms that swing across the body. Limb motion pivots on the attachment rather than moving it; equipped weapons follow the hands. Creatures also show gait, recoil, death poses, attack arcs/projectiles, damage numbers, Shield breaks, critical feedback, and brief hit-stop on large impacts. Reduced-motion preferences suppress shake and cosmetic gait motion.
- 51 equipment definitions across five rarities, with timers, tags, generic selectors/effects, duplicate upgrades, and Level 3 signatures.
- Mutable Hand, Head, Foot, Chest, and Heart sockets; anatomy-derived HP, Mana, circulation capacity and load.
- 16 surgical procedures, including rat and bone donor grafts, arm/head/foot grafts, amputation, arm-to-head conversion, clockwork arms, Mana-fed necrotic hearts, serpent heads, and headless neural control.
- Continuous circulation penalties; triggers and direct remaining-cooldown changes bypass slow natural clocks.
- One-attack Shield, flat Armour, penetration-triggered Bleed, decaying Poison, uncapped chance and additive critical tiers.
- Octopod set thresholds and anatomy-derived identities.
- A 100-floor budget-generated campaign, seven enemy archetypes, five authored checkpoint guardians, and personal Legacy replacements.
- Hall of Shame, final-build records, four anatomical challenge achievements, equipment contribution reports, and causal-chain transcripts.
- Deliberate phone/desktop layouts with a textured dungeon shop, compact phone vitals, expanded equipment workspaces, exact surgery previews, a compact combat HUD, sound, host safe areas, pause/resume handling, and RUN cloud saves. Core views use tabs/pages without scrolling; the combat transcript is the scrolling exception.
- Custom RUN analytics for purchases, upgrades, rerolls, procedures, equipment choices, fights, retirement, and run outcomes.

The design's later addendum explicitly defers community publishing, Fame, public reactions, and a shared boss repository. Those are not simulated or presented as live features here. The newer visual direction supersedes the original movement deferral. Ordinary floors reuse a circular room; props are decorative and do not block movement or line of sight. The modular creature artwork is described in [the art notes](docs/art-prototype.md); chest/organ overlays and distinct headgear remain later equipment art work.

## Architecture

| File                                                              | Responsibility                                                                                |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `src/game/content.ts`                                             | Declarative equipment, effects, reactions, and procedures                                     |
| `src/game/combat.ts`                                              | Fixed-step simulation, event queue, branch ancestry, damage and resources                     |
| `src/game/anatomy.ts`                                             | Anatomy, sockets, derived stats, and identities                                               |
| `src/game/run.ts`                                                 | Starting, advancing, outcomes, checkpoints, and retirement                                    |
| `src/game/shop.ts`, `inventory.ts`, `surgery.ts`, `encounters.ts` | Pure build actions, stock, surgery, and enemy generation                                      |
| `src/game/abilities.ts`, `anatomy-content.ts`, `sets.ts`          | Shared equipment, intrinsic limb, and set abilities                                           |
| `src/save-validation.ts`, `save-writer.ts`                        | Boundary validation and serialized retry/coalescing                                           |
| `src/platform.ts`                                                 | RUN storage, analytics, safe areas, and lifecycle events                                      |
| `src/App.tsx`                                                     | Build/combat screens, inspection, records, and player controls                                |
| `src/ui/Shop.tsx`, `Equipment.tsx`, `Surgery.tsx`, `Reference.tsx` | Phone/desktop screens, equipment workspaces, previews, reference views |
| `src/ui/Paging.tsx`, `Modal.tsx` | Adaptive text/grid pages and focused workspaces without core UI scrolling |
| `src/ui/Creature.tsx`                                             | Responsive modular creature portraits                                                         |
| `src/ui/Arena.tsx`                                                | Arena rendering, effects, mobile framing, and dressing room                                   |
| `src/art/pixel.ts`                                                | Pixel dungeon, props, equipment icons, and creature rendering entry point                     |
| `src/art/puppet.ts`                                               | Measured artwork pivots, fabric seams, growing creature layout, fitting, and puppet animation |

[Prototype art notes](docs/art-prototype.md) record the torso edit, sprite connection points, and composition checks.

[UI expectations](docs/ui-expectations.md) record the agreed direction for the
full UI pass: deliberate phone/desktop modes, core screens without scrolling,
and tabs, explicit pages, and expanded equipment workspaces for excess content.
The combat transcript is the scrolling exception. The implementation uses eight
satchel spaces, with atomic capacity checks in inventory and surgery rules.
[UI review](docs/ui-review.md) records the implemented screens, viewport checks,
actual in-game captures, and verification limits. [UI materials and RUN prompts](output/art-direction/ui-pass/README.md)
record the reusable artwork workflow. `src/ui-materials.css` applies the shared
timber, iron and parchment treatments over the layouts in `src/styles.css`.

[UI pass handoff](docs/ui-pass-handoff.md) records the unfinished checkpoint,
private deployment state and remaining verification, with setup and transfer
instructions for another machine.

`public/thumbnail.jpg` is the required 512×512 RUN thumbnail. `node scripts/render-thumbnail.mjs` renders it from the game's own pixel dungeon and creature. RUN text generation is explicitly disabled in `rundot/textGen.config.json`; this game makes no inference calls.

Each timed or triggered activation carries an immutable branch ancestry containing item-instance IDs. An instance cannot activate again in the same branch; siblings remain independent. Passive effects such as an item's own-hit rule execute within that activation and have their own once-per-branch reaction guard. An emergency event budget reports a simulation failure instead of freezing. Battles enter explicit attrition after 90 simulated seconds.

If a session closes during combat, the save resumes at that floor's build phase with its pre-fight HP and the same encounter seed. Completed fight outcomes and purchases are persisted through RUN storage. Failed writes retain the latest snapshot and retry automatically with capped exponential backoff; Retry save and host resume can also flush pending progress. Unsaved progress is indicated explicitly. Content snapshots include the ruleset version.

## Validation

```sh
npm test
npm run build
npm run balance
```

Tests cover defence/status semantics, chance overflow, branch-local recursion, duplicate instances, own-hit/own-crit passives, circulation, necrotic capacity, deterministic replay, shops, surgery, retirement snapshots, outcomes, four different prepared late-game builds, melee reach, physical movement, leg-count speed, target selection, ranged spacing, heavy wind-up, and arena bounds.

`npm run balance` runs a deliberately simple shop/surgery bot across sixteen seeds per strategy. It is a diagnostic, not a guarantee that a build is purchasable or that a new player can complete the tower. Prepared Blood, Mana, Shield, and Poison engines pass the late-game encounter tests. The spatial rules change pacing and encounter balance; the old stationary-combat bot results are no longer a release benchmark. Economy, content availability, and human comprehension still need external playtesting before public release.

Install the test browser once, then run the offline browser gates with automatic Vite startup and cleanup:

```sh
npx playwright install chromium
npm run test:browser
```

The suite checks real controls, arena movement, puppet connectivity, malformed-record recovery, failed-write retries, and combat/runtime crash recovery. Screenshots go to ignored `test-results/`. It uses Playwright's bundled Chromium by default; set `FRANKENTOWER_BROWSER_CHANNEL=chrome` or `FRANKENTOWER_BROWSER_EXECUTABLE` to use another installed Chromium browser. `FRANKENTOWER_ARTIFACT_DIR` selects another screenshot directory. Individual checks accept `FRANKENTOWER_LOCAL_URL` when you start an offline server yourself.

GitHub Actions runs a clean install, unit tests, production build, and the offline browser suite. A separate manual hosted workflow uses a private preview link stored as an environment secret. See [release checks and recovery behavior](docs/release-checks.md).

`scripts/playground-check.mjs` requires a running authenticated Playground server, uses `FRANKENTOWER_PLAYGROUND_URL`, and expects its dedicated Heavy Club test profile. `npm run test:hosted` requires `FRANKENTOWER_PREVIEW_URL` or `FRANKENTOWER_PREVIEW_URL_FILE`; it opens a fresh disposable browser context and refuses to replace an existing run. It verifies a purchased item and floor progression survive cloud reloads. Private share links must stay out of source control.

## Private deployment and jam submission

**Do not make the game public or submit it to the jam without Daniel's explicit approval.**

The production project ID is recorded in `game.config.prod.json`; Playground has a separate project ID. Build and upload an unlisted/private version with:

```sh
npm run build
rundot deploy --changelog-file docs/release-notes.md
```

Do not add `--public` or run `rundot game set-public` without approval. RUN private/unlisted deployments are accessible to anyone given their share link, but are not listed publicly in Explore; the share link is not an access-control boundary.

The [jam rules](https://events.run.world/events/octoberjam/) require public publication **and** a separate entry through Creator Hub. Publishing alone is not submission. The submission deadline is **3 November 2026 at 6:00 am Brisbane time** (2 November at noon Pacific). Voting opens **16 October at 5:00 am Brisbane time** (15 October at noon Pacific). This repository's design predates the jam; game implementation began on 9 October Brisbane time, after the permitted build window opened.

Git commits use `Daniel Andersen <zedar@zedar.org>`. If GitHub authentication is needed, use `~/.ssh/github.key`. No GitHub push is performed automatically.
