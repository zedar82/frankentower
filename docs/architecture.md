# Code structure and content authoring

The [14 October codebase review](codebase-review.md) records proposed correctness
fixes and restructuring priorities. It is a review plan; the boundaries below
describe the implemented architecture.

The game has one deterministic combat engine for the player, enemies, and
guardians. React renders it and dispatches build actions; the game modules do
not import React, browser APIs, audio, persistence, or telemetry.

Presentation follows [UI expectations](ui-expectations.md):
deliberate phone/desktop layouts, core screens and expanded workspaces without
scrolling, and tabs/pages for excess content. Keep presentation/navigation in
React. Satchel capacity belongs in validated inventory and surgery
operations, including final occupancy during swaps and displaced equipment;
it must not be enforced only by hiding or disabling UI elements.

## Where rules belong

| Module                                                 | Responsibility                                                     |
| ------------------------------------------------------ | ------------------------------------------------------------------ |
| `game/types.ts`                                        | Saved structures and the shared ability/effect vocabulary          |
| `game/content/items.ts`                                | Purchasable equipment, including level 3 signatures                |
| `game/content/enemies.ts`                              | Enemy equipment using the same effect vocabulary                   |
| `game/content/procedures.ts`                           | Surgery choices and structural changes                             |
| `game/anatomy-content.ts`                              | Slot physiology, anatomy variants, intrinsic limb abilities        |
| `game/sets.ts`                                         | Set membership and cumulative threshold bonuses                    |
| `game/body.ts`                                         | Anatomy counts, equipment ownership, and requirements              |
| `game/abilities.ts`                                    | Ordered assembly of equipment, limb, and set ability instances     |
| `game/anatomy.ts`                                      | Pure stat calculation and derived circulation/movement values      |
| `game/combat.ts`                                       | Simulation clocks, event queue, causal ancestry, damage resolution |
| `game/combat/effects.ts`                               | Execution of individual effect primitives                          |
| `game/combat/reactions.ts`                             | Reaction and ability-selector matching                             |
| `game/combat/spatial.ts`                               | Target geometry, movement, and attack poses                        |
| `game/inventory.ts`                                    | Validated purchases, transfers, swaps, combining, selling          |
| `game/shop.ts`                                         | Stock generation, freeze, shop upgrade, recovery, and costs        |
| `game/surgery.ts`                                      | Procedure eligibility, selection, and execution                    |
| `game/encounters.ts`                                   | Encounter composition and enemy builds                             |
| `game/run.ts`                                          | Starting, advancing, finishing, retiring, and run records          |
| `ui/hooks/useItemDrag.ts`                              | Pointer/native drag lifecycle and listener cleanup                 |
| `ui/Shop.tsx`, `ItemDetails.tsx`, `PatientSummary.tsx` | Presentation and inspection                                        |
| `ui/Equipment.tsx`, `Surgery.tsx`, `Reference.tsx` | Expanded equipment, procedure previews, help/history/catalogue/reports |
| `ui/Paging.tsx`, `Modal.tsx` | Viewport-aware text/grid pages and focused bounded workspaces |
| `save-validation.ts`, `save-writer.ts`                 | Save boundary validation and serialized retry/coalescing           |
| `platform.ts`                                          | RUN persistence and host integration                               |

`anatomy.ts` exposes the common body queries as part of its public build API.
Lower-level ability assembly imports `body.ts` directly to avoid a cycle through
stat calculation. `content.ts` is the catalogue entry point, not a registration
system with import-order side effects.

## Adding content

Equipment uses named fields, not positional arguments. Add an `item({...})`
definition with metadata and any of `stats`, `cooldown`, `effects`, `reactions`,
and `lv3`. Its price defaults from rarity but can be explicitly authored.

An intrinsic limb ability belongs in
`VARIANT_DEFINITIONS[variant].abilities[slot]`. It uses `AbilityDef`, the same
behavioral definition as equipment, and does not need a synthetic inventory
item, a shop price, or an exception in combat. Ordinary limbs provide structure
and physiology only. Mana-dependent heart capacity belongs in the heart
physiology definition, not in the effect executor.

A set belongs in `SET_DEFINITIONS`: a membership tag plus threshold abilities.
Every reached threshold applies once and stacks with earlier thresholds. Set
abilities can provide static stats, timed effects, and event reactions. They
remain level 1, so equipment upgrades do not multiply a set bonus.

Ability instances identify their source as `item`, `limb`, or `set`. Item
instances retain the equipment UID; limb instances include the owning part UID;
set instances include the set and threshold. Combat keys also include the actor
ID. This keeps repeated limbs, duplicate equipment, and opponents independent.

Selectors filter by type, tag, slot, and optionally source. By default, triggers
target equipment and intrinsic limbs, preserving their existing behavior; set
passives are excluded unless selected explicitly with `source: 'set'`,
`source: 'any'`, or `self`. Reactions can filter their event source similarly.
Use an explicit reaction `id` when an ability has several named passive rules.

The effect union requires the fields appropriate to each primitive: a stat
effect requires a stat name, damage has optional attack fields, and triggers
have selectors rather than damage amounts. Add a new primitive to that union
and the effect executor only when the existing vocabulary cannot express a
rule. Do not dispatch by item names, anatomy names, or set names inside combat.

## Invariants and verification

- All randomness goes through the seeded `Random` instance. Definition order
  determines resolution order; do not introduce unordered registration.
- Each causal branch receives a new ancestry array. Sibling branches are
  independent. Own-hit/own-crit passive effects may resolve without counting a
  second activation of their source.
- Runtime stat effects accumulate in the actor's modifiers. Dynamic circulation
  recomputation includes those modifiers, including when necrotic hearts stop.
- Inventory operations validate ownership, phase, price, slot compatibility, and
  anatomy before mutating state. Complete a swap before clamping HP.
- Stock generation and surgery selection are separate RNG operations. Frozen
  stock does not prevent a scheduled surgery visit from getting new choices.
- Until public release, incompatible saves reset; do not add migration code.

Run `npm test` and `npm run build` for rule changes. The ability regression tests
exercise new source types, set timers/reactions, and dynamic modifiers alongside
the existing deterministic combat and buildcraft tests. Browser checks need the
offline Vite server. Use `npm run format` with file paths to format touched code.

`App.tsx` still coordinates the run flow, combat animation loop, and less-used
dialogs. Extract a new screen or controller when it gains independent behavior;
avoid moving state into an all-purpose manager or introducing a second rule
engine for UI previews.
