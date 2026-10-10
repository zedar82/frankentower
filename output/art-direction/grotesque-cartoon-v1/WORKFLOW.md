# Repeatable art-study workflow

This note records the repeatable asset creation, registration, runtime integration, rendering, and visual review process. The current set is integrated as runtime item-icon archetypes and paper-doll anatomy components; the generated art and fit estimates remain reviewable studies.

## 1. Start from the contracts

Before creating art, read:

- `docs/visual-direction.txt` for the game's pixel-art treatment and spatial combat goals.
- `docs/paper-doll-design-manifest.md` for the component frames, anchors, seams, and assembly rules.

Treat the manifest as the implementation contract. In particular, every limb needs visible supporting anatomy, and equipment needs an overlap region as well as an anchor coordinate. A correct coordinate alone does not make a joint look attached.

## 2. Make one isolated image per part

Use a fixed front-facing view, shared pixel scale, outline weight, and lighting. Let the material choose the palette: living tissue can use rose, rat fur tawny brown, bone parchment and sepia, and serpent scales teal or olive. The style anchor guides pixel technique and rendering, not a requirement to recolor every part pink. Combine different part palettes when the creature calls for mismatched grafts. Keep symmetry optional: use a balanced face or silhouette when it reads best, and add asymmetry as a character detail instead of forcing it onto every part. Keep each PNG on a transparent background and make one part the clear subject. Store the original image in `assets/` and preserve earlier versions when replacing a weak study; the revised club is `assets/weapon-bone-club-v2.png`, while the earlier attempt remains available for comparison.

For a replacement equipment image, use `style-anchor.png` as a style reference. Prompt for the item's silhouette and intended use, and state what makes it recognizable. For the club, the useful constraints were a broad blunt head, a sturdy handle, and no hand, limb joints, hollow sockets, or hooks. Inspect the generated cutout and alpha before registering it. A hand or grip overlay should be a separate component when it needs to fit multiple items.

## 3. Register images into the shared frame

`generate.mjs` is the source of generated SVGs and metadata. Add the asset's filename to `art` and its pixel dimensions and landmarks to `source`. Choose two meaningful source landmarks, such as shoulder-to-grip or head-center-to-grip. `fitPair()` uniformly scales, rotates, and translates those landmarks to their shared target positions in the 512 px component frame. Avoid separate X and Y fitting for anatomy parts.

Record the shared local anchors in the component branch and in `geometry.json`. The current study uses:

- arm: shoulder `(0, 0)`, elbow `(33, 52)`, grip `(77, 103)`;
- head: neck `(0, 0)`, headwear `(0, -82)`;
- leg: hip `(0, 0)`, knee `(0, 57)`, footwear `(0, 99)`, sole `(0, 114)`;
- boot: footwear `(0, 0)`, sole `(0, 15)`.

The club registers its head center at `(0, -64)` and its grip at `(0, 0)`. `applyFit()` records where intermediate source landmarks land after the transform, which helps diagnose inaccurate elbow or knee estimates without silently moving the shared interface.

## 4. Build the attachment pieces and assembly

Draw reusable adapters in SVG in the same 512 px frame. Each adapter declares its host, layer, overlap, and reuse rule in `geometry.json`. The hand grip overlay is drawn after the held item so its fingers cross the shaft. Hip adapters are drawn after the legs but behind the torso hem, letting the body cover the top of the seam. Use the exact same universal boot at every leg's footwear mount.

Keep the variant list declarative in `cases`. Include a baseline, a mixed anatomy/equipment example, an expanded anatomy example, and an odd-count example. When adding limbs, place one adapter per actual limb and check the paths between roots as well as the roots themselves. Do not solve overlap by putting two roots close together and hoping the limbs separate later.

### Current torso experiment

This study keeps a single horizontal torso tier and adds 104 px (52 units) of vertical torso height for each additional arm pair. The pair mounts 104 px lower, and the extra pair angles toward vertical. This put the lowest arm root 124 px (62 units) above the hem in the three-arm preview, instead of leaving it hanging off the edge.

The current SVG review generator achieves that extra height by vertically stretching the torso cell. This is a visible-review shortcut and **does not meet** the design manifest's prohibition on stretching a finished torso to create limb capacity. Do not copy that preview transform into production. The runtime renderer repeats fixed-scale trunk modules, cropping the shared internal overlap from each additional row; each arm pair receives a matching shoulder row.

## 5. Connect the art to the game

Keep the full-resolution generated sources in `assets/` and place small runtime copies where the renderer loads them. Equipment uses one transparent sprite for each icon archetype declared by `ItemDef.icon`; the current player and enemy catalogs use twelve keys: `dagger`, `club`, `knife`, `shield`, `wand`, `bow`, `helmet`, `hood`, `armour`, `shoe`, `heart`, and `dice`. Give each source a stable `item-<key>.png` name, then make a transparent 256 px maximum-dimension runtime copy in `public/grotesque/items/<key>.png` with nearest-neighbour resampling. Preserve alpha. Pass the item definition ID as the variant so blood, poison, arcane, mechanical, and other named families retain readable color differences.

`src/art/item-assets.ts` maps those keys to runtime files, decodes them before the UI redraws, and draws them through the existing `pixelItem()` call path. The shop, inspection view, patient summary, feet, chest, heads, and hands continue using the definition's `icon`. This keeps equipment content declarative while covering every icon archetype currently used by player and enemy items.

Copy the registered SVG component frames to `public/grotesque/components/` with their source images in the neighboring `public/grotesque/assets/` folder so relative `<image>` links resolve. `src/art/puppet.ts` loads those frames, maps slot/variant art, and places limbs and equipment at their registered roots. Render the legs and hip adapters first, then arms, fixed-scale torso cells, shoulder adapters, neck adapters and heads. Draw held equipment before the grip-hand overlay so the fingers cross the handle. Keep the frame anchors in `generate.mjs` and `geometry.json` as the shared source of truth.

When adding a new `ItemDef.icon` key, add its transparent image and mapping in the same change. Check the unique icon keys in `src/game/content/items.ts` and `src/game/content/enemies.ts` against `src/art/item-assets.ts`; the sets should match. For body variants, generate each supported slot as a separate component and register it with the shared slot anchors. Rat and bone have dedicated head, arm, and leg art; serpent has a dedicated two-eyed head. Torso-cell swatches are useful studies, but runtime keeps the organic shared trunk and applies a material filter to preserve seamless joins. Add source art to `art` and landmarks to `source`, regenerate, copy runtime SVGs and source images to `public/grotesque`, and map each component in `partArt()`. Do not route a new variant to an unrelated silhouette.

## 6. Generate and render the review set

From the repository root, regenerate the SVG and JSON outputs:

```powershell
node output/art-direction/grotesque-cartoon-v1/generate.mjs
```

Render the four individual assemblies and review boards with Edge. Update the paths if Edge or the checkout location differs:

```powershell
$edge = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
$root = (Resolve-Path 'output/art-direction/grotesque-cartoon-v1').Path
$profile = Join-Path $env:TEMP 'frankentower-art-review-profile'

foreach ($name in @('baseline-human', 'mixed-unicorn', 'expanded-count', 'single-arm-odd-legs')) {
  & $edge --headless=new --disable-gpu --disable-extensions --allow-file-access-from-files `
    --no-first-run "--user-data-dir=$profile" --window-size=1000,1000 `
    "--screenshot=$root\assemblies\$name.png" `
    "file:///$($root.Replace('\', '/'))/assemblies/$name.svg"
}

foreach ($board in @('assembly-board', 'component-board')) {
  $size = if ($board -eq 'assembly-board') { '1680,1360' } else { '1440,900' }
  & $edge --headless=new --disable-gpu --disable-extensions --allow-file-access-from-files `
    --no-first-run "--user-data-dir=$profile" --window-size=$size `
    "--screenshot=$root\$board.png" `
    "file:///$($root.Replace('\', '/'))/$board.svg"
}
```

Open `index.html` or inspect the PNGs directly. Regeneration overwrites generated SVG/JSON files, so edit the generator and source assets rather than patching generated outputs by hand. Keep the rendered PNGs with the study as review snapshots.

## 7. Review the assembled result

Inspect at full size and at likely arena scales. For each combination, check:

- the full silhouette and torso proportions before checking measurements;
- every shoulder and hip is visibly joined to supporting torso tissue;
- extra arms have vertical room and do not collide along their length;
- the hand visibly wraps the handle, and the item reads as equipment rather than anatomy;
- exposed torso edges look intentional, unused sockets are absent, and each leg has the same shoe;
- the component still reads when the complete creature is reduced to 64, 128, and 256 px tall.

When a review fails, change the source image, landmark, adapter, layer, mount layout, or assembly case that caused it. Regenerate all outputs and inspect the same views again. Record any temporary compromise and its replacement plan, as with the stretched torso above. Cosmetic-only iterations use the existing art review; gameplay tests are for gameplay changes.
