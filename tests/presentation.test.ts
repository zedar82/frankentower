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

test('torso and organ profiles define fitted front-overlay geometry', () => {
  const chest = itemPresentation('plate'),
    spikes = itemPresentation('spikes'),
    heart = itemPresentation('heart');
  assert.equal(chest?.kind, 'torso');
  if (chest?.kind === 'torso') {
    assert.equal(chest.worn.anchor, 'torso');
    assert.equal(chest.asset.file, 'iron-breastplate-v2.png');
    assert.ok(chest.worn.width > 0.9);
    assert.ok(chest.worn.height > 0.9);
  }
  assert.equal(spikes?.kind, 'torso');
  if (spikes?.kind === 'torso') assert.equal(spikes.asset.file, 'spiked-cuirass-v2.png');
  assert.equal(heart?.kind, 'organ');
  if (heart?.kind === 'organ') {
    assert.equal(heart.worn.anchor, 'heart');
    assert.equal(heart.asset.file, 'heart.png');
    assert.ok(heart.worn.width > 0.25 && heart.worn.width < 0.5);
    assert.ok(heart.worn.height > 0.25 && heart.worn.height < 0.5);
  }
});
