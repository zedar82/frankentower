# UI expectations for the full presentation pass

Status: implementation brief. Records agreed expectations and proposals for the
upcoming full UI pass; it does not establish implementation or acceptance status.
Recorded: 11 October 2026.

Implementation and verification are recorded separately in [UI review](ui-review.md).

This specification develops the shop mockup and subsequent discussion into
requirements for the whole interface. It supplements `visual-direction.txt`
and takes precedence over older UI layout suggestions where they conflict.
It defines the requirements for implementation and subsequent UI changes.

## Decisions and proposals

Agreed expectations:

- Deliberate phone and desktop modes across the whole application.
- No scrolling in the core game, including inside panels and expanded views.
- The combat log may scroll within a bounded reader.
- Equipment can expand over surrounding fields, with a persistent Done/Back
  control, until the player has finished managing it.
- Use tabs and explicit pages for content that cannot fit at a readable size.
- A limited satchel is acceptable; capacity must be visible and operations
  must handle a full satchel without losing items.
- Carry the shop mockup's visual language into the other screens, adapting
  each composition to its activity and available space.

Implementation proposals, to settle during the pass:

- Eight satchel spaces as the initial capacity, matching the mockup. The
  discussion accepts a limit but does not lock its exact size.
- The review sizes below are starting points. Breakpoints and a minimum
  supported viewport still need to be established from actual layouts.
- The screen arrangements described below guide composition; they are not
  fixed pixel positions or a requirement to show every region simultaneously.

## 1. Core rule: fit the viewport

The player must never need to scroll to use the core game. This applies to
both the page and panels inside it, vertically and horizontally.

Core views include:

- Starting a run and choosing starting equipment.
- Shop stock, purchases, equipment, and the satchel.
- Expanded equipment management and item inspection.
- Surgery, anatomy selection, and procedure consequences.
- Combat, pause/speed controls, and the fight outcome.
- Continuing, retiring, and ending a run.
- Settings, help, build inspection, and recovery dialogs.

Use category tabs, explicit pages, and focused expanded views when content
exceeds available space. Page controls must be visible, show the current page
and total, and allow the player to reach every entry. Swiping may supplement
buttons, but must not be the only way to navigate.

Do not satisfy the rule by clipping content, hiding overflow, truncating
essential effects, or shrinking text and controls until they are difficult
to use. Optional detail can move into inspection; full detail must remain
reachable without scrolling.

The combat log is the explicit scrolling exception. Its transcript may scroll
inside a bounded reader with a persistent Close/Back control. Scrolling is
appropriate for this kind of long chronological reference, not as a fallback
for inventory, shop, surgery, or inspection. Any further exception must be
named and justified before implementation; reference screens default to tabs
or pages too.

## 2. Phone and desktop modes

Provide deliberate phone and desktop layouts. They share visual language,
rules, terminology, and capabilities, but may arrange content differently.
Choose the arrangement from available width and height, not device names
alone. Phone landscape and short desktop windows need explicit treatment.

- Desktop uses available width to place related regions beside one another.
  The shop can place patient information, creature, equipment, and stock in
  adjacent regions instead of copying the portrait mockup's vertical stack.
- Phone uses a compact composition and focused full-screen workspaces where
  necessary. All purchases, transfers, swaps, sales, and combinations must
  be possible through tapping.
- Tabs or pages can separate tasks that cannot fit simultaneously. Essential
  information for the selected task and its actions stays visible.
- Account for host/browser chrome, safe areas, and the changing usable viewport.
  A layout sized to a screenshot or a fixed device height is insufficient.
- Resizing or rotating preserves the run, selected item/category, and task.
  Reflow must not purchase, equip, sell, or reroll anything.
- Large text, long names, large numbers, and short heights need layouts that
  remain readable. Reduce decoration or simultaneous content before reducing
  useful text and hit areas.

Initial layout review targets, in CSS pixels, are 360 x 640 and 390 x 844 for
phone portrait, 844 x 390 for phone landscape, and 1280 x 720 and 1440 x 900 for
desktop. These are proposed review sizes, not fixed canvases or a declared
minimum support policy. Include intermediate sizes, tablet, browser zoom,
and real host safe areas during the pass.

## 3. Shared visual language

Keep the dark pixel-art dungeon setting and grotesque cartoon creatures.
Use stone, timber, iron fittings, parchment, warm light, and restrained
background colours. All body parts retain freedom of colour, texture, and
material; asymmetry remains optional.

The shop mockup establishes materials and grouping, not a single image to
scale down for every display. Decorative frames must adapt to live content.
Render names, rules, numbers, and controls as live UI; do not bake them into
generated art. Preserve crisp creature and item detail at display density.

Share typography, frame treatments, button states, icons, spacing conventions,
and navigation behaviour across screens. Each activity has its own composition.
The creature stays prominent during ordinary building; the arena dominates
combat. Borders and props must leave enough room for readable content.

Use a stable shell for floor, gold where relevant, and settings. Each screen
has a clear primary action in a predictable location. Notices must not cover
purchase buttons, equipment targets, or navigation. Disabled actions explain
their reason in context without requiring hover.

## 4. Shop

The ordinary shop brings together:

- Creature presentation with room for changing anatomy.
- Patient name/identity, HP, Mana, and circulation.
- Compact equipment overview and a satchel summary or grid.
- Four stock offers with visible purchase prices and essential effects.
- Stock refresh/freeze state and access to refresh, upgrade, and recovery.
- A prominent action to enter the arena.

Keep equipment controls clear of the creature's face, hands, and silhouette.
The mockup's separate equipment region is the preferred ordinary shop model;
anatomical ownership must still be clear in labels and selection feedback.

Show all four offers together where readable. On constrained displays, use
explicit stock pages, show which offers remain, and retain the selected offer's
price and purchase control. Buying an offer keeps its sold position; opening
inspection, equipment, or another page does not refresh stock.

Item art, name, slot/type, and the essential effect communicate the offer.
Inspection provides full rules, level/signature information, requirements,
and relevant tags through sections or pages. Reserve space for longer effects
and names rather than relying on the shortest items in the mockup.

The mockup's prices, counts, and effect wording are illustrative. Display
actual game rules: stock freeze is currently free, stock refreshes on new
floors unless frozen, and purchases/refresh/upgrade/recovery use engine costs.
A presentation pass does not implicitly change those rules.

## 5. Equipment expansion

Ordinary view is a compact overview grouped by heads, hands, chest, hearts,
and feet. Show occupied slots / actual slots owned, for example
`Hands 2 / 8` only when the creature really owns eight hand slots. Distinguish
empty, occupied, and unusable equipment without relying on colour alone.

Show actual anatomy-derived slots. An empty-slot plus means choosing equipment
for an existing slot. It must not suggest that clicking adds a limb; anatomical
changes belong in surgery. Keep terminology consistent: legs are anatomy,
while shoes use foot equipment slots.

Each category has an explicit Expand or Manage action when needed. Expansion
temporarily covers surrounding fields so the player can work comfortably.
It does not have to keep shop stock and patient statistics visible underneath.

- Desktop: expand the equipment region across the available scene.
- Phone: use a full-screen equipment workspace.
- Both: keep category navigation, selected-item information, relevant actions,
  the satchel or transfer destination, and a visible Done/Back control.
- Use readable slot grids. Extra categories and slots use tabs and explicit
  pages instead of growing the panel or continually shrinking icons.
- Preserve stable slot identity and ordering. Repeated similar limbs must
  remain distinguishable when equipping, swapping, or inspecting.
- Opening and closing changes presentation only. Closing preserves completed
  transfers and returns to the same shop state and context.

Choosing Equip on an item opens the appropriate category and highlights
compatible targets. The player can complete equip, swap, unequip, combine,
and sell actions by tapping or clicking. Dragging is an optional shortcut.
No action may require dragging to an off-screen target or edge auto-scroll.

Maintain context when inspecting from the expanded workspace: returning from
details restores its category/page and selection. Avoid stacking dialogs that
leave transfer destinations hidden or require closing several layers to finish.

## 6. Limited satchel

Propose eight satchel spaces for the first implementation, matching the mockup.
Settle the exact capacity during implementation and balance review. Whatever
limit is chosen must apply in game rules as well as presentation; occupied
equipment does not consume bag space.

The implementation must expose occupancy / capacity and account for the
complete operation before accepting it:

- A full satchel can still equip one of its items or swap that item with an
  equipped item when final occupancy does not increase.
- A purchase can go directly to a compatible empty equipment slot even when
  the satchel is full. Otherwise it needs a valid destination before payment.
- Unequipping into a full satchel is blocked with an actionable explanation.
  Selling or combining provides ways to free space.
- Buying into an occupied equipment slot needs room for the displaced item.
  Show the result before accepting the purchase.
- Anatomy removal/replacement must account for any displaced equipment before
  the procedure commits. Do not silently discard items or leave them hidden.
- Rejected actions leave gold, stock, items, and anatomy intact. Temporary
  intermediate occupancy during an atomic swap must not reject a valid result.

Capacity is a gameplay invariant enforced in the game modules, not just the
UI. Use the existing inventory/surgery rules and deterministic state flow.
If capacity invalidates development saves, follow the project policy of
resetting incompatible saves rather than adding migrations.

## 7. Screen-specific composition

| Screen                          | Main focus                            | Supporting information and actions                                                   |
| ------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------ |
| Shop                            | Creature and offered equipment        | Patient summary, equipment/satchel access, economy, next fight                       |
| Surgery                         | Creature and selected anatomy         | Procedure options, compatibility, costs, before/after consequences, confirm/back     |
| Combat                          | Physical arena battle                 | Compact vitals, circulation warning, activation feedback, pause/speed controls       |
| Outcome                         | Arena and concise result              | Reward/loss explanation, continue/retire actions, optional log                       |
| Item/build inspection           | Selected item or build                | Complete rules and ownership through sections/pages, relevant actions, return        |
| Start/end/history/help/settings | Current choice or information         | Bounded sections/pages, predictable navigation, close/back                           |
| Recovery                        | Failure and available recovery action | Clear state/consequences, reconnect/reset controls, existing confirmation safeguards |

Combat retains the visual direction's roughly 60-70% attention on the arena.
Do not copy the shop's equipment panel and large stock cards into combat.
Use in-world effects and compact indicators for combat feedback.

Surgery retains the physician's clinical, practical tone. The selected
procedure must make changes to slots, HP, circulation, mobility, requirements,
and displaced equipment understandable before confirmation. Large procedure
lists or anatomy selections use explicit pages/categories.

## 8. Interaction and readability

- Make all core flows work with touch, mouse, and keyboard. Hover tooltips
  supplement inspection and cannot contain the only explanation of a rule.
- Keep touch targets generous; use approximately 44 x 44 CSS pixels as the
  initial target for interactive controls, even when the icon is smaller.
- Preserve visible keyboard focus, meaningful labels, and a logical focus
  order. Expanded workspaces own focus and return it to their opener on close.
- Done/Back/Close stays visible. Desktop Escape returns from a workspace;
  keyboard navigation must not reveal hidden overflow by scrolling the page.
- Selected/disabled/incompatible states need icons or text as well as colour.
- Body and effect text must be readable at the actual display size. Decorative
  pixel fonts can serve headings; dense rules need clear typography and contrast.
- Honour reduced motion. Motion and decorative effects must not obscure
  controls, change hit targets, or be necessary to understand the current state.

## 9. Preparation and acceptance for the implementation pass

First establish live-content layouts for phone and desktop with simple frames.
Exercise extreme content before producing final decorative assets. Then build
shared presentation components and apply the rules screen by screen, retaining
the existing engine, persistence, and body renderer.

Review the following states at the proposed sizes and in the real host:

- Starting human and wide/tall, many-headed, many-armed, many-footed, heart-heavy,
  and headless builds; counts must come from real anatomy.
- Empty and full satchel, repeated similar items, valid full-bag swaps,
  purchases without destinations, and procedures displacing equipment.
- Long item names/effects, level-three signatures, requirements, large stat
  values, overload warnings, and unaffordable/max-tier actions.
- All four stock offers, partially purchased stock, frozen stock, and returning
  from equipment/inspection without losing the active category or shop state.
- Touch-only equip/swap/sell/combine, keyboard focus, rotation, short heights,
  zoom, host safe areas, notices, and recovery dialogs.
- Combat, pause, outcome, and return to the build phase.

Acceptance requires every core control and complete piece of core information
to be reachable without scrolling or unreadable scaling. No page or inner
panel may scroll in a core view. The combat-log reader may scroll its transcript
while navigation remains visible. Overflow hiding alone is not evidence of fit.

Use existing browser checks and real in-game screenshots during implementation;
record outstanding failures rather than treating a concept image as evidence.
Gameplay changes such as a satchel limit require `npm test` and `npm run build`
under the project instructions. Create an implementation review record during
the pass, with evidence and remaining limitations; this specification alone is
not evidence that a layout passes.
