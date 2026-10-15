import test from 'node:test';
import assert from 'node:assert/strict';
import { ITEM_MAP, PROCEDURES } from '../src/game/content';
import { describeItemRules, describeSignature } from '../src/game/descriptions';
import { human } from '../src/game/anatomy';
import { Combat } from '../src/game/combat';

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
  assert.match(
    describeItemRules(ITEM_MAP.dice, 1),
    /longest remaining cooldown by 50% \(35% chance\)/,
  );
  assert.match(describeItemRules(ITEM_MAP.stormwand, 1), /within 700 units of the target/);
});
test('level-three descriptions match scaled signature effects and unscaled runtime stat effects', () => {
  for (const id of ['club', 'viper', 'spurs', 'hood']) {
    const def = ITEM_MAP[id];
    const build = human('Patient');
    build.parts.find((part) => part.slot === def.slot)!.item = {
      uid: 'tested',
      defId: id,
      level: 3,
    };
    const combat = new Combat(build, [human('Enemy')], 1234);
    if (id === 'club') {
      combat.enemies[0].x = combat.player.x + 30;
      combat.enemies[0].y = combat.player.y;
      combat.activate(combat.player, combat.player.abilities[0]);
      combat.step();
      assert.equal(combat.player.shield, 192);
      assert.match(describeSignature(def), /gain 192 Shield/);
      assert.match(describeItemRules(def, 3), /Signature: When own hit: gain 192 Shield/);
    } else if (id === 'viper') {
      assert.equal(combat.player.modifiers.chance, 0.5);
      assert.match(describeSignature(def), /gain 50% Chance amplification/);
      assert.match(describeItemRules(def, 3), /gain 50% Chance amplification/);
    } else if (id === 'spurs') {
      assert.equal(combat.player.modifiers.crit, 20);
      assert.match(describeSignature(def), /gain 20% Critical chance/);
      assert.match(describeItemRules(def, 3), /gain 20% Critical chance/);
    } else {
      assert.equal(combat.player.stats.crit, 36);
      assert.match(describeItemRules(def, 3), /gain 36% Critical chance/);
    }
  }
});
