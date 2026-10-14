import test from 'node:test';
import assert from 'node:assert/strict';
import { ITEM_MAP, PROCEDURES } from '../src/game/content';
import { describeItemRules, describeSignature } from '../src/game/descriptions';

test('item rules and signatures are generated from combat definitions', () => {
  const dagger = ITEM_MAP.dagger;
  const rules = describeItemRules(dagger, 1);
  const signature = describeSignature(dagger);

  assert.match(rules, /Cooldown: 0\.5s\./);
  assert.match(rules, /deal 60 damage\./);
  assert.match(signature, /When own crit: reduce cooldown of this item by 0\.2s\./);
  assert.equal('text' in dagger, false);
  assert.equal('signature' in dagger, false);
});

test('procedure content keeps authored flavor while omitting duplicated consequence prose', () => {
  assert.equal('text' in PROCEDURES[0], false);
  assert.ok(PROCEDURES[0].quote.length > 0);
});

test('generated descriptions preserve stat units, selectors, chances and area targeting', () => {
  assert.match(describeItemRules(ITEM_MAP.hood, 1), /15% Critical chance/);
  assert.match(describeItemRules(ITEM_MAP.dice, 1), /longest remaining cooldown by 50% \(35% chance\)/);
  assert.match(describeItemRules(ITEM_MAP.stormwand, 1), /within 700 units of the target/);
});
