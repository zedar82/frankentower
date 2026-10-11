# Frankentower — Modular Body Assembly Specification

**Status:** Structural assembly accepted by Daniel on 2026-10-11; implemented as the default renderer.
**Purpose:** Replace the current rectangular, expanding torso renderer with a modular construction system that produces more organic creature silhouettes while preserving arbitrary anatomical combinations.

**Prototype evidence:** [Modular assembly study 02](../output/art-direction/modular-v2/README.md) records generated mix-and-match parts, accepted construction dimensions and actual dressing-room/combat captures. Structural assembly is accepted; final material, seam and equipment polish remains open.

## 1. Design objective

Frankentower allows creatures to have variable numbers of heads, arms and legs, using interchangeable anatomical artwork.

Earlier rendering repeated rectangular torso sections and then stretched one torso image into an expanding rectangular frame. Both approaches produce awkward proportions as appendage counts increase. Existing anchors also do not guarantee convincing anatomical or equipment attachment.

The adopted solution is to assemble the torso from multiple smaller pieces with strictly defined geometric interfaces.

The system must:

- Support arbitrary numbers and combinations of heads, arms and legs within practical rendering limits.
- Support different torso materials and appearances, such as flesh, bone and fur.
- Preserve interchangeable anatomical assets.
- Produce a continuous, reasonably organic silhouette.
- Avoid requiring unique artwork for every anatomical configuration.
- Allow new assets to be generated through a repeatable pipeline without manually adjusting the renderer for each asset.
- Retain the deliberately grotesque, visibly assembled appearance of Frankentower's creatures.

The system does not need to produce anatomically realistic creatures. Awkward proportions and visible surgical joins are acceptable and may be desirable.

### Art style and variation

Retain the grotesque cartoon style in the game's chunky pixel-art treatment. Every body part may have its own colour, texture and material; mismatched grafts are central to the appearance. This applies to all parts, including torsos, heads, arms and legs. Fur, scales, bone and tissue are examples, not palette restrictions. No shared pink palette or global material treatment is required.

Keep the drawing conventions consistent: view, pixel density, outline treatment and lighting. Different materials should retain their own appearance within those conventions.

Asymmetry is allowed, but is neither a requirement nor an art-generation goal. Symmetrical parts and balanced faces are equally valid. Do not add extra eyes, mouths or displaced facial features merely to create asymmetry. Unusual anatomy should serve a specific part concept and remain readable at game scale.

## 2. Core architecture

The torso is no longer treated as a single sprite. It consists of three conceptual layers.

### Interior

Repeatable torso material that fills the space between the creature's outer boundaries.

Examples include flesh, bone-and-tissue, fur and other biological materials.

Interior artwork should be relatively low-detail and designed for repetition. Prominent features such as complete ribcages should not repeat across every cell.

### Boundary

Pieces that define the visible outer silhouette of the torso.

These include corners, shoulders, hips, attachment connectors and closed edges.

The boundary is responsible for making the creature appear organically assembled rather than rectangular.

### Appendages

Heads, arms and legs attached to the appropriate connectors.

Appendages remain independent assets and continue to use the existing paper-doll animation approach.

## 3. Required torso components

| Component | Purpose |
|---|---|
| Neck connector | Top boundary section supporting an attached head |
| Top empty section | Top boundary section without a head |
| Left shoulder | Upper-left corner of the torso |
| Right shoulder | Upper-right corner of the torso |
| Left arm connector | Left boundary section supporting an arm |
| Right arm connector | Right boundary section supporting an arm |
| Left empty edge | Closed left boundary without an arm |
| Right empty edge | Closed right boundary without an arm |
| Left hip | Lower-left corner of the torso |
| Right hip | Lower-right corner of the torso |
| Leg connector | Bottom boundary section supporting a leg |
| Bottom empty section | Closed bottom boundary without a leg |
| Interior fill | Repeatable torso material |

The shoulder and hip components establish transitions between horizontal and vertical boundaries.

The arm and leg connectors establish attachment interfaces. Empty sections allow a boundary to remain visually complete when no appendage is present.

The top and bottom empty sections are proposed counterparts to the explicitly discussed armless and legless sections, ensuring that the system can construct valid boundaries without requiring every position to contain an appendage.

## 4. Defined geometric interfaces

Every component must conform to a shared geometry specification.

**The renderer owns geometry; artwork must conform to it.**

Each component should declare or inherit:

- Logical dimensions in the renderer's coordinate system.
- Connection points to neighbouring torso components.
- The orientation of each connection.
- The width or height of each connection interface.
- Attachment anchors for appendages, where applicable.
- Permitted visual bounds outside the logical cell.
- Layering and overlap rules.

### 4.1 Torso-to-torso interfaces

Adjacent torso components must share compatible edge dimensions.

Their joining edges should align without gaps or unintended overlap.

The artwork may use controlled overlap to conceal seams, but this overlap must follow a documented rule rather than being adjusted individually for each asset.

The exterior contour may be irregular. Only the interfaces between components need to be standardised.

### 4.2 Appendage interfaces

Each attachment connector defines a standard appendage interface.

A neck connector defines where a head attaches, the available connection width and the direction in which the head extends.

An arm connector defines the shoulder position, the available shoulder width and the arm's rotation pivot.

A leg connector defines the hip attachment position, the available connection width and the leg's pivot.

The corresponding appendage artwork must provide a compatible attachment region.

The rest of the appendage is free to vary substantially in size and silhouette, subject to reasonable rendering bounds.

### 4.3 Interface dimensions

Exact numerical dimensions are not specified in this proposal.

They should be derived from the existing renderer's coordinate system and current asset sizes, then recorded centrally.

Individual assets must not introduce their own incompatible interface dimensions.

### 4.4 Maximum part envelopes and clearance

Define maximum width and height for each supported head, arm and leg interface. These limits are measured relative to the attachment anchor at the shared body scale, including permitted overhang in each direction. A common canvas size alone does not establish an occupied-space limit.

Each asset declares its actual visual bounds within its allowed envelope. The assembly reserves space using the maximum interface envelope, so replacing one compatible part does not require bespoke spacing adjustments. Oversized parts require an explicitly supported size class rather than arbitrary stretching or an unbounded exception.

Head spacing includes the permitted crown-headgear envelope. Arm rows reserve the agreed movement and held-equipment clearance. Leg positions reserve their footwear envelopes and share a defined ground line. Animation can include deliberate overlap, but idle poses must preserve readable heads and separate limbs.

The torso must provide sufficient attachment spacing and supporting boundary geometry before appendages are drawn. If the anatomy exceeds available space, the layout adds sections or expands within the agreed limits.

### 4.5 Pixel scale

The geometry prototype must establish source pixel density, target display sizes and pixel-stable animation placement. Validate the assembled result at actual dressing-room and combat scale. Correct anchors do not establish visual acceptance when downsampling produces noisy or unstable artwork.

## 5. Torso construction

The renderer should construct a creature from its anatomical configuration using a deterministic process.

### Step 1 — Determine required capacity

Read the creature's anatomical definition and determine the number of head, arm and leg attachments required.

Calculate the necessary torso width and height, including additional rows or sections when appendage counts exceed the available boundary positions.

Calculate separate required upper and lower spans from head and leg envelopes, with additional side capacity for arm rows. These spans guide shoulder and hip taper rather than forcing every torso row to have the same width.

### Step 2 — Construct the interior

Create an interior region large enough to support the selected attachment layout.

Fill it with repeatable material appropriate to the creature's torso type.

Avoid simple repetition of visually dominant features.

### Step 3 — Construct the upper boundary

Place the left and right shoulder corner pieces.

Populate the intervening upper boundary with neck connectors for the required heads and closed top sections where needed.

### Step 4 — Construct the side boundaries

Place arm connectors on the left and right sides according to the creature's anatomy.

Use closed edge pieces for positions without arms.

Extend the torso vertically when additional arm positions are required.

The existing anatomical ordering should remain deterministic so that saved creatures reproduce the same visual configuration.

### Step 5 — Construct the lower boundary

Place the left and right hip corner pieces.

Populate the lower boundary with leg connectors and closed bottom sections as required.

### Step 6 — Attach appendages

Attach heads, arms and legs to their designated connectors using the shared anchor definitions.

Appendages should not require special-case positioning for each torso material.

### Step 7 — Apply layering and animation

Render torso interior, boundary pieces, attachment transitions and appendages in a consistent order.

Continue using simple paper-doll movement: pivot rotation, bobbing, wiggling and other lightweight transformations.

Full skeletal animation is not a requirement.

## 6. Organic silhouettes

The principal visual improvement comes from replacing hard rectangular boundaries with anatomical transitions.

Shoulders can slope into arms. Hips can curve toward legs. Neck connectors can rise naturally from the upper torso. Empty sections can close off unused positions with continuous flesh, fur or bone.

Individual components may have irregular contours, but their connection edges must remain compatible.

Different torso materials may use different boundary artwork while sharing the same geometry.

For example, a fleshy shoulder and skeletal shoulder can have very different appearances but must connect to the same adjacent torso components and appendage anchors.

### Shoulder and hip taper

Head and leg demand can produce different upper and lower torso widths. More head capacity than leg capacity can produce broad shoulders narrowing toward the hips; more leg capacity can produce a narrower upper body expanding toward broad hips.

Use compatible sloping or stepped boundary transitions to connect these spans. Arm connectors and reserved part envelopes may require a wider intermediate section. A zero-head or zero-leg body closes with authored boundary pieces rather than collapsing to zero width.

Taper is part of the deterministic layout, with a bounded slope or step size specified by the geometry prototype. Do not squash or stretch corner artwork to bridge an arbitrary width difference. Similar upper and lower attachment demands may produce a balanced body; deliberate asymmetry is optional.

Start with pre-rendered one-step and two-step taper transitions, alongside straight boundaries. This is the proposed small construction vocabulary for common shoulder/hip width mismatches. A step represents a standard layout width increment, not simply one extra head or leg; the required spans still come from the reserved part envelopes. The geometry prototype must define the increment, transition height and how the total width difference is distributed between the two sides, including odd differences.

Each transition has fixed joining interfaces and declared bounds. Author the required shoulder/hip orientations and left/right variants, or declare safe mirroring. Use the pieces at their canonical scale, with enough supporting space for arm connectors.

Cap the visual taper at two steps. Larger mismatches use the two-step taper and ignore the remaining difference for silhouette shaping; do not chain transitions or add further taper variants to match it exactly. The narrower end may retain surplus width or closed boundary sections. The torso must still reserve sufficient space for every actual appendage and its equipment envelope. This bounded taper is considered sufficient even when upper and lower capacity differ substantially.

### Scaling to extreme anatomy

Large creatures will still require expanded torsos.

The system should make these expansions look deliberately assembled rather than attempting to hide every construction seam.

A creature with eight arms may remain broad or unusually tall. Such proportions are acceptable.

The objective is to avoid accidental rectangular silhouettes, not to guarantee naturalistic anatomy.

## 7. Asset generation pipeline

The existing image-generation pipeline should be extended to produce torso modules against predefined geometry.

For each asset category, the pipeline should receive:

1. The component type and its anatomical purpose.
2. A canonical geometry template showing connection interfaces.
3. Required attachment anchors, if any.
4. The permitted silhouette envelope.
5. The intended material or visual treatment.
6. Existing style references.

The output must be validated against the geometry contract before inclusion.

Templates must preserve authoritative canvases, anchors, connection regions and maximum envelopes throughout export. Generated artwork that violates those constraints must be corrected or rejected; generation alone is not evidence of conformity.

A successful asset must be usable across multiple creatures without custom renderer changes.

### Repeatable artwork

Interior fill assets should avoid large distinctive patterns that become visibly duplicated.

Boundary pieces should avoid features that create obvious discontinuities when repeated.

The earlier skeletal torso, whose ribcage pattern repeated conspicuously across multiple cells, is an example of the problem this pipeline should detect.

## 8. Validation

New torso component families should be tested in assembled configurations, not merely inspected as individual sprites.

The regression set should include:

- A conventional one-head, two-arm, two-leg creature.
- A two-headed creature.
- A creature with multiple arms and arm rows.
- A creature with multiple legs.
- Head-heavy creatures with narrow hips and leg-heavy creatures with narrower shoulders.
- An asymmetric creature with missing appendages.
- A creature with many heads, arms and legs.
- Creatures using flesh, bone and fur torso treatments.
- Combinations of torso materials and mismatched appendage types.

Validation should check:

- No gaps between torso modules.
- No unintended exposed seams.
- Correct appendage attachment and pivot positions.
- Acceptable layering and overlap.
- No excessive repetition of distinctive artwork.
- Acceptable silhouettes at actual combat scale.
- Stable behaviour during basic paper-doll movement.
- Compliance with maximum part and equipment envelopes, including attachment spacing and tapered boundaries.

Both normal and extreme configurations matter. An improvement to the baseline creature must not break larger constructions.

## 9. Relationship to equipment

Equipment fitting is a related but separate problem.

This torso assembly proposal does not require the renderer to solve equipment fitting as part of torso construction.

The current equipment direction is:

- **Weapons:** Arms provide standardised hand grips and weapon anchors.
- **Footwear:** Feet fit within a defined envelope so boots can cover them.
- **Headgear:** Use a crown attachment model for hats, caps, helmets and similar equipment. Each compatible head declares a crown anchor and a maximum headgear envelope; each headgear asset declares its corresponding mount, orientation and layer. Wrapping hoods and face-opening garments are excluded from the art direction. Existing hood-based items should receive crown-compatible artwork and names during the equipment pass; their gameplay effects can be retained. Anatomically incompatible heads may prohibit particular equipment through declarative compatibility rules.
- **Chest:** Conventional visible chest armour may be removed. A chest slot reserved for hearts or internal organs is under consideration.

These interfaces should remain independent of torso module geometry wherever possible.

The decision about hearts and chest equipment is not required to implement modular torso assembly.

## 10. Implementation boundaries

The proposed system should not require:

- Generating complete character illustrations for every anatomical combination.
- Customising individual appendage artwork for each torso.
- Generating equipment artwork as part of the torso.
- Realistic anatomical deformation.
- Full skeletal animation.
- Unique torso artwork for every combination of heads, arms and legs.

It should reuse the existing construction and rendering architecture wherever practical.

The component system is an extension of the current procedural torso approach, not a replacement for the entire paper-doll renderer.

## 11. Open implementation decisions

The following should be resolved during prototyping rather than treated as settled design requirements.

**Grid dimensions:** The canonical width and height of torso cells and their connection interfaces.

**Part envelopes:** Numerical maximum widths/heights, directional overhang, equipment clearance and any supported size classes.

**Attachment distribution:** How heads, arms and legs are distributed across available boundary positions, including asymmetrical configurations.

**Expansion rules:** When the torso grows horizontally, vertically or both.

**Taper construction:** Prototype pre-rendered one-step and two-step transitions. Define the width increment, transition height, side distribution and compatible joins. Visual taper is capped at two steps for larger mismatches, while all attachment and equipment capacity remains reserved.

**Mirroring:** Whether left and right boundary assets can share mirrored artwork or require separate images.

**Seam treatment:** Whether overlapping artwork alone is sufficient or whether dedicated stitching and transition overlays are useful.

**Material mixing within a torso:** Whether a single torso construction can combine different materials across its modules. Independent body parts may already differ freely in colour, texture and material; this implementation question does not restrict that direction.

**Equipment layering:** How weapons and other visible equipment interact with appendages, without coupling those rules to the torso assembly system.

**Prototype sequence:** Establish one material family and inspect ordinary, imbalanced, odd-count and expanded bodies using the actual game renderer before generating further families. Include representative crown headgear, held weapons and footwear in the equipped review.

## 12. Acceptance criteria

The proposed solution is successful when:

1. The renderer can construct creatures with varying numbers of heads, arms and legs from a fixed library of torso modules.
2. Torso outlines appear organic or deliberately assembled rather than simply rectangular.
3. Appendages attach consistently across torso variants.
4. New torso artwork can be introduced using the established geometry contract without bespoke positioning code.
5. The existing lightweight paper-doll animation remains functional.
6. The result is recognisable and entertaining at the game's actual combat scale.
7. The art-generation process remains sufficiently repeatable to support continued development within the jam.
8. Head/leg imbalances produce useful shoulder or hip taper without compromising shared interfaces.
9. Defined maximum part and equipment envelopes are respected, with sufficient torso capacity and spacing for every supported attachment.
10. Supported headgear attaches through a crown mount and remains readable on compatible heads at game scale.

**Guiding principle:** Standardise the interfaces, not the anatomy. The renderer determines how the creature fits together; the artwork determines how grotesque the result looks.
