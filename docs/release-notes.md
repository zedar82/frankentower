# FRANKENTOWER — phone and desktop UI pass

The quartermaster now uses a textured dungeon scene, timber controls, iron fittings
and parchment stock cards. Desktop places the creature between equipment and stock;
phone uses a compact header and focused Patient, Stock, Gear and Services views.

Equipment expands into a touch-friendly workspace. Extra slots, complete item
rules, surgery consequences, help, history and reports use tabs and explicit pages.
Core views fit the usable viewport; only the combat transcript scrolls.

The satchel has eight spaces. Purchases, swaps and surgery check the complete
result before spending or moving anything. A full satchel still permits valid
swaps and purchases into empty compatible slots. Surgery previews the exact
anatomy and displaced equipment before confirmation.

Inventory pictures now match the accepted cleaver and crown silhouettes. Icons
render at display density. The creature uses a RUN-generated stone plinth;
controls use a RUN-generated timber texture.

Short landscape keeps blocked-purchase explanations beside the price and gives
equipment selection clear space inside its frame. Touch controls retain a minimum
44-pixel width. The creature display stays within its scene after rotation and
does not intercept the arena action.

This changes the development ruleset to frankentower-3. Incompatible development
saves reset; no save migration is provided.

This build remains private/unlisted. It is not a public release or jam submission.

## Previous update: rendering quality and display density

Creature cutouts, materials and torso boundaries now retain four bitmap pixels per assembly unit. This preserves facial lines, hand shapes and limb detail inside the existing frames and attachment envelopes.

Room, arena and portrait canvases draw at their actual display size and device pixel ratio. Pixelated CSS scaling replaces smooth enlargement of a fixed small canvas. Portraits redraw when resized.

The accepted body proportions, taper, grips and foreground attack-arm layers are preserved. Before/after quality captures use the actual DressingRoom at standard and high display density. The existing attachment check and production build pass; gameplay and combat timing are unchanged.

This build remains private/unlisted. It is not a public release or jam submission.
