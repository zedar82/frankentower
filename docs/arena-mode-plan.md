# Arena Mode — review and implementation plan

Reviewed 15 October 2026 against `d5ba318` and the installed RUN SDK 5.29.1.
The [original proposal](arena-mode-proposal.txt) is preserved unchanged.
This document recommends behavior and work; it does not mark the feature as
implemented or the open design decisions as agreed. No gameplay or platform
configuration changes accompany this review.

## Assessment

The game is well suited to asynchronous build battles. Anatomy, equipment,
abilities, presentation and seeded combat already work for player-shaped
opponents. Preserve those systems. Introduce an encounter provider and
mode-aware progression around the existing game, rather than a second game
loop or PvP combat engine.

The shared service is the largest uncertainty. Immutable daily snapshots,
trusted progression, durable match assignment and an atomic frontier claim
are more demanding than uploading a build and browsing for an opponent. Prove
that RUN can supply those guarantees before committing to a hosted architecture.
A client-only prototype can test the rules, but cannot establish competitive
integrity or reliable community frontier ownership.

## Important corrections and decisions

| Issue                                 | Recommended initial behavior                                                                                                                                                                                                                                                                               |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Submission before lookup              | Freeze the entry build first. The service selects from previously admitted snapshots and admits the new snapshot in one operation, before combat. The current submission cannot match itself. Losing entrants remain in the pool.                                                                          |
| Two players reach the same empty day  | Serialize frontier claims. Exactly one establishes that day; the other receives the newly admitted build as an opponent. A request retry returns its original decision.                                                                                                                                    |
| Only the player's own snapshots exist | This is an established day with no eligible opponent, not unexplored territory. Try an eligible same-stage Tower fallback within the proposed early-day band; otherwise return a retryable no-opponent state. Do not award a second frontier victory.                                                      |
| Starting from an empty Arena          | An unseeded Arena ends the first run on Day 1. With strict self-exclusion, one account cannot bootstrap it alone. Prefer compatible Tower floor snapshots as explicitly sourced early-day seed opponents; keep declared developer seeds as a private-test option. The fallback depth remains to be agreed. |
| What state a defender starts with     | Capture entry HP as well as the build; use that HP when reconstructing the defender. Refill Mana and reset combat-only state for both sides exactly as normal combat does. Full-health defenders would be a different policy and need an explicit decision.                                                |
| Frontier completion                   | End the run once the service acknowledges the first snapshot for that day. Record a frontier achievement, not a fabricated fight, kill or battle report. Do not award combat gold or victory healing for an unfought encounter.                                                                            |
| Timeouts                              | Retain the current 160-second victory for a living challenger initially. This favors the challenger, including against an identical defender. Measure stalemates; changing this policy would be an explicit balance decision.                                                                              |
| Day 20/100                            | Arena has no guardian checkpoint, retirement-to-Legacy flow or Day 100 ending. Keep the existing reward formula, including its every-20-stage gold bonus, and surgery every fifth day. Tower remains unchanged.                                                                                            |
| Historical gaps                       | Deleting/quarantining all opponents on an established day must not create a new frontier win. Retain a monotonic established frontier and recover missing pools separately.                                                                                                                                |

These are recommendations where the proposal is ambiguous. In particular,
entry HP, the Tower fallback band/self-only behavior, frontier rewards and the challenger-favored
timeout should be settled before implementing their affected paths.

Normal losses still end a run. A service outage, authorization failure,
incompatible pool, malformed candidate, quota failure or an exhausted page of
search results is never evidence of an empty frontier day. Opponents must come
from the same day and compatible pool; do not silently widen the day filter or
insert generated encounters during a service error.

## Tower-build fallback

Daniel suggested using regular-mode builds when Arena builds are scarce on
15 October. This is a proposed refinement; the early-day range and collection
policy are still open. It can bootstrap the Arena with actual player creatures
and reduce the need to author separate seed opponents.

Recommend the following first version:

- Prefer eligible Arena snapshots. If none are available, use a compatible Tower
  snapshot from Floor N for Arena Day N within an explicitly configured early-day
  band. A broader minimum-variety threshold can follow playtesting.
- Capture Tower builds at the same pre-fight point, including entry HP. Keep
  losing entrants eligible. Do not substitute a later retired/final build for an
  earlier floor, or change its strength to fit that floor.
- Apply the same version, legality and owner-exclusion checks to both sources.
  A pool containing only the challenger's own Tower and Arena builds still needs
  the waiting behavior. Record provenance in snapshots and receipts.
- Prepare a contiguous initial band of admitted Tower seed days and mark those
  days established before enabling it. Seed admission is distinct from an Arena
  frontier achievement. Missing or removed seed opponents require repair, not
  first-arrival awards. Tower fallback does not extend the Arena frontier beyond
  the configured early-day band.
- Capture new Tower snapshots without changing Tower combat or progression.
  Background collection failure must not block an ordinary Tower run. Existing
  saves do not retain every historical pre-fight build, so there is no complete
  early-floor archive to import automatically.
- Treat Tower snapshot collection and sharing as an explicit feature policy.
  Planning this fallback does not enable uploads or change game/pool visibility.
  Use the same admitted snapshot contract and RUN service boundary for both
  sources; a client save is not trusted merely because it came from Tower mode.

This keeps ordinary Arena opponents tied to the same progression stage while
allowing the early pools to benefit from Tower participation. Once an eligible
Arena opponent exists, the initial policy uses it rather than Tower fallback.

## Platform evidence and limits

Evidence comes from the installed package, not from calls to a live service.
All paths in this section are relative to
`node_modules/@series-inc/rundot-game-sdk/`. Re-check capabilities in a private
host before implementation relies on them.

| Existing RUN surface                                                                                           | What it establishes                                                                                                                                                                                             | What still needs proving                                                                                                                                                                                              |
| -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/rundot-developer-platform/runtime-environment.md` and storage declarations in `dist/index-Dexubh1n.d.ts` | `appStorage` holds per-player game data. `ownerStorage` and `sharedStorage` also share data for the current player across games. Storage offers a single-key compare-and-swap.                                  | None of these scopes establishes an app-wide opponent pool or global frontier lock. A CAS on one player's save cannot coordinate different players.                                                                   |
| `docs/rundot-developer-platform/api/PVP_SYSTEM.md`                                                             | Simulation recipes can store room actors, match rooms by metadata and fetch opponents while their owners are offline. Own rooms are excluded. Recipe execution has a nonce option in `SERVER_AUTHORITATIVE.md`. | The example replaces each player's latest board. Per-run/per-day immutable history, atomic frontier ownership, global absence and commit semantics across records are not demonstrated. Test their actual guarantees. |
| `docs/rundot-developer-platform/api/UGC.md`                                                                    | Indexed day/version fields, browsing, pagination and counts are documented. Owners can update/delete entries. Default quotas are 100 entries per player and 100 KiB per data payload.                           | Browse is a discovery surface, not a transaction. Client-created UGC is not inherently immutable or competitively validated. Endless daily submissions need a deliberate quota/retention design.                      |
| UGC declarations in `dist/index-Dexubh1n.d.ts`                                                                 | Ordinary `UgcCreateParams` has no `uniqueKey`. Cross-app creation does have one.                                                                                                                                | Do not assume ordinary create is idempotent, or use a cross-app method as a global frontier transaction without verifying its scope and authorization.                                                                |
| PvP outcome recipe                                                                                             | `validate_battle_outcome` compares reported outcomes with power estimates; documentation explicitly describes heuristic checks without replaying combat.                                                        | A power estimate cannot prove a Frankentower trigger build legal, reproduce an underdog win or verify progression. Do not introduce power-based matchmaking or reject legitimate combos to fit this heuristic.        |
| `ACCESS_GATE.md`, UGC visibility and Playground release-tag docs                                               | UGC mutations are login gated; public browse and platform-wide visibility are separate settings. Playground binds requests to a release tag.                                                                    | Verify the chosen backend's identity requirements, private tester access and data isolation. The documents do not establish that a private game automatically makes publicly browsable UGC private.                   |

Prefer the RUN simulation/PvP route for a prototype because it already models
asynchronous opponents. Keep its storage details behind an adapter. UGC may
serve a later discovery/export feature; do not use mutable public UGC as the
authoritative Arena registry by default. Do not add a separate external backend
or replacement login while RUN capability is unresolved.

The feasibility step must establish a RUN-side coordinator with authenticated
validation and atomic operations. If the available recipes cannot provide it,
record the specific missing capability and revise the scope or arrange RUN
support before proceeding with shared competitive play. Merely naming a new
endpoint does not make it available.

## Snapshot and match contracts

The following are proposed domain contracts, not claims about existing SDK
methods. Keep serialization bounded and explicit.

An admitted snapshot contains:

- Service-issued snapshot ID, immutable payload hash and creation time.
- Internal authenticated owner ID and a separate creature display name. Do not
  expose account names in the encounter UI by default.
- Service-issued source run ID, source mode, original floor/day, matched Arena day, rules/content version and pool generation.
  A run seed is not a unique run identifier.
- Canonical ordered body parts, variants, item definition IDs, instance IDs and
  levels, plus HP immediately before combat.
- A presentation version/key only where required to reproduce appearance.
  Current player appearance is derived from anatomy and equipment; do not accept
  arbitrary external asset URLs or generated artwork in this feature.
- A server validation/receipt reference tying the snapshot to legal progression.

Recompute derived stats and abilities using the compatible rules/content bundle.
Optional stored stat totals are diagnostics, not executable client authority.
Capture permanent effects when such a system exists; do not invent an unused
effects framework. Do not serialize live clocks, positions, attack poses,
modifiers, Shield, Bleed, Poison or remaining Mana from the previous fight.

A durable match receipt pins both combatant snapshots, their starting HP, day,
rules/content version, seed and engine step policy. Store a validated opponent
copy with the pending match so deletion or later pool changes cannot replace an
already assigned fight. Keep game balance versioning deliberate: content changes
that affect stats, targeting or outcomes must invalidate the relevant pool.

Retain original instance IDs within each build. The engine already prefixes
ability identities with actor IDs; rewriting equipment IDs merely to distinguish
the two creatures would risk ancestry and own-hit semantics.

## Atomic day-entry protocol

Expose a domain operation such as `enterArenaDay(runId, day, revision, requestId)`.
The service obtains the authenticated owner and trusted run state; the client
cannot assert its own author, day, HP, gold or legality. The exact wire API is an
output of the feasibility step.

1. Freeze the combat-ready player state and persist a pending request ID. Disable
   build mutations during admission. A changed build must not reuse the request
   ID for a different payload.
2. Validate the command history/current trusted revision, expected day, ruleset,
   combat eligibility and payload limits. Reject stale tabs and forged progress.
3. Return an existing receipt for this logical run/day entry if one was already
   committed, including when the client lost the first response.
4. In a transaction or equivalently serialized operation, inspect the compatible
   registry, including admitted Tower fallback snapshots, before admitting the current snapshot. If this is the next
   never-established day, admit the snapshot, advance the frontier, end this run
   and return a frontier receipt. Initially the frontier is zero.
5. Otherwise choose a previous valid same-day snapshot owned by another player,
   admit this entrant's immutable snapshot, and return a pinned match receipt.
   Selection uses service-controlled randomness; retries cannot reroll it.
6. If the day is established but no eligible opponent is available, return a
   distinct waiting/repair result. For a valid entrant, its own snapshot can still
   be admitted once, so another player can challenge it. Repeated waiting requests
   do not append duplicates. A waiting entry may later receive one pinned match
   through a separate retry operation; it never becomes a frontier receipt.

Admission, frontier advancement and receipt persistence must commit together.
Never announce a frontier win based on a client browse followed by a write. A
concurrent contender observes the committed first entrant and fights it; the
first entrant's recorded win is not revoked.

After a match is assigned, execute the existing deterministic engine at the
shared fixed step. Resolve its result against the receipt once. Rewards,
recovery, death records and next-day permission must commit idempotently before
further progression. Use server replay of the same engine, or an equivalently
authoritative command/outcome path; a client-supplied `won: true` is insufficient.

Reload during combat replays the pinned encounter from pre-fight HP, preserving
the existing recovery policy. Engine failure returns to that pre-fight build
without a death or reward. The receipt stays assigned; another attempt uses the
same snapshot, opponent and seed. An explicit edit after engine failure needs a
defined replacement-entry policy before it is allowed; it cannot silently create
extra pool submissions or reroll opponents.

## Validation and operational boundaries

The existing save validator is useful structure validation, not proof that a
competitive build was earned. It currently accepts enemy profiles, enemy items
and authored health/power factors that are appropriate in saved encounters.
Do not reuse that acceptance boundary unchanged for Arena entrants.

Validate finite bounded values, unique identities, allowed definitions and
levels, slots, functional control, legal item ownership, valid action history,
HP, gold, shop RNG and surgery cadence. Disallow enemy-only content and arbitrary
health/power multipliers. Preserve legitimate unusable equipment left after a
procedure: it stays inactive under existing rules. Circulatory overload remains
legal and penalized, not a snapshot rejection criterion.

For trusted admission, either execute Arena build commands server-side or replay
their ordered journal from a server-issued run seed and prior verified match
receipts using the same pure rules. Client-side checks remain useful feedback
but cannot replace this boundary. Hashes and signatures are meaningful only if
the service computed/issued them; a client hash alone proves no legality.
Checkpoint trusted state at acknowledged days so verification does not have to
replay an ever-growing run history for each new snapshot.

Pool eligibility requires compatible versions, active validation status and the
correct day. If all fetched candidates are rejected, distinguish incomplete
search, service corruption and genuinely unavailable opponents. Uniformly
sampling the first recent page is biased; verify server sampling or define a
bounded randomized sampling strategy and document its limits. Do not download
an unbounded pool to a phone. V1 needs self-exclusion; cross-run opponent
diversity and duplicate weighting can follow measurements.

Define pool retention and quotas before promising long runs. At minimum keep
established-day metadata independent of individual snapshot lifetimes, retain
enough eligible candidates for older days, and make removal/moderation trigger
repair rather than another first-place claim. Measure snapshot size and dense
combat cost. An operational limit must fail visibly and preserve progress; it
must not masquerade as an Arena ending. "Endless" means no authored final day,
not unlimited numeric precision, storage or simulation budget.

## Changes to the existing application

| Area                                                             | Planned change                                                                                                                                                                                                                                  |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `game/types.ts`, `game/run.ts`                                   | Add an explicit mode, unique Arena run identity, mode-aware progression policy, frontier terminal result and separate Arena records/best day. Keep Tower's best floor, completion and Legacy guardians intact.                                  |
| `game/encounters.ts` and a new encounter/admission adapter       | Retain Tower generation. Resolve Arena opponents asynchronously through a separate controller; no SDK or network imports in pure game modules. Avoid generating Tower previews during Arena admission.                                          |
| `game/combat/formation.ts` and combat construction               | Permit generic per-combatant starting HP, so a snapshot uses its captured HP. Defaults preserve current Tower behavior. Keep targeting, RNG, shared effects, ancestry and own-hit behavior unchanged.                                           |
| `platform.ts` and a small Arena service module                   | Handle RUN identity, admission, receipts, retries and results. Hosted data stays on RUN. An offline test implementation is explicitly development-only and excluded from production, like existing offline storage.                             |
| `App.tsx`, session/fight controllers                             | Await admission before starting combat; guard double clicks, stale responses and run replacement. Persist pending/assigned state. Display retry/cancel before commitment; after commitment, restore the receipt.                                |
| `save-validation.ts`                                             | Validate mode-specific stages and all pending/result structures. Remove the floor-100 ceiling only for Arena across runs, reports and records. Bump development ruleset if the save shape changes; reset incompatible saves without migrations. |
| Starter, HUD, shop, surgery, Arena labels, reports, help/history | Choose Tower/Arena at admission; use Day N with no `/ 100` for Arena. Remove misleading guardian/retirement copy there. Show creature identity, loading/retry, self-only wait and acknowledged frontier victory in existing bounded workspaces. |

Keep one active run initially: choosing a new mode ends/replaces the current
patient through the existing new-run confirmation. Preserve history for both
modes. No leaderboard, creator profile, social actions, shared Legacy bosses,
new art pipeline or separate Arena balance catalogue is required.

Stage arithmetic, rewards and generated IDs need safe integer checks beyond 100. Preserve the unsigned combat-seed fix and use explicit integer mixing for
large stage numbers. Bound numerical/storage resources without introducing an
authored Arena endpoint. Large HP, damage, body counts and report limits must
also remain valid for actually reachable builds.

## Delivery sequence and acceptance

1. **Settle the gameplay decisions above and prove RUN feasibility.** Use two
   isolated authenticated test identities in a private host. Demonstrate immutable
   per-day records, same-day filtering, self-exclusion, nonce retry, atomic
   admission/frontier claims, receipt recovery and authoritative validation.
   Resolve visibility and quotas. Record SDK/runtime versions and evidence.
   Stop the hosted integration path if a required guarantee is missing.
2. **Add pure mode and snapshot rules.** Preserve all Tower regressions; cover
   Arena days 20, 100, 101 and a large day, unchanged economy/surgery, entry HP,
   canonical stats and malformed/forged snapshots. Reset development saves when
   needed. This stage can use an in-memory service for tests, not a claimed live
   community feature.
3. **Build the service boundary and recovery.** Implement request persistence,
   atomic admission, pinned matches, trusted result application and history.
   Test simultaneous frontier contenders, lost responses, double submission,
   multiple tabs, rejected builds, quota/auth failures, deletion and self-only
   pools. Cover Arena-first selection, same-stage Tower fallback, self-exclusion
   across both sources, the early-day boundary and established seed days. A failed or timed-out request must never produce a free win.
4. **Integrate the existing UI and combat flow.** Exercise both modes through
   start, shopping, surgery, battle, loss, reload and new-run confirmation. Prove
   a losing entrant remains challengeable and that a later edit cannot change an
   earlier snapshot. A frontier result must survive reload and contain no invented
   battle report or ordinary combat rewards.
5. **Verify a private end-to-end candidate.** Run `npm test`, `npm run build` and
   existing browser suites with their Vite server. Extend the current hosted check
   with dedicated disposable profiles and concurrent admission. Verify the
   agreed phone/desktop sizes, keyboard/touch, safe areas and no core scrolling.
   Test dense repeated combats and retry/backoff on physical phones. Record
   stalemate rate and pool variety before considering balance changes.

The first reviewable implementation unit should be the capability proof and
accepted service contract, followed by pure mode/snapshot rules. A production
date estimate would be premature until the shared transaction and trust
boundary are established; server support may dominate the effort.

Private/unlisted game deployment remains allowed under project policy. This
proposal does not authorize a public game, game-jam submission or publicly
discoverable build pool. Existing community-publishing deferral remains in
force while this is a plan; leaderboard/social work remains deferred afterward
unless explicitly added to scope.
