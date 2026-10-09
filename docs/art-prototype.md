# Puppet composition prototype

The creature uses the original illustrated head, arm and booted leg. `src/art/assets/torso-core.webp` is a sibling edit of the original tunic with its four fixed protruding tabs removed. The original `torso.webp` remains the source of the painted socket tab, cropped by the compositor and reused for every graft.

## Assembly

`src/art/puppet.ts` records each cutout's opaque crop and the centre of its painted joint button in source pixels. Draw transforms align that button to a socket pin. The torso's alpha silhouette determines where the socket's inner seam meets the fabric; the socket and the limb share the same pin.

Arms rotate around shoulder pins, legs swing around hip pins, and weapons are positioned at the painted hand grip. Heads always face the audience and their neck buttons meet the collar or a sewn upper seam. Added arm rows increase torso height; added heads and feet increase width. Boots are placed at ground level. Portrait fitting and the arena camera use the same composition bounds.

## Verification

Run the offline Vite server, then `node scripts/puppet-check.mjs`. It renders six anatomy combinations in idle, walking and attack poses and checks actual alpha connectivity from the torso to each pin and limb. The cases include a starting body, four and eight arms, twelve arms with six heads, odd limb counts, and a headless body. The output sheet is `/private/tmp/frankentower-puppet-composition.png`.

## Torso edit provenance

Generated with the built-in `image_gen.imagegen` tool, using `src/art/assets/torso.webp` as the edit target and `transparent_background: true`. The selected output was saved in the workspace and encoded as a transparent WebP at the original 1312 × 1199 resolution. The other painted body parts were retained.

Final prompt:

> Use case: precise-object-edit
> Asset type: modular puppet torso cutout, edit target is the provided illustrated tunic
> Change ONLY this: remove the FOUR protruding beige socket stubs with red X stitches, two at the shoulders and two at the lower sides. Remove each stub cleanly to leave a simple continuous outlined tunic silhouette. Keep the collar and collar hole, same front-facing tunic, same torso proportions, belt, patchwork, decorative stitching, olive fabric, outline, shading and painted texture. The torso should have no protruding connection points, no arms or legs. It is the socket-free core for an animated puppet; sockets will be attached dynamically by the game. Genuine alpha transparent background, preserve clean silhouette edges. No scenery, no shadow or glow, no text, no other changes. Preserve the visual style and existing image as closely as possible.
