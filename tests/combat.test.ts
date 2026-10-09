import test from 'node:test';
import assert from 'node:assert/strict';
import { Combat } from '../src/game/combat';
import { ITEM_MAP } from '../src/game/content';
import { human, stats } from '../src/game/anatomy';
import { Random, successes } from '../src/game/random';
import { type Build, type ItemDef } from '../src/game/types';

function armed(id: string, name = 'Patient'): Build {
  const b = human(name);
  b.parts.find((p) => p.slot === 'hand')!.item = { uid: `${name}-item`, defId: id, level: 1 };
  return b;
}
function custom(def: Partial<ItemDef> & { id: string }) {
  ITEM_MAP[def.id] = {
    name: def.id,
    slot: 'hand',
    type: 'Weapon',
    tags: [],
    rarity: 1,
    price: 0,
    icon: 'dagger',
    text: '',
    signature: '',
    ...def,
  };
}
function closeRanks(sim: Combat) {
  sim.enemies[0].x = sim.player.x + 40;
  sim.enemies[0].y = sim.player.y;
  return sim;
}
// These unit tests exercise effects in reach. Spatial approach is covered separately.
function duel(id = 'dagger') {
  return closeRanks(new Combat(armed(id), [armed('skeletonblade', 'Target')], 1234));
}
test('a normal human starts at 1000 HP and circulatory equilibrium', () => {
  const s = stats(human());
  assert.equal(s.maxHp, 1000);
  assert.equal(s.capacity, s.load);
  assert.equal(s.efficiency, 1);
});
test('Shield absorbs one attack and discards its unused remainder', () => {
  const sim = duel(),
    node = sim.player.abilities[0],
    target = sim.enemies[0];
  target.shield = 200;
  sim.hit(sim.player, target, node, 50);
  assert.equal(target.hp, 1000);
  assert.equal(target.shield, 0);
  sim.hit(sim.player, target, node, 50);
  assert.equal(target.hp, 950);
  target.shield = 200;
  sim.hit(sim.player, target, node, 500);
  assert.equal(target.hp, 650);
  assert.equal(target.shield, 0);
});
test('Bleed needs a penetrating direct hit, does not tick, and does not recur', () => {
  const sim = duel(),
    target = sim.enemies[0],
    node = sim.player.abilities[0];
  target.bleed = 80;
  target.stats.armour = 100;
  sim.hit(sim.player, target, node, 60);
  assert.equal(target.hp, 1000);
  target.stats.armour = 0;
  target.shield = 200;
  sim.hit(sim.player, target, node, 60);
  assert.equal(target.hp, 1000);
  sim.hit(sim.player, target, node, 60);
  assert.equal(target.hp, 860);
  sim.hit(sim.player, target, node, 20, [], false);
  assert.equal(target.hp, 840);
  const start = target.hp;
  for (let i = 0; i < 8; i++) sim.step();
  assert.equal(target.hp, start);
});
test('chance overflow grants multiple successes and crit tiers add damage', () => {
  const rng = new Random(32);
  assert.equal(successes(300, rng), 3);
  assert.equal(successes(0, rng), 0);
  const sim = duel();
  sim.player.stats.crit = 200;
  sim.activate(sim.player, sim.player.abilities[0]);
  assert.equal(sim.enemies[0].hp, 820);
});
test('Poison ticks and decays, without being stopped by direct-attack defences', () => {
  const sim = duel();
  sim.player.abilities[0].remaining = 99;
  sim.enemies[0].abilities[0].remaining = 99;
  sim.enemies[0].poison = 50;
  sim.enemies[0].stats.armour = 1000;
  sim.enemies[0].shield = 1000;
  for (let i = 0; i < 20; i++) sim.step();
  assert.equal(sim.enemies[0].hp, 950);
  assert.equal(sim.enemies[0].poison, 40);
  assert.equal(sim.enemies[0].shield, 1000);
});
test('trigger ancestry is per branch, tracks instances, and stops recursive loops', () => {
  custom({
    id: 'test-hat',
    slot: 'head',
    type: 'Helmet',
    cooldown: 5,
    effects: [{ kind: 'trigger', select: { type: 'Wand' } }],
    reactions: [{ event: 'mana', effects: [{ kind: 'trigger', select: { self: true } }] }],
  });
  custom({
    id: 'test-wand',
    type: 'Wand',
    cooldown: 99,
    effects: [{ kind: 'damage', amount: 1, direct: true }],
  });
  custom({
    id: 'test-heart',
    slot: 'heart',
    type: 'Heart',
    reactions: [{ event: 'activated', type: 'Wand', effects: [{ kind: 'mana', amount: 1 }] }],
  });
  const build = human();
  let i = 0;
  for (const part of build.parts)
    if (['head', 'heart', 'hand'].includes(part.slot))
      part.item = {
        uid: `chain-${i++}`,
        defId:
          part.slot === 'head' ? 'test-hat' : part.slot === 'heart' ? 'test-heart' : 'test-wand',
        level: 1,
      };
  const sim = closeRanks(new Combat(build, [armed('skeletonblade', 'Target')], 12));
  sim.player.mana = 0;
  const hat = sim.player.abilities.find((n) => n.def.id === 'test-hat')!,
    heart = sim.player.abilities.find((n) => n.def.id === 'test-heart')!;
  sim.activate(sim.player, hat);
  sim.step();
  assert.equal(hat.activations, 1);
  assert.equal(heart.activations, 2);
  assert.equal(sim.suppressed, 2);
  assert.equal(
    sim.player.abilities.filter((n) => n.def.id === 'test-wand').every((n) => n.activations === 1),
    true,
  );
  // A new scheduled/root activation may reuse every instance.
  sim.activate(sim.player, hat);
  sim.step();
  assert.equal(hat.activations, 2);
  assert.equal(heart.activations, 4);
});
test('overload slows natural clocks while direct triggers still activate immediately', () => {
  const build = armed('club');
  for (let i = 0; i < 6; i++)
    build.parts.push({ uid: `extra-${i}`, slot: 'hand', variant: 'living' });
  const sim = new Combat(build, [armed('skeletonblade', 'Target')], 5);
  assert.ok(sim.player.stats.efficiency < 0.5);
  for (let i = 0; i < 20; i++) sim.step();
  assert.ok(sim.player.abilities[0].remaining > 2);
  closeRanks(sim);
  sim.activate(sim.player, sim.player.abilities[0], ['other-root']);
  assert.equal(sim.enemies[0].hp, 700);
});
test('necrotic heart capacity stops when Mana reaches zero', () => {
  const b = human();
  b.parts.push({ uid: 'deadheart', slot: 'heart', variant: 'necrotic' });
  assert.equal(stats(b, 1).capacity, 340);
  assert.equal(stats(b, 0).capacity, 120);
});

test('Mana regeneration and necrotic upkeep retain their per-second pacing', () => {
  const brain = human(),
    undead = human();
  undead.parts.push({ uid: 'extra-necrotic', slot: 'heart', variant: 'necrotic' });
  const sim = new Combat(brain, [undead], 12);
  sim.player.mana = 0;
  sim.enemies[0].mana = 50;
  for (let i = 0; i < 20; i++) sim.step();
  assert.equal(sim.player.mana, 10);
  assert.equal(sim.enemies[0].mana, 40);
});
test('identical builds and seeds produce identical outcomes and event traces', () => {
  const a = duel('knife'),
    b = duel('knife');
  a.runToEnd();
  b.runToEnd();
  assert.deepEqual(a.logs, b.logs);
  assert.equal(a.player.hp, b.player.hp);
  assert.equal(a.won, b.won);
});
test('own-hit passive effects resolve inside the activation rather than being suppressed', () => {
  const sim = duel('maul');
  sim.activate(sim.player, sim.player.abilities[0]);
  sim.step();
  assert.equal(sim.player.shield, 50);
  assert.equal(sim.player.abilities[0].activations, 1);
});
test('own-crit Lv3 signatures can reduce their originating item cooldown', () => {
  const sim = duel('dagger');
  sim.player.abilities[0].level = 3;
  sim.player.stats.crit = 100;
  sim.activate(sim.player, sim.player.abilities[0]);
  sim.step();
  assert.ok(sim.player.abilities[0].remaining < 0.3);
  assert.equal(sim.player.abilities[0].activations, 1);
});
test('all three starting weapons survive the reference encounter', () => {
  for (const id of ['dagger', 'club', 'knife']) {
    const sim = duel(id);
    assert.equal(sim.runToEnd(), true, id);
    assert.ok(sim.player.hp > 0, id);
  }
});
