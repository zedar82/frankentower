# Codebase review — 14 October 2026

Reviewed production code at `447803c`, following the project architecture,
visual direction and UI expectations. Private runtime at this checkpoint is
1.8.21. This is a source review and improvement plan, not implementation or
release acceptance. No tests, balance campaigns, browser checks or performance
benchmarks were run for this review. Behavioral findings below come from the
current call paths; performance recommendations still need measurements.

## Assessment

Keep the current game architecture and improve it incrementally. The shared
deterministic combat engine, declarative ability vocabulary, atomic inventory
operations, RUN persistence and modular art interfaces are useful foundations.
The largest flexibility gains are clearer application ownership, one validated
art catalogue, simpler screen styling and less repeated work during simulation
and rendering. Fix the correctness issues below before broad restructuring.

### Coverage

| Area | Reviewed | Assessment |
| --- | --- | --- |
| Rules and content | Types, anatomy/body, abilities, sets, all item/procedure/enemy definitions | Preserve the shared vocabulary; validate authoring and reduce duplicated facts. |
| Combat | Queue/ancestry, effects, reactions, movement, attack timing | Preserve resolution order; clarify termination and targeting. |
| Campaign | Inventory, surgery, shop, encounters, progression, identities | Atomic capacity checks are sound; improve command results and encounter authoring. |
| Application | App coordination, frame loop, navigation, dialogs, startup/recovery | Extract separate controllers with explicit ownership. |
| UI | Shop, surgery, equipment, inspection, reference, paging, modal/focus, drag | Keep bounded workspaces; consolidate screen modes and CSS. |
| Rendering | Puppet layout/drawing, item placement, portraits, canvas sizing, arenas/rooms | Use validated profiles, shared bounds and revision-based caches. |
| Persistence/audio | Save parser/writer, RUN lifecycle integration, offline adapter, sound | Preserve retries and production storage exclusion; keep host behavior out of rules. |
| Tooling | Active asset registration/generation/capture workflow, balance harness, unit/browser checks, CI, build configuration | Existing CI is present; extend its coverage and improve diagnostic reliability. |
| Documentation | Architecture, design/visual/UI briefs, handoff and release guidance | Distinguish current guidance from historical checkpoints. |

Historical generation experiments and binary artwork were not exhaustively
reviewed for visual quality. Dependency versions, RUN service behavior and
physical phone performance were not audited.

## Priority list

P1 means a correctness issue to resolve first. P2 means valuable near-term
work. P3 means a smaller follow-up or an extension point to prepare when needed.

| Priority | Work | Why |
| --- | --- | --- |
| P1 | Guarantee a terminal combat outcome | Fixed attrition can be out-healed. |
| P1 | Preserve an honest completed-fight report | Reload replaces the original simulation with a fresh preview. |
| P2 | Define targeting across an activation | Follow-up effects can silently switch opponents after a kill. |
| P2 | Correct balance diagnostics | Floor 100 losses count as completions; failures and blocked purchases skew results. |
| P2 | Validate content and derive factual descriptions | Procedure prose already contradicts its data. |
| P2 | Extract run/session and combat controllers | App still owns game-specific recovery/completion callbacks. |
| P2 | Create one validated presentation catalogue | Drawing, bounds, loading and generators currently maintain overlapping contracts. |
| P2 | Handle asset readiness per asset/group | One failed image can disable unrelated artwork or abort the game UI. |
| P2 | Consolidate responsive styling and display modes | Successive overrides and duplicate breakpoint logic make changes hard to reason about. |
| P2 | Compile/cache stable build and rendering data | Complete stats and puppet geometry are rebuilt frequently. |
| P3 | Give commands structured results and reusable plans | UI, previews and tools need consistent failure reasons and consequences. |
| P3 | Separate combat events, reports and status attribution | One truncated log currently serves several consumers; Poison remembers only an actor. |
| P3 | Consolidate review tools and current documentation | Recent capture scripts bypass the portable browser helper; some prose describes obsolete art. |

### Implementation status

Implemented and committed locally: terminal stalemate victories, locked action
targeting, saved completed-fight reports, corrected balance diagnostics,
build-time content validation, static combat previews and one shared display-
mode subscription. The development ruleset is now `frankentower-4`. Per-asset
readiness and modular geometry validation are also implemented locally.
CSS consolidation and full compiled combat stats remain planned work.
The item presentation catalogue now covers every equipment slot. Fight
completion now rejects repeated calls after the combat phase. Puppet layout has
a content-signature cache that handles in-place
build edits and geometry readiness changes. Combat now precomputes each actor's
mana-positive and mana-depleted capacity, avoiding full stat reconstruction on
every simulation step; broader profiling and render optimization remain.

## 1. Combat can continue indefinitely — P1

**Evidence:** `src/game/combat.ts:410`, `src/game/combat.ts:423`,
`src/App.tsx:233`, `src/game/content/items.ts:170`,
and `src/game/content/items.ts:552`.

After 90 seconds, attrition removes a fixed 2% of maximum HP per second. It is
ordinary HP loss and healing remains active. For a normal 1000-HP body, that is
20 HP/s. A level-3 Bandaged Cap heals 192 every four seconds, averaging 48 HP/s
at normal circulation. Two such builds with 60 Armour and level-1 daggers can
block each other's attacks and sustain attrition. Personal guardians make
opponents with player-style healing a real supported case.

`runToEnd(160)` used to stop iterating at its horizon without marking an
unresolved simulation as terminal. The interactive loop had no corresponding
horizon and could wait for `combat.done` indefinitely.

**Agreed policy — 14 October:** Daniel considers an extended unresolved fight a
player win if the player is still alive. Resolve it through normal victory
rewards, recovery and progression, including checkpoint/final-floor behavior.
The first engine implementation uses a named 160-second timeout as a tuning
point; this duration remains adjustable after playtesting.

**Implementation:** the shared engine now ends unresolved fights at the named
timeout as a stalemate victory for a living player. `outcome` distinguishes
stalemate, ordinary victory, defeat, failure and ongoing combat. Simulation-
budget failures retain their separate pre-fight recovery behavior. A deliberately
short `runToEnd` horizon can still return before the game timeout without
inventing a result. Saved report metadata is handled in the next implementation
stage.

**Regression coverage:** a living player receives a stalemate outcome at the
shared timeout, while a short diagnostic horizon stays unresolved. Follow-up
coverage should verify App recovery for engine failure and ordinary player death.

## 2. Completed reports become fresh previews after reload — P1

**Evidence:** `src/App.tsx:74–87`, `src/game/types.ts:151`,
`src/game/run.ts:79`, `src/ui/Reference.tsx:219–276`.

The completed `Combat` survives only in a React ref. Saves retain progression,
HP and enemy builds, but not duration, contributions or transcript. Reloading a
result/checkpoint/death/completion creates a new `Combat` with the current
build and current HP. The report then uses its initial counters and logs as
though they describe the completed fight. This affects report accuracy, not
the saved reward calculation.

**Recommendation:** store a bounded immutable last-fight report at completion:
outcome, seed/floor, duration, contribution totals, relevant final actor data,
and a bounded transcript with an explicit truncation indicator. Make Report
consume that snapshot; make live inspection consume a separate live view.
Never synthesize historical results from a preview. If reports are deliberately
session-only, say they are unavailable after reload instead of showing new
statistics. A changed save shape can bump the development ruleset and reset
incompatible saves; no migration layer is needed.

**Implementation:** `Run.lastReport` stores a bounded end-of-fight snapshot with
outcome, seed/floor, patient and enemy state, item contributions, suppression
count, and the last 400 transcript entries. The transcript marks truncation
explicitly. The report screen reads only this snapshot, including after reload;
it no longer presents a fresh preview as historical data. The save ruleset was
bumped so incompatible development saves reset without migration.

**Regression coverage:** a completed report survives save reload with its
outcome and final patient state intact.

## 3. An activation can change targets between effects — P2

**Evidence:** `src/game/combat.ts:100`, `src/game/combat.ts:198–236`,
`src/game/combat/effects.ts:53–56`.

Before implementation, activation checked reach against one opponent, but each
effect resolved its own living target. A damage effect could kill opponent A,
then a Bleed/Poison effect could choose opponent B.

**Agreed policy — 14 October:** each item declares single, fixed-count or
area/radius targeting. Daniel confirmed that range means a spatial area.
Targets are selected once when an action is made, then locked through its
completion. All hostile effects in that action use that target set; a dead
target is not replaced, and actors entering an area later are not added.
Whirlwinds centred on the wielder and magical explosions around a chosen impact
point are desired examples. Owner-directed support effects retain their owner.
Attacks cannot miss: moving out of the original range/area after selection does
not invalidate a hit on a living locked target. Skip remaining hostile effects
on targets that die during resolution, without replacement; continue resolving
other living targets in the set. Normal Armour/Shield rules still apply.

**Implementation:** shared ability and reaction definitions now support single,
fixed-count and area targets. Count acquisition takes the nearest eligible
targets, up to the requested count. Targeted area attacks select their center
when the action starts; the existing all-enemy items use a radius covering the
arena. Hand strikes lock their set when the forward stroke begins. Jobs carry
the selected IDs through resolution; effects skip dead members without
replacement, while living members remain hittable after movement. This keeps
the deterministic engine shared by players, enemies, limbs and set abilities.

**Regression coverage:** damage-plus-status does not switch targets after a
kill; fixed-count and area selection use the declared set; committed strikes
hit a living target after it leaves reach; branch-local ancestry tests still
pass.

## 4. Balance output needs correction before tuning — P2

**Evidence:** `scripts/balance.ts:113–127`, `scripts/balance.ts:179–204`.

- `completed` counts final floor numbers equal to 100, including death on floor
  100. Count terminal victory/complete state instead.
- A simulation failure is counted separately, then still passed to
  `finishFight` as an ordinary loss. An unresolved horizon is also treated as a
  loss. Separate these diagnostic outcomes from player defeat.
- The bot ignores `buy()`'s result and buys into the stash before equipping.
  With a full satchel, that purchase can fail even when a direct purchase into
  an empty compatible slot would succeed. It never sells obsolete equipment
  to free capacity. This weakens conclusions about attainable progression.
- It loops over six offer positions although stock has four. Iterate actual
  offers and use the same validated transfer primitives as the player.

**Recommendation:** separate campaign execution, purchasing strategy and
reporting. Record blocked purchases, satchel occupancy, spending, enemy
composition and the actual termination reason. Preserve seeded reproducibility.
Treat bot performance as diagnostic evidence rather than a difficulty verdict.

**Implementation in progress:** the runner now iterates the actual offer list,
records blocked purchases/transfers, sells a lower-value stash item when a full
satchel would otherwise block an intended acquisition, and uses direct
purchases for empty compatible slots. It reports gross gold spent, satchel
occupancy, deaths, true final-floor completions, stalemates, unresolved runs and
engine failures separately. Failed and unresolved simulations no longer become
player deaths.

## 5. Content validation and factual prose — P2

**Evidence:** `src/game/content/procedures.ts:125–140`,
`src/game/anatomy-content.ts:51`, `src/game/content.ts:9`,
`src/game/content/helpers.ts:22`, `src/ui/ItemDetails.tsx:39`.

Osseous graft previously said "Replace 10 Chest" and "add 10 Hand" while its
counts were one. Its quote also claimed no circulation, while the bone variant
receives normal slot load. The count text now matches its data and the
circulation claim has been removed. Skeletal circulation and item-balance
decisions remain deferred; current rules and values were preserved.
More generally, timers, amounts, requirements, signatures and procedure
consequences have separately authored prose. The effect summary already derives
much of its information from rules; extend that pattern for factual details.
Keep names, flavor quotes and deliberate explanations authored by hand.

Duplicate item IDs now fail before ITEM_MAP creation. validateContent() is part
of the build and checks item rarity/price/slot/type, finite rule values,
cooldowns, target shapes, selector contradictions, duplicate explicit reaction
IDs, set thresholds and procedure counts/variants. Item definitions default to
explicit single-target metadata. The catalogue remains mutable because existing
combat tests add definitions directly; fixture injection should precede any
future move to readonly/frozen definitions.
## 6. Extract application ownership — P2

**Evidence:** `src/App.tsx:37–106`, `src/App.tsx:184–307`,
`src/App.tsx:515–729`.

App owns a mutable Save ref, forced renders, combat objects, previews, the
simulation clock, audio/hit-stop, persistence, analytics, phase navigation,
equipment and several independent overlay states. New screen behavior requires
understanding all of them. Creating a simulation during render also executes
start reactions for what is meant to be a preview.

Suggested boundaries:

- `useRunSession`: current save/run, validated command dispatch, revision,
  persistence scheduling and action analytics. Preserve existing pure rule
  modules as the authority.
- `useCombatSession`: fixed-step clock, start/finish/recovery, pause/speed/host
  state, bounded render notifications and combat feedback consumption.
- Screen navigation: explicit shop/clinic/combat/outcome transitions. Use a
  single overlay union for application overlays, with clear ownership of local
  subviews. Decide whether clinic navigation resumes or intentionally resets on
  reload.
- App: compose screens and connect their intents to those controllers.

Extract one boundary at a time. Keep presentation navigation out of combat and
avoid an all-purpose manager. Build static previews from build/layout data;
instantiate Combat only for a fight or an explicit simulation study.

**Implementation:** preview actors now come from a shared formation builder and
are exposed through a read-only `CombatView`. Rendering a preview no longer
constructs the combat engine or runs start reactions. `useRunSession` now owns
the mutable save/run reference, missing-run initialization, React refresh,
persistence scheduling and common action analytics. `useCombatSession` owns the
fixed-step clock, pause/visibility checks and hit feedback. `useFightLifecycle`
owns simulation failure recovery and completion, including report capture, rule
transition, sound, telemetry and persistence. `useRunNavigation` owns the
primary-screen state and phase synchronization. It deliberately restores a
saved build to the shop after reload; clinic navigation remains transient, and
the saved `operated` rule still prevents repeating surgery. App continues to
connect user intents to these boundaries. App supplies the lifecycle's
navigation, error UI and preview invalidation callbacks. `useAppOverlay` stores
modal, item, equipment, build-inspection and fight-recovery views as one
exclusive union; item paging remains local to its inspector.

## 7. One presentation catalogue — P2

**Evidence:** `src/art/item-assets.ts:18–159`,
`src/art/item-assets.ts:251`, `src/art/item-assets.ts:295`,
`src/art/modular-puppet.ts:15–76`, `src/art/modular-puppet.ts:209`,
`scripts/generate-modular-study.mjs:35–135`, `src/ui/Arena.tsx:215`.

Asset names, geometry, material mapping, image crops, attachment landmarks,
layer rules and tint heuristics are spread between the generator, runtime JSON
and TypeScript. Held attachment/bounds selection follows the icon archetype,
while drawing can select a per-item image. A future differently shaped weapon
would inherit another asset's grip/frame. Item IDs also choose colors by
substring, and enemy names choose some presentation scaling.

Define a presentation catalogue with discriminated profiles for held, crown,
footwear, torso and organ art. Each profile should declare its asset/crop,
source-pixel landmarks, logical envelope, layering/coverage and explicit
material treatment. Link content IDs to those profiles without adding named
exceptions to combat. Drawing and bounds must consume the same resolved profile
and transform. Validate geometry roles: heads require crown/root, arms require
grip/root, legs require sole/root/ankle, with finite in-frame coordinates.

Keep the accepted direct joins, front-only headwear/footwear, capped tapers,
optional asymmetry and unrestricted material colors. Torso/organ equipment
should gain defined interfaces before further art is generated; accepted chest
icons are not currently a worn chest renderer.

**Implementation:** one discriminated presentation catalogue now maps every
content item to held, crown, footwear, torso or organ art. Held art resolves its
content ID into one profile containing grip, axis, frame, hand layer, image and
crop; drawing, bounds and hand-overlap order share that profile. Crown and
footwear profiles declare their front-facing coverage and attachment landmarks.
Torso and organ profiles establish their slot interfaces and explicitly record
that current art is icon-only. Build validation checks profile-to-slot roles,
finite landmarks and crops against the dimensions of existing PNG files.
Generator metadata and worn torso/organ renderers remain outstanding.

## 8. Asset loading and recovery — P2

**Evidence:** `src/art/item-assets.ts:159`,
`src/art/modular-puppet.ts:64`, `src/ui/Creature.tsx:29`,
`src/ui/Arena.tsx:39–49`, `src/main.tsx:125`.

At review time, all item images and modular parts participated in combined
decode promises. A failed unrelated image prevented modular readiness; derived
rejected promises could reach the global recovery screen. Four shop/clinic
backgrounds shared a single readiness flag, so one failed clinic background
hid available shop backgrounds. Merely returning false from a painter was not
a complete recovery path if the combined readiness promise had already rejected.

Use a shared loader keyed by asset URL with explicit loading/ready/error state,
named diagnostics, per-scene essentials, sensible optional fallbacks and a
targeted retry. Multiple footwear aliases can share one decoded asset. Validate
files and metadata before deployment, and prioritize assets needed for the
current screen. Keep an honest failure view for indispensable assets.

**Implementation:** item-image readiness now settles per file so one missing
optional icon uses its existing pixel fallback without rejecting the whole
group. Quartermaster and clinic backgrounds track readiness independently.
Modular geometry is validated for finite dimensions and required head crown,
arm grip, leg sole/ankle and root landmarks. A failed optional body sprite logs
its asset name and draws a material-colored fallback block; the geometry file
remains essential. Presentation images now deduplicate by art path within the
item-art catalogue, and build validation checks every catalogue PNG and crop.
A URL-keyed loader now owns item, modular-body, geometry and arena-scene requests.
It exposes loading/ready/error status, shares duplicate image requests, keeps
optional image failures isolated, and gives required geometry a targeted retry
action in recovery. Retry URLs bypass stale browser cache entries. Scene drawing
checks the readiness of the individual backdrop it needs; body and item drawing
retain their local fallbacks. A focused loader test verifies the original URL,
failure state, cache-busted retry and successful reuse. The loader does not yet
prioritize only the currently visible screen; all registered body and item art
is still requested during startup.

## 9. Responsive styling and display modes — P2

**Evidence:** `src/main.tsx:7–9`, `src/styles.css:173`,
`src/ui-materials.css:13–54`, `src/ui-workshop.css:13–49`,
`src/ui-workshop.css:655`, `src/ui-workshop.css:941`,
`src/ui-workshop.css:1128`, `src/ui/Paging.tsx:3`, `src/ui/Shop.tsx:46`.

Three global sheets repeatedly style the same components. Workshop rules still
include an older single-offer composition, followed by overrides for four
compact offers. Header framing is introduced and then removed in a later sheet.
JavaScript and CSS separately encode compact, phone, short and landscape cases;
each `useDisplayMode` consumer installs its own resize listener.

Consolidate styles by screen/component with clear base, material and responsive
ownership. Remove superseded selectors only after checking their consumers.
Centralize spacing, control sizes, frames and typography as tokens. Prefer
container-aware layout where a component's allocated space decides fit; expose
one shared display-mode subscription for genuinely different interactions.
Retain deliberate phone/desktop modes and the existing no-scroll rules.

**Implementation:** `useDisplayMode` now reads one shared viewport snapshot and
uses one resize subscription for all consumers. The shop's landscape threshold
is part of that snapshot. Unused single-offer and four-offer layout overrides
were removed after checking that the live shop uses the compact-offers layout.
Short-landscape build summaries now constrain the creature pane while preserving
the paged text region's stretch sizing. The browser fixture now supplies a
validated report snapshot when it exercises saved report sections. The existing
browser suite passed after these changes, including the short-landscape report
layout case. The broader style ownership cleanup and responsive rule
consolidation remain.

Use the current browser/zoom/safe-area coverage as the regression gate for
each extraction. Do not treat CSS cleanup as visual acceptance. Pagination's
fixed row-size contracts also need to remain explicit and tested with long names
and larger text as content expands.

## 10. Cache stable computation, then measure — P2

**Evidence:** `src/game/combat.ts:341`, `src/game/anatomy.ts:41–59`,
`src/game/combat/effects.ts:138–147`, `src/ui/Arena.tsx:218–244`,
`src/art/modular-puppet.ts:315`, `src/art/modular-puppet.ts:381`.

Every simulation step recalculates complete anatomy stats for each living
actor, including rebuilding abilities and recounting sets, then uses only
capacity/efficiency from that result. Runtime stat changes repeat the full
calculation several times. At draw time, camera bounds independently request
the same puppet bounds for four extrema, followed by further layout work for
targets, actors and HP bars. Trunk patterns and paths are rebuilt during drawing.
Room/arena cosmetic loops continue scheduling frames while hidden or host-paused.

Compile a stable build snapshot once per fight: abilities, counts, set
membership and base physiology. Keep Mana-dependent hearts and runtime modifiers
as explicit dynamic inputs. Cache resolved art/layout/bounds/patterns by a build
revision and asset-catalogue revision. Current builds mutate in place, so a cache
keyed only by Build object identity would be wrong after equipment or surgery.

**Implementation:** modular puppet layouts now cache by the current ordered part
slots, variants and held-item icon profiles, plus resting mode and geometry
revision. This captures in-place anatomy/equipment changes and the transition
from fallback to loaded geometry. Combat actors also cache the two stable capacity
totals that vary with mana; each step applies the live capacity modifier and
recomputes circulation efficiency from current load. Stat effects still perform
a full recalculation when needed. Camera/render work reduction, cosmetic
scheduling changes and representative-device profiling remain open; no
performance budget is claimed yet.

Separate static room drawing from animated feedback, and honor visibility/host
pause in cosmetic scheduling. Profile representative phones and dense/many-limb
builds before setting budgets or adding worker/atlas complexity. Preserve seeded
RNG order and numeric results through every optimization.

## 11. Smaller flexibility improvements — P3

### Structured command results and plans

`inventory.ts` already validates complete occupancy before mutation. Preserve
that. Return a typed result with a stable reason code, affected IDs and relevant
consequences instead of bool-only success plus separately recomputed strings.
Use a reusable surgery plan for removal, displacement, additions and validation;
replace `ignoreMoney`, which actually skips several visit constraints, with an
explicit availability context. Add transition guards to completion commands
so future callers cannot award a fight twice. These changes can stay local to
existing modules. `finishFight` now accepts calls only during combat and returns
whether it applied a terminal result; duplicate callbacks cannot award rewards
or records again.

**Implementation:** surgery now builds one `procedurePlan` for anatomy changes,
equipment displacement and eligibility. The patient preview, availability
message and operation consume the same projected removal set. Procedure stock
uses an explicit `stock` access context that skips visit, phase, gold and satchel
constraints while preserving anatomical validity checks. `operateResult` gives
the caller a clear failure message or the removed and displaced IDs; the App
shows failed command reasons. Inventory move, purchase, equip, unequip, sale and
combine operations now have structured result APIs with stable failure codes
and messages. Successful results report affected item IDs and gold deltas where
applicable; the item inspector displays rejected actions. Boolean wrappers stay
for existing diagnostic callers. `planItemMove` now resolves eligibility, gold
cost, displaced equipment and final satchel count. The equipment UI uses that
plan for slot feedback, while commands reapply a fresh plan before mutation.

### Events, reports and attribution

`Combat.log()` keeps only 400 entries, but Report promises a complete transcript.
Make truncation explicit. App audio, Arena effects, contribution reports and
human-readable transcripts currently inspect the same mutable log. A sequenced
structured feedback stream and an independently bounded transcript would give
each consumer clear ownership without making telemetry part of combat.

**Agreed stacking policy — 14 October:** Poison applications combine into one
pool per affected creature, with combined damage and decay. The current numeric
stacking already does this. Do not split gameplay pools or create extra ticks
to implement source attribution.

Poison stores only `poisonOwner`, not the contributing ability. Tick damage
contributes to the actor total but not an item total; `poisonTick` has no source
for source-filtered reactions. Ownership, damage/kill credit and multi-source
reaction routing remain questions for the later status/report pass. Keep that
bookkeeping separate from the agreed combined-pool gameplay.

### Authoring and tool consistency

Move encounter anatomy, stats, equipment and presentation keys into stable enemy
profiles. Rename a displayed enemy without changing its body or render scale.
Keep encounter generation as the seeded budget selector over those profiles.

Have current capture/registration tools use `scripts/browser-support.mjs` for
browser selection and output configuration; newer captures and generators still
default to a Windows Chrome path and differing localhost ports. Consolidate the
active RUN generator runner and manifest validation while retaining historical
prompts, accepted/rejected source provenance and costs. Review board generation
remains separate from pass/fail checks. Record which catalogue/commit a board
actually depicts.

The README's stale painted-socket and broad art-ownership description has been
corrected. Older roadmap evidence has dates and should remain historical; point
contributors to one current status/handoff instead of accumulating conflicting
completion claims. Existing offline and manual private-host CI workflows are
present and worth retaining. Extend them with catalogue validation and the
targeted cases above when implementing; no replacement test framework is
necessary.

**Implementation:** modular-body and footwear capture scripts now share
`browser-support.mjs` for browser selection, local URL configuration and
artifact-directory configuration. Their prior fixed Chrome executable paths
and separate default Vite ports are removed. README now describes direct graft
joins, optional material mismatch, front-only gear and the current stalemate
rule. The dated production roadmap remains a historical checkpoint. The RUN
generator runner/manifest still needs consolidation.

## Suggested implementation sequence

1. Guarantee combat termination; correct diagnostic outcome classification.
2. Make completed reports accurate after reload; fix factual content prose and
   settle the activation-target policy.
3. Extract session/clock/navigation ownership with unchanged rule results and
   existing persistence/failure behavior.
4. Establish the validated art/content catalogues. Use those contracts before
   generating unique footwear, more headgear or worn torso equipment.
5. Consolidate CSS and display-mode ownership screen by screen.
6. Profile and optimize compiled stats, layouts and cosmetic scheduling.
7. Add the smaller command/event/authoring improvements as their callers grow.

Keep RUN as hosted persistence, the offline adapter excluded from production,
development save resets, one deterministic player/enemy engine, branch-local
ancestry, own-hit reactions, atomic satchel operations and no core scrolling.
This review does not call for a new renderer or simulation framework. Each
implementation step should have its own reviewable commit and the existing
appropriate checks; gameplay changes require unit tests and production build.
