# UI materials and in-game review

11 October 2026. These are reusable materials for live game layouts, not a
baked interface screenshot. See [UI expectations](../../../docs/ui-expectations.md)
and [implementation review](../../../docs/ui-review.md).

## Production artwork

| File in `public/ui/`         | Source                                         | Use                                                             |
| ---------------------------- | ---------------------------------------------- | --------------------------------------------------------------- |
| `quartermaster-scene-v1.png` | Built-in image generation before the RUN trial | Dark dungeon wall, side torches and counter behind live content |
| `parchment-frame-v1.png`     | Built-in image generation before the RUN trial | Adaptive patient records and stock cards                        |
| `iron-frame-v1.png`          | Built-in image generation before the RUN trial | Header, workspaces and supporting regions                       |
| `display-stage-v1.png`       | RUN Flash + BiRefNet, quoted 165 credits       | Transparent stone plinth beneath the assembled creature         |
| `button-timber-v1.png`       | RUN Flash, quoted 120 credits                  | Quiet dark wood backing for live controls                       |

The RUN assets cost **285 credits** together. The body-generation trial used
1,230 credits separately. No runtime inference is enabled.

All labels, rules, prices, meters and interactions remain live HTML/canvas.
`src/ui-materials.css` applies nine-slice frame borders: source slice 240 pixels,
ordinary display border 22 pixels, reduced for compact layouts. Frames fit the
actual element without extending its layout bounds or intercepting input.
The timber is a background texture with live focus/selected/disabled states.

The embedded DressingRoom uses its actual display aspect ratio. The stone
plinth's standing plane is registered to the creature's ground line; short
views scale the plinth to preserve the whole stage. Resting-pose bounds let
the shop show a larger creature without reserving every combat swing. Combat
continues using the full attack envelope. All canvas drawing respects display
size, DPR and nearest-neighbour sampling.

## Repeat generation with RUN

1. Define a new versioned asset and save its prompt in this directory. Describe
   its view, footprint, usable interior, material density and prohibited content.
   Keep text, numbers and interaction out of generated artwork.
2. Supply one original full-resolution image as **style only**. Both RUN jobs
   use `public/ui/quartermaster-scene-v1.png`; neither supplies the object to copy.
3. Query the current game-scoped estimate before spending. For isolated props,
   request a plain background and BiRefNet removal. Filled material tiles do
   not require background removal.
4. Save the PNG and its CLI JSON sidecar. The sidecar records the exact prompt,
   model, seed and generation ID. Keep references and quoted costs in the manifest.
   Move sidecars into `metadata/` before the production build; only runtime PNGs
   belong in `public/ui/`.
5. Inspect the source and alpha, then mount it in the actual UI. Review live
   content at portrait, landscape and desktop sizes before promoting it.
6. Keep accepted versions intact. Give retries and replacements new filenames.
   Failed body-part trials are documented in [the RUN study](../run-generation-study/README.md).

Exact RUN manifests: [stage](run-stage-prompt.json), [timber](run-timber-prompt.json).
The stage, timber and visual-target-pass launchers share
`scripts/run-rundot-image-manifest.mjs`. It validates each complete manifest
before launching, skips existing outputs, supports one job or a job list, and
reads the CLI from `RUNDOT_EXECUTABLE` (default: `rundot` on `PATH`). Validate
without spending credits with:

```sh
node scripts/run-rundot-image-manifest.mjs output/art-direction/ui-pass/run-stage-prompt.json --validate-only
```

Manifests retain the prompt, model, reference, output, quoted estimate and date;
set `FRANKENTOWER_RUN_GAME_ID` only when targeting a different RUN project. Use
a new versioned output for retries.

[Earlier built-in provenance](prior-prompts.json) records the source filenames.
The scene prompt was recovered from the subsequent trial manifest. Complete
original frame prompts were not persisted, so that file explicitly records the
gap; the accepted PNGs are retained as future style exemplars.

## Captures

`review/` contains actual game screenshots, refreshed on 13 October.
These demonstrate rendered output; automated fit checks are recorded separately
in the UI review. The phone Patient screen uses the compact record strip rather
than the former large name/health panel. Short-landscape 844×342 captures show
the layout fixes included in private RUN version 1.8.14. Hosted captures show the
actual RUN browser viewport and toolbar, without private URLs or credentials. See the
[implementation review](../../../docs/ui-review.md) for command results,
zoom coverage and the host automation limitation. The
[handoff](../../../docs/ui-pass-handoff.md) preserves the earlier checkpoint.
