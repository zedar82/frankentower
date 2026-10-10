# Grotesque cartoon paper-doll style study

This private art-direction study records a chunky grotesque pixel-art treatment and its shared anatomy interfaces. Registered anatomy components and item-icon archetypes feed the runtime renderer; the generated art and landmark estimates remain reviewable studies.

## Review files

- `index.html` opens both review boards and links to each full-size assembly.
- `component-board.png` shows the 18 generated anatomy and equipment studies, including rat, bone, and serpent replacements.
- `assembly-board.png` shows five assembled previews: the baseline, mixed anatomy with a held club, expanded arm count, odd limb counts, and a rat/bone/serpent combination.
- `assemblies/` contains each full-size SVG assembly. `components/` contains the registered component frames, four shared anatomy adapters, the universal shoe, and a reusable grip-hand overlay.
- `assets/item-*.png` contains the twelve full-resolution equipment icon archetypes used by the current player and enemy item catalogs. Runtime-sized copies live in `public/grotesque/items/`.
- `geometry.json` records the shared 512 px frames, declared anchors, source landmarks, and assembly inventory.
- `style-anchor.png` is the rendering reference.

Generated SVG components register anatomy images with uniform scale, rotation, and translation. Rat and bone heads, arms, and legs replace their legacy atlas art; serpent has a dedicated two-eyed head. The torso swatches are kept in the study gallery, while runtime uses the organic trunk cell with a material filter so its joins remain continuous. A revised pixel-art bone club replaces the earlier limb-like study, and a generic hand overlay crosses held equipment at the grip. Shoulder, neck, hip, and ankle adapters overlap their attachment roots. The runtime renderer assembles fixed-scale trunk modules and adds one row for each additional pair of arms. The expanded-count SVG is a layout preview; runtime trunk rows stay at fixed scale.

The style anchor sets pixel scale, outline, and light direction. It does not lock every part to pink: rat parts use fur browns, bone parts use parchment and sepia, and serpent heads use teal and olive. Palette can vary between grafts. Symmetry is a composition choice, not a required feature of each part.

## Composition contract

- Keep a fixed front-facing view, 512 px authoring frame, common body scale, and stable registration.
- Build torso width from repeated 64 by 80 unit tissue cells with a 20-unit horizontal overlap. Keep one continuous torso tier as arm count grows. Add vertical torso space for extra pairs, then angle those arms toward vertical to prevent overlap. Cells have no baked shoulder pair. Place one shared shoulder adapter for each actual arm.
- Register arms to the same shoulder and grip frame, and heads to the same neck and headgear frame.
- Register legs to the common hip and sole frame; declare the shared knee and footwear anchors. Use one shared shoe component for every leg type.
- Keep the pixel-art material, outline, palette, and lighting treatment steady while anatomy varies.

## Runtime connection and review limits

The study boards include the baseline, odd-count, expanded-count, and alternate anatomy sets. The mixed build shows the revised bone club held by a hand overlay. Runtime torso rows use the registered cell crop at a fixed scale, with adapters in the assembly order. Rat, bone, and serpent use dedicated anatomy images in their applicable slots; other material variants keep the shared forms with material filters or the closest anatomy study.

Treat this as a reviewable art set, not accepted final art. Source elbow and knee landmarks were estimated from the generated images. Their recorded transformed positions can be compared with the shared interface anchors in `geometry.json`; inspect joint anatomy, adapter overlap, and weapon grip at game scale. This set does not cover every material with bespoke art, every limb count, or animation states.

The design contract is in `docs/paper-doll-design-manifest.md`; the updated visual treatment follows `docs/visual-direction.txt`. The generator is `generate.mjs` and writes the SVG/JSON outputs. The rendered PNG boards are review snapshots.
# Workflow

See [WORKFLOW.md](WORKFLOW.md) for the repeatable asset creation, registration, rendering, and review process.
