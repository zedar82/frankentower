# FRANKENTOWER modular art experiments — experiment 02

Shared construction standard: [geometry.json](geometry.json), with six neutral 512-unit guides under `guides/`. Interface targets are neck, shoulder and hip 32 units; grip 20; footwear 48. The renderer reads explicit prepared-image anchors and attachment bands from each style's `catalogue.json`.

## Status

A — Grotesque Cartoon and B — Stitched Ragdoll each have seven isolated generated assets, prepared transparent components, a metadata catalogue, anchor overlay, renderer assembly, animation clips and equipment/arena previews. No style has been selected. C — Dark Storybook, D — Claymation and E — Graphic Comic Monster have not yet received experiment-02 renderer runs, so a five-style score and winner are intentionally pending.

The first seven assets are separate images. Extra catalogue objects for style A test independent reproduction. Style B's extra reproduction samples remain outstanding. `generation.json` stores each original generation prompt, and `originals/` preserves source images. `prepared/` contains uniform-scaled transparent exports; measured anchors are recorded in the catalogue.

## Preview index

| Deliverable | A | B |
|---|---|---|
| Style reference | [A](a/style-reference.png) | [B](b/style-reference.png) |
| Prepared component catalogue | [A](a/catalogue.png) | [B](b/catalogue.png) |
| Anchor and torso-band overlay | [A](a/technical-overlay.png) | [B](b/technical-overlay.png) |
| Neutral renderer pose | [A](a/neutral.png) | [B](b/neutral.png) |
| Walking renderer capture | [A](a/walk.webm) | [B](b/walk.webm) |
| Attack renderer capture | [A](a/attack.webm) | [B](b/attack.webm) |
| Human/tentacle maul and mirrored boot checks | [A](a/equipment-compatibility.png) | [B](b/equipment-compatibility.png) |
| 64/128/256 px arena preview | [A](a/gameplay.png) | [B](b/gameplay.png) |
| Six heads, twelve mixed arms, eight legs | [A](a/stress.png) | [B](b/stress.png) |
| Extra components and substitutions | [A](a/reproducibility.png) | Not generated |

These assemblies are captured by `drawPuppet` via its optional metadata-driven skin. They duplicate, translate, rotate, mirror, scale and layer the exact prepared components. No whole-creature illustration was generated. `validation.json` records actual drawn component counts and 192 sampled moving weapon/footwear anchor checks per style; maximum measured anchor drift is under 0.000004 px (floating-point canvas precision).

The fixtures are renderer proofs, not production acceptance. The art assets were measured manually from source images and need careful human anchor review before game integration. A's dog boot, torso seam/skin boundaries and the crowded head cluster show fit/overlap weaknesses. Crowding becomes pronounced in both stress assemblies; scale-down compresses facial details, especially at 64 px. Side-by-side compatibility captures show each maul and mirrored boot using the same prepared image. Rotation is in the shared metadata.

## Preliminary observations (not a selection)

A has strong comic expression and bright species separation. The style leans toward polished illustration with many shade bands rather than the direction's target pixel art. Its first renderer pose needed adjusted head spacing, leg fanning, weapon orientation and boot anchor. The independent head, skeletal arm and replacement torso were generated separately; the torso needed a targeted edit to remove an unwanted neck stump. This is evidence of reproducibility with non-trivial correction.

B is materially distinct. Stitches and buttons disguise cut edges convincingly and the second generated collection remains consistent with the reference. Its dense shared fabric palette and stitch texture may merge repeated limbs at game scale. Extra-component reproduction is still untested. The first renderer assembly passed the same count and anchor-coordinate checks as A.

No weighted style score is published because three renderer comparisons and B's reproduction test remain incomplete. Visual estimates from only these two samples would not support choosing a production style.

## Reproduce the preparation and captures

The project already needs its normal Vite and Playwright dependencies. Start an offline development Vite server at `127.0.0.1:5173`, then run:

```powershell
node output/art-direction/experiment-02/make-guides.mjs
node output/art-direction/experiment-02/prepare.mjs a
node output/art-direction/experiment-02/capture.mjs a
node output/art-direction/experiment-02/prepare.mjs b
node output/art-direction/experiment-02/capture.mjs b
```

The source anchor observations live in each style's `measurements.json`; the preparation script crops transparent source canvases, applies uniform scale and padding, and records the transformed anchor coordinates. The renderer does not infer anchors at runtime.
