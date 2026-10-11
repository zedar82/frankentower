# RUN asset-generation trial

11 October 2026. Evaluation only. The UI goal resumed after this trial;
new UI materials use RUN generation. Trial body parts remain outside production.

## Result

RUN can generate distinct parts from a single common style reference. The first
target-image experiment produced near-copies and was stopped after three images
(450 credits). Do not use that experiment as the new-part workflow.

The [style-only trial](style-reference-v2/) generated a toad head, shell-plated arm,
goat leg and fresh dungeon alcove. Every request supplied exactly one image,
explicitly labelled as style only. No target-part artwork or geometry diagram was
supplied. Composition and attachment constraints were written into the prompts.

The initial reference was the registered human head. Its small bitmap and the
prompt's “chunky clusters” / “three-tone” language led to much coarser art. A head
retry using the original full-resolution human-head source and finer shading
instructions improved the detail substantially. Both prompt and reference changed,
so this trial does not isolate which change contributed more.

The new four-image set cost 615 RUN credits; the finer head retry cost 165.
Total for this comparison: **780 credits**. Including the earlier reproduction
experiment: **1,230 credits**. Prices were queried through RUN's live estimator.

## Evidence

- [Head comparison at identical bitmap/display size](style-reference-v2/review/head-detail-comparison.png).
- [Raw attachment placement in the actual DressingRoom](style-reference-v2/review/run-dressing-room.png).
- [Measured registration in the actual DressingRoom](style-reference-v2/review/calibrated-dressing-room.png).
- [Registered assembly and strike poses](style-reference-v2/review/calibrated-assembly.png).
- [New dungeon background](style-reference-v2/sources/dungeon-background.png).
- [Full prompts and generation parameters](style-reference-v2/prompts.json).
- [Finer-detail prompt](style-reference-v2/detail-prompt.json).
- [Raw geometry measurements](style-reference-v2/measurements.json).
- [Measured source landmarks](style-reference-v2/landmarks.json).
- [Registration measurements](style-reference-v2/calibrated/measurements.json).

The captures use the real drawPuppet and DressingRoom implementations. Browser
request interception substitutes candidate PNGs and their metadata only in the
review browser. Production code and assets were not replaced.

## Limits and acceptance

- The original toad head was coarser than the established artwork. Its requested
  crown point was empty, and the painted neck extended beyond the requested bounds.
- The arm had about 20.4% of its painted source pixels outside the prompted
  envelope. The raw weapon placement missed the fist. Measured shoulder/grip
  registration improves attachment, but clips about 0.47% of the source pixels:
  **reject this arm for production** until corrected or regenerated.
- The goat leg included thin unwanted rectangular lines in the generated source.
  Background removal did not remove all of them. **Reject this leg for production**.
- The finer head fits the canonical frame without clipping after uniform
  registration, with its crown mount measured from the actual source.
  It is a usable art candidate, subject to Daniel's visual review.
- The new background is distinct but simpler and flatter than the richly textured
  visual goal. It is a study, not an accepted replacement.
- Empty-space or coordinate instructions are approximate generation constraints,
  not reliable attachment metadata. Geometry checks and actual renderer inspection
  are required after generation.

## Repeatable process

1. Use ONE original full-resolution style exemplar shared across new part requests.
   The successful detail retry used
   `output/art-direction/modular-v2/sources/head-flesh.png`.
   Prefer a full-resolution source over an already registered/downsampled sprite.
2. Say explicitly that the image supplies drawing conventions only. Define a new
   subject and its own material/colour in text. Do not ask for the same silhouette
   or appearance as the reference. Symmetry is welcome; extra eyes/mouths are not
   added merely for asymmetry.
3. Describe fine source-bitmap detail separately from logical game geometry.
   Logical 64-unit dimensions must not become a 64-pixel artwork target.
   Match the exemplar's shading density and curved stepped contours.
4. Specify view, maximum envelope, neck/crown or shoulder/grip or hip/sole
   landmarks, pose and equipment clearance as percentages of the complete canvas.
   Do not send a target-part picture or a geometry picture.
5. Request one isolated cutout on a plain background. Avoid the word “frame” when
   describing a leg's reserved space: the model may draw the frame itself.
   Inspect the generated source and alpha for unwanted lines before registration.
6. Query the current game-scoped price before generation. Current creator access
   exposes Flash and Flash Lite; a price quote does not prove model availability.
   Keep the model explicit. This trial used Flash plus BiRefNet background removal.
7. Save the prompt, model, reference path and CLI JSON sidecar with the source PNG.
   Keep originals, revisions and rejected outputs distinct.
8. Measure actual landmarks. Uniformly scale, rotate and translate into canonical
   canvases using the existing registration approach. Never stretch X/Y separately
   or change renderer geometry to accommodate a generated part.
9. Measure alpha bounds, clipping and connected attachment regions. Reject
   frame/guide artifacts, oversized silhouette, missing mounts or excessive
   clipping. A sampled opaque pivot alone does not prove the landmark is correct.
10. Inspect actual game rendering with other materials, multiple appendage rows,
    crowns, weapons and attack poses before promoting a candidate.

## Commands

The generator supplies a single style reference and saves outputs non-destructively.
It spaces request starts to avoid the rate limit encountered in the first trial.
Generation spends credits; review/registration commands do not.

~~~powershell
rundot generate image-models
rundot generate estimate image --game-id mjkCVhrId815cvHaoaqj --model gemini-3.1-flash-image-preview --remove-background --remove-background-model birefnet --json
node output/art-direction/run-generation-study/style-reference-v2/generate.mjs
node output/art-direction/run-generation-study/style-reference-v2/generate-detail.mjs
npm run dev:offline -- --port 5175 --strictPort
node output/art-direction/run-generation-study/style-reference-v2/review.mjs
node output/art-direction/run-generation-study/style-reference-v2/register.mjs
node output/art-direction/run-generation-study/style-reference-v2/review.mjs --registered
~~~

Author a new versioned manifest for future parts rather than overwriting this
trial's prompts and measurements. The detail generator is for the recorded retry,
not a bulk-generation entry point.
