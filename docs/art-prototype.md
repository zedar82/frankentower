# Modular creature rendering

The modular assembly is the default renderer, adopted on 2026-10-11 after Daniel accepted the in-game structural review. The former stretched torso, SVG donor components, procedural monster fallback and legacy pose animations have been removed.

## Assembly and assets

Read [the assembly specification](modular-body-assembly.md), [design manifest](paper-doll-design-manifest.md) and [repeatable asset workflow](../output/art-direction/modular-v2/README.md).

`src/art/puppet.ts` exposes the shared layout, fitting and drawing API. `src/art/modular-puppet.ts` constructs one continuous low-detail torso interior with fixed boundary pieces, sockets and capped zero/one/two-step tapers. Each actual limb gets a root; additional arm rows reserve 68 logical pixels vertically. Head and leg capacity determine separate upper/lower widths. Registered PNGs and measured landmarks live in `public/grotesque/modular-v2/`.

Every existing anatomy variant resolves to new art. Living, rat, serpent, bone, clockwork and ganglion have distinct cutouts; necrotic uses individually tinted flesh heads and bone limbs. Torsos use flesh, fur, scales, bone or metal. Materials remain local to each graft. Symmetry is permitted and does not dictate creature composition.

Head equipment uses the crown interface and shared crown art. Cleavers use registered grip anchors; other weapons and footwear retain their equipment icons at declared host mounts. Each host's actual hand pixels are drawn over the handle. Chest equipment and internal organs retain their gameplay effects and inventory UI; visible torso equipment is still an open art pass.

## Motion

`src/game/attack-motion.ts` and the deterministic combat engine own preparation, contact and recovery phases. The new renderer consumes `Pose.arms` per weapon instance and rotates limbs around registered shoulders. Removing old art does not change activation clocks, damage timing, own-hit effects or branch ancestry.

Walking uses a small hip rotation and integer body translation. Static bodies do not bob or shimmer. Death and hurt have simple presentation transforms. No legacy windup/item-swing fallback schedules remain in the renderer.

## Review and existing checks

Start the offline Vite server and open `art-study.html`. It mounts the actual DressingRoom and Arena. Run `node scripts/capture-modular-study.mjs` to save room, combat, mixed anatomy, catalogue and motion captures.

The existing `node scripts/puppet-check.mjs` verifies painted alpha connectivity at every root, grip, foot and face across eight anatomies, three poses and both attack directions. Its landmarks now match the registered modular frames. Output is `test-results/frankentower-puppet-composition.png` by default. Set `FRANKENTOWER_LOCAL_URL` and `FRANKENTOWER_BROWSER_EXECUTABLE` when necessary.

Structural acceptance is separate from final art polish. Texture repetition, socket finish, consistent pixel detail, individual headgear and footwear still deserve later art passes.
