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
- Buy items to fill empty compatible sockets automatically. Further purchases go into the tray.
- Select equipped items to unequip or combine them. Two identical items at the same level make one item at the next level. Level 3 adds a signature effect.
- Select a tray item to equip, swap, combine, or sell it.
- Surgery opens every five floors: choose one procedure per visit. Amputation returns equipment to the tray.
- Enter a room to fight automatically. Pause and inspect opponents, or change speed to 1×, 2×, or 4×.
- Space enters a room or toggles combat pause. Auto-climb stops at surgery visits and checkpoint results.
- At floors 20, 40, 60, and 80, retire to replace the checkpoint guardian or risk continuing. Floor 100 preserves its champion automatically.

## Implemented first-pass scope

- Deterministic spatial combat shared by players, authored enemies, and saved guardians: positions, nearest-target acquisition, pursuit, orbiting, soft body separation, and a circular arena boundary.
- Melee strikes require reach; ready weapons wait while approaching. Ranged and magical attacks have longer reach, and ranged-only fighters retreat from nearby threats. Leg count determines physical movement speed.
- Pixel-art dungeon arena with an illustrated paper-puppet creature prototype: a growing stitched torso, a painted socket and matching joint pin for each graft, front-facing heads seated in the collar, visible limbs, and arms that swing across the body. Limb motion pivots on the attachment rather than moving it; equipped weapons follow the hands. Creatures also show gait, recoil, death poses, attack arcs/projectiles, damage numbers, Shield breaks, critical feedback, and brief hit-stop on large impacts. Reduced-motion preferences suppress shake and cosmetic gait motion.
- 51 equipment definitions across five rarities, with timers, tags, generic selectors/effects, duplicate upgrades, and Level 3 signatures.
- Mutable Hand, Head, Foot, Chest, and Heart sockets; anatomy-derived HP, Mana, circulation capacity and load.
- 14 surgical procedures, including arm/head/foot grafts, amputation, arm-to-head conversion, clockwork arms, Mana-fed necrotic hearts, serpent heads, and headless neural control.
- Continuous circulation penalties; triggers and direct remaining-cooldown changes bypass slow natural clocks.
- One-attack Shield, flat Armour, penetration-triggered Bleed, decaying Poison, uncapped chance and additive critical tiers.
- Octopod set thresholds and anatomy-derived identities.
- A 100-floor budget-generated campaign, seven enemy archetypes, five authored checkpoint guardians, and personal Legacy replacements.
- Hall of Shame, final-build records, four anatomical challenge achievements, equipment contribution reports, and causal-chain transcripts.
- Creature-centred equipment room with anatomical sockets, a timber supply counter, a clinical surgery view, a compact combat HUD, responsive mobile camera, sound, safe areas, host pause/resume handling, and cloud saves.
- Custom RUN analytics for purchases, upgrades, rerolls, procedures, equipment choices, fights, retirement, and run outcomes.

The design's later addendum explicitly defers community publishing, Fame, public reactions, and a shared boss repository. Those are not simulated or presented as live features here. The newer visual direction supersedes the original movement deferral. Ordinary floors reuse a circular room; props are decorative and do not block movement or line of sight. The room and equipment icons retain their procedural pixel style; the creature cutouts are an early illustrated art experiment, not final production art.

## Architecture

| File | Responsibility |
| --- | --- |
| `src/game/content.ts` | Declarative equipment, effects, reactions, and procedures |
| `src/game/combat.ts` | Fixed-step simulation, event queue, branch ancestry, damage and resources |
| `src/game/anatomy.ts` | Anatomy, sockets, derived stats, and identities |
| `src/game/run.ts` | Seeded shops, economy, grafts, encounter budgets, checkpoints, and retirement |
| `src/platform.ts` | RUN storage, analytics, safe areas, and lifecycle events |
| `src/App.tsx` | Build/combat screens, inspection, records, and player controls |
| `src/ui/Creature.tsx` | Responsive modular creature portraits |
| `src/ui/Arena.tsx` | Arena rendering, effects, mobile framing, and dressing room |
| `src/art/pixel.ts` | Pixel dungeon, props, equipment icons, and creature rendering entry point |
| `src/art/puppet.ts` | Measured artwork pivots, fabric seams, growing creature layout, fitting, and puppet animation |

[Prototype art notes](docs/art-prototype.md) record the torso edit, sprite connection points, and composition checks.

`public/thumbnail.jpg` is the required 512×512 RUN thumbnail. `node scripts/render-thumbnail.mjs` renders it from the game's own pixel dungeon and creature. RUN text generation is explicitly disabled in `rundot/textGen.config.json`; this game makes no inference calls.

Each timed or triggered activation carries an immutable branch ancestry containing item-instance IDs. An instance cannot activate again in the same branch; siblings remain independent. Passive effects such as an item's own-hit rule execute within that activation and have their own once-per-branch reaction guard. An emergency event budget reports a simulation failure instead of freezing. Battles enter explicit attrition after 90 simulated seconds.

If a session closes during combat, the save resumes at that floor's build phase with its pre-fight HP and the same encounter seed. Completed fight outcomes and purchases are persisted through RUN storage. Content snapshots include the ruleset version.

## Validation

```sh
npm test
npm run build
npm run balance
```

Tests cover defence/status semantics, chance overflow, branch-local recursion, duplicate instances, own-hit/own-crit passives, circulation, necrotic capacity, deterministic replay, shops, surgery, retirement snapshots, outcomes, four different prepared late-game builds, melee reach, physical movement, leg-count speed, target selection, ranged spacing, heavy wind-up, and arena bounds.

`npm run balance` runs a deliberately simple shop/surgery bot across sixteen seeds per strategy. It is a diagnostic, not a guarantee that a build is purchasable or that a new player can complete the tower. Prepared Blood, Mana, Shield, and Poison engines pass the late-game encounter tests. The spatial rules change pacing and encounter balance; the old stationary-combat bot results are no longer a release benchmark. Economy, content availability, and human comprehension still need external playtesting before public release.

Browser checks (start the relevant server first):

```sh
node scripts/browser-check.mjs
node scripts/arena-check.mjs
node scripts/puppet-check.mjs
node scripts/playground-check.mjs
```

They use installed Google Chrome on macOS, exercise actual controls and cloud persistence, and write screenshots to `/private/tmp`.

The puppet check verifies actual canvas pixel connectivity from the torso to arm, hip and neck pins, sleeves, boots and faces across six anatomies and idle, walking and attack poses. It writes a comparison sheet to `/private/tmp/frankentower-puppet-composition.png`. The offline browser, arena and puppet scripts accept `FRANKENTOWER_LOCAL_URL` for a local server running on a different port.

`scripts/hosted-check.mjs` tests a deployed private version when `FRANKENTOWER_PREVIEW_URL` is supplied. It waits for RUN's visible game frame, exercises a purchase and combat, and checks cloud persistence after reload. For browser testing, use the private catalog URL with its `tag=private` and `k` share-key parameters to avoid the mobile deep-link handoff. Keep the share link out of source control.

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
