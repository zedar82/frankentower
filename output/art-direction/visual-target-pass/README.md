# Visual target assets and review

These are actual runtime assets and in-game captures for the UI target pass,
not replacement concept screenshots. Status and acceptance remain in
[`docs/visual-target-pass.md`](../../../docs/visual-target-pass.md).

## Repeatable RUN workflow

Run from the repository root, with an authenticated RUN CLI. The runners accept
`RUNDOT_EXECUTABLE` to select the CLI installed on another machine. They use
production game `mjkCVhrId815cvHaoaqj` for asset generation; they do not publish.
No credentials or private preview links are included here.

1. Author a versioned prompt manifest. Supply only
   `public/ui/quartermaster-scene-v1.png` as the **style** reference, rather than
   supplying the part to imitate. Specify silhouette, viewpoint, material,
   empty space and attachment landmarks. Use new IDs/outputs for retries.
2. For opaque scenery, run `node output/art-direction/visual-target-pass/generate-alcove.mjs <manifest.json>`.
   Accepted examples are `alcove-prompt.json`, `alcove-landscape-prompt.json`,
   `clinic-prompt.json`, `clinic-landscape-prompt.json` and `arena-prompt.json`.
3. For cutout equipment, run `node output/art-direction/visual-target-pass/generate-armour.mjs <manifest-array.json>`.
   `armour-prompts.json` and `gear-prompts.json` are accepted examples. Use plain
   white generation backgrounds and RUN `birefnet` removal. The runners preserve
   completed files and stop on errors. If RUN returns a rate-limit retry interval,
   wait that interval before rerunning; completed jobs are skipped.
4. Visually review original PNGs before selecting them. Copy accepted files to
   `public/ui/` or `public/grotesque/items/`. Preserve originals and CLI sidecars.
5. Start the offline Vite server. Measure transparent equipment with
   `node output/art-direction/visual-target-pass/measure-gear.mjs <basename> ...`.
   `FRANKENTOWER_LOCAL_URL` and `FRANKENTOWER_BROWSER_EXECUTABLE` override the
   local URL and Chrome path. Measurement reads source RGBA; it never edits PNGs.
6. Register measured crops in `src/art/item-assets.ts`. Crown-family equipment
   must fit the existing 44×25 frame with base-edge forehead registration. Held
   items require a grip, shaft axis, frame and hand layer; the wooden shield
   preserves the common central-boss profile. Do not centre a held weapon as if
   it were an inventory thumbnail. Inventory and equipped sprites must agree.
7. Register scenery using standing planes/floor landmarks. The stone step uses
   `display-step-v2-measurements.json`; arena landmarks are in
   `arena-chamber-v1-geometry.json`. Register artwork to gameplay geometry,
   rather than changing combat to accommodate a generated picture.
8. Review the actual DressingRoom/Arena at phone, desktop and short heights.
   Use existing browser/attachment checks, and retain meaningful captures in
   `review/`. Keep full rules and prices as live UI, never baked into images.

Model: `gemini-3.1-flash-image-preview`. Opaque scenery costs 120 RUN credits per
accepted image; the selected cutouts cost 165 each including removal. Eleven
assets in this pass total **1,590 credits**. Do not infer remaining jam credits
from the account-wide balance, which may include other allocations/activity.

## Review captures

Shop/clinic review saves use a legitimate mixed two-head build, equipped via the
same renderer as the game. The initial four stock items mirror the reference;
additional captures exercise Bleed, Poison, Mana cost and reaction notation.
Local captures include the ordinary/equipped shop, intermediate-height fallback,
effect symbols, clinic, start, equipment, help, outcomes and recovery. Arena
captures come from the existing spatial combat check. `shop-private-host.png`
is the actual private RUN 1.8.16 frame after purchase/cloud reload.
`shop-hud-mobile.png` and `shop-hud-desktop.png` show the subsequent local
removal of persistent branding; these are separate from the earlier captures.
