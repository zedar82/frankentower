# Modular creature rendering

The modular assembly is the default renderer, adopted on 2026-10-11 after Daniel accepted the in-game structural review. The former stretched torso, SVG donor components, procedural monster fallback and legacy pose animations have been removed.

## Assembly and assets

Read [the assembly specification](modular-body-assembly.md), [design manifest](paper-doll-design-manifest.md) and [repeatable asset workflow](../output/art-direction/modular-v2/README.md).

`src/art/puppet.ts` exposes the shared layout, fitting and drawing API. `src/art/modular-puppet.ts` constructs one continuous low-detail torso interior with fixed boundary pieces, registered roots and capped zero/one/two-step tapers. Each actual limb gets a root; additional arm rows reserve 68 logical pixels vertically. Head and leg capacity determine separate upper/lower widths. Registered PNGs and measured landmarks live in `public/grotesque/modular-v2/`.

14 October 2026: decorative circular connectors are removed from shoulders,
hips and necks following Daniel's direction. Parts meet through their existing
root overlap and native stitched contours. The renderer does not paint joint
discs over the grafts. All root positions, reserved spacing and motion pivots
remain the same. The registration generator no longer emits the fifteen
circle sprites; the unused runtime PNGs and geometry entries are removed.

Every existing anatomy variant resolves to new art. Living, rat, serpent, bone, clockwork and ganglion have distinct cutouts; necrotic uses individually tinted flesh heads and bone limbs. Torsos use flesh, fur, scales, bone or metal. Materials remain local to each graft. Symmetry is permitted and does not dictate creature composition.

Head equipment uses the crown interface and front-only material. Weapons use registered grip anchors, and footwear uses front-only art at the sole/ankle interface below. Each host's actual hand pixels are drawn over the handle. Chest equipment and internal organs retain their gameplay effects and inventory UI; visible torso equipment is still an open art pass.

Held-item profiles in `src/art/item-assets.ts` declare the source frame, normalized grip, a second shaft/aim landmark, logical size and hand layer for every current hand-item archetype. That second landmark aligns the held axis before the parent arm rotates or mirrors it. Shields draw their front face over the hand; handles draw beneath the host fingers. Inventory icon centring is separate from worn/held placement. New hand-item archetypes require an attachment profile and a visual review on the supported hands.

Arms and held items render together in front of the torso, so crossing strikes retain visible forearms. Camera bounds use the same item transforms and mirroring order as drawing. The grip and swing boards capture all seven hand-item archetypes, six hand materials, and both attack directions through the actual renderer.

## Bitmap and display resolution

Assembly coordinates are logical units; they are separate from bitmap pixels. The registration generator now emits four bitmap pixels per logical unit, preserving source detail inside the accepted frames. For example, a 64 × 64 logical head frame is a 256 × 256 PNG. Every asset's geometry records `rasterScale`, logical dimensions and anchors. Drawing explicitly uses those logical dimensions, and texture patterns divide out the bitmap density, so torso proportions and taper do not change.

`src/art/canvas.ts` sizes room, arena and portrait backing stores to their displayed width and device pixel ratio. `Creature` redraws on resize; animated views update naturally. CSS uses pixelated display scaling and the renderer keeps nearest-neighbour sampling. A fixed small backing store no longer discards detail before CSS magnifies it.

The quality baseline mounts the real DressingRoom with living anatomy, a cleaver and a dagger. `node scripts/capture-modular-study.mjs --quality-only` records standard/2× display captures using production CSS and a cropped before/after comparison. The previous registered head held about 52 painted pixels across; the current bitmap can retain about 208 across inside the same envelope. This addresses rendering loss without changing the accepted structural design or regenerating source artwork.

## Motion

`src/game/attack-motion.ts` and the deterministic combat engine own preparation, contact and recovery phases. The new renderer consumes `Pose.arms` per weapon instance and rotates limbs around registered shoulders. Removing old art does not change activation clocks, damage timing, own-hit effects or branch ancestry.

Walking uses a small hip rotation and integer body translation. Static bodies do not bob or shimmer. Death and hurt have simple presentation transforms. No legacy windup/item-swing fallback schedules remain in the renderer.

## Review and existing checks

Start the offline Vite server and open `art-study.html`. It mounts the actual DressingRoom and Arena. Run `node scripts/capture-modular-study.mjs` to save room, combat, mixed anatomy, catalogue and motion captures.

The existing `node scripts/puppet-check.mjs` verifies painted alpha connectivity at every root, grip, foot and face across eight anatomies, three poses and both attack directions. Its landmarks now match the registered modular frames. Output is `test-results/frankentower-puppet-composition.png` by default. Set `FRANKENTOWER_LOCAL_URL` and `FRANKENTOWER_BROWSER_EXECUTABLE` when necessary.

Structural acceptance is separate from final art polish. Texture repetition,
natural seam finish, consistent pixel detail, individual headgear and footwear
still deserve later art passes.

## UI target gear variants — 13 October 2026

`src/art/item-assets.ts` declares presentation variants with an original PNG,
measured alpha crop and optional `crownSeat` in original image coordinates.
All headwear is **front material only**, rendered as one overlay after the head.
Do not generate a rear rim, interior, hollow opening or top-down elliptical
ring. The game shows frontal creatures; a back layer adds no useful view.
`drawCrownItem` uniformly fits the artwork to the common 44×25 size and aligns
the authored seat with the head's registered crown mount. That seat can lie
inside the front material, allowing the art to project above the skull and
overlap the forehead. Both new 1024px front-only sprites seat at (512,512).
Moving the earlier full-ring assets did not fix their unsuitable viewpoint;
they are retained only as historical sources. `modular-puppet.ts` uses this shared rule for every
variant; it does not add item-specific face/head attachment logic. Full original
PNGs are retained. The Wooden Shield variant uses the existing shield grip and
front face covers the hand. Inventory and equipment use the same artwork.

See [the RUN workflow and prompts](../output/art-direction/visual-target-pass/README.md)
for repeatable generation and measurement. New headwear must remain inside the
common envelope; wrapping hoods and face masks are not part of this approach.

## Footwear interface — 14 October 2026

Shoes are opaque front material, with no rear half, visible interior or hollow
cuff. Inventory and worn equipment share the accepted front PNGs. Three front
archetypes currently cover all ten foot items; individual themed illustrations
(for example the heel and rabbit foot) remain a separate content art pass.

Each presentation profile declares its measured crop and `soleSeat` in original
source pixels. `drawFootwearItem` uniformly fits the art inside 26×30 logical
pixels, below the 28px leg pitch, and aligns the seat with the host's `end`.
All current 32×72 leg frames have `root=(16,10)`, `end=(16,65)` and
`ankle=(16,53)`. These are invisible landmarks. Equipped legs clip native pixels
below the ankle plane, so paws, claws and toes inside the shoe cannot protrude.
The front shaft overlaps that plane. Bare legs keep their complete original art.
Only decoded footwear enables this clipping. Shoes inherit the exact leg/root
transform and walking rotation; there are no item-specific offsets in combat.

New legs must author an ankle coverage plane. New shoes must cover that join,
stay inside the common envelope and declare a sole seat. Items without custom
footwear art use the registered runner front. Review the real renderer, including
bare/equipped feet on all materials, walking and many-foot builds; run
`node scripts/capture-footwear-study.mjs` against the offline server for boards.
