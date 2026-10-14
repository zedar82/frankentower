import assert from 'node:assert/strict';
import test from 'node:test';
import { ITEM_MAP } from '../src/game/content';
import {
  ITEM_PRESENTATION,
  itemPresentation,
  validatePresentationCatalog,
} from '../src/art/presentation-catalog';

test('every authored item resolves to a validated presentation role for its slot', () => {
  validatePresentationCatalog();
  for (const [id, item] of Object.entries(ITEM_MAP)) {
    const profile = ITEM_PRESENTATION[id];
    assert.ok(profile, `${id} has a presentation profile`);
    assert.equal(profile.icon, item.icon);
    assert.equal(
      profile.kind,
      { hand: 'held', head: 'crown', foot: 'footwear', chest: 'torso', heart: 'organ' }[item.slot],
    );
  }
});

test('equipment profiles preserve front-only coverage and explicit hand layering', () => {
  assert.equal(ITEM_PRESENTATION.shield.kind, 'held');
  if (ITEM_PRESENTATION.shield.kind === 'held')
    assert.equal(ITEM_PRESENTATION.shield.geometry.handLayer, 'behind');
  assert.equal(ITEM_PRESENTATION.horns.kind, 'crown');
  if (ITEM_PRESENTATION.horns.kind === 'crown')
    assert.equal(ITEM_PRESENTATION.horns.frontOnly, true);
  assert.equal(ITEM_PRESENTATION.runners.kind, 'footwear');
  if (ITEM_PRESENTATION.runners.kind === 'footwear') {
    assert.equal(ITEM_PRESENTATION.runners.frontOnly, true);
    assert.equal(ITEM_PRESENTATION.runners.replacesFootBelowAnkle, true);
  }
});

test('torso and organ art state their current worn-renderer boundary', () => {
  const chest = itemPresentation('plate'),
    heart = itemPresentation('heart');
  assert.equal(chest?.kind, 'torso');
  if (chest?.kind === 'torso') assert.equal(chest.worn.status, 'icon-only');
  assert.equal(heart?.kind, 'organ');
  if (heart?.kind === 'organ') assert.equal(heart.worn.status, 'icon-only');
});
