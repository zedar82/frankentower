# FRANKENTOWER paper-doll design manifest

**Status:** Iteration 4, structural assembly accepted and adopted on 2026-10-11. The [assembly specification](modular-body-assembly.md) and [asset workflow](../output/art-direction/modular-v2/README.md) describe the implemented contract. Final artwork and equipment polish remain open.

**Purpose:** Give the team one contract for designing interchangeable creature parts. A valid paper doll must read as one anatomically connected creature across supported anatomy combinations, and held or worn equipment must sit predictably on its host.

## Design test

Judge the assembled creature as a silhouette first, an anatomical construction second, and a collection of assets last. Coordinates, draw counts, and anchor error are useful diagnostics; they do not establish visual acceptance.

The two-arm human is the baseline. Added limbs require visible supporting anatomy in the torso assembly. Do not stretch a finished humanoid torso to make room, or place extra limbs on an otherwise unmodified humanoid silhouette.

## Art style and variation

Keep the grotesque cartoon style and chunky pixel-art rendering. Any body part may use any colour, texture or material appropriate to its concept. Mismatches between grafted parts are central to the character design; the common style does not require a common palette or material.

Asymmetry is optional, not an authoring objective. Symmetrical silhouettes and balanced faces are valid. Do not introduce extra eyes, mouths or distorted facial placement just to make a part asymmetric. Authored unusual anatomy must have a clear concept and remain readable at game scale.

## Shared visual coordinate system

The current [geometry.json](../public/grotesque/modular-v2/geometry.json) records registered frames and anchors. The [asset workflow](../output/art-direction/modular-v2/README.md) records accepted construction dimensions, maximum envelopes, crown clearance and capped taper. Earlier construction templates were removed; Git history retains those experiments.

| Property | Draft requirement |
| --- | --- |
| View | The current templates use strict frontal orthographic projection. Every component and equipment item uses the same view; changing it requires revising the whole family. |
| Canvas | A shared authoring frame with fixed registration. Registered frames are 64 × 64 for heads, 96 × 112 for arms and 32 × 72 for legs. Transparent clean exports and declared silhouette envelopes. |
| Scale | A common body scale and consistent part proportions. Avoid correcting fit with per-part stretching. Uniform scaling is allowed for final composition and target display size. |
| Lighting | One consistent, soft frontal lighting direction and shared rendering conventions. Each material keeps its own colour and texture. |
| Axes | Local registration origin is (0, 0); +X right; +Y down. PNG frame origins and anchors are declared in geometry.json. Preserve the frame when painting or exporting; avoid per-asset cropping that shifts registration. |
| Mirroring | Declare whether each component is authored for left/right use or may be mirrored. Mirroring must preserve attachment and equipment orientation. |
| Small-size read | Core silhouette, limb separation, attachment, and held equipment remain legible in the actual arena composition at 64, 128, and 256 px creature heights. |

Every asset declares its local bounds, scale class, camera/view, layer, attachment point, overlap/seam region, and compatible interfaces. Every equipment asset additionally declares its host anchor and intended orientation. Components may occupy different positions when assembled, but their authored view, scale, and local interfaces stay consistent.

Define maximum width, height and directional overhang for each interface or supported size class. The torso reserves those envelopes, including relevant headgear, footwear and arm movement clearance. Artists may vary silhouettes inside them; the shared canvas is not itself a sufficient spacing rule.

## Anatomical assembly model

Represent the torso as a construction assembled from parts with explicit sockets. A rendered limb attaches to a named socket belonging to a visible torso component; the socket component supplies the surrounding tissue, seam, and overlap needed to make the connection read as anatomical.

### Torso component roles

| Component role | Responsibility | Iteration questions |
| --- | --- | --- |
| Interior fill | Repeatable, relatively low-detail material inside the constructed boundary. Contains no complete repeated chest or ribcage and no permanent attachment anatomy. | Does repetition remain unobtrusive at actual game scale? |
| Shoulder adapter | Supplies one arm socket and the surrounding shoulder tissue/overlap. One adapter is placed for each actual arm. | Does the joint read as part of the body, and remain continuous when the arm moves? |
| Top deck and neck collar | Deck tiles finish the upper trunk; each head receives its own separate collar and neck frame. | Does the top expand convincingly for multiple heads without hidden conventional shoulders? |
| Lower deck and hip adapter | Deck tiles and endcaps finish the lower trunk; each leg receives its own hip socket. | Do multiple legs retain plausible roots, spacing, and sole alignment? |
| Side edges and endcaps | Finish exposed surfaces with fixed reusable pieces. Plain edges remain where there is no limb. | Are joins continuous without stretching the components or implying an absent limb? |

Calculate upper and lower widths independently from head and leg capacity. Unequal demand may create broad shoulders with narrowing hips, or a narrow upper body expanding toward broad hips. Use authored compatible taper transitions, respecting arm capacity and maximum part envelopes. Similar demands may produce a balanced silhouette; asymmetry is optional.

Prototype a small pre-rendered taper library: straight, one-step and two-step transitions at canonical scale. Steps describe standard layout width increments derived from reserved envelopes, not raw head/leg count differences. Cap visual taper at two steps for larger mismatches; do not chain transitions to reproduce the full difference. Retain surplus width or closed sections at the narrower end as needed, while reserving all actual part and equipment envelopes. Accepted steps change total width by 16 px; transitions are 48 px high and distributed equally across both sides.

The base two arms use separate left and right shoulder adapters on the upper torso section. Additional arms use further adapters and supporting torso sections. Use two arms per row, alternating sides, with 68 px between rows to reserve the declared envelopes. Do not infer a socket by interpolating along a broad torso edge or band.

An unused side stays a plain trunk edge. A zero-arm torso has no shoulder adapters; a one-arm torso has one. The third arm adds one shoulder on the next row, leaving the opposite side plain. The one-arm and three-arm builds must look intentional. Every gameplay arm slot receives a declared host socket.

The assembly plan maps anatomy IDs to component IDs, socket IDs, local transforms, and draw layers. It must account for all parts before drawing. It may grow or rearrange the torso by adding authored components; it must not hide incompatibility by distorting an authored asset.

## Attachment and equipment interfaces

| Host | Required interface | Equipment must declare |
| --- | --- | --- |
| Arm/hand | Shoulder root and local arm axis; grip point and hand-facing direction. | Grip anchor, wielding orientation, mirror behavior, and the allowed swing envelope. |
| Leg/foot | Hip root and local leg axis; ground/sole point. | Footwear mount, sole alignment, mirror behavior, and ground clearance. |
| Head | Neck root and head-facing direction; crown mount and declared headgear envelope. | Crown mount, orientation, layer and compatible host interfaces. |
| Torso | Supporting attachment geometry and any internal-organ presentation. Visible conventional chest armor remains an open design decision. | Any retained chest presentation needs explicit coverage/attachment rules. |

Parts that share an interface use the same local scale and orientation convention. An attachment interface includes an overlap/occlusion region, not only a mathematical point: the host must visually cover or join the component at the root. Equipment stays attached to the host's declared anchor through every supported animation pose. Any exception must be explicit metadata and pass a visual review; it must not be an item-name exception in combat code.

Headgear uses crown-compatible hats, caps and helmets. Exclude wrapping hoods and face-opening garments; existing hood-based item artwork and names should be replaced during the equipment pass. Compatibility is declarative. A crown anchor does not imply that every head can wear every item.

## Iteration matrix

Capture the same style, camera, lighting, renderer, and display size for every candidate. Begin with neutral poses and no equipment; add movement and equipment after the anatomy reads.

| Pass | Build examples | What it proves |
| --- | --- | --- |
| Baseline | Two arms, one head, two legs, interior fill and constructed boundary components. | Visible shoulder roots correspond to the depicted body; no alignment guesswork. |
| Zero and odd counts | Zero arms; one arm; three arms; one leg; three legs. | The number of supporting socket components follows actual anatomy; absent limbs leave plain edges. |
| Added torso modules | Four arms; six arms; eight arms. | Each arm has a visible host; added trunk rows integrate into a continuous body instead of floating beside it. |
| Other body plans | Headless with controller; multiple heads; many legs; rat and bone materials. | Shared assembly rules support materially different builds without losing readable connections. |
| Imbalanced capacity | Many heads with few legs; few heads with many legs; unequal arm counts on each side. | Taper and reserved envelopes create useful silhouettes without crowding appendages. |
| Equipment fit | Weapon on each hand type; mirrored weapons; footwear on each leg type; crown headgear; any retained chest presentation. | Equipment has predictable size, orientation, clearance, and attachment on every compatible host. |
| Animation | Neutral, walk, attack, hit, and mirrored facing. | Roots remain joined, equipment stays attached, and motion respects the silhouette. |
| Arena read | 64, 128, and 256 px creature heights against the pixel-art arena. | Form and combat action survive their real use sizes and contrast. |

Use representative combinations, not only a maximal stress build. Review the two-arm baseline before approving any expansion. Review odd counts because surgery may add a single limb. Do not treat passing anchor checks as acceptance for a combination whose assembled silhouette has not been inspected.

## Acceptance checklist

- [ ] Every part uses the shared camera, axes, scale convention, lighting, and style.
- [ ] The two-arm baseline's roots visibly meet its depicted shoulders.
- [ ] Every additional arm has a named socket on an assembled torso component with visible supporting anatomy.
- [ ] Torso joins are authored and continuous; adding capacity does not stretch a fixed humanoid body to fake a new body plan.
- [ ] Zero and odd limb counts create exactly the required supporting socket components; absent limbs leave intentional plain edges.
- [ ] All supported anatomy/equipment mappings resolve to declared interfaces before render.
- [ ] Maximum width/height and overhang envelopes are defined and reserved by the torso layout.
- [ ] Head/leg capacity imbalance produces supported shoulder/hip taper without stretching interface artwork.
- [ ] Grip, footwear, crown-headgear and any retained chest attachments remain predictable across compatible parts and all tested poses.
- [ ] Assemblies have no unexplained gaps, detached joints, hidden limbs, collisions that change their anatomical reading, or equipment clipping.
- [ ] Silhouettes and equipped items remain legible in arena-size captures.
- [ ] Visual review passes separately from coordinate, alpha-connectivity, and asset-count checks.

## Iteration record

Use this section to record decisions. Do not silently replace open questions with measurements made from an unapproved concept image.

| Revision/date | Decision or question | Evidence/reference | Owner/status |
| --- | --- | --- | --- |
| Draft 1 | Establish component-built torsos, fixed shared perspective and equipment interfaces as requirements. The earlier whole-torso rendering tests did not produce coherent attachment anatomy and have been removed. | `docs/visual-direction.txt`; `docs/art-prototype.md` | Superseded by Draft 2 |
| Draft 2 | Replace baked shoulder pairs with individual adapters and fixed trunk cells. Render zero/one/three-arm cases, two/four/six-arm comparisons, and mixed equipment using one source of component geometry. | Historical construction study (removed; retained in Git history) | Rendered and inspected; design acceptance pending |
| Draft 3 / 2026-10-11 | Adopt interior fill plus constructed boundaries; require taper for unequal head/leg demand, maximum part envelopes with reserved torso capacity, and crown-compatible headgear. Remove wrapping hoods from the art direction. | [Modular body assembly specification](modular-body-assembly.md); user design review | Direction agreed; numerical geometry and in-game prototype pending |
| Iteration 4 / 2026-10-11 | Accept modular construction, reserve registered part envelopes, adopt the renderer for all anatomy families and remove legacy body/animation assets. | [In-game captures](../output/art-direction/modular-v2/README.md) and Daniel’s structural approval | Implemented; material and equipment polish remain |
