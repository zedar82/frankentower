import test from 'node:test';
import assert from 'node:assert/strict';
import { advance, defaultSave, finishFight, newRun, retire, startRun } from '../src/game/run';
import { reroll, toggleShopFreeze } from '../src/game/shop';
import { buy, combine, equip, purchaseItem, unequip } from '../src/game/inventory';
import { operate, operateResult, procedurePlan, procedurePreview, procedureReason } from '../src/game/surgery';
import { encounter } from '../src/game/encounters';
import { RULESET, SATCHEL_CAPACITY, clone } from '../src/game/types';
import { PROCEDURES } from '../src/game/content';
import { count, equipped, stats } from '../src/game/anatomy';
import { Combat } from '../src/game/combat';
import { canMoveItem, moveItem, moveItemResult, purchaseItemResult } from '../src/game/inventory';

test('inventory moves validate ownership and targets before spending or removing items', () => {
  const run = newRun(12);
  startRun(run, 'dagger');
  const offer = run.offers[0]!,
    wrong = run.build.parts.find((part) => part.slot !== ITEM_MAP[offer.defId].slot)!;
  const before = clone(run);
  assert.deepEqual(moveItemResult(run, offer.uid, wrong.uid), {
    ok: false,
    code: 'wrong_slot',
    message: 'Choose a matching equipment slot.',
  });
  assert.equal(moveItem(run, offer.uid, wrong.uid), false);
  assert.deepEqual(run, before);
  assert.equal(canMoveItem(run, 'not-owned'), false);
  run.gold = 0;
  assert.equal(moveItem(run, offer.uid), false);
  assert.equal(run.offers[0]?.uid, offer.uid);
});

test('moving equipped HP equipment clamps health only after the complete swap', () => {
  const run = newRun(12);
  startRun(run, 'dagger');
  const chest = run.build.parts.find((part) => part.slot === 'chest')!;
  chest.item = { uid: 'donor', defId: 'donor', level: 1 };
  run.build.parts.push({
    uid: 'other-chest',
    slot: 'chest',
    variant: 'living',
    item: { uid: 'plate', defId: 'plate', level: 1 },
  });
  run.hp = stats(run.build).maxHp;
  const hp = run.hp;
  assert.equal(moveItem(run, 'donor', 'other-chest'), true);
  assert.equal(run.hp, hp);
  assert.equal(run.stash[0].defId, 'plate');
  assert.equal(chest.item, undefined);
});

test('full satchel permits atomic swaps and direct purchases into empty slots', () => {
  const run = newRun(12);
  startRun(run, 'dagger');
  run.gold = 100;
  run.stash = Array.from({ length: SATCHEL_CAPACITY }, (_, i) => ({
    uid: `bag-${i}`,
    defId: 'knife',
    level: 1,
  }));
  const hands = run.build.parts.filter((part) => part.slot === 'hand');
  assert.equal(equip(run, 'bag-0', hands[0].uid), true);
  assert.equal(run.stash.length, SATCHEL_CAPACITY);
  const before = clone(run);
  assert.equal(unequip(run, hands[0].uid), false);
  assert.deepEqual(run, before);
  run.offers[0] = { uid: 'purchase-knife', defId: 'knife', level: 1 };
  assert.equal(purchaseItem(run, 0), true);
  assert.equal(hands[1].item?.uid, 'purchase-knife');
  assert.equal(run.stash.length, SATCHEL_CAPACITY);
  run.offers[1] = { uid: 'no-room', defId: 'knife', level: 1 };
  const full = clone(run);
  assert.deepEqual(purchaseItemResult(run, 1), {
    ok: false,
    code: 'satchel_full',
    message: 'Satchel full. Equip, combine, or sell an item to make room.',
  });
  assert.equal(purchaseItem(run, 1), false);
  assert.equal(moveItem(run, 'no-room', hands[0].uid), false);
  assert.deepEqual(run, full);
});

test('surgery preview and capacity validation use the same removal selection', () => {
  const run = newRun(12);
  startRun(run, 'dagger');
  run.floor = 5;
  run.gold = 100;
  run.procedures = ['amputate'];
  const hands = run.build.parts.filter((part) => part.slot === 'hand');
  hands[1].item = { uid: 'second-knife', defId: 'knife', level: 1 };
  run.stash = Array.from({ length: SATCHEL_CAPACITY }, (_, i) => ({
    uid: `full-${i}`,
    defId: 'knife',
    level: 1,
  }));
  const procedure = PROCEDURES.find((p) => p.id === 'amputate')!;
  const preview = procedurePreview(run, procedure);
  const plan = procedurePlan(run, procedure);
  assert.equal(preview.removed[0].uid, hands[1].uid);
  assert.equal(preview.displaced[0].uid, 'second-knife');
  assert.equal(plan.removed[0].uid, preview.removed[0].uid);
  assert.equal(plan.displaced[0].uid, preview.displaced[0].uid);
  const before = clone(run);
  assert.match(procedureReason(run, procedure)!, /satchel/);
  assert.deepEqual(operateResult(run, 'amputate'), {
    ok: false,
    reason: procedureReason(run, procedure),
  });
  assert.equal(operate(run, 'amputate'), false);
  assert.deepEqual(run, before);
  run.phase = 'combat';
  run.operated = true;
  run.gold = 0;
  assert.equal(procedurePlan(run, procedure, 'stock').reason, null);
  run.phase = 'build';
  run.operated = false;
  run.gold = 100;
  run.stash.pop();
  assert.equal(operate(run, 'amputate'), true);
  assert.equal(run.stash.length, SATCHEL_CAPACITY);
  assert.equal(run.stash.at(-1)?.uid, 'second-knife');
  assert.deepEqual(
    run.build.parts.map((part) => part.uid),
    preview.build.parts.map((part) => part.uid),
  );
});

test('new floors refill stock for free while ordinary floors retain surgery choices', () => {
  const r = newRun(5432);
  startRun(r, 'dagger');
  buy(r, 0);
  const previous = r.offers.filter(Boolean).map((i) => i!.uid),
    gold = r.gold,
    procedures = clone(r.procedures);
  r.phase = 'result';
  assert.equal(advance(r), true);
  assert.equal(r.offers.filter(Boolean).length, 4);
  assert.ok(r.offers.every((i) => i && !previous.includes(i.uid)));
  assert.equal(r.gold, gold);
  assert.equal(r.rerolls, 0);
  assert.deepEqual(r.procedures, procedures);
});

test('freeze preserves remaining offers across ordinary and surgery floors until disabled', () => {
  const r = newRun(5432);
  startRun(r, 'dagger');
  buy(r, 0);
  toggleShopFreeze(r);
  const offers = clone(r.offers);
  r.floor = 3;
  r.operated = true;
  r.procedures = [];
  for (const floor of [4, 5]) {
    r.phase = 'result';
    advance(r);
    assert.equal(r.floor, floor);
    assert.deepEqual(r.offers, offers);
    assert.equal(r.shopFrozen, true);
  }
  assert.equal(r.operated, false);
  assert.ok(r.procedures.length > 0);
  const gold = r.gold;
  toggleShopFreeze(r);
  assert.deepEqual(r.offers, offers);
  r.phase = 'result';
  advance(r);
  assert.ok(r.offers.every(Boolean));
  assert.notDeepEqual(r.offers, offers);
  assert.equal(r.gold, gold);
});

test('freeze is build-only and manual refresh still works while frozen', () => {
  const r = newRun(5432);
  assert.equal(toggleShopFreeze(r), false);
  assert.equal(r.shopFrozen, false);
  startRun(r, 'dagger');
  toggleShopFreeze(r);
  const offers = clone(r.offers);
  assert.equal(reroll(r), true);
  assert.notDeepEqual(r.offers, offers);
  assert.equal(r.shopFrozen, true);
  r.phase = 'combat';
  assert.equal(toggleShopFreeze(r), false);
  assert.equal(r.shopFrozen, true);
});

test('shops and encounter budgets are reproducible and build-agnostic', () => {
  const a = newRun(5432),
    b = newRun(5432);
  assert.deepEqual(a, b);
  assert.equal(a.offers.length, 4);
  startRun(a, 'dagger');
  assert.equal(reroll(a), true);
  assert.equal(a.offers.length, 4);
  for (const floor of [1, 5, 19, 47, 99])
    assert.deepEqual(encounter(floor, a.seed, []), encounter(floor, b.seed, []));
  for (let f = 1; f <= 100; f++) {
    const enemies = encounter(f, a.seed, []);
    assert.ok(enemies.length >= 1 && enemies.length <= 6);
    assert.ok(enemies.every((b) => stats(b).maxHp > 0));
  }
});
test('enemy archetypes use distinct paper-puppet anatomy and materials', () => {
  const found = new Map<string, ReturnType<typeof encounter>[number]>();
  for (let seed = 0; seed < 30; seed++)
    for (let floor = 2; floor <= 100; floor++)
      for (const build of encounter(floor, seed, [])) found.set(build.name, build);
  for (const name of [
    'Grave rat',
    'Skeleton',
    'Ogre',
    'Grave mage',
    'Bone archer',
    'Iron knight',
    'Golem',
  ])
    assert.ok(found.has(name), `missing ${name}`);
  const rat = found.get('Grave rat')!;
  assert.equal(count(rat, 'foot'), 4);
  assert.ok(rat.parts.every((p) => p.variant === 'rat'));
  const ogre = found.get('Ogre')!;
  assert.equal(count(ogre, 'hand'), 4);
  assert.equal(count(ogre, 'head'), 2);
  const golem = found.get('Golem')!;
  assert.equal(count(golem, 'foot'), 4);
  assert.ok(golem.parts.every((p) => p.variant === 'clockwork'));
  assert.ok(found.get('Skeleton')!.parts.every((p) => p.variant === 'bone'));
});
test('rat and bone donor grafts create reusable, equipable player anatomy', () => {
  const r = newRun(554);
  startRun(r, 'dagger');
  r.floor = 20;
  r.gold = 200;
  r.procedures = ['ratgraft'];
  assert.equal(operate(r, 'ratgraft'), true);
  assert.equal(r.build.parts.find((p) => p.slot === 'chest')?.variant, 'rat');
  assert.equal(r.build.parts.find((p) => p.slot === 'head')?.variant, 'rat');
  assert.equal(r.build.parts.filter((p) => p.slot === 'foot' && p.variant === 'rat').length, 2);
  const ratHand = r.build.parts.find((p) => p.slot === 'hand' && p.variant === 'rat')!;
  r.stash.push({ uid: 'graft-knife', defId: 'knife', level: 1 });
  assert.equal(equip(r, 'graft-knife', ratHand.uid), true);
  assert.equal(ratHand.item?.defId, 'knife');
  const b = newRun(555);
  startRun(b, 'club');
  b.floor = 20;
  b.gold = 200;
  b.procedures = ['bonegraft'];
  assert.equal(operate(b, 'bonegraft'), true);
  assert.ok(
    b.build.parts
      .filter((p) => ['chest', 'head', 'hand', 'foot'].includes(p.slot))
      .some((p) => p.variant === 'bone'),
  );
  const boneHand = b.build.parts.find((p) => p.slot === 'hand' && p.variant === 'bone')!;
  b.stash.push({ uid: 'bone-knife', defId: 'knife', level: 1 });
  assert.equal(equip(b, 'bone-knife', boneHand.uid), true);
});
test('buying is atomic and compatible sockets enforce anatomy', () => {
  const r = newRun(123);
  startRun(r, 'dagger');
  r.gold = 0;
  assert.equal(buy(r, 0), false);
  assert.ok(r.offers[0]);
  r.gold = 100;
  assert.equal(buy(r, 0), true);
  const i = r.stash[0];
  const defSlot = awaitImportSlot(i.defId);
  const wrongSlot = r.build.parts.find((p) => p.slot !== defSlot)!;
  assert.equal(equip(r, i.uid, wrongSlot.uid), false);
  assert.equal(r.stash.length, 1);
  assert.equal(r.offers[0], null);
});
import { ITEM_MAP } from '../src/game/content';
function awaitImportSlot(id: string) {
  return ITEM_MAP[id].slot;
}
test('duplicate combining consumes only one matching instance', () => {
  const r = newRun(1);
  startRun(r, 'dagger');
  r.stash.push(
    { uid: 'copy', defId: 'dagger', level: 1 },
    { uid: 'other', defId: 'club', level: 1 },
  );
  const target = equipped(r.build)[0].item;
  assert.equal(combine(r, target.uid), true);
  assert.equal(target.level, 2);
  assert.equal(r.stash.length, 1);
  assert.equal(combine(r, target.uid), false);
  r.stash.push({ uid: 'copy2', defId: 'dagger', level: 2 });
  assert.equal(combine(r, target.uid), true);
  assert.equal(target.level, 3);
  assert.equal(combine(r, target.uid), false);
});

test('combining a satchel item with equipped HP equipment clamps the final health', () => {
  const run = newRun(12);
  startRun(run, 'dagger');
  const chest = run.build.parts.find((part) => part.slot === 'chest')!;
  chest.item = { uid: 'equipped-donor', defId: 'donor', level: 1 };
  run.stash.push({ uid: 'bag-donor', defId: 'donor', level: 1 });
  run.hp = stats(run.build).maxHp;
  assert.equal(combine(run, 'bag-donor'), true);
  assert.equal(chest.item, undefined);
  assert.equal(run.stash[0].level, 2);
  assert.equal(run.hp, stats(run.build).maxHp);
});
test('surgery adds real sockets and soft overload, removal preserves equipment', () => {
  const r = newRun(4);
  startRun(r, 'dagger');
  r.floor = 5;
  r.gold = 100;
  r.procedures = ['arm', 'amputate'];
  assert.equal(operate(r, 'arm'), true);
  assert.equal(count(r.build, 'hand'), 3);
  assert.ok(stats(r.build).efficiency < 1);
  assert.equal(operate(r, 'arm'), false);
  r.operated = false;
  r.build.parts
    .filter((p) => p.slot === 'hand')
    .forEach((p, i) => (p.item = { uid: 'knife' + i, defId: 'knife', level: 1 }));
  assert.equal(operate(r, 'amputate'), true);
  assert.equal(count(r.build, 'hand'), 2);
  assert.equal(r.stash.length, 1);
});
test('headless conversion requires an alternative controller', () => {
  const r = newRun(42);
  startRun(r, 'dagger');
  r.floor = 30;
  r.gold = 100;
  r.procedures = ['ganglion'];
  assert.equal(operate(r, 'ganglion'), true);
  assert.equal(count(r.build, 'head'), 0);
  assert.ok(r.build.parts.some((p) => p.variant === 'ganglion'));
});
test('retirement stores a deep snapshot and becomes the next checkpoint opponent', () => {
  const save = defaultSave(),
    r = newRun(4);
  startRun(r, 'knife');
  r.floor = 20;
  r.phase = 'checkpoint';
  save.run = r;
  assert.equal(retire(save, r), true);
  const boss = encounter(20, 89, save.legacy)[0];
  assert.deepEqual(boss, r.build);
  r.build.name = 'Changed';
  assert.notEqual(save.legacy[0].build.name, r.build.name);
  const player = clone(boss);
  const sim = new Combat(player, [boss], 123);
  assert.equal(stats(player).maxHp, sim.enemies[0].hp);
});
test('successful floors award gold, recover health, and stop at checkpoints', () => {
  const save = defaultSave(),
    r = newRun(4);
  startRun(r, 'dagger');
  r.phase = 'combat';
  r.floor = 20;
  finishFight(r, 300, true, save);
  assert.equal(r.phase, 'checkpoint');
  assert.equal(r.hp, 550);
  assert.equal(save.best, 20);
  const awardedGold = r.gold;
  assert.equal(finishFight(r, 300, true, save), false);
  assert.equal(r.gold, awardedGold);
  assert.equal(r.victories, 1);
  assert.equal(advance(r), true);
  assert.equal(r.floor, 21);
  r.floor = 100;
  r.phase = 'combat';
  finishFight(r, 300, true, save);
  assert.equal(r.phase, 'complete');
  assert.equal(save.completed, true);
  assert.equal(save.legacy[0].checkpoint, 100);
  assert.equal(save.legacy[0].ruleset, RULESET);
});
test('defeat preserves the final build for inspection', () => {
  const save = defaultSave(),
    r = newRun(7);
  startRun(r, 'club');
  r.phase = 'combat';
  finishFight(r, 0, false, save);
  assert.equal(r.phase, 'dead');
  assert.equal(save.records.length, 1);
  assert.equal(save.records[0].build.name, r.build.name);
});
