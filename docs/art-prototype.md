# Puppet composition prototype

This documents the puppet renderer currently used by the game. The next component design is defined in the [paper-doll design manifest](paper-doll-design-manifest.md), with [construction templates](../output/art-direction/paper-doll-templates-v1/README.md) for visual review. Those templates are not yet integrated into the runtime renderer.

The creature uses the original illustrated head, arm and booted leg. `src/art/assets/torso-core.webp` is a sibling edit of the original tunic with its four fixed protruding tabs removed. The original `torso.webp` remains the source of the painted socket tab, cropped by the compositor and reused for every graft.

## Assembly

`src/art/puppet.ts` records each cutout's opaque crop and the centre of its painted joint button in source pixels. Draw transforms align that button to a socket pin. The torso's alpha silhouette determines where the socket's inner seam meets the fabric; the socket and the limb share the same pin.

Arms rotate around shoulder pins, legs swing around hip pins, and weapons are positioned at the painted hand grip. Heads always face the audience and their neck buttons meet the collar or a sewn upper seam. Added arm rows increase torso height; added heads and feet increase width. Boots are placed at ground level. Portrait fitting and the arena camera use the same composition bounds.

## Arm timing

Each equipped hand draws back in proportion to its own cooldown progress. Normal attacking hands reserve the final 0.12 seconds of their cycle for a forward stroke, with damage resolving at contact, then recover for 0.16 seconds while the next preparation starts. A dagger prepares quickly; a club prepares slowly. Both use the same forward-stroke duration in simulation seconds, including under Circulation penalties. The simulation owns the strike phase; drawing does not schedule damage.

The strike commits its rate and direction when it starts. Speed changes affect subsequent preparation, rather than stretching a committed stroke. At extreme natural activation speeds the forward stroke sets a 0.12-second minimum cycle. Explicit trigger chains retain their immediate activation rules and jump the hand to contact; direct cooldown reductions advance its preparation or committed pose and retain immediate activation when they reach zero. Hit, Crit and passive effects still resolve with the original branch ancestry. Physical attacks recheck reach at contact.

`src/game/attack-motion.ts` defines the durations and preparation progress. The exported `armMotion` function in `src/game/combat.ts` supplies independent phases to `src/art/puppet.ts`, which rotates each cutout around its existing joint button. Non-attacking held items use a preparation/activation gesture.

## Verification

Run the offline Vite server, then `node scripts/puppet-check.mjs`. It renders six anatomy combinations in preparation, walking and attack poses, in both directions, and checks actual alpha connectivity from the torso to each pin and limb. The cases include a starting body, four and eight arms, twelve arms with six heads, odd limb counts, and a headless body. The output sheet is `/private/tmp/frankentower-puppet-composition.png`. Set `FRANKENTOWER_LOCAL_URL` to use a server on a different port. `tests/attack-timing.test.ts` checks independent hand clocks, contact timing, constant strokes at different speeds, trigger/CDR behavior, and missed or cancelled attacks.

## Torso edit provenance

Generated with the built-in `image_gen.imagegen` tool, using `src/art/assets/torso.webp` as the edit target and `transparent_background: true`. The selected output was saved in the workspace and encoded as a transparent WebP at the original 1312 × 1199 resolution. The other painted body parts were retained.

Final prompt:

> Use case: precise-object-edit
> Asset type: modular puppet torso cutout, edit target is the provided illustrated tunic
> Change ONLY this: remove the FOUR protruding beige socket stubs with red X stitches, two at the shoulders and two at the lower sides. Remove each stub cleanly to leave a simple continuous outlined tunic silhouette. Keep the collar and collar hole, same front-facing tunic, same torso proportions, belt, patchwork, decorative stitching, olive fabric, outline, shading and painted texture. The torso should have no protruding connection points, no arms or legs. It is the socket-free core for an animated puppet; sockets will be attached dynamically by the game. Genuine alpha transparent background, preserve clean silhouette edges. No scenery, no shadow or glow, no text, no other changes. Preserve the visual style and existing image as closely as possible.
