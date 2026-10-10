# Paper doll — construction study 01

Start with [construction-board.png](construction-board.png), then [socket-count-board.png](socket-count-board.png) and [equipment-board.png](equipment-board.png). The PNGs were rendered from the same SVG component definitions used in the individual templates. Their editable SVG counterparts sit beside them.

This proposal establishes shared proportions and explicit attachment surfaces before drawing finished art. All components use a strict frontal orthographic view. The neutral pose, component size, silhouette envelope, and attachment frames are fixed. The human and bone arm samples share their shoulder, elbow, and grip coordinates.

## Torso construction

The trunk consists of complete 64 × 80 unit cells. Add rows for more arms and columns for more heads or legs. Each exposed edge is finished with a reusable top deck, side edge, lower deck, or curved lower endcap. These parts provide a continuous body without stretching a humanoid torso.

A shoulder adapter supplies the tissue and overlap surrounding **one** arm root. It is a separate component placed only where an actual arm exists. The first two arms occupy opposite sides of the upper row; the third occupies one side of the next row. That row's unused side stays a plain edge. A zero-arm torso contains no shoulders. Pairing is a placement rule for the current draft, not anatomy painted into a trunk asset.

Neck collars and hip adapters work the same way: one visible supporting component per head or leg. Head count determines collar placement; leg count determines hip placement. The trunk itself contains no permanent neck, shoulder, or hip socket.

## Files for artists

- `templates/`: 16 editable SVG guides and matching 512 × 512 PNGs. Each guide shows a fixed grid, origin, silhouette envelope, and named attachment/equipment points.
- `clean/`: the same component silhouettes on transparent backgrounds, in SVG and PNG. Use these as starting shapes or underlays.
- `assemblies/`: transparent assembled figures for zero, one, two, three, four, and six arms, plus a mixed equipped example.
- `geometry.json`: exact local coordinates, envelopes, dimensions, and current assembly rules.
- `generate.mjs`: one source of shapes and placement rules for both the individual templates and proof boards.
- `render.py`: optional Cairo/Rsvg export helper used for the PNG previews.

Every individual asset uses the same 512 × 512 frame with a 256 × 256 unit viewBox. One design unit equals two export pixels. The local origin is always the middle pixel (256, 256). Preserve that registration when painting over a guide; do not recrop each part around its opaque pixels. Placement may translate or reflect a component. Fit the complete assembled figure to the display with uniform scaling.

The equipment samples use host-local frames: mace at the grip, boot at the ankle with a matching sole, helmet at the crown, and chest plate on the upper central trunk. The hand is drawn over the handle so it visibly holds the weapon. The samples use the same equipment on both arm variants without corrective offsets.

## What to review next

1. Are the ordinary body's head, shoulder, trunk, arm, and leg proportions useful as production templates?
2. Does an added torso row give its additional arms convincing physical support?
3. Is the relaxed arm pose suitable for equipment and combat animation, or should the shared bend/hand orientation change?
4. Should the 80-unit row spacing or 64-unit column spacing change? Change the common model before painting variants.
5. Can finished art soften the cell seams while preserving the same join surfaces and envelope?

These figures are a starting geometry proposal. They have been rendered and inspected for continuity and obvious clipping. Dense attack poses, small arena rendering, extreme anatomy, and finished materials remain unproven. Current row and column packing is deliberately simple; visually different body plans may eventually need additional component families that share the same interfaces.

## Reproduce

From the repository root:

```powershell
node output/art-direction/paper-doll-templates-v1/generate.mjs
```

Open the resulting SVGs in a browser or vector editor. To reproduce the PNGs with the installed GIMP Python environment used here:

```powershell
& 'C:/Users/msn/AppData/Local/Programs/GIMP 3/bin/python.exe' output/art-direction/paper-doll-templates-v1/render.py
```

Other SVG renderers can export the same files. The generator requires only Node's standard library.
