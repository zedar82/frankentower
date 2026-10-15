import test from 'node:test';
import assert from 'node:assert/strict';
import { COMBAT_STALEMATE_SECONDS, Combat } from '../src/game/combat';
import { createCombatPreview } from '../src/game/combat/view';
import { ITEM_MAP, type ItemCatalog } from '../src/game/content';
import { human, stats } from '../src/game/anatomy';
import { Random, successes } from '../src/game/random';
import { type Build, type ItemDef } from '../src/game/types';

function armed(id: string, name = 'Patient'): Build {
  const b = human(name);
  b.parts.find((p) => p.slot === 'hand')!.item = { uid: `${name}-item`, defId: id, level: 1 };
  return b;
}
function custom(def: Partial<ItemDef> & { id: string }): ItemDef {
  return {
    name: def.id,
    slot: 'hand',
    type: 'Weapon',
    tags: [],
    rarity: 1,
    price: 0,
    icon: 'dagger',
    ...def,
  };
}
function catalog(...definitions: ItemDef[]): ItemCatalog {
  return Object.freeze({
    ...ITEM_MAP,
    ...Object.fromEntries(definitions.map((def) => [def.id, def])),
  });
}
test('combat fixtures use isolated catalogues and production definitions cannot be registered globally', () => {
  const fixture = custom({ id: 'test-isolated-catalogue' });
  const testCatalog = catalog(fixture);
  assert.equal(Object.isFrozen(ITEM_MAP), true);
  assert.equal(ITEM_MAP[fixture.id], undefined);
  assert.equal(testCatalog[fixture.id], fixture);
});
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
test('combat preview shares formation data without running combat start reactions', () => {
  const previewItem = custom({
    id: 'test-preview-start',
    slot: 'head',
    type: 'Helmet',
    reactions: [{ event: 'start', effects: [{ kind: 'shield', amount: 10 }] }],
  });
  const build = human('Preview patient');
  build.parts.find((part) => part.slot === 'head')!.item = {
    uid: 'preview-head',
    defId: 'test-preview-start',
    level: 1,
  };
  const preview = createCombatPreview(build, [human('Preview enemy')], 700, catalog(previewItem));
  assert.equal(preview.player.shield, 0);
  assert.equal(preview.player.x, 185);
  assert.equal(preview.enemies[0].x, 475);
  const combat = new Combat(build, [human('Actual enemy')], 700, undefined, catalog(previewItem));
  assert.equal(combat.player.shield, 10);
});
test('visual combat feedback is bounded and separate from transcript entries', () => {
  const sim = duel();
  for (let i = 0; i < 100; i++) sim.hit(sim.player, sim.enemies[0], sim.player.abilities[0], 1);
  assert.ok(sim.feedback.some((entry) => entry.kind === 'damage'));
  assert.ok(sim.logs.some((entry) => typeof entry.text === 'string'));
  assert.ok(sim.feedback.every((entry) => !('text' in entry)));
  assert.ok(sim.feedback.length <= 64);
});
test('active battle reports capture current combat without inventing a completed outcome', () => {
  const sim = duel();
  sim.step();
  sim.hit(sim.player, sim.enemies[0], sim.player.abilities[0], 100);
  const report = sim.reportSnapshot(2, 1234);
  const captured = structuredClone(report);
  assert.equal(report.outcome, 'ongoing');
  assert.equal(report.floor, 2);
  assert.equal(report.duration, sim.time);
  assert.equal(report.patient.damage, sim.player.damage);
  assert.equal(report.enemies[0].hp, sim.enemies[0].hp);
  assert.ok(report.transcript.some((entry) => entry.kind === 'damage'));
  assert.ok(report.contributions[0].damage > 0);
  assert.throws(() => sim.completedReport(2, 1234), /Only a completed fight/);
  sim.player.build.name = 'Changed after inspection';
  sim.hit(sim.player, sim.enemies[0], sim.player.abilities[0], 100);
  assert.deepEqual(report, captured);
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
test('damage and follow-up status stay on one locked target when that target dies', () => {
  const sim = new Combat(
    armed('knife'),
    [armed('skeletonblade', 'First'), armed('skeletonblade', 'Second')],
    1234,
  );
  sim.player.x = 185;
  sim.player.y = 250;
  const [first, second] = sim.enemies;
  first.x = sim.player.x + 40;
  first.y = sim.player.y;
  first.hp = 50;
  second.x = sim.player.x + 50;
  second.y = sim.player.y;
  const node = sim.player.abilities[0];
  sim.activate(sim.player, node);
  assert.equal(first.hp, 0);
  assert.equal(first.bleed, 0);
  assert.equal(second.hp, 1000);
  assert.equal(second.bleed, 0);
});
test('fixed-count targeting selects the nearest eligible targets once', () => {
  const countItem = custom({
    id: 'test-count-targeting',
    targeting: { kind: 'count', count: 2 },
    effects: [{ kind: 'damage', amount: 10, direct: true }],
  });
  const sim = new Combat(
    armed('test-count-targeting'),
    [
      armed('skeletonblade', 'First'),
      armed('skeletonblade', 'Second'),
      armed('skeletonblade', 'Third'),
    ],
    1234,
    undefined,
    catalog(countItem),
  );
  sim.enemies[0].x = sim.player.x + 35;
  sim.enemies[0].y = sim.player.y;
  sim.enemies[1].x = sim.player.x + 45;
  sim.enemies[1].y = sim.player.y;
  sim.enemies[2].x = sim.player.x + 100;
  sim.enemies[2].y = sim.player.y;
  sim.activate(sim.player, sim.player.abilities[0]);
  assert.equal(sim.enemies[0].hp, 990);
  assert.equal(sim.enemies[1].hp, 990);
  assert.equal(sim.enemies[2].hp, 1000);
});
test('area targeting resolves against its selected impact point', () => {
  const areaItem = custom({
    id: 'test-area-targeting',
    targeting: { kind: 'area', radius: 25, center: 'target' },
    effects: [{ kind: 'damage', amount: 10, direct: true }],
  });
  const sim = new Combat(
    armed('test-area-targeting'),
    [
      armed('skeletonblade', 'Center'),
      armed('skeletonblade', 'Inside'),
      armed('skeletonblade', 'Outside'),
    ],
    1234,
    undefined,
    catalog(areaItem),
  );
  sim.enemies[0].x = sim.player.x + 35;
  sim.enemies[0].y = sim.player.y;
  sim.enemies[1].x = sim.player.x + 50;
  sim.enemies[1].y = sim.player.y;
  sim.enemies[2].x = sim.player.x + 70;
  sim.enemies[2].y = sim.player.y;
  sim.activate(sim.player, sim.player.abilities[0]);
  assert.equal(sim.enemies[0].hp, 990);
  assert.equal(sim.enemies[1].hp, 990);
  assert.equal(sim.enemies[2].hp, 1000);
});
test('trigger ancestry is per branch, tracks instances, and stops recursive loops', () => {
  const hatItem = custom({
    id: 'test-hat',
    slot: 'head',
    type: 'Helmet',
    cooldown: 5,
    effects: [{ kind: 'trigger', select: { type: 'Wand' } }],
    reactions: [{ event: 'mana', effects: [{ kind: 'trigger', select: { self: true } }] }],
  });
  const wandItem = custom({
    id: 'test-wand',
    type: 'Wand',
    cooldown: 99,
    effects: [{ kind: 'damage', amount: 1, direct: true }],
  });
  const heartItem = custom({
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
  const sim = closeRanks(
    new Combat(
      build,
      [armed('skeletonblade', 'Target')],
      12,
      undefined,
      catalog(hatItem, wandItem, heartItem),
    ),
  );
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
  const sim = new Combat(b, [human()], 31);
  sim.player.mana = 0;
  sim.step();
  assert.equal(sim.player.stats.capacity, 120);
  sim.player.mana = 1;
  sim.step();
  assert.equal(sim.player.stats.capacity, 340);
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
test('an unresolved fight becomes a stalemate victory at the shared game timeout', () => {
  const sim = new Combat(human('Patient'), [human('Opponent')], 1234);
  sim.time = COMBAT_STALEMATE_SECONDS - 0.05;
  sim.step(0.05);
  assert.equal(sim.done, true);
  assert.equal(sim.won, true);
  assert.equal(sim.outcome, 'stalemate');
});
test('a diagnostic horizon can stop before the game timeout without inventing a result', () => {
  const sim = new Combat(human('Patient'), [human('Opponent')], 1234);
  assert.equal(sim.runToEnd(1), false);
  assert.equal(sim.done, false);
  assert.equal(sim.outcome, 'ongoing');
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
