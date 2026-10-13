# Modular creature assets

Generated and reviewed 2026-10-11. Daniel accepted the structural assembly after seeing actual in-game renders. This library is now the default for both player and enemy creatures. Final material and seam polish remains open.

## Open the review

Run `npm run dev:offline -- --port 5174 --strictPort`, then open <http://127.0.0.1:5174/art-study.html>.

The development review mounts the game's DressingRoom and Arena components through their normal monster/drawPuppet path. It uses the same renderer and assets as production. The combat panel uses the deterministic Combat engine. Controls change counts, material, graft ordering, equipment and combat time.

## Repeatable art workflow

A separate [RUN image-generation trial](../run-generation-study/README.md) records
a repeatable single-style-reference workflow, costs, finer-detail prompting and
measured registration. Its candidates are review artifacts; production parts have
not been replaced. The existing geometry and renderer acceptance requirements
below apply to assets from either generation route.

1. Read the assembly specification and design manifest in `docs/`. Geometry owns the interface; generated art must fit it.
2. Generate one isolated part or quiet material tile per image, with transparent alpha for cutouts. Use the built-in image_gen tool. Keep a frontal view, common lighting and chunky grotesque cartoon drawing. Any part may have its own colour and material. Asymmetry is optional; balanced eyes and ordinary faces are valid.
3. State the silhouette, maximum envelope, attachment region and intended equipment grip in the prompt. Request folded gripping fingers for arms and a flat crown region for heads. Do not generate hands attached to weapons.
4. Preserve source PNGs and full prompts. [prompts.json](prompts.json) records the original set and revisions; [catalogue-prompts.json](catalogue-prompts.json) records the additional catalogue parts. Both sets are in [sources](sources).
5. Measure shoulder/grip, hip/sole, neck/crown landmarks. Edit the registration specifications in `scripts/generate-modular-study.mjs`. Uniformly scale, rotate and translate cutouts into standard frames; never stretch anatomy separately along X and Y.
6. Register with nearest-neighbour sampling. The generator records bounds, rejects substantial clipping and emits the same geometry metadata used by the renderer.
7. For torso materials, generate a quiet tile, then pre-render boundary masks, corners, edges and straight/one/two-step tapers. Parts join through their declared root overlap and native stitched contours; do not generate circular connector discs. Do not tile a complete torso, ribcage or chest.
8. Map each new slot/variant explicitly in `src/art/modular-puppet.ts`. Register and capture the actual game renderer. Inspect the complete silhouette at room and arena scales, mixed materials, odd counts and combat poses before accepting the art.

With the local server running:

~~~powershell
node scripts/generate-modular-study.mjs
node scripts/capture-modular-study.mjs
~~~

The scripts use installed Chrome by default. Override `FRANKENTOWER_BROWSER_EXECUTABLE` or `FRANKENTOWER_LOCAL_URL` as needed. Regeneration overwrites runtime sprites; revise source landmarks and masks instead of editing emitted PNGs.

## Library and coverage

The 80 runtime sprites include six heads, six arms, six legs, a crown, a substantial cleaver and twelve boundary/fill pieces for each of five torso materials. On 14 October, the fifteen decorative arm/hip/neck circle overlays were removed from rendering, metadata and the generator. Roots, spacing and pivots are unchanged.

- Living: stitched flesh head, arm and leg.
- Rat: brown furry head, arm and leg.
- Serpent: green lizard head, arm and leg.
- Bone: ivory skull, skeletal arm and leg.
- Clockwork: mechanical head, brass arm and leg.
- Ganglion: violet brain head and tentacle limbs.
- Necrotic: individually recoloured flesh head and skeletal limbs.
- Torso materials: quiet skin, fur, scales, bone and metal; necrotic and ganglion recolour their torso material locally.

Selected quieter flesh and thicker bone revisions supersede initial sources, which remain for repeatability. Runtime files and landmark metadata are in `public/grotesque/modular-v2/`.

Head equipment currently shares crown artwork. Cleavers use the new registered weapon; other held items and footwear retain inventory equipment art. Inventory pictures now use the same crown and cleaver silhouettes as the assembled creature. Conventional chest armour and organs have no body overlay yet; their inventory presentation and gameplay effects remain. Old wrapping-hood placement has been removed. Individual crowns, hats, footwear and chest presentation require later equipment work.

## Accepted construction dimensions

Assembly measurements use logical units. Runtime PNGs have four bitmap pixels per logical unit; `rasterScale` and the logical dimensions are declared in geometry.json. A 64 × 64 head frame therefore occupies a 256 × 256 PNG while keeping the same neck mount, painted envelope and spacing.

| Interface | Logical frame / landmarks | Reserved space |
| --- | --- | --- |
| Head | 64 × 64; neck (32,56); individually measured crown | 52 px painted width; 56 px pitch; crown clearance |
| Arm | 96 × 112; shoulder (24,20); grip (64,78) | 68 px between rows; movement and equipment bounds included in fitting |
| Leg | 32 × 72; hip (16,10); sole (16,65) | 28 px pitch; 55 px hip-to-ground distance |
| Torso | 80 px minimum end width; 88 px first-row height | Add 68 px for each extra arm row; calculate upper/lower requirements separately |
| Taper | 48 px transition; 16 px total-width step | Cap at two steps, retain surplus width at the narrower end |

Taper is distributed evenly between both sides. The interior is one continuous texture field clipped to the same outline used by the boundaries. No finished torso is repeated or stretched.

## Actual renderer captures

- [Dressing-room board](review/dressing-room-board.png): actual room canvases.
- [Arena](review/arena.png): actual combat-engine frame.
- [Assembly board](review/assembly-board.png): the six approved construction examples.
- [Catalogue board](review/catalogue-board.png): every anatomy family.
- [Motion board](review/motion-board.png): equipped idle, drawback and strike.
- [Weapon grips](review/weapon-grips.png): measured handle/shaft anchors for all seven held-item archetypes on six hand types, with shields covering hands.
- [Weapon swings](review/weapon-swings.png): arms and attached equipment in front of the torso, facing both directions. The corresponding `-before` captures record the earlier generic icon placement and hidden arms.
- [Review page](review/review-page.png): the browser page and controls.
- [Rendering quality comparison](review/quality-comparison.png): actual DressingRoom before/after at the same display size and density. Standard and 2× full-room captures are also preserved.

Head spacing, separate arm rows, hip connections, substantial weapons and host-hand occlusion solve the former structural problems. Remaining polish includes flat broad torsos, natural seam finish, visible material repetition, noisy legacy boots and varying outline/pixel density. Acceptance of construction does not imply completion of every equipment or texture pass.

The `weapon-grips-direct-joins.png` and `weapon-swings-direct-joins.png` captures
show the actual renderer after the circle removal, including both swing
directions. The earlier captures retain the historical connector artwork.

The previous SVG and whole-body libraries and their obsolete generators have been removed. Git history retains them. Equipment source cutouts remain separately in `output/art-direction/equipment-v1/sources/`.

Adoption checks: registration emitted 95 sprites; the existing puppet composition check passed eight anatomies, three poses and both attack directions. Eleven actual renderer images captured without browser errors. TypeScript and the production build passed after legacy cleanup. Gameplay definitions and combat rules were not changed.

Held-item follow-up: `src/art/item-assets.ts` now owns a declarative source frame, normalized grip/shaft landmarks, logical size and hand layer for each hand-item icon. Generic inventory icon centring no longer determines where handles sit. Shaft landmarks normalize the bone wand and crossbow orientation; shields draw over the hand while weapon fingers draw over handles. Arms and equipment share a foreground pass, including strikes across the chest. Bounds use the same item transform. Run `node scripts/capture-modular-study.mjs --weapons-only` to refresh the two attachment boards; `FRANKENTOWER_CAPTURE_SUFFIX=-before` preserves a comparison snapshot.

Rendering-quality follow-up: source registration now preserves 4× bitmap density for every cutout, material and boundary piece. Runtime drawing maps those images back into the existing logical geometry. Room, arena and portrait backing stores follow actual display size and device pixel ratio, with pixelated CSS scaling. Run `node scripts/capture-modular-study.mjs --quality-only` to compare the real room at 1×/2× density. Before captures show the former 640 × 680 backing store regardless of display size; after captures use 960 × 1020 and 1920 × 2040 for the same 960 CSS-pixel-wide room. The library totals roughly 3.6 MB rather than 0.3 MB; the extra bitmap data preserves detail that was previously lost.
